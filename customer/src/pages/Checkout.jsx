import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { placeOrder } from '../supabase/orders';
import { createRazorpayOrder, verifyRazorpayPayment } from '../supabase/payments';
import { formatPrice } from '../utils/money';
import { openRazorpayCheckout } from '../utils/razorpay';
import { getOrderTotal, getShippingTotal } from '../utils/shipping';

const EMPTY = { name: '', phone: '', email: '', address: '' };

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const [form, setForm] = useState(EMPTY);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const shipping = getShippingTotal(subtotal);
  const total = getOrderTotal(subtotal);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      name: current.name || user.user_metadata?.full_name || '',
      email: current.email || user.email || '',
    }));
  }, [user]);

  if (items.length === 0) {
    return (
      <div className="empty">
        <h1>Nothing to check out</h1>
        <p>Add a piece to your bag first.</p>
        <Link className="btn btn-dark" to="/shop">Shop jewellery</Link>
      </div>
    );
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildSnapshot(orderId, method, paymentStatus) {
    return {
      orderId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      paymentMethod: method,
      paymentStatus,
      subtotal,
      shippingTotal: shipping,
      total,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        price: item.price,
      })),
    };
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('Name, phone, and address are required.');
      return;
    }
    if (paymentMethod === 'razorpay' && !form.email.trim()) {
      setError('Email is required for online payment.');
      return;
    }

    setBusy(true);
    let placedOrderId = null;
    try {
      const orderId = await placeOrder({
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        paymentMethod,
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.qty,
        })),
      });
      placedOrderId = orderId;

      if (paymentMethod === 'cod') {
        clear();
        navigate(`/order/${orderId}/confirmation`, {
          replace: true,
          state: { order: buildSnapshot(orderId, 'cod', 'Unpaid') },
        });
        return;
      }

      const session = await createRazorpayOrder(orderId);
      const keyId = session.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!keyId) {
        throw new Error('Razorpay key is missing. Set VITE_RAZORPAY_KEY_ID or function secrets.');
      }

      const payment = await openRazorpayCheckout({
        keyId,
        razorpayOrderId: session.razorpayOrderId,
        amount: session.amount,
        currency: session.currency,
        name: session.name || form.name.trim(),
        email: session.email || form.email.trim(),
        phone: session.phone || form.phone.trim(),
        description: `Order #${orderId}`,
      });

      await verifyRazorpayPayment({
        orderId,
        razorpayOrderId: payment.razorpay_order_id || session.razorpayOrderId,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature,
      });

      clear();
      navigate(`/order/${orderId}/confirmation`, {
        replace: true,
        state: { order: buildSnapshot(orderId, 'razorpay', 'Paid') },
      });
    } catch (err) {
      if (err?.code === 'payment_cancelled' && placedOrderId) {
        setError(
          `Order #${placedOrderId} was created but payment was not completed. You can pay from My Orders later, or contact the store.`,
        );
      } else {
        setError(err.message || 'Could not place the order.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="checkout">
      <header className="page-intro">
        <p className="kicker">Checkout</p>
        <h1>Delivery details</h1>
        <p>Guests can place an order. Sign in if you want it saved under My Orders.</p>
      </header>
      <div className="checkout-grid">
        <form onSubmit={onSubmit}>
          <label>
            Full name
            <input value={form.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" />
          </label>
          <label>
            Address
            <textarea rows={4} value={form.address} onChange={(event) => update('address', event.target.value)} />
          </label>

          <fieldset className="pay-methods">
            <legend>Payment</legend>
            <label className={`pay-option${paymentMethod === 'cod' ? ' on' : ''}`}>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
              />
              <span>
                <strong>Cash on delivery</strong>
                <small>Pay when the order arrives. Unpaid until then.</small>
              </span>
            </label>
            <label className={`pay-option${paymentMethod === 'razorpay' ? ' on' : ''}`}>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'razorpay'}
                onChange={() => setPaymentMethod('razorpay')}
              />
              <span>
                <strong>Online payment</strong>
                <small>Pay now securely with Razorpay (UPI, cards, wallets).</small>
              </span>
            </label>
          </fieldset>

          {error && <p className="form-notice">{error}</p>}
          <button className="btn btn-dark" type="submit" disabled={busy}>
            {busy
              ? paymentMethod === 'razorpay'
                ? 'Opening payment…'
                : 'Placing order…'
              : paymentMethod === 'razorpay'
                ? 'Pay now'
                : 'Place order'}
          </button>
        </form>
        <aside className="summary">
          <h2>Your bag</h2>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <span>{item.name} × {item.qty}</span>
                <strong>{formatPrice(item.price * item.qty)}</strong>
              </li>
            ))}
          </ul>
          <p><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p>
          <p>
            <span>Shipping</span>
            <strong>{shipping <= 0 ? 'Free' : formatPrice(shipping)}</strong>
          </p>
          <p><span>Total</span><strong>{formatPrice(total)}</strong></p>
          <p>
            <span>Payment</span>
            <strong>{paymentMethod === 'razorpay' ? 'Online' : 'COD'}</strong>
          </p>
        </aside>
      </div>
    </div>
  );
}
