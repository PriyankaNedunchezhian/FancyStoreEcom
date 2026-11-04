import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed.', 405);
  }

  try {
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!razorpayKeySecret) {
      return errorResponse('Razorpay is not configured.', 500);
    }
    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse('Supabase service role is not configured.', 500);
    }

    const body = await req.json().catch(() => ({}));
    const orderId = Number(body?.orderId ?? body?.order_id);
    const razorpayOrderId = String(
      body?.razorpayOrderId ?? body?.razorpay_order_id ?? '',
    ).trim();
    const razorpayPaymentId = String(
      body?.razorpayPaymentId ?? body?.razorpay_payment_id ?? '',
    ).trim();
    const razorpaySignature = String(
      body?.razorpaySignature ?? body?.razorpay_signature ?? '',
    ).trim();

    if (!Number.isFinite(orderId) || orderId <= 0) {
      return errorResponse('A valid orderId is required.');
    }
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return errorResponse('Missing Razorpay payment details.');
    }

    const expected = await hmacSha256Hex(
      razorpayKeySecret,
      `${razorpayOrderId}|${razorpayPaymentId}`,
    );

    if (!timingSafeEqual(expected, razorpaySignature)) {
      return errorResponse('Invalid payment signature.', 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        'order_id, payment_method, payment_status, razorpay_order_id, razorpay_payment_id',
      )
      .eq('order_id', orderId)
      .maybeSingle();

    if (orderError) {
      return errorResponse(orderError.message || 'Could not load the order.', 500);
    }
    if (!order) {
      return errorResponse('Order not found.', 404);
    }
    if (order.payment_method !== 'razorpay') {
      return errorResponse('This order is not set up for Razorpay.');
    }
    if (
      order.razorpay_order_id &&
      order.razorpay_order_id !== razorpayOrderId
    ) {
      return errorResponse('Razorpay order does not match this store order.');
    }
    if (order.payment_status === 'Paid') {
      return jsonResponse({
        ok: true,
        orderId,
        paymentStatus: 'Paid',
        alreadyPaid: true,
      });
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'Paid',
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    if (updateError) {
      return errorResponse(
        updateError.message || 'Could not mark the order as paid.',
        500,
      );
    }

    return jsonResponse({
      ok: true,
      orderId,
      paymentStatus: 'Paid',
      alreadyPaid: false,
    });
  } catch (err) {
    return errorResponse(err?.message || 'Unexpected error verifying payment.', 500);
  }
});
