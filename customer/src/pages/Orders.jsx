import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  canCancelOrder,
  cancelMyOrder,
  getMyOrders,
  paymentMethodLabel,
} from '../supabase/orders';
import { formatPrice } from '../utils/money';
import { canPayRazorpayOrder, payRazorpayOrder } from '../utils/payOrder';

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
  const [payingId, setPayingId] = useState('');
  const [payError, setPayError] = useState('');
  const [cancellingId, setCancellingId] = useState('');
  const [cancelError, setCancelError] = useState('');

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

  async function onPay(order) {
    setPayError('');
    setCancelError('');
    setPayingId(String(order.orderId));
    try {
      await payRazorpayOrder(order.orderId, {
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
      });
      setOrders((current) =>
        current.map((row) =>
          row.orderId === order.orderId
            ? { ...row, paymentStatus: 'Paid' }
            : row,
        ),
      );
    } catch (err) {
      if (err?.code !== 'payment_cancelled') {
        setPayError(err.message || 'Could not complete payment.');
      }
    } finally {
      setPayingId('');
    }
  }

  async function onCancel(order) {
    if (!canCancelOrder(order)) return;
    const paidNote =
      order.paymentStatus === 'Paid' && order.paymentMethod === 'razorpay'
        ? ' Your Razorpay payment will be refunded.'
        : '';
    const ok = window.confirm(
      `Cancel order #${order.orderId}?${paidNote} This cannot be undone.`,
    );
    if (!ok) return;

    setCancelError('');
    setPayError('');
    setCancellingId(String(order.orderId));
    try {
      const refreshed = await cancelMyOrder(order);
      setOrders((current) =>
        current.map((row) =>
          row.orderId === order.orderId
            ? refreshed || { ...row, status: 'Cancelled' }
            : row,
        ),
      );
    } catch (err) {
      setCancelError(err.message || 'Could not cancel this order.');
    } finally {
      setCancellingId('');
    }
  }

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
      {payError && <p className="form-notice">{payError}</p>}
      {cancelError && <p className="form-notice">{cancelError}</p>}
      <ul className="orders-list">
        {orders.map((order) => {
          const canPay = canPayRazorpayOrder(order);
          const canCancel = canCancelOrder(order);
          const listBusy = Boolean(payingId || cancellingId);
          return (
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
                {canPay && (
                  <button
                    className="btn btn-dark"
                    type="button"
                    disabled={listBusy}
                    onClick={() => onPay(order)}
                  >
                    {payingId === String(order.orderId) ? 'Opening…' : 'Pay'}
                  </button>
                )}
                {canCancel && (
                  <button
                    className="btn btn-line"
                    type="button"
                    disabled={listBusy}
                    onClick={() => onCancel(order)}
                  >
                    {cancellingId === String(order.orderId) ? 'Cancelling…' : 'Cancel'}
                  </button>
                )}
                <Link className="btn btn-line" to={`/orders/${order.id}`}>View</Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
