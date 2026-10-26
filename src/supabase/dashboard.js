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

export function buildDashboardMetrics({ orders, products, wishlist }) {
  const last7 = ordersInLastDays(orders, 7);
  const statusCounts = countByStatus(orders);
  const inventory = inventoryHealth(products);
  const wishlistTop = topWishlist(wishlist, 5);
  const wishlistSaves = totalWishlistSaves(wishlist);

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
  };
}
