import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { useAuth } from '../context/AuthContext';
import AppButton from '../mui/components/AppButton';
import AppDialog from '../mui/components/AppDialog';
import {
  canCancelOrder,
  cancelMyOrder,
  getMyOrder,
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payError, setPayError] = useState('');
  const [paying, setPaying] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) {
      setOrder(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    getMyOrder(id)
      .then((row) => {
        if (!cancelled) {
          setOrder(row);
          setError(row ? '' : 'This order was not found on your account.');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setOrder(null);
          setError(err.message || 'Could not load this order.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading]);

  async function onPay() {
    if (!order) return;
    setPayError('');
    setPaying(true);
    try {
      await payRazorpayOrder(order.orderId, {
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
      });
      const refreshed = await getMyOrder(id);
      setOrder(refreshed || { ...order, paymentStatus: 'Paid' });
    } catch (err) {
      if (err?.code !== 'payment_cancelled') {
        setPayError(err.message || 'Could not complete payment.');
      }
    } finally {
      setPaying(false);
    }
  }

  async function onCancel() {
    if (!order || !canCancelOrder(order)) return;
    setCancelOpen(true);
  }

  async function confirmCancel() {
    if (!order) return;
    setCancelOpen(false);
    setCancelError('');
    setCancelling(true);
    try {
      const refreshed = await cancelMyOrder(order);
      setOrder(refreshed || { ...order, status: 'Cancelled' });
    } catch (err) {
      setCancelError(err.message || 'Could not cancel this order.');
    } finally {
      setCancelling(false);
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
        <h1>Sign in to see this order</h1>
        <AppButton component={Link} to="/account">Sign in</AppButton>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="empty">
        <h1>Order not found</h1>
        <p>{error || 'This order is not linked to your account.'}</p>
        <AppButton component={Link} to="/orders">Back to orders</AppButton>
      </div>
    );
  }

  const canPay = canPayRazorpayOrder(order);
  const canCancel = canCancelOrder(order);
  const actionBusy = paying || cancelling;

  return (
    <div className="order-detail">
      <Breadcrumbs className="crumb" sx={{ mb: 2 }}>
        <Link to="/orders">My orders</Link>
        <span>#{order.orderId}</span>
      </Breadcrumbs>
      <header className="page-intro">
        <p className="kicker">Order #{order.orderId}</p>
        <h1>{order.status}</h1>
        <p>
          Placed {formatDate(order.createdAt)} · {order.paymentStatus} ·{' '}
          {paymentMethodLabel(order.paymentMethod)}
        </p>
      </header>

      {(canPay || canCancel) && (
        <Stack className="hero-actions" direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {canPay && (
            <AppButton onClick={onPay} loading={paying} disabled={actionBusy}>
              Pay now
            </AppButton>
          )}
          {canCancel && (
            <AppButton variant="outlined" onClick={onCancel} loading={cancelling} disabled={actionBusy}>
              Cancel order
            </AppButton>
          )}
        </Stack>
      )}
      {payError ? <Alert severity="error" sx={{ mb: 2 }}>{payError}</Alert> : null}
      {cancelError ? <Alert severity="error" sx={{ mb: 2 }}>{cancelError}</Alert> : null}

      <div className="checkout-grid">
        <div>
          <h2 className="section-title">Items</h2>
          <ul className="bag-list">
            {order.items.map((item) => (
              <li key={item.id}>
                <div className={item.imageUrl ? 'bag-art has-photo' : 'bag-art'}>
                  {item.imageUrl ? <img src={item.imageUrl} alt="" /> : null}
                </div>
                <div className="bag-info">
                  <h2>
                    <Link to={`/product/${item.productId}`}>{item.productName}</Link>
                  </h2>
                  <p className="price">
                    {formatPrice(item.unitPrice)} × {item.quantity}
                  </p>
                </div>
                <p className="line-total">{formatPrice(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
        </div>
        <aside className="summary">
          <h2>Delivery</h2>
          <p className="summary-block">
            {order.customerName}
            <br />
            {order.customerPhone}
            {order.customerEmail ? (
              <>
                <br />
                {order.customerEmail}
              </>
            ) : null}
            <br />
            {order.shippingAddress}
          </p>
          <p><span>Subtotal</span><strong>{formatPrice(order.subtotal)}</strong></p>
          {order.discountTotal > 0 && (
            <p><span>Discount</span><strong>−{formatPrice(order.discountTotal)}</strong></p>
          )}
          <p>
            <span>Shipping</span>
            <strong>
              {Number(order.shippingTotal) <= 0 ? 'Free' : formatPrice(order.shippingTotal)}
            </strong>
          </p>
          <p><span>Total</span><strong>{formatPrice(order.total)}</strong></p>
          <p>
            <span>Payment</span>
            <strong>
              {paymentMethodLabel(order.paymentMethod)} · {order.paymentStatus}
            </strong>
          </p>
          {canPay && (
            <AppButton fullWidth onClick={onPay} loading={paying} disabled={actionBusy}>
              Pay now
            </AppButton>
          )}
          {canCancel && (
            <AppButton fullWidth variant="outlined" onClick={onCancel} loading={cancelling} disabled={actionBusy}>
              Cancel order
            </AppButton>
          )}
          <AppButton fullWidth variant="outlined" component={Link} to="/shop">
            Continue shopping
          </AppButton>
        </aside>
      </div>
      <AppDialog
        open={cancelOpen}
        title={`Cancel order #${order.orderId}?`}
        message={
          order.paymentStatus === 'Paid' && order.paymentMethod === 'razorpay'
            ? 'Your Razorpay payment will be refunded. This cannot be undone.'
            : 'This cannot be undone.'
        }
        confirmLabel="Cancel order"
        danger
        onConfirm={confirmCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  );
}
