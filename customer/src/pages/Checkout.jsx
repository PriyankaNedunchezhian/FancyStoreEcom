import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  MAX_ADDRESSES,
  createAddress,
  defaultAddress,
  listAddresses,
} from '../supabase/addresses';
import { placeOrder } from '../supabase/orders';
import { formatPrice } from '../utils/money';
import { payRazorpayOrder } from '../utils/payOrder';
import { getOrderTotal, getShippingTotal } from '../utils/shipping';

const EMPTY = { name: '', phone: '', email: '', address: '' };

function applySavedAddress(row, email = '') {
  if (!row) return null;
  return {
    name: row.recipientName || '',
    phone: row.phone || '',
    email,
    address: row.address || '',
  };
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const [form, setForm] = useState(EMPTY);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [saveAddress, setSaveAddress] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const shipping = getShippingTotal(subtotal);
  const total = getOrderTotal(subtotal);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setAddresses([]);
        setSelectedAddressId('');
        return;
      }

      setForm((current) => ({
        ...current,
        name: current.name || user.user_metadata?.full_name || '',
        phone: current.phone || user.user_metadata?.phone || '',
        email: current.email || user.email || '',
      }));

      try {
        const rows = await listAddresses();
        if (cancelled) return;
        setAddresses(rows);
        const preferred = defaultAddress(rows);
        if (preferred) {
          setSelectedAddressId(preferred.id);
          setForm((current) => ({
            ...current,
            ...applySavedAddress(preferred, user.email || current.email),
            email: user.email || current.email || '',
          }));
        }
      } catch {
        if (!cancelled) setAddresses([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const matchesSelected = useMemo(() => {
    if (!selectedAddressId) return false;
    const row = addresses.find((item) => item.id === selectedAddressId);
    if (!row) return false;
    return (
      form.name.trim() === row.recipientName.trim() &&
      form.phone.trim() === row.phone.trim() &&
      form.address.trim() === row.address.trim()
    );
  }, [addresses, form.address, form.name, form.phone, selectedAddressId]);

  const canSaveNewAddress =
    Boolean(user) &&
    addresses.length < MAX_ADDRESSES &&
    !matchesSelected &&
    form.name.trim() &&
    form.phone.trim() &&
    form.address.trim();

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
    if (field === 'name' || field === 'phone' || field === 'address') {
      setSelectedAddressId('');
    }
  }

  function onPickAddress(event) {
    const id = event.target.value;
    setSelectedAddressId(id);
    setSaveAddress(false);
    if (!id) return;
    const row = addresses.find((item) => item.id === id);
    if (!row) return;
    setForm((current) => ({
      ...current,
      ...applySavedAddress(row, user?.email || current.email),
      email: user?.email || current.email || '',
    }));
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

  async function maybeSaveAddress() {
    if (!saveAddress || !canSaveNewAddress) return;
    try {
      await createAddress({
        label: 'Checkout',
        recipientName: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        isDefault: addresses.length === 0,
      });
    } catch {
      // Order already placed; do not block confirmation on address save failure.
    }
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
      await maybeSaveAddress();

      if (paymentMethod === 'cod') {
        clear();
        navigate(`/order/${orderId}/confirmation`, {
          replace: true,
          state: { order: buildSnapshot(orderId, 'cod', 'Unpaid') },
        });
        return;
      }

      await payRazorpayOrder(orderId, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });

      clear();
      navigate(`/order/${orderId}/confirmation`, {
        replace: true,
        state: { order: buildSnapshot(orderId, 'razorpay', 'Paid') },
      });
    } catch (err) {
      if (err?.code === 'payment_cancelled' && placedOrderId) {
        setError(
          user
            ? `Order #${placedOrderId} is saved as Unpaid. Open My Orders and tap Pay when you are ready.`
            : `Order #${placedOrderId} was created but payment was not completed. Sign in before checkout next time so you can pay from My Orders, or contact the store.`,
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
        <p>
          Guests can place an order. Sign in to use saved addresses and track My Orders.
          {user ? (
            <>
              {' '}
              <Link to="/account">Manage addresses</Link>
            </>
          ) : null}
        </p>
      </header>
      <div className="checkout-grid">
        <form onSubmit={onSubmit}>
          {addresses.length > 0 && (
            <label>
              Deliver to
              <select value={selectedAddressId} onChange={onPickAddress}>
                <option value="">Enter a new address</option>
                {addresses.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                    {row.isDefault ? ' (default)' : ''} — {row.recipientName}
                  </option>
                ))}
              </select>
            </label>
          )}

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

          {canSaveNewAddress && (
            <label className="check-row">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(event) => setSaveAddress(event.target.checked)}
              />
              <span>Save this address to my account</span>
            </label>
          )}

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
