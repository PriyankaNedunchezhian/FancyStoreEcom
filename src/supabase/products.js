import { supabase } from './config';

export const PRODUCT_CATEGORIES = [
  'Earrings',
  'Chain',
  'Bangles',
  'Necklace',
  'Ring',
  'Bracelet',
  'Other',
];

export const STOCK_STATUSES = ['In stock', 'Out of stock'];
export const RETURN_ELIGIBILITIES = ['Returnable', 'Non-returnable'];
export const PRODUCT_STATUSES = ['Active', 'Inactive'];

const TABLE = 'products';
const BUCKET = 'products';
export const MAX_PRODUCT_IMAGES = 6;

function normalizeImageUrls(urls, fallback = '') {
  const list = Array.isArray(urls)
    ? urls.filter((url) => typeof url === 'string' && url.trim())
    : [];
  if (list.length === 0 && fallback) return [fallback];
  return list.slice(0, MAX_PRODUCT_IMAGES);
}

export function calcDiscountPercent(mrp, sellingPrice) {
  const m = Number(mrp);
  const s = Number(sellingPrice);
  if (!Number.isFinite(m) || m <= 0 || !Number.isFinite(s) || s < 0) {
    return 0;
  }
  const pct = ((m - s) / m) * 100;
  return Math.max(0, Math.round(pct * 100) / 100);
}

function mapProduct(row) {
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
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function toRow(data) {
  const imageUrls = normalizeImageUrls(
    data.imageUrls,
    data.imageUrl ?? '',
  );
  return {
    name: data.name,
    category: data.category,
    description: data.description ?? '',
    image_url: imageUrls[0] ?? '',
    image_urls: imageUrls,
    size: data.size ?? '',
    mrp: data.mrp,
    selling_price: data.sellingPrice,
    discount: data.discount,
    colour: data.colour ?? '',
    material: data.material ?? '',
    weight: data.weight ?? '',
    brand: data.brand ?? '',
    stock_status: data.stockStatus,
    available_quantity: data.availableQuantity,
    return_eligibility: data.returnEligibility,
    product_status: data.productStatus,
    updated_at: new Date().toISOString(),
  };
}

function throwIfError(error) {
  if (error) {
    const err = new Error(error.message || 'Supabase request failed.');
    err.code = error.code || error.details || 'supabase_error';
    throw err;
  }
}

export async function getProducts() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('product_id', { ascending: false });

  throwIfError(error);
  return (data || []).map(mapProduct);
}

export async function getProduct(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('product_id', Number(id))
    .maybeSingle();

  throwIfError(error);
  return mapProduct(data);
}

export async function createProduct(data) {
  const { data: row, error } = await supabase
    .from(TABLE)
    .insert(toRow(data))
    .select('product_id')
    .single();

  throwIfError(error);
  return String(row.product_id);
}

export async function updateProduct(id, data) {
  const { error } = await supabase
    .from(TABLE)
    .update(toRow(data))
    .eq('product_id', Number(id));

  throwIfError(error);
}

export async function deleteProduct(id) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('product_id', Number(id));

  throwIfError(error);
}

export async function uploadProductImage(file, productId) {
  const safeName = file.name.replace(/[^\w.-]+/g, '_');
  const path = `${productId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  throwIfError(uploadError);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
