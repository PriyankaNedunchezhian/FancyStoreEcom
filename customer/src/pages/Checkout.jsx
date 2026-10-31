import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/money';

const EMPTY = { name: '', phone: '', email: '', address: '' };

export default function Checkout() {
  const { items, subtotal } = useCart();
  const [form, setForm] = useState(EMPTY);
  const [notice, setNotice] = useState('');

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

  function onSubmit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setNotice('Name, phone, and address are required on this form.');
      return;
    }
    setNotice('Checkout layout is ready. Placing the order will be connected in the next step. Your bag is unchanged.');
  }

  return (
    <div className="checkout">
      <header className="page-intro">
        <p className="kicker">Checkout</p>
        <h1>Delivery details</h1>
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
          {notice && <p className="form-notice">{notice}</p>}
          <button className="btn btn-dark" type="submit">Place order</button>
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
        </aside>
      </div>
    </div>
  );
}
