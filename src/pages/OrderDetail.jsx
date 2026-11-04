import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import {
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_STATUSES,
  canEditOrder,
  getOrder,
  updateOrderStatus,
  updatePaymentStatus,
} from '../supabase/orders';
import OutlinedSelect from '../components/form/OutlinedSelect';
import AppButton from '../mui/components/AppButton';
import AppNotification from '../mui/components/AppNotification';
import './Products.css';
import './Orders.css';

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ACTION_LABELS = {
  Confirmed: 'Confirm',
  Shipped: 'Mark shipped',
  Delivered: 'Mark delivered',
  Cancelled: 'Cancel order',
};

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getOrder(id);
      if (!data) {
        setError('Order not found.');
        setOrder(null);
        return;
      }
      setOrder(data);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not load order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatus(nextStatus) {
    if (!order || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await updateOrderStatus(order.id, nextStatus);
      setOrder(updated);
      setNotice(`Order marked as ${nextStatus}.`);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not update status.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePaymentChange(e) {
    if (!order || busy) return;
    const value = e.target.value;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await updatePaymentStatus(order.id, value);
      setOrder(updated);
      setNotice(`Payment status set to ${value}.`);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not update payment status.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="order-detail-page">
        <div className="products-card">
          <p className="products-loading">Loading order…</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-detail-page">
        {error ? <p className="products-alert error">{error}</p> : null}
        <AppButton variant="outlined" component={Link} to="/orders">
          Back to orders
        </AppButton>
      </div>
    );
  }

  const nextStatuses = ORDER_STATUS_TRANSITIONS[order.status] || [];

  return (
    <div className="order-detail-page">
      <div className="order-detail-top">
        <Stack className="order-detail-meta" direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <IconButton
            component={Link}
            to="/orders"
            title="Back to orders"
            aria-label="Back to orders"
          >
            <ArrowBackIcon />
          </IconButton>
          <strong>Order #{order.orderId}</strong>
          <Chip size="small" label={order.status} />
          <Chip size="small" label={order.paymentStatus} />
        </Stack>
        <Stack className="order-detail-actions" direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {canEditOrder(order) ? (
            <Tooltip title="Edit order">
              <IconButton
                component={Link}
                to={`/orders/${order.id}/edit`}
                aria-label="Edit order"
              >
                <EditOutlinedIcon />
              </IconButton>
            </Tooltip>
          ) : null}
          {nextStatuses.map((status) => (
            <AppButton
              key={status}
              color={status === 'Cancelled' ? 'error' : 'primary'}
              disabled={busy}
              onClick={() => handleStatus(status)}
            >
              {ACTION_LABELS[status] || status}
            </AppButton>
          ))}
        </Stack>
      </div>

      <AppNotification inline severity="error" message={error} />
      <AppNotification inline severity="success" message={notice} />

      <div className="order-detail-grid">
        <section className="products-card">
          <div className="pf-section-head">
            <h2>Line items</h2>
            <p>{order.items.length} product line(s)</p>
          </div>
          {order.items.length === 0 ? (
            <p className="products-empty">No items on this order.</p>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Image</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Unit price</TableCell>
                    <TableCell>Line total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id || `${item.productId}-${item.productName}`} hover>
                      <TableCell>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="products-thumb"
                          />
                        ) : (
                          <span className="products-thumb placeholder">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="products-name">{item.productName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatMoney(item.unitPrice)}</TableCell>
                      <TableCell>{formatMoney(item.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <div className="order-totals">
            <div className="order-totals-row">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotal)}</span>
            </div>
            <div className="order-totals-row">
              <span>Discount</span>
              <span>{formatMoney(order.discountTotal)}</span>
            </div>
            <div className="order-totals-row">
              <span>Shipping</span>
              <span>
                {Number(order.shippingTotal) <= 0
                  ? 'Free'
                  : formatMoney(order.shippingTotal)}
              </span>
            </div>
            <div className="order-totals-row grand">
              <span>Total</span>
              <span>{formatMoney(order.total)}</span>
            </div>
          </div>
        </section>

        <aside className="products-card">
          <div className="pf-section-head">
            <h2>Customer & shipping</h2>
            <p>Contact details captured with this order.</p>
          </div>
          <dl className="order-info-list">
            <div>
              <dt>Name</dt>
              <dd>{order.customerName || '—'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{order.customerPhone || '—'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{order.customerEmail || '—'}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{order.shippingAddress || '—'}</dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{order.notes || '—'}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDate(order.createdAt)}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDate(order.updatedAt)}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>
                <OutlinedSelect
                  label="Payment status"
                  value={order.paymentStatus}
                  onChange={handlePaymentChange}
                  disabled={busy || order.status === 'Cancelled'}
                  options={PAYMENT_STATUSES}
                />
              </dd>
            </div>
            <div>
              <dt>Method</dt>
              <dd>
                {order.paymentMethod === 'razorpay'
                  ? 'Razorpay'
                  : order.paymentMethod === 'cod'
                    ? 'Cash on delivery'
                    : order.paymentMethod || '—'}
              </dd>
            </div>
            {(order.razorpayOrderId || order.razorpayPaymentId) && (
              <>
                <div>
                  <dt>Razorpay order</dt>
                  <dd>{order.razorpayOrderId || '—'}</dd>
                </div>
                <div>
                  <dt>Razorpay payment</dt>
                  <dd>{order.razorpayPaymentId || '—'}</dd>
                </div>
              </>
            )}
          </dl>
        </aside>
      </div>
    </div>
  );
}
