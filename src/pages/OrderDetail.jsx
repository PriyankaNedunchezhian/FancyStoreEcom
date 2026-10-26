import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import {
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_STATUSES,
  canEditOrder,
  getOrder,
  updateOrderStatus,
  updatePaymentStatus,
} from '../supabase/orders';
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

function statusClass(status) {
  return String(status || '')
    .toLowerCase()
    .replace(/\s+/g, '-');
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
        <Link to="/orders" className="products-btn secondary">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const nextStatuses = ORDER_STATUS_TRANSITIONS[order.status] || [];

  return (
    <div className="order-detail-page">
      <div className="order-detail-top">
        <div className="order-detail-meta">
          <Link
            to="/orders"
            className="products-btn secondary dtt-icon-only"
            title="Back to orders"
            aria-label="Back to orders"
          >
            <ArrowLeft size={20} strokeWidth={2.25} aria-hidden="true" />
          </Link>
          <strong>Order #{order.orderId}</strong>
          <span
            className={`products-badge orders-badge ${statusClass(order.status)}`}
          >
            {order.status}
          </span>
          <span
            className={`products-badge orders-badge ${statusClass(order.paymentStatus)}`}
          >
            {order.paymentStatus}
          </span>
        </div>
        <div className="order-detail-actions">
          {canEditOrder(order) ? (
            <Link
              to={`/orders/${order.id}/edit`}
              className="products-btn secondary dtt-icon-only"
              title="Edit order"
              aria-label="Edit order"
            >
              <Pencil size={20} strokeWidth={2.25} aria-hidden="true" />
            </Link>
          ) : null}
          {nextStatuses.map((status) => (
            <button
              key={status}
              type="button"
              className={`products-btn${status === 'Cancelled' ? ' danger' : ''}`}
              disabled={busy}
              onClick={() => handleStatus(status)}
            >
              {ACTION_LABELS[status] || status}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="products-alert error">{error}</p> : null}
      {notice ? <p className="products-alert success">{notice}</p> : null}

      <div className="order-detail-grid">
        <section className="products-card">
          <div className="pf-section-head">
            <h2>Line items</h2>
            <p>{order.items.length} product line(s)</p>
          </div>
          {order.items.length === 0 ? (
            <p className="products-empty">No items on this order.</p>
          ) : (
            <div className="products-table-wrap">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id || `${item.productId}-${item.productName}`}>
                      <td>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="products-thumb"
                          />
                        ) : (
                          <span className="products-thumb placeholder">N/A</span>
                        )}
                      </td>
                      <td className="products-name">{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{formatMoney(item.unitPrice)}</td>
                      <td>{formatMoney(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                <select
                  value={order.paymentStatus}
                  onChange={handlePaymentChange}
                  disabled={busy || order.status === 'Cancelled'}
                >
                  {PAYMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
