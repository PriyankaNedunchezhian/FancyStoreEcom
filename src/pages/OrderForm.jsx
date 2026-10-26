import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  canEditOrder,
  createOrder,
  getOrder,
  updateOrder,
} from '../supabase/orders';
import { getProducts } from '../supabase/products';
import './Products.css';
import './Orders.css';

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const emptyForm = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  shippingAddress: '',
  status: 'Pending',
  paymentStatus: 'Unpaid',
  discountTotal: '0',
  notes: '',
};

export default function OrderForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stockDeducted, setStockDeducted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const catalog = await getProducts();
        if (cancelled) return;
        setProducts(catalog.filter((p) => p.productStatus === 'Active'));

        if (isEdit) {
          const order = await getOrder(id);
          if (cancelled) return;
          if (!order) {
            setError('Order not found.');
            return;
          }
          if (!canEditOrder(order)) {
            setError(
              `Orders with status ${order.status} cannot be edited.`,
            );
            return;
          }
          setStockDeducted(Boolean(order.stockDeducted));
          setForm({
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerEmail: order.customerEmail,
            shippingAddress: order.shippingAddress,
            status: order.status,
            paymentStatus: order.paymentStatus,
            discountTotal: String(order.discountTotal ?? 0),
            notes: order.notes,
          });
          setItems(
            order.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
            })),
          );
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err?.message || 'Could not load form data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
      0,
    );
    const discount = Math.max(0, Number(form.discountTotal) || 0);
    return {
      subtotal,
      discountTotal: discount,
      total: Math.max(0, subtotal - discount),
    };
  }, [items, form.discountTotal]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addLineItem() {
    const pid = Number(productId);
    const quantity = Math.max(1, Math.floor(Number(qty) || 1));
    const product = products.find((p) => p.productId === pid);
    if (!product) {
      setError('Select a product to add.');
      return;
    }
    setError('');
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === pid);
      if (existing) {
        return prev.map((item) =>
          item.productId === pid
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.productId,
          productName: product.name,
          unitPrice: product.sellingPrice,
          quantity,
        },
      ];
    });
    setProductId('');
    setQty('1');
  }

  function removeLineItem(pid) {
    setItems((prev) => prev.filter((item) => item.productId !== pid));
  }

  function updateLineQty(pid, value) {
    const quantity = Math.max(1, Math.floor(Number(value) || 1));
    setItems((prev) =>
      prev.map((item) =>
        item.productId === pid ? { ...item, quantity } : item,
      ),
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.customerName.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (items.length === 0) {
      setError('Add at least one product line.');
      return;
    }

    const payload = {
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail,
      shippingAddress: form.shippingAddress,
      status: form.status,
      paymentStatus: form.paymentStatus,
      discountTotal: Number(form.discountTotal) || 0,
      notes: form.notes,
      items,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateOrder(id, payload);
        navigate(`/orders/${id}`);
      } else {
        const created = await createOrder(payload);
        navigate(`/orders/${created.id}`);
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not save order.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="order-form-page">
        <div className="products-card">
          <p className="products-loading">Loading…</p>
        </div>
      </div>
    );
  }

  const createStatuses = ORDER_STATUSES.filter(
    (s) => s === 'Pending' || s === 'Confirmed',
  );

  return (
    <div className="order-form-page">
      <div className="order-form-top">
        <Link
          to={isEdit ? `/orders/${id}` : '/orders'}
          className="products-btn secondary dtt-icon-only"
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft size={20} strokeWidth={2.25} aria-hidden="true" />
        </Link>
        <strong>{isEdit ? `Edit order #${id}` : 'Create order'}</strong>
      </div>

      {error ? <p className="products-alert error">{error}</p> : null}

      <form className="product-form" onSubmit={handleSubmit}>
        <section className="products-card pf-section">
          <div className="pf-section-head">
            <h2>Customer</h2>
            <p>Contact and delivery details.</p>
          </div>
          <div className="order-form-grid">
            <label className="order-form-field">
              <span>Customer name *</span>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => updateField('customerName', e.target.value)}
                required
              />
            </label>
            <label className="order-form-field">
              <span>Phone</span>
              <input
                type="text"
                value={form.customerPhone}
                onChange={(e) => updateField('customerPhone', e.target.value)}
              />
            </label>
            <label className="order-form-field">
              <span>Email</span>
              <input
                type="email"
                value={form.customerEmail}
                onChange={(e) => updateField('customerEmail', e.target.value)}
              />
            </label>
            <label className="order-form-field full">
              <span>Shipping address</span>
              <textarea
                rows={3}
                value={form.shippingAddress}
                onChange={(e) =>
                  updateField('shippingAddress', e.target.value)
                }
              />
            </label>
            <label className="order-form-field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                disabled={isEdit}
              >
                {(isEdit ? ORDER_STATUSES : createStatuses).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="order-form-field">
              <span>Payment</span>
              <select
                value={form.paymentStatus}
                onChange={(e) => updateField('paymentStatus', e.target.value)}
              >
                {PAYMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="order-form-field">
              <span>Discount (₹)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.discountTotal}
                onChange={(e) => updateField('discountTotal', e.target.value)}
              />
            </label>
            <label className="order-form-field full">
              <span>Notes</span>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
              />
            </label>
          </div>
          {isEdit ? (
            <p className="product-form-hint">
              Status changes happen on the order detail page (Confirm / Ship /
              Cancel).
            </p>
          ) : (
            <p className="product-form-hint">
              Creating as Confirmed deducts inventory immediately.
            </p>
          )}
        </section>

        <section className="products-card pf-section">
          <div className="pf-section-head">
            <h2>Products</h2>
            <p>Add catalog items and quantities.</p>
          </div>

          <div className="order-line-builder">
            {stockDeducted ? (
              <p className="product-form-hint">
                Stock already deducted — line items are locked. Cancel the order
                to restore inventory if you need different products.
              </p>
            ) : null}
            <div className="order-line-add">
              <label>
                Product
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  disabled={stockDeducted}
                >
                  <option value="">Select product…</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.productId}>
                      {product.name} — {formatMoney(product.sellingPrice)} (qty{' '}
                      {product.availableQuantity})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Qty
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  disabled={stockDeducted}
                />
              </label>
              <button
                type="button"
                className="products-btn secondary dtt-icon-only"
                title="Add line"
                aria-label="Add line"
                disabled={stockDeducted}
                onClick={addLineItem}
              >
                <Plus size={20} strokeWidth={2.25} aria-hidden="true" />
              </button>
            </div>

            {items.length === 0 ? (
              <p className="products-empty">No line items yet.</p>
            ) : (
              <div className="products-table-wrap">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Unit price</th>
                      <th>Qty</th>
                      <th>Line total</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.productId}>
                        <td className="products-name">{item.productName}</td>
                        <td>{formatMoney(item.unitPrice)}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineQty(item.productId, e.target.value)
                            }
                            style={{ width: '5rem' }}
                            disabled={stockDeducted}
                          />
                        </td>
                        <td>
                          {formatMoney(item.unitPrice * item.quantity)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="products-btn danger dtt-icon-only"
                            title="Remove"
                            aria-label={`Remove ${item.productName}`}
                            disabled={stockDeducted}
                            onClick={() => removeLineItem(item.productId)}
                          >
                            <Trash2
                              size={18}
                              strokeWidth={2.25}
                              aria-hidden="true"
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="order-totals">
              <div className="order-totals-row">
                <span>Subtotal</span>
                <span>{formatMoney(totals.subtotal)}</span>
              </div>
              <div className="order-totals-row">
                <span>Discount</span>
                <span>{formatMoney(totals.discountTotal)}</span>
              </div>
              <div className="order-totals-row grand">
                <span>Total</span>
                <span>{formatMoney(totals.total)}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="order-form-actions">
          <Link
            to={isEdit ? `/orders/${id}` : '/orders'}
            className="products-btn secondary"
          >
            Cancel
          </Link>
          <button type="submit" className="products-btn" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update order' : 'Create order'}
          </button>
        </div>
      </form>
    </div>
  );
}
