import { supabase } from './config';

function throwPaymentError(message, code = 'payment_error') {
  const err = new Error(message || 'Payment request failed.');
  err.code = code;
  throw err;
}

async function postLocal(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    throwPaymentError(data?.error || `Payment request failed (${response.status}).`);
  }
  return data;
}

function useLocalPaymentApi() {
  // Local Vite middleware — works without deployed Edge Functions during npm run dev.
  return import.meta.env.DEV;
}

export async function createRazorpayOrder(orderId) {
  if (useLocalPaymentApi()) {
    const data = await postLocal('/api/razorpay/create-order', {
      orderId: Number(orderId),
    });
    return {
      keyId: data.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || '',
      razorpayOrderId: data.razorpayOrderId,
      amount: data.amount,
      currency: data.currency || 'INR',
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      orderId: data.orderId ?? Number(orderId),
    };
  }

  const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
    body: { orderId: Number(orderId) },
  });
  if (error || data?.error) {
    throwPaymentError(
      data?.error ||
        error?.message ||
        'Could not start online payment. Deploy Edge Functions for production.',
    );
  }

  return {
    keyId: data.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || '',
    razorpayOrderId: data.razorpayOrderId,
    amount: data.amount,
    currency: data.currency || 'INR',
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    orderId: data.orderId ?? Number(orderId),
  };
}

export async function verifyRazorpayPayment({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) {
  if (useLocalPaymentApi()) {
    const data = await postLocal('/api/razorpay/verify', {
      orderId: Number(orderId),
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
    return {
      ok: Boolean(data?.ok ?? true),
      orderId: data?.orderId ?? Number(orderId),
      paymentStatus: data?.paymentStatus || 'Paid',
      alreadyPaid: Boolean(data?.alreadyPaid),
    };
  }

  const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
    body: {
      orderId: Number(orderId),
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    },
  });
  if (error || data?.error) {
    throwPaymentError(data?.error || error?.message || 'Could not verify payment.');
  }

  return {
    ok: Boolean(data?.ok),
    orderId: data?.orderId ?? Number(orderId),
    paymentStatus: data?.paymentStatus || 'Paid',
    alreadyPaid: Boolean(data?.alreadyPaid),
  };
}
