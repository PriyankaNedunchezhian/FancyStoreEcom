import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  corsHeadersFor,
  errorResponse,
  jsonResponse,
  originAllowed,
} from '../_shared/security.ts';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return errorResponse(req, 'Supabase is not configured.', 500);
    }

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return errorResponse(req, 'Sign in to cancel your order.', 401);
    }

    const body = await req.json().catch(() => ({}));
    const orderId = Number(body?.orderId ?? body?.order_id);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return errorResponse(req, 'A valid orderId is required.');
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return errorResponse(req, 'Sign in to cancel your order.', 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select(
        'order_id, customer_id, status, payment_status, payment_method, razorpay_payment_id',
      )
      .eq('order_id', orderId)
      .maybeSingle();

    if (orderError) {
      return errorResponse(req, orderError.message || 'Could not load order.', 500);
    }
    if (!order) {
      return errorResponse(req, 'Order not found.', 404);
    }
    if (order.customer_id !== user.id) {
      return errorResponse(req, 'You can only cancel your own orders.', 403);
    }
    if (order.status !== 'Pending') {
      return errorResponse(req, 'Only pending orders can be cancelled.');
    }

    let refundId: string | null = null;

    if (order.payment_status === 'Paid') {
      if (order.payment_method !== 'razorpay') {
        return errorResponse(
          req,
          'Paid orders without Razorpay must be refunded by the store.',
        );
      }
      const paymentId = String(order.razorpay_payment_id || '').trim();
      if (!paymentId) {
        return errorResponse(
          req,
          'Missing Razorpay payment id. Contact the store for a refund.',
        );
      }
      if (!razorpayKeyId || !razorpayKeySecret) {
        return errorResponse(req, 'Razorpay is not configured for refunds.', 500);
      }

      const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      const refundRes = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        },
      );
      const refundBody = await refundRes.json().catch(() => ({}));
      const alreadyRefunded =
        refundRes.status === 400 &&
        String(
          refundBody?.error?.description ||
            refundBody?.error?.code ||
            refundBody?.error?.reason ||
            '',
        )
          .toLowerCase()
          .includes('already');

      if (!refundRes.ok && !alreadyRefunded) {
        return errorResponse(
          req,
            refundBody?.error?.description ||
            refundBody?.error?.reason ||
            `Razorpay refund failed (${refundRes.status}). Order was not cancelled.`,
          502,
        );
      }
      refundId = String(refundBody?.id || '') || null;
    }

    const { data: cancelled, error: cancelError } = await userClient.rpc(
      'cancel_my_order',
      { p_order_id: orderId },
    );

    if (cancelError) {
      return errorResponse(
        req,
        cancelError.message ||
          'Refund may have succeeded but the order could not be cancelled. Contact the store.',
        500,
      );
    }

    return jsonResponse(req, {
      ok: true,
      orderId,
      status: cancelled?.status || 'Cancelled',
      paymentStatus: cancelled?.payment_status || order.payment_status,
      refundId,
    });
  } catch (err) {
    return errorResponse(
      req,
      err?.message || 'Unexpected cancel-customer-order error.',
      500,
    );
  }
});
