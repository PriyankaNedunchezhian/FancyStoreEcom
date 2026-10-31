import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyOrders, paymentMethodLabel } from '../supabase/orders';
import { formatPrice } from '../utils/money';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function Orders() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) {
      setOrders([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    getMyOrders()
      .then((rows) => {
        if (!cancelled) {
          setOrders(rows);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setOrders([]);
          setError(err.message || 'Could not load orders.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <p className="status-line">Loading your orders…</p>;
  }

  if (!user) {
    return (
      <div className="empty">
        <h1>Sign in to track orders</h1>
        <p>Guest checkouts still work — sign in before placing an order to see it here.</p>
        <Link className="btn btn-dark" to="/account">Sign in</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty">
        <h1>Orders could not load</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="empty">
        <h1>No orders yet</h1>
        <p>When you place an order while signed in, it will show up here.</p>
        <Link className="btn btn-dark" to="/shop">Shop jewellery</Link>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <header className="page-intro">
        <p className="kicker">Account</p>
        <h1>My orders</h1>
        <p>{orders.length} {orders.length === 1 ? 'order' : 'orders'}</p>
      </header>
      <ul className="orders-list">
        {orders.map((order) => (
          <li key={order.id}>
            <div>
              <p className="orders-id">Order #{order.orderId}</p>
              <p className="orders-meta">
                {formatDate(order.createdAt)} · {order.status} · {order.paymentStatus} ·{' '}
                {paymentMethodLabel(order.paymentMethod)}
              </p>
            </div>
            <div className="orders-side">
              <strong>{formatPrice(order.total)}</strong>
              <Link className="btn btn-line" to={`/orders/${order.id}`}>View</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
