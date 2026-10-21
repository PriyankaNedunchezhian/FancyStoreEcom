import { supabase } from './config';

const TABLE = 'wishlists';
const MAX_PRODUCT_IMAGES = 6;

function throwIfError(error) {
  if (error) {
    const err = new Error(error.message || 'Supabase request failed.');
    err.code = error.code || error.details || 'supabase_error';
    throw err;
  }
}

function normalizeImageUrls(urls, fallback = '') {
  const list = Array.isArray(urls)
    ? urls.filter((url) => typeof url === 'string' && url.trim())
    : [];
  if (list.length === 0 && fallback) return [fallback];
  return list.slice(0, MAX_PRODUCT_IMAGES);
}

function mapProductFields(product) {
  if (!product) return null;
  const imageUrls = normalizeImageUrls(
    product.image_urls,
    product.image_url ?? '',
  );
  return {
    id: String(product.product_id),
    productId: product.product_id,
    name: product.name ?? '',
    category: product.category ?? '',
    imageUrl: imageUrls[0] ?? '',
    imageUrls,
    mrp: Number(product.mrp ?? 0),
    sellingPrice: Number(product.selling_price ?? 0),
    discount: Number(product.discount ?? 0),
    stockStatus: product.stock_status ?? 'In stock',
    availableQuantity: Number(product.available_quantity ?? 0),
    productStatus: product.product_status ?? 'Active',
  };
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  throwIfError(error);
  const userId = data?.user?.id;
  if (!userId) {
    const err = new Error('You must be signed in.');
    err.code = 'auth_required';
    throw err;
  }
  return userId;
}

/**
 * Admin overview: products that appear on customer wishlists, with counts.
 */
export async function getWishlistOverview() {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      `
      product_id,
      created_at,
      products (
        product_id,
        name,
        category,
        image_url,
        image_urls,
        mrp,
        selling_price,
        discount,
        stock_status,
        available_quantity,
        product_status
      )
    `,
    )
    .order('created_at', { ascending: false });

  throwIfError(error);

  const byProduct = new Map();

  for (const row of data || []) {
    const product = mapProductFields(row.products);
    if (!product) continue;

    const key = product.productId;
    const existing = byProduct.get(key);
    if (existing) {
      existing.wishlistCount += 1;
      if (
        row.created_at &&
        (!existing.lastAddedAt || row.created_at > existing.lastAddedAt)
      ) {
        existing.lastAddedAt = row.created_at;
      }
    } else {
      byProduct.set(key, {
        ...product,
        wishlistCount: 1,
        lastAddedAt: row.created_at ?? null,
      });
    }
  }

  return Array.from(byProduct.values()).sort((a, b) => {
    if (b.wishlistCount !== a.wishlistCount) {
      return b.wishlistCount - a.wishlistCount;
    }
    const aTime = a.lastAddedAt || '';
    const bTime = b.lastAddedAt || '';
    return bTime.localeCompare(aTime);
  });
}

/**
 * Flat wishlist rows for detail views.
 */
export async function getWishlistEntries() {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      `
      id,
      customer_id,
      product_id,
      created_at,
      products (
        product_id,
        name,
        category,
        image_url,
        image_urls,
        mrp,
        selling_price,
        discount,
        stock_status,
        available_quantity,
        product_status
      )
    `,
    )
    .order('created_at', { ascending: false });

  throwIfError(error);

  return (data || []).map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    productId: row.product_id,
    createdAt: row.created_at ?? null,
    product: mapProductFields(row.products),
  }));
}

export async function addToWishlist(productId) {
  const customerId = await requireUserId();
  const { error } = await supabase.from(TABLE).insert({
    customer_id: customerId,
    product_id: Number(productId),
  });
  throwIfError(error);
}

export async function removeFromWishlist(productId) {
  const customerId = await requireUserId();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('customer_id', customerId)
    .eq('product_id', Number(productId));
  throwIfError(error);
}

/**
 * Loads demo customer wishlist rows (requires seed_wishlists.sql once).
 * Returns the number of demo wishlist rows after seeding.
 */
export async function seedWishlistDemo() {
  const { data, error } = await supabase.rpc('seed_wishlist_demo');
  throwIfError(error);
  return Number(data ?? 0);
}
