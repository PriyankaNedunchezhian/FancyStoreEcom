import { supabase } from './config';

function throwIfError(error) {
  if (error) {
    const err = new Error(error.message || 'Could not complete the order request.');
    err.code = error.code || 'supabase_error';
    throw err;
  }
}

function coverImage(product) {
  if (!product) return '';
  const urls = Array.isArray(product.image_urls)
    ? product.image_urls.filter((url) => typeof url === 'string' && url.trim())
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
    paymentMethod: row.payment_method ?? 'cod',
    subtotal: Number(row.subtotal ?? 0),
    discountTotal: Number(row.discount_total ?? 0),
    total: Number(row.total ?? 0),
    notes: row.notes ?? '',
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
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

/**
 * Places a Pending / Unpaid COD order via security-definer RPC.
 * Works for guests (anon) and signed-in customers.
 */
export async function placeOrder({
  name,
  phone,
  email,
  address,
  items,
  paymentMethod = 'cod',
}) {
  const payloadItems = (Array.isArray(items) ? items : [])
    .map((item) => ({
      productId: Number(item.productId ?? item.id),
      quantity: Math.max(1, Math.floor(Number(item.quantity ?? item.qty) || 1)),
    }))
    .filter((item) => Number.isFinite(item.productId) && item.productId > 0);

  if (payloadItems.length === 0) {
    throw new Error('Add at least one product to the order.');
  }

  const { data, error } = await supabase.rpc('place_customer_order', {
    p_customer: {
      name: String(name || '').trim(),
      phone: String(phone || '').trim(),
      email: String(email || '').trim(),
      address: String(address || '').trim(),
      payment_method: paymentMethod || 'cod',
    },
    p_items: payloadItems,
  });

  throwIfError(error);
  const orderId = Number(data);
  if (!Number.isFinite(orderId)) {
    throw new Error('The order was created but no order number was returned.');
  }
  return orderId;
}

export async function getMyOrders() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  throwIfError(userError);
  if (!user) {
    const err = new Error('Sign in to see your orders.');
    err.code = 'auth_required';
    throw err;
  }

  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  throwIfError(error);
  return (data || []).map(mapOrder);
}

export async function getMyOrder(id) {
  const orderId = Number(id);
  if (!Number.isFinite(orderId)) return null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  throwIfError(userError);
  if (!user) {
    const err = new Error('Sign in to see your orders.');
    err.code = 'auth_required';
    throw err;
  }

  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('order_id', orderId)
    .eq('customer_id', user.id)
    .maybeSingle();

  throwIfError(error);
  return mapOrder(data);
}

export function paymentMethodLabel(method) {
  if (method === 'razorpay' || method === 'stripe') return 'Online payment';
  return 'Cash on delivery';
}
