const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export function loadRazorpayScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay can only run in the browser.'));
  }
  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Razorpay));
      existing.addEventListener('error', () =>
        reject(new Error('Could not load Razorpay Checkout.')),
      );
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout.'));
    document.body.appendChild(script);
  });
}

/**
 * Opens Razorpay Checkout. Resolves with payment response or rejects on dismiss/failure.
 */
export async function openRazorpayCheckout({
  keyId,
  razorpayOrderId,
  amount,
  currency = 'INR',
  name,
  email,
  phone,
  description = 'Kumar Fancy Store',
}) {
  const Razorpay = await loadRazorpayScript();
  if (!Razorpay) {
    throw new Error('Razorpay Checkout is unavailable.');
  }

  return new Promise((resolve, reject) => {
    const options = {
      key: keyId,
      amount,
      currency,
      name: 'Kumar Fancy Store',
      description,
      order_id: razorpayOrderId,
      prefill: {
        name: name || '',
        email: email || '',
        contact: phone || '',
      },
      theme: {
        color: '#1a1a1a',
      },
      handler(response) {
        resolve(response);
      },
      modal: {
        ondismiss() {
          const err = new Error('Payment was cancelled.');
          err.code = 'payment_cancelled';
          reject(err);
        },
      },
    };

    const checkout = new Razorpay(options);
    checkout.on('payment.failed', (response) => {
      const err = new Error(
        response?.error?.description || 'Payment failed. Please try again.',
      );
      err.code = 'payment_failed';
      reject(err);
    });
    checkout.open();
  });
}
