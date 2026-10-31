import { supabase } from './config';
import { mapProduct } from './products';

const TABLE = 'wishlists';

const PRODUCT_COLUMNS = `
  product_id,
  name,
  category,
  description,
  image_url,
  image_urls,
  size,
  mrp,
  selling_price,
  discount,
  colour,
  material,
  weight,
  brand,
  stock_status,
  available_quantity,
  return_eligibility,
  product_status
`;

function throwIfError(error) {
  if (error) {
    const err = new Error(error.message || 'Could not update the wishlist.');
    err.code = error.code || 'supabase_error';
    throw err;
  }
}

export async function getMyWishlist(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`product_id, created_at, products (${PRODUCT_COLUMNS})`)
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });

  throwIfError(error);
  return (data || []).map((row) => mapProduct(row.products)).filter(Boolean);
}

export async function addToWishlist(userId, productId) {
  const { error } = await supabase.from(TABLE).insert({
    customer_id: userId,
    product_id: Number(productId),
  });
  if (error?.code === '23505') return;
  throwIfError(error);
}

export async function removeFromWishlist(userId, productId) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('customer_id', userId)
    .eq('product_id', Number(productId));

  throwIfError(error);
}
