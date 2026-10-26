import { ORDER_STATUSES } from './orders';

const LOW_STOCK_THRESHOLD = 5;
const MS_DAY = 24 * 60 * 60 * 1000;

export function daysAgo(n, from = new Date()) {
  return new Date(from.getTime() - n * MS_DAY);
}

export function isWithinDays(isoDate, days, from = new Date()) {
  if (!isoDate) return false;
  const t = new Date(isoDate).getTime();
  if (Number.isNaN(t)) return false;
  return t >= daysAgo(days, from).getTime() && t <= from.getTime();
}

export function countByStatus(orders) {
  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  for (const order of orders || []) {
    const key = order.status;
    if (key in counts) counts[key] += 1;
    else counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export function sumRevenue(orders, { excludeCancelled = true } = {}) {
  return (orders || []).reduce((sum, order) => {
    if (excludeCancelled && order.status === 'Cancelled') return sum;
    return sum + (Number(order.total) || 0);
  }, 0);
}

export function ordersInLastDays(orders, days) {
  return (orders || []).filter((o) => isWithinDays(o.createdAt, days));
}

export function inventoryHealth(products, threshold = LOW_STOCK_THRESHOLD) {
  const list = products || [];
  let active = 0;
  let inactive = 0;
  let outOfStock = 0;
  let lowStock = 0;

  for (const p of list) {
    if (p.productStatus === 'Active') active += 1;
    else inactive += 1;

    const qty = Number(p.availableQuantity) || 0;
    const isOut =
      p.stockStatus === 'Out of stock' || qty <= 0;
    if (isOut) {
      outOfStock += 1;
    } else if (qty <= threshold) {
      lowStock += 1;
    }
  }

  return {
    total: list.length,
    active,
    inactive,
    outOfStock,
    lowStock,
    threshold,
  };
}

export function topWishlist(overview, limit = 5) {
  return [...(overview || [])]
    .sort((a, b) => (b.wishlistCount || 0) - (a.wishlistCount || 0))
    .slice(0, limit);
}

export function totalWishlistSaves(overview) {
  return (overview || []).reduce(
    (sum, row) => sum + (Number(row.wishlistCount) || 0),
    0,
  );
}

export function recentOrders(orders, limit = 8) {
  return [...(orders || [])]
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, limit);
}

function startOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function localDayKey(date) {
  const d = startOfLocalDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ordersRevenueByDay(orders, days = 7, from = new Date()) {
  const end = startOfLocalDay(from);
  const buckets = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(end.getTime() - i * MS_DAY);
    const key = localDayKey(day);
    buckets.push({
      key,
      dayLabel: day.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
      }),
      orders: 0,
      revenue: 0,
    });
  }

  const byKey = new Map(buckets.map((b) => [b.key, b]));

  for (const order of orders || []) {
    if (!order.createdAt) continue;
    const created = new Date(order.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const key = localDayKey(created);
    const bucket = byKey.get(key);
    if (!bucket) continue;
    bucket.orders += 1;
    if (order.status !== 'Cancelled') {
      bucket.revenue += Number(order.total) || 0;
    }
  }

  return buckets.map(({ dayLabel, orders: orderCount, revenue }) => ({
    dayLabel,
    orders: orderCount,
    revenue,
  }));
}

export function statusChartData(statusCounts) {
  return ORDER_STATUSES.map((name) => ({
    name,
    value: Number(statusCounts?.[name]) || 0,
  }));
}

export function productsByCategory(products) {
  const counts = new Map();
  for (const product of products || []) {
    const raw = String(product.category || '').trim();
    const category = raw || 'Uncategorized';
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

export function buildDashboardMetrics({ orders, products, wishlist }) {
  const last7 = ordersInLastDays(orders, 7);
  const statusCounts = countByStatus(orders);
  const inventory = inventoryHealth(products);
  const wishlistTop = topWishlist(wishlist, 5);
  const wishlistSaves = totalWishlistSaves(wishlist);
  const trend = ordersRevenueByDay(orders, 7);
  const status = statusChartData(statusCounts);
  const categories = productsByCategory(products);

  return {
    kpis: {
      orders7d: last7.length,
      revenue7d: sumRevenue(last7),
      activeProducts: inventory.active,
      wishlistSaves,
    },
    statusCounts,
    inventory,
    wishlistTop,
    recent: recentOrders(orders, 8),
    pipelineMax: Math.max(1, ...ORDER_STATUSES.map((s) => statusCounts[s] || 0)),
    charts: {
      trend,
      status,
      categories,
    },
  };
}
