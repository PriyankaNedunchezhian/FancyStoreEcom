import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  IndianRupee,
  Package,
  ShoppingBag,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { buildDashboardMetrics } from '../supabase/dashboard';
import { getOrders } from '../supabase/orders';
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

function readThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  const get = (name, fallback) =>
    styles.getPropertyValue(name).trim() || fallback;
  return {
    ink: get('--ink', '#0a0a0a'),
    muted: get('--muted', '#737373'),
    line: get('--line', '#e8e8ea'),
    paper: get('--paper', '#ffffff'),
    accent: get('--accent', '#2563eb'),
    ok: get('--ok', '#067647'),
    danger: get('--danger', '#b42318'),
    info: get('--info', '#175cd3'),
  };
}

const STATUS_COLOR_KEYS = {
  Pending: 'muted',
  Confirmed: 'info',
  Shipped: 'accent',
  Delivered: 'ok',
  Cancelled: 'danger',
};

function ChartTooltip({ active, payload, label, moneyKeys = [] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dash-chart-tooltip">
      {label ? <p className="dash-chart-tooltip-label">{label}</p> : null}
      <ul>
        {payload.map((entry) => {
          const key = entry.dataKey || entry.name;
          const isMoney = moneyKeys.includes(key);
          const value = isMoney
            ? formatMoney(entry.value)
            : Number(entry.value).toLocaleString('en-IN');
          return (
            <li key={`${entry.name}-${key}`}>
              <span style={{ color: entry.color }}>{entry.name}</span>
              <strong>{value}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Dashboard() {
  const { theme } = useTheme();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const colors = useMemo(() => readThemeColors(), [theme]);

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

  const trendHasData = metrics.charts.trend.some(
    (d) => d.orders > 0 || d.revenue > 0,
  );
  const statusHasData = metrics.charts.status.some((d) => d.value > 0);
  const categoryHasData = metrics.charts.categories.some((d) => d.count > 0);

  const statusColors = useMemo(
    () =>
      metrics.charts.status.map((row) => {
        const key = STATUS_COLOR_KEYS[row.name] || 'accent';
        return colors[key];
      }),
    [metrics.charts.status, colors],
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

      <section className="dash-charts" aria-label="Charts">
        <article className="products-card dash-panel dash-chart-wide">
          <div className="dash-panel-head">
            <h2>Orders & revenue (7d)</h2>
            <Link to="/orders" className="dash-link">
              View orders
            </Link>
          </div>
          {!trendHasData ? (
            <p className="dash-empty">No order activity in the last 7 days.</p>
          ) : (
            <div className="dash-chart-frame">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={metrics.charts.trend}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke={colors.line} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fill: colors.muted, fontSize: 11 }}
                    axisLine={{ stroke: colors.line }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="orders"
                    allowDecimals={false}
                    tick={{ fill: colors.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <YAxis
                    yAxisId="revenue"
                    orientation="right"
                    tick={{ fill: colors.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                    }
                  />
                  <Tooltip
                    content={<ChartTooltip moneyKeys={['revenue']} />}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: colors.muted }}
                  />
                  <Bar
                    yAxisId="orders"
                    dataKey="orders"
                    name="Orders"
                    fill={colors.accent}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke={colors.ok}
                    strokeWidth={2}
                    dot={{ r: 3, fill: colors.ok }}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="products-card dash-panel">
          <div className="dash-panel-head">
            <h2>Order status mix</h2>
            <Link to="/orders" className="dash-link">
              View orders
            </Link>
          </div>
          {!statusHasData ? (
            <p className="dash-empty">No orders to chart yet.</p>
          ) : (
            <div className="dash-chart-frame dash-chart-frame-sm">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.charts.status}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="78%"
                    paddingAngle={2}
                    stroke={colors.paper}
                  >
                    {metrics.charts.status.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={statusColors[index]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: 11, color: colors.muted }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </section>

      <section className="dash-split">
        <article className="products-card dash-panel">
          <div className="dash-panel-head">
            <h2>Catalog by category</h2>
            <Link to="/products" className="dash-link">
              View products
            </Link>
          </div>
          {!categoryHasData ? (
            <p className="dash-empty">No products in catalog.</p>
          ) : (
            <div className="dash-chart-frame">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={metrics.charts.categories.slice(0, 8)}
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                  <CartesianGrid
                    stroke={colors.line}
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: colors.muted, fontSize: 11 }}
                    axisLine={{ stroke: colors.line }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={88}
                    tick={{ fill: colors.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Products"
                    fill={colors.info}
                    radius={[0, 3, 3, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
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
