import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { useAuth } from '../context/AuthContext';
import AppButton from '../mui/components/AppButton';
import AppDialog from '../mui/components/AppDialog';
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
  const [cancelTarget, setCancelTarget] = useState(null);

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
    setCancelTarget(order);
  }

  async function confirmCancel() {
    const order = cancelTarget;
    setCancelTarget(null);
    if (!order) return;

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
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!user) {
    return (
      <div className="empty">
        <h1>Sign in to track orders</h1>
        <p>Guest checkouts still work — sign in before placing an order to see it here.</p>
        <AppButton component={Link} to="/account">Sign in</AppButton>
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
        <AppButton component={Link} to="/shop">Shop jewellery</AppButton>
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
      {payError ? <Alert severity="error" sx={{ mb: 2 }}>{payError}</Alert> : null}
      {cancelError ? <Alert severity="error" sx={{ mb: 2 }}>{cancelError}</Alert> : null}
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
              <Stack className="orders-side" direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <strong>{formatPrice(order.total)}</strong>
                {canPay && (
                  <AppButton
                    size="small"
                    disabled={listBusy}
                    loading={payingId === String(order.orderId)}
                    onClick={() => onPay(order)}
                  >
                    Pay
                  </AppButton>
                )}
                {canCancel && (
                  <AppButton
                    size="small"
                    variant="outlined"
                    disabled={listBusy}
                    loading={cancellingId === String(order.orderId)}
                    onClick={() => onCancel(order)}
                  >
                    Cancel
                  </AppButton>
                )}
                <AppButton size="small" variant="outlined" component={Link} to={`/orders/${order.id}`}>
                  View
                </AppButton>
              </Stack>
            </li>
          );
        })}
      </ul>
      <AppDialog
        open={Boolean(cancelTarget)}
        title={`Cancel order #${cancelTarget?.orderId}?`}
        message={
          cancelTarget?.paymentStatus === 'Paid' && cancelTarget?.paymentMethod === 'razorpay'
            ? 'Your Razorpay payment will be refunded. This cannot be undone.'
            : 'This cannot be undone.'
        }
        confirmLabel="Cancel order"
        danger
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
