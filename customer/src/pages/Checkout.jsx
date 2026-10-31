import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { placeOrder } from '../supabase/orders';
import { formatPrice } from '../utils/money';

const EMPTY = { name: '', phone: '', email: '', address: '' };

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('Name, phone, and address are required.');
      return;
    }

    setBusy(true);
    try {
      const orderId = await placeOrder({
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        paymentMethod: 'cod',
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.qty,
        })),
      });

      const snapshot = {
        orderId,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        paymentMethod: 'cod',
        subtotal,
        total: subtotal,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          price: item.price,
        })),
      };

      clear();
      navigate(`/order/${orderId}/confirmation`, { replace: true, state: { order: snapshot } });
    } catch (err) {
      setError(err.message || 'Could not place the order.');
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
            <label className="pay-option on">
              <input type="radio" name="payment" checked readOnly />
              <span>
                <strong>Cash on delivery</strong>
                <small>Pay when the order arrives. Unpaid until then.</small>
              </span>
            </label>
            <label className="pay-option disabled">
              <input type="radio" name="payment" disabled />
              <span>
                <strong>Online payment</strong>
                <small>Coming soon</small>
              </span>
            </label>
          </fieldset>

          {error && <p className="form-notice">{error}</p>}
          <button className="btn btn-dark" type="submit" disabled={busy}>
            {busy ? 'Placing order…' : 'Place order'}
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
          <p><span>Payment</span><strong>COD</strong></p>
        </aside>
      </div>
    </div>
  );
}
