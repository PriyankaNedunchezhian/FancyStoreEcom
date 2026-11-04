import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  canAccessOrder,
  corsHeadersFor,
  errorResponse,
  jsonResponse,
  originAllowed,
  paymentMatchesOrder,
  requireUser,
  timingSafeEqual,
} from '../_shared/security.ts';

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) });
  }
  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed.', 405);
  }
  if (!originAllowed(req)) {
    return errorResponse(req, 'Origin is not allowed.', 403);
  }

  try {
    const auth = await requireUser(req);
    if (!auth.user) {
      return errorResponse(req, auth.error, auth.status);
    }

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!razorpayKeyId || !razorpayKeySecret) {
      return errorResponse(req, 'Razorpay is not configured.', 500);
    }
    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(req, 'Supabase service role is not configured.', 500);
    }

    const body = await req.json().catch(() => ({}));
    const orderId = Number(body?.orderId ?? body?.order_id);
    const razorpayOrderId = String(body?.razorpayOrderId ?? body?.razorpay_order_id ?? '').trim();
    const razorpayPaymentId = String(body?.razorpayPaymentId ?? body?.razorpay_payment_id ?? '').trim();
    const razorpaySignature = String(body?.razorpaySignature ?? body?.razorpay_signature ?? '').trim();

    if (!Number.isFinite(orderId) || orderId <= 0) {
      return errorResponse(req, 'A valid orderId is required.');
    }
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return errorResponse(req, 'Missing Razorpay payment details.');
    }

    const expected = await hmacSha256Hex(
      razorpayKeySecret,
      `${razorpayOrderId}|${razorpayPaymentId}`,
    );
    if (!timingSafeEqual(expected, razorpaySignature)) {
      return errorResponse(req, 'Invalid payment signature.', 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        'order_id, customer_id, payment_method, payment_status, total, razorpay_order_id, razorpay_payment_id',
      )
      .eq('order_id', orderId)
      .maybeSingle();

    if (orderError) {
      return errorResponse(req, orderError.message || 'Could not load the order.', 500);
    }
    if (!order) {
      return errorResponse(req, 'Order not found.', 404);
    }
    if (!canAccessOrder(auth.user, order)) {
      return errorResponse(req, 'You can only verify payment for your own orders.', 403);
    }
    if (order.payment_method !== 'razorpay') {
      return errorResponse(req, 'This order is not set up for Razorpay.');
    }
    if (!order.razorpay_order_id || order.razorpay_order_id !== razorpayOrderId) {
      return errorResponse(req, 'Razorpay order does not match this store order.', 409);
    }
    if (order.payment_status === 'Paid') {
      return jsonResponse(req, {
        ok: true,
        orderId,
        paymentStatus: 'Paid',
        alreadyPaid: true,
      });
    }

    const basic = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const paymentRes = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpayPaymentId)}`,
      { headers: { Authorization: `Basic ${basic}` } },
    );
    const payment = await paymentRes.json().catch(() => ({}));
    if (!paymentRes.ok) {
      return errorResponse(req, 'Could not confirm the payment with Razorpay.', 502);
    }
    if (!paymentMatchesOrder(payment, order)) {
      return errorResponse(req, 'Payment does not match this order amount.', 409);
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'Paid',
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('payment_status', 'Unpaid');

    if (updateError) {
      return errorResponse(req, updateError.message || 'Could not mark the order as paid.', 500);
    }

    return jsonResponse(req, {
      ok: true,
      orderId,
      paymentStatus: 'Paid',
      alreadyPaid: false,
    });
  } catch (err) {
    return errorResponse(req, err?.message || 'Unexpected error verifying payment.', 500);
  }
});
