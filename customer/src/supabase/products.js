import { supabase } from './config';

const TABLE = 'products';

function normalizeImageUrls(urls, fallback = '') {
  const list = Array.isArray(urls)
    ? urls.filter((url) => typeof url === 'string' && url.trim())
    : [];
  if (list.length === 0 && fallback) return [fallback];
  return list.slice(0, 6);
}

export function mapProduct(row) {
  if (!row) return null;
  const imageUrls = normalizeImageUrls(row.image_urls, row.image_url ?? '');
  return {
    id: String(row.product_id),
    productId: row.product_id,
    name: row.name ?? '',
    category: row.category ?? '',
    description: row.description ?? '',
    imageUrl: imageUrls[0] ?? '',
    imageUrls,
    size: row.size ?? '',
    mrp: Number(row.mrp ?? 0),
    sellingPrice: Number(row.selling_price ?? 0),
    discount: Number(row.discount ?? 0),
    colour: row.colour ?? '',
    material: row.material ?? '',
    weight: row.weight ?? '',
    brand: row.brand ?? '',
    stockStatus: row.stock_status ?? 'In stock',
    availableQuantity: Number(row.available_quantity ?? 0),
    returnEligibility: row.return_eligibility ?? 'Returnable',
    productStatus: row.product_status ?? 'Active',
  };
}

function throwIfError(error) {
  if (error) {
    const err = new Error(error.message || 'Could not load products.');
    err.code = error.code || 'supabase_error';
    throw err;
  }
}

export async function getActiveProducts() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('product_status', 'Active')
    .order('product_id', { ascending: false });

  throwIfError(error);
  return (data || []).map(mapProduct);
}

export async function getActiveProduct(id) {
  const productId = Number(id);
  if (!Number.isFinite(productId)) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('product_id', productId)
    .eq('product_status', 'Active')
    .maybeSingle();

  throwIfError(error);
  return mapProduct(data);
}
