import { notifyOrder } from '../supabase/notifyOrder';
import { createRazorpayOrder, verifyRazorpayPayment } from '../supabase/payments';
import { openRazorpayCheckout } from './razorpay';

export function canPayRazorpayOrder(order) {
  if (!order) return false;
  return (
    order.paymentMethod === 'razorpay' &&
    order.paymentStatus === 'Unpaid' &&
    order.status !== 'Cancelled'
  );
}

/**
 * Opens Razorpay for an existing store order and marks it Paid after verify.
 */
export async function payRazorpayOrder(orderId, prefill = {}) {
  const id = Number(orderId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('A valid order id is required.');
  }

  const session = await createRazorpayOrder(id);
  const keyId = session.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new Error('Razorpay key is missing. Set VITE_RAZORPAY_KEY_ID or function secrets.');
  }

  const payment = await openRazorpayCheckout({
    keyId,
    razorpayOrderId: session.razorpayOrderId,
    amount: session.amount,
    currency: session.currency,
    name: prefill.name || session.name || '',
    email: prefill.email || session.email || '',
    phone: prefill.phone || session.phone || '',
    description: `Order #${id}`,
    preferredMethod: prefill.preferredMethod || 'upi',
  });

  const result = await verifyRazorpayPayment({
    orderId: id,
    razorpayOrderId: payment.razorpay_order_id || session.razorpayOrderId,
    razorpayPaymentId: payment.razorpay_payment_id,
    razorpaySignature: payment.razorpay_signature,
  });
  await notifyOrder(id, 'placed');
  return result;
}
