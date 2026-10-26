import { supabase } from './config';

export const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Shipped',
  'Delivered',
  'Cancelled',
];

export const PAYMENT_STATUSES = ['Unpaid', 'Paid', 'Refunded'];

export const ORDER_STATUS_TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
};

const ORDERS = 'orders';
const ITEMS = 'order_items';

function throwIfError(error) {
  if (error) {
    const err = new Error(error.message || 'Supabase request failed.');
    err.code = error.code || error.details || 'supabase_error';
    throw err;
  }
}

function coverImage(product) {
  if (!product) return '';
  const urls = Array.isArray(product.image_urls)
    ? product.image_urls.filter((u) => typeof u === 'string' && u.trim())
    : [];
  return urls[0] || product.image_url || '';
}

function mapItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name ?? '',
    unitPrice: Number(row.unit_price ?? 0),
    quantity: Number(row.quantity ?? 0),
    lineTotal: Number(row.line_total ?? 0),
    imageUrl: coverImage(row.products),
  };
}

function mapOrder(row) {
  if (!row) return null;
  const items = Array.isArray(row.order_items)
    ? row.order_items.map(mapItem).filter(Boolean)
    : [];
  return {
    id: String(row.order_id),
    orderId: row.order_id,
    customerId: row.customer_id ?? null,
    customerName: row.customer_name ?? '',
    customerPhone: row.customer_phone ?? '',
    customerEmail: row.customer_email ?? '',
    shippingAddress: row.shipping_address ?? '',
    status: row.status ?? 'Pending',
    paymentStatus: row.payment_status ?? 'Unpaid',
    subtotal: Number(row.subtotal ?? 0),
    discountTotal: Number(row.discount_total ?? 0),
    total: Number(row.total ?? 0),
    notes: row.notes ?? '',
    stockDeducted: Boolean(row.stock_deducted),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

function computeTotals(items, discountTotal = 0) {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
    0,
  );
  const discount = Math.max(0, Number(discountTotal) || 0);
  const total = Math.max(0, subtotal - discount);
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountTotal: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

function normalizeItems(items) {
  const list = Array.isArray(items) ? items : [];
  return list
    .map((item) => {
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      return {
        product_id: Number(item.productId),
        product_name: String(item.productName || '').trim(),
        unit_price: unitPrice,
        quantity,
        line_total: Math.round(unitPrice * quantity * 100) / 100,
      };
    })
    .filter((item) => Number.isFinite(item.product_id) && item.product_id > 0);
}

function toOrderRow(data, totals) {
  return {
    customer_id: data.customerId || null,
    customer_name: data.customerName?.trim() || '',
    customer_phone: data.customerPhone?.trim() || '',
    customer_email: data.customerEmail?.trim() || '',
    shipping_address: data.shippingAddress?.trim() || '',
    status: data.status || 'Pending',
    payment_status: data.paymentStatus || 'Unpaid',
    subtotal: totals.subtotal,
    discount_total: totals.discountTotal,
    total: totals.total,
    notes: data.notes?.trim() || '',
    updated_at: new Date().toISOString(),
  };
}

const ORDER_SELECT = `
  *,
  order_items (
    id,
    order_id,
    product_id,
    product_name,
    unit_price,
    quantity,
    line_total,
    products (
      product_id,
      image_url,
      image_urls
    )
  )
`;

export function canEditOrder(order) {
  return order?.status === 'Pending' || order?.status === 'Confirmed';
}

export function canDeleteOrder(order) {
  if (!order) return false;
  if (order.status === 'Cancelled') return true;
  return order.status === 'Pending' && !order.stockDeducted;
}

export async function getOrders() {
  const { data, error } = await supabase
    .from(ORDERS)
    .select(ORDER_SELECT)
    .order('order_id', { ascending: false });

  throwIfError(error);
  return (data || []).map(mapOrder);
}

export async function getOrder(id) {
  const { data, error } = await supabase
    .from(ORDERS)
    .select(ORDER_SELECT)
    .eq('order_id', Number(id))
    .maybeSingle();

  throwIfError(error);
  return mapOrder(data);
}

async function replaceOrderItems(orderId, items) {
  const { error: deleteError } = await supabase
    .from(ITEMS)
    .delete()
    .eq('order_id', Number(orderId));
  throwIfError(deleteError);

  if (!items.length) return;

  const rows = items.map((item) => ({
    ...item,
    order_id: Number(orderId),
  }));

  const { error: insertError } = await supabase.from(ITEMS).insert(rows);
  throwIfError(insertError);
}

export async function createOrder(data) {
  const items = normalizeItems(data.items);
  if (items.length === 0) {
    throw new Error('Add at least one product to the order.');
  }

  const totals = computeTotals(
    items.map((i) => ({
      unitPrice: i.unit_price,
      quantity: i.quantity,
    })),
    data.discountTotal,
  );

  const status = data.status || 'Pending';
  const insertRow = {
    ...toOrderRow({ ...data, status: status === 'Confirmed' ? 'Pending' : status }, totals),
    stock_deducted: false,
  };

  // Insert as Pending first when Confirmed so stock RPC can run safely
  if (status === 'Confirmed') {
    insertRow.status = 'Pending';
  }

  const { data: row, error } = await supabase
    .from(ORDERS)
    .insert(insertRow)
    .select('order_id')
    .single();
  throwIfError(error);

  const orderId = row.order_id;
  try {
    await replaceOrderItems(orderId, items);
  } catch (err) {
    await supabase.from(ORDERS).delete().eq('order_id', orderId);
    throw err;
  }

  if (status === 'Confirmed') {
    const { error: rpcError } = await supabase.rpc('confirm_order_stock', {
      p_order_id: orderId,
    });
    throwIfError(rpcError);
  }

  return getOrder(orderId);
}

export async function updateOrder(id, data) {
  const existing = await getOrder(id);
  if (!existing) {
    throw new Error('Order not found.');
  }
  if (!canEditOrder(existing)) {
    throw new Error(`Orders with status ${existing.status} cannot be edited.`);
  }

  const items = normalizeItems(data.items);
  if (items.length === 0) {
    throw new Error('Add at least one product to the order.');
  }

  if (existing.stockDeducted) {
    const sameLines =
      existing.items.length === items.length &&
      existing.items.every((item) => {
        const next = items.find((row) => row.product_id === item.productId);
        return (
          next &&
          next.quantity === item.quantity &&
          Number(next.unit_price) === Number(item.unitPrice)
        );
      });
    if (!sameLines) {
      throw new Error(
        'Line items cannot change after stock is deducted. Cancel and recreate, or ship as-is.',
      );
    }
  }

  const totals = computeTotals(
    items.map((i) => ({
      unitPrice: i.unit_price,
      quantity: i.quantity,
    })),
    data.discountTotal,
  );

  // Keep status stable here; use updateOrderStatus for transitions
  const { error } = await supabase
    .from(ORDERS)
    .update(
      toOrderRow(
        {
          ...data,
          status: existing.status,
        },
        totals,
      ),
    )
    .eq('order_id', Number(id));
  throwIfError(error);

  if (!existing.stockDeducted) {
    await replaceOrderItems(id, items);
  }
  return getOrder(id);
}

export async function updateOrderStatus(id, nextStatus) {
  const existing = await getOrder(id);
  if (!existing) {
    throw new Error('Order not found.');
  }

  const allowed = ORDER_STATUS_TRANSITIONS[existing.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(
      `Cannot move order from ${existing.status} to ${nextStatus}.`,
    );
  }

  if (nextStatus === 'Confirmed') {
    const { error } = await supabase.rpc('confirm_order_stock', {
      p_order_id: Number(id),
    });
    throwIfError(error);
    return getOrder(id);
  }

  if (nextStatus === 'Cancelled') {
    const { error } = await supabase.rpc('cancel_order_restore_stock', {
      p_order_id: Number(id),
    });
    throwIfError(error);
    return getOrder(id);
  }

  const { error } = await supabase
    .from(ORDERS)
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', Number(id));
  throwIfError(error);

  return getOrder(id);
}

export async function updatePaymentStatus(id, paymentStatus) {
  if (!PAYMENT_STATUSES.includes(paymentStatus)) {
    throw new Error('Invalid payment status.');
  }
  const { error } = await supabase
    .from(ORDERS)
    .update({
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', Number(id));
  throwIfError(error);
  return getOrder(id);
}

export async function deleteOrder(id) {
  const existing = await getOrder(id);
  if (!existing) {
    throw new Error('Order not found.');
  }
  if (!canDeleteOrder(existing)) {
    throw new Error(
      'Only cancelled or undeducted pending orders can be deleted.',
    );
  }
  const { error } = await supabase
    .from(ORDERS)
    .delete()
    .eq('order_id', Number(id));
  throwIfError(error);
}

export async function seedOrdersDemo() {
  const { data, error } = await supabase.rpc('seed_orders_demo');
  throwIfError(error);
  return Number(data ?? 0);
}
