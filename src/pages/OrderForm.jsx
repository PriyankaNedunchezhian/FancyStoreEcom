import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  canEditOrder,
  createOrder,
  getOrder,
  updateOrder,
} from '../supabase/orders';
import { getProducts } from '../supabase/products';
import OutlinedTextField from '../components/form/OutlinedTextField';
import OutlinedSelect from '../components/form/OutlinedSelect';
import OutlinedTextarea from '../components/form/OutlinedTextarea';
import AppAutocomplete from '../mui/components/AppAutocomplete';
import AppButton from '../mui/components/AppButton';
import AppNotification from '../mui/components/AppNotification';
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
        <IconButton
          component={Link}
          to={isEdit ? `/orders/${id}` : '/orders'}
          title="Back"
          aria-label="Back"
        >
          <ArrowBackIcon />
        </IconButton>
        <strong>{isEdit ? `Edit order #${id}` : 'Create order'}</strong>
      </div>

      <AppNotification inline severity="error" message={error} />

      <form className="product-form" onSubmit={handleSubmit}>
        <section className="products-card pf-section">
          <div className="pf-section-head">
            <h2>Customer</h2>
            <p>Contact and delivery details.</p>
          </div>
          <div className="order-form-grid">
            <OutlinedTextField
              label="Customer name"
              value={form.customerName}
              onChange={(e) => updateField('customerName', e.target.value)}
              required
            />
            <OutlinedTextField
              label="Phone"
              value={form.customerPhone}
              onChange={(e) => updateField('customerPhone', e.target.value)}
            />
            <OutlinedTextField
              label="Email"
              type="email"
              value={form.customerEmail}
              onChange={(e) => updateField('customerEmail', e.target.value)}
            />
            <OutlinedTextarea
              className="full"
              label="Shipping address"
              rows={3}
              value={form.shippingAddress}
              onChange={(e) => updateField('shippingAddress', e.target.value)}
            />
            <OutlinedSelect
              label="Status"
              value={form.status}
              onChange={(e) => updateField('status', e.target.value)}
              disabled={isEdit}
              options={isEdit ? ORDER_STATUSES : createStatuses}
            />
            <OutlinedSelect
              label="Payment"
              value={form.paymentStatus}
              onChange={(e) => updateField('paymentStatus', e.target.value)}
              options={PAYMENT_STATUSES}
            />
            <OutlinedTextField
              label="Discount (₹)"
              type="number"
              min="0"
              step="0.01"
              value={form.discountTotal}
              onChange={(e) => updateField('discountTotal', e.target.value)}
            />
            <OutlinedTextarea
              className="full"
              label="Notes"
              rows={2}
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
            />
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
              <AppAutocomplete
                label="Product"
                placeholder="Search products…"
                options={products}
                value={products.find((product) => String(product.productId) === String(productId)) || null}
                onChange={(next) => setProductId(next?.productId ? String(next.productId) : '')}
                getOptionLabel={(option) =>
                  option?.name
                    ? `${option.name} — ${formatMoney(option.sellingPrice)} (qty ${option.availableQuantity})`
                    : ''
                }
                isOptionEqualToValue={(option, selected) =>
                  String(option?.productId) === String(selected?.productId)
                }
                disabled={stockDeducted}
              />
              <OutlinedTextField
                label="Qty"
                type="number"
                min="1"
                step="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                disabled={stockDeducted}
              />
              <Tooltip title="Add line">
                <span>
                  <IconButton
                    aria-label="Add line"
                    disabled={stockDeducted}
                    onClick={addLineItem}
                  >
                    <AddIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </div>

            {items.length === 0 ? (
              <p className="products-empty">No line items yet.</p>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Unit price</TableCell>
                      <TableCell>Qty</TableCell>
                      <TableCell>Line total</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.productId} hover>
                        <TableCell className="products-name">{item.productName}</TableCell>
                        <TableCell>{formatMoney(item.unitPrice)}</TableCell>
                        <TableCell>
                          <OutlinedTextField
                            label="Qty"
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineQty(item.productId, e.target.value)
                            }
                            disabled={stockDeducted}
                            className="order-qty-field"
                          />
                        </TableCell>
                        <TableCell>
                          {formatMoney(item.unitPrice * item.quantity)}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Remove">
                            <span>
                              <IconButton
                                color="error"
                                aria-label={`Remove ${item.productName}`}
                                disabled={stockDeducted}
                                onClick={() => removeLineItem(item.productId)}
                              >
                                <DeleteOutlineOutlinedIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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
          <AppButton
            variant="outlined"
            component={Link}
            to={isEdit ? `/orders/${id}` : '/orders'}
          >
            Cancel
          </AppButton>
          <AppButton type="submit" loading={saving}>
            {isEdit ? 'Update order' : 'Create order'}
          </AppButton>
        </div>
      </form>
    </div>
  );
}
