import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  RETURN_ELIGIBILITIES,
  STOCK_STATUSES,
  calcDiscountPercent,
  createProduct,
  getProduct,
  updateProduct,
  uploadProductImage,
} from '../supabase/products';
import './Products.css';

const emptyForm = {
  name: '',
  category: PRODUCT_CATEGORIES[0],
  description: '',
  size: '',
  mrp: '',
  sellingPrice: '',
  colour: '',
  material: '',
  weight: '',
  brand: '',
  stockStatus: 'In stock',
  availableQuantity: '0',
  returnEligibility: 'Returnable',
  productStatus: 'Active',
};

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [productId, setProductId] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const discount = useMemo(
    () => calcDiscountPercent(form.mrp, form.sellingPrice),
    [form.mrp, form.sellingPrice],
  );

  const previewUrl = useMemo(() => {
    if (imageFile) return URL.createObjectURL(imageFile);
    return imageUrl || '';
  }, [imageFile, imageUrl]);

  useEffect(() => {
    if (!imageFile) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile, previewUrl]);

  useEffect(() => {
    if (!isEdit) return undefined;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const product = await getProduct(id);
        if (cancelled) return;
        if (!product) {
          setError('Product not found.');
          return;
        }
        setProductId(product.productId);
        setImageUrl(product.imageUrl || '');
        setForm({
          name: product.name,
          category: product.category || PRODUCT_CATEGORIES[0],
          description: product.description,
          size: product.size,
          mrp: String(product.mrp ?? ''),
          sellingPrice: String(product.sellingPrice ?? ''),
          colour: product.colour,
          material: product.material,
          weight: product.weight,
          brand: product.brand,
          stockStatus: product.stockStatus || 'In stock',
          availableQuantity: String(product.availableQuantity ?? 0),
          returnEligibility: product.returnEligibility || 'Returnable',
          productStatus: product.productStatus || 'Active',
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError('Could not load product.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  function updateField(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === 'availableQuantity') {
        const qty = Number(value);
        if (Number.isFinite(qty) && qty <= 0) {
          next.stockStatus = 'Out of stock';
        } else if (
          Number.isFinite(qty) &&
          qty > 0 &&
          prev.stockStatus === 'Out of stock'
        ) {
          next.stockStatus = 'In stock';
        }
      }

      return next;
    });
  }

  function validate() {
    if (!form.name.trim()) return 'Product name is required.';
    if (!form.category) return 'Category is required.';

    const mrp = Number(form.mrp);
    const sellingPrice = Number(form.sellingPrice);
    const qty = Number(form.availableQuantity);

    if (!Number.isFinite(mrp) || mrp < 0) return 'Enter a valid MRP.';
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      return 'Enter a valid selling price.';
    }
    if (sellingPrice > mrp) return 'Selling price cannot be greater than MRP.';
    if (!Number.isFinite(qty) || qty < 0 || !Number.isInteger(qty)) {
      return 'Available quantity must be a whole number ≥ 0.';
    }
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const mrp = Number(form.mrp);
    const sellingPrice = Number(form.sellingPrice);
    const availableQuantity = Number(form.availableQuantity);
    let stockStatus = form.stockStatus;
    if (availableQuantity <= 0) stockStatus = 'Out of stock';

    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      size: form.size.trim(),
      mrp,
      sellingPrice,
      discount: calcDiscountPercent(mrp, sellingPrice),
      colour: form.colour.trim(),
      material: form.material.trim(),
      weight: form.weight.trim(),
      brand: form.brand.trim(),
      stockStatus,
      availableQuantity,
      returnEligibility: form.returnEligibility,
      productStatus: form.productStatus,
      imageUrl,
    };

    setSaving(true);
    try {
      if (isEdit) {
        let nextImageUrl = imageUrl;
        if (imageFile) {
          nextImageUrl = await uploadProductImage(imageFile, id);
        }
        await updateProduct(id, { ...payload, imageUrl: nextImageUrl });
      } else {
        const newId = await createProduct({ ...payload, imageUrl: '' });
        if (imageFile) {
          const nextImageUrl = await uploadProductImage(imageFile, newId);
          await updateProduct(newId, { ...payload, imageUrl: nextImageUrl });
        }
      }
      navigate('/products');
    } catch (err) {
      console.error(err);
      const code = err?.code || '';
      const detail = err?.message || '';
      const lower = detail.toLowerCase();
      if (
        lower.includes('row-level security') ||
        lower.includes('permission') ||
        lower.includes('not authorized') ||
        code === '42501'
      ) {
        setError(
          'Permission denied. Run supabase/schema.sql and ensure you are signed in. Check RLS policies on products.',
        );
      } else if (
        lower.includes('relation') ||
        lower.includes('does not exist') ||
        lower.includes('schema cache')
      ) {
        setError(
          'Products table missing. Run supabase/schema.sql in the Supabase SQL Editor, then try again.',
        );
      } else if (lower.includes('bucket') || lower.includes('storage')) {
        setError(
          'Storage upload failed. Create a public "products" bucket and apply storage policies from schema.sql.',
        );
      } else {
        setError(
          `Could not save product${code ? ` (${code})` : ''}${detail ? `: ${detail}` : '. Check Supabase setup.'}`,
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="product-form-page">
        <div className="products-card">
          <p className="products-loading">Loading product…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-form-page">
      {error ? <p className="products-alert error">{error}</p> : null}

      <div className="products-card">
        <form className="product-form" onSubmit={handleSubmit}>
          <div className="product-form-grid">
            <label>
              Product ID
              <input
                type="text"
                value={
                  isEdit
                    ? productId ?? id
                    : 'Assigned on save (starts from 100)'
                }
                readOnly
                disabled
              />
              {!isEdit ? (
                <p className="product-form-hint">
                  Sequential ID is generated automatically.
                </p>
              ) : null}
            </label>

            <label>
              Product name *
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
              />
            </label>

            <label>
              Category type *
              <select
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Brand
              <input
                type="text"
                value={form.brand}
                onChange={(e) => updateField('brand', e.target.value)}
              />
            </label>

            <label className="full">
              Product description
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </label>

            <label className="full">
              Image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Product preview"
                  className="product-image-preview"
                />
              ) : (
                <p className="product-form-hint">No image selected.</p>
              )}
            </label>

            <label>
              Size
              <input
                type="text"
                value={form.size}
                onChange={(e) => updateField('size', e.target.value)}
                placeholder="e.g. Free size, 2.4"
              />
            </label>

            <label>
              Colour
              <input
                type="text"
                value={form.colour}
                onChange={(e) => updateField('colour', e.target.value)}
              />
            </label>

            <label>
              Material
              <input
                type="text"
                value={form.material}
                onChange={(e) => updateField('material', e.target.value)}
              />
            </label>

            <label>
              Weight
              <input
                type="text"
                value={form.weight}
                onChange={(e) => updateField('weight', e.target.value)}
                placeholder="e.g. 12 g"
              />
            </label>

            <label>
              MRP *
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.mrp}
                onChange={(e) => updateField('mrp', e.target.value)}
                required
              />
            </label>

            <label>
              Selling price *
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.sellingPrice}
                onChange={(e) => updateField('sellingPrice', e.target.value)}
                required
              />
            </label>

            <label>
              Discount
              <input type="text" value={`${discount.toFixed(2)}%`} readOnly />
              <p className="product-form-hint">
                Calculated from MRP and selling price.
              </p>
            </label>

            <label>
              Available quantity *
              <input
                type="number"
                min="0"
                step="1"
                value={form.availableQuantity}
                onChange={(e) =>
                  updateField('availableQuantity', e.target.value)
                }
                required
              />
            </label>

            <label>
              Stock status
              <select
                value={form.stockStatus}
                onChange={(e) => updateField('stockStatus', e.target.value)}
              >
                {STOCK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Return eligibility
              <select
                value={form.returnEligibility}
                onChange={(e) =>
                  updateField('returnEligibility', e.target.value)
                }
              >
                {RETURN_ELIGIBILITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Product status
              <select
                value={form.productStatus}
                onChange={(e) => updateField('productStatus', e.target.value)}
              >
                {PRODUCT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="product-form-actions">
            <button type="submit" className="products-btn" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update product' : 'Create product'}
            </button>
            <Link to="/products" className="products-btn secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
