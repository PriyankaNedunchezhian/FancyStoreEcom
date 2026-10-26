import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  IndianRupee,
  Package,
  ShoppingBag,
} from 'lucide-react';
import { buildDashboardMetrics } from '../supabase/dashboard';
import { getOrders, ORDER_STATUSES } from '../supabase/orders';
import { getProducts } from '../supabase/products';
import { getWishlistOverview } from '../supabase/wishlist';
import './Products.css';
import './Orders.css';
import './Dashboard.css';

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

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [orderList, productList, wishList] = await Promise.all([
        getOrders(),
        getProducts(),
        getWishlistOverview(),
      ]);
      setOrders(orderList || []);
      setProducts(productList || []);
      setWishlist(wishList || []);
    } catch (err) {
      setError(err?.message || 'Failed to load overview.');
      setOrders([]);
      setProducts([]);
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(
    () => buildDashboardMetrics({ orders, products, wishlist }),
    [orders, products, wishlist],
  );

  if (loading) {
    return (
      <div className="products-page dash-page">
        <p className="products-loading">Loading overview…</p>
      </div>
    );
  }

  return (
    <div className="products-page dash-page">
      {error ? (
        <p className="products-alert error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="dash-kpi-grid" aria-label="Key metrics">
        <article className="products-card dash-kpi">
          <div className="dash-kpi-icon" aria-hidden="true">
            <ShoppingBag size={16} strokeWidth={2.25} />
          </div>
          <div className="dash-kpi-body">
            <p className="dash-kpi-label">Orders (7d)</p>
            <p className="dash-kpi-value">{metrics.kpis.orders7d}</p>
          </div>
        </article>
        <article className="products-card dash-kpi">
          <div className="dash-kpi-icon" aria-hidden="true">
            <IndianRupee size={16} strokeWidth={2.25} />
          </div>
          <div className="dash-kpi-body">
            <p className="dash-kpi-label">Revenue (7d)</p>
            <p className="dash-kpi-value">
              {formatMoney(metrics.kpis.revenue7d)}
            </p>
          </div>
        </article>
        <article className="products-card dash-kpi">
          <div className="dash-kpi-icon" aria-hidden="true">
            <Package size={16} strokeWidth={2.25} />
          </div>
          <div className="dash-kpi-body">
            <p className="dash-kpi-label">Active products</p>
            <p className="dash-kpi-value">{metrics.kpis.activeProducts}</p>
          </div>
        </article>
        <article className="products-card dash-kpi">
          <div className="dash-kpi-icon" aria-hidden="true">
            <Heart size={16} strokeWidth={2.25} />
          </div>
          <div className="dash-kpi-body">
            <p className="dash-kpi-label">Wishlist saves</p>
            <p className="dash-kpi-value">{metrics.kpis.wishlistSaves}</p>
          </div>
        </article>
      </section>

      <section className="dash-split">
        <article className="products-card dash-panel">
          <div className="dash-panel-head">
            <h2>Order pipeline</h2>
            <Link to="/orders" className="dash-link">
              View orders
            </Link>
          </div>
          <ul className="dash-pipeline">
            {ORDER_STATUSES.map((status) => {
              const count = metrics.statusCounts[status] || 0;
              const pct = Math.round(
                (count / metrics.pipelineMax) * 100,
              );
              return (
                <li key={status} className="dash-pipeline-row">
                  <div className="dash-pipeline-meta">
                    <span
                      className={`products-badge orders-badge ${statusClass(status)}`}
                    >
                      {status}
                    </span>
                    <strong>{count}</strong>
                  </div>
                  <div
                    className="dash-bar-track"
                    role="presentation"
                    aria-hidden="true"
                  >
                    <div
                      className={`dash-bar-fill status-${statusClass(status)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="products-card dash-panel">
          <div className="dash-panel-head">
            <h2>Inventory health</h2>
            <Link to="/products" className="dash-link">
              View products
            </Link>
          </div>
          <ul className="dash-stat-list">
            <li>
              <span>Active</span>
              <strong>{metrics.inventory.active}</strong>
            </li>
            <li>
              <span>Inactive</span>
              <strong>{metrics.inventory.inactive}</strong>
            </li>
            <li>
              <span>Out of stock</span>
              <strong className="dash-warn">
                {metrics.inventory.outOfStock}
              </strong>
            </li>
            <li>
              <span>Low stock (≤{metrics.inventory.threshold})</span>
              <strong className="dash-warn">
                {metrics.inventory.lowStock}
              </strong>
            </li>
            <li>
              <span>Catalog total</span>
              <strong>{metrics.inventory.total}</strong>
            </li>
          </ul>
        </article>
      </section>

      <section className="products-card dash-panel">
        <div className="dash-panel-head">
          <h2>Top wishlisted</h2>
          <Link to="/wishlist" className="dash-link">
            View wishlist
          </Link>
        </div>
        {metrics.wishlistTop.length === 0 ? (
          <p className="dash-empty">No wishlist activity yet.</p>
        ) : (
          <ul className="dash-wishlist">
            {metrics.wishlistTop.map((row) => (
              <li key={row.productId || row.id} className="dash-wishlist-row">
                <div className="dash-wishlist-product">
                  {row.imageUrl ? (
                    <img
                      src={row.imageUrl}
                      alt=""
                      className="products-thumb"
                    />
                  ) : (
                    <span className="products-thumb placeholder">—</span>
                  )}
                  <div className="dash-wishlist-copy">
                    <p className="products-name">{row.name || '—'}</p>
                    <span className="dash-muted">{row.category || '—'}</span>
                  </div>
                </div>
                <strong className="dash-wishlist-count">
                  {row.wishlistCount}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="products-card dash-panel">
        <div className="dash-panel-head">
          <h2>Recent orders</h2>
          <Link to="/orders" className="dash-link">
            All orders
          </Link>
        </div>
        {metrics.recent.length === 0 ? (
          <p className="dash-empty">No recent orders.</p>
        ) : (
          <div className="products-table-wrap">
            <table className="products-table dash-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recent.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        to={`/orders/${order.id}`}
                        className="dash-order-link"
                      >
                        {order.orderId}
                      </Link>
                    </td>
                    <td>{order.customerName || '—'}</td>
                    <td>
                      <span
                        className={`products-badge orders-badge ${statusClass(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td>{formatMoney(order.total)}</td>
                    <td>{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
