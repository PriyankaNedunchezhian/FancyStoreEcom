import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed.', 405);
  }

  try {
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!razorpayKeyId || !razorpayKeySecret) {
      return errorResponse('Razorpay is not configured.', 500);
    }
    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse('Supabase service role is not configured.', 500);
    }

    const body = await req.json().catch(() => ({}));
    const orderId = Number(body?.orderId ?? body?.order_id);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return errorResponse('A valid orderId is required.');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        'order_id, customer_name, customer_email, customer_phone, payment_method, payment_status, total, razorpay_order_id',
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
    if (order.payment_status === 'Paid') {
      return errorResponse('This order is already paid.');
    }
    if (order.payment_status !== 'Unpaid') {
      return errorResponse('This order cannot accept online payment.');
    }

    const amountPaise = Math.round(Number(order.total || 0) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      return errorResponse('Order total is too low for online payment.');
    }

    let razorpayOrderId = order.razorpay_order_id || '';

    if (!razorpayOrderId) {
      const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: `order_${orderId}`,
          notes: {
            store_order_id: String(orderId),
          },
        }),
      });

      const razorpayBody = await razorpayRes.json().catch(() => ({}));
      if (!razorpayRes.ok) {
        const message =
          razorpayBody?.error?.description ||
          razorpayBody?.error?.reason ||
          'Could not create Razorpay order.';
        return errorResponse(message, 502);
      }

      razorpayOrderId = String(razorpayBody.id || '');
      if (!razorpayOrderId) {
        return errorResponse('Razorpay did not return an order id.', 502);
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          razorpay_order_id: razorpayOrderId,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId);

      if (updateError) {
        return errorResponse(
          updateError.message || 'Could not save Razorpay order id.',
          500,
        );
      }
    }

    return jsonResponse({
      keyId: razorpayKeyId,
      razorpayOrderId,
      amount: amountPaise,
      currency: 'INR',
      name: order.customer_name || '',
      email: order.customer_email || '',
      phone: order.customer_phone || '',
      receipt: `order_${orderId}`,
      orderId,
    });
  } catch (err) {
    return errorResponse(err?.message || 'Unexpected error creating payment.', 500);
  }
});
