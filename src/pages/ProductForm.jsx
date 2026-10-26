import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  MAX_PRODUCT_IMAGES,
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
import OutlinedTextField from '../components/form/OutlinedTextField';
import OutlinedSelect from '../components/form/OutlinedSelect';
import OutlinedTextarea from '../components/form/OutlinedTextarea';
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

let imageEntryId = 0;
function makeImageEntry({ url = '', file = null } = {}) {
  imageEntryId += 1;
  return {
    id: `img-${imageEntryId}`,
    url,
    file,
    previewUrl: file ? URL.createObjectURL(file) : url,
  };
}

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(emptyForm);
  const [productId, setProductId] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const discount = useMemo(
    () => calcDiscountPercent(form.mrp, form.sellingPrice),
    [form.mrp, form.sellingPrice],
  );

  const savings = useMemo(() => {
    const mrp = Number(form.mrp);
    const selling = Number(form.sellingPrice);
    if (!Number.isFinite(mrp) || !Number.isFinite(selling) || mrp <= selling) {
      return 0;
    }
    return mrp - selling;
  }, [form.mrp, form.sellingPrice]);

  const slotsLeft = MAX_PRODUCT_IMAGES - images.length;
  const coverPreview = images[0]?.previewUrl || '';
  const imagesRef = useRef(images);
  imagesRef.current = images;

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => {
        if (img.file && img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
    };
  }, []);

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
        setImages(
          (product.imageUrls || []).map((url) => makeImageEntry({ url })),
        );
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

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []).filter((file) =>
      file.type.startsWith('image/'),
    );
    if (incoming.length === 0) {
      setError('Please choose image files (PNG or JPG).');
      return;
    }

    setImages((prev) => {
      const room = MAX_PRODUCT_IMAGES - prev.length;
      if (room <= 0) {
        setError(`You can upload up to ${MAX_PRODUCT_IMAGES} images.`);
        return prev;
      }
      const accepted = incoming.slice(0, room);
      if (incoming.length > room) {
        setError(
          `Only ${MAX_PRODUCT_IMAGES} images allowed. Added ${accepted.length} of ${incoming.length}.`,
        );
      } else {
        setError('');
      }
      return [...prev, ...accepted.map((file) => makeImageEntry({ file }))];
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeImage(entryId) {
    setImages((prev) => {
      const target = prev.find((img) => img.id === entryId);
      if (target?.file && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((img) => img.id !== entryId);
    });
    setError('');
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
    if (images.length > MAX_PRODUCT_IMAGES) {
      return `Maximum ${MAX_PRODUCT_IMAGES} images allowed.`;
    }
    return '';
  }

  async function resolveImageUrls(productKey) {
    const urls = [];
    for (const img of images) {
      if (img.file) {
        urls.push(await uploadProductImage(img.file, productKey));
      } else if (img.url) {
        urls.push(img.url);
      }
    }
    return urls.slice(0, MAX_PRODUCT_IMAGES);
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
      imageUrls: [],
      imageUrl: '',
    };

    setSaving(true);
    try {
      if (isEdit) {
        const imageUrls = await resolveImageUrls(id);
        await updateProduct(id, {
          ...payload,
          imageUrls,
          imageUrl: imageUrls[0] ?? '',
        });
      } else {
        const newId = await createProduct({
          ...payload,
          imageUrls: [],
          imageUrl: '',
        });
        const imageUrls = await resolveImageUrls(newId);
        if (imageUrls.length) {
          await updateProduct(newId, {
            ...payload,
            imageUrls,
            imageUrl: imageUrls[0] ?? '',
          });
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
        lower.includes('schema cache') ||
        lower.includes('image_urls')
      ) {
        setError(
          'Products table missing or outdated. Run supabase/schema.sql in the Supabase SQL Editor, then try again.',
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
      <div className="pf-topbar">
        <Link to="/products" className="pf-back">
          ← Back to products
        </Link>
        <div className="pf-id-pill">
          ID{' '}
          <strong>
            {isEdit ? productId ?? id : 'Auto · from 100'}
          </strong>
        </div>
      </div>

      {error ? <p className="products-alert error">{error}</p> : null}

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="pf-layout">
          <aside className="pf-media-card products-card">
            <div className="pf-section-head">
              <h2>Product images</h2>
              <p>
                Up to {MAX_PRODUCT_IMAGES} photos. First image is the cover.
              </p>
            </div>

            <button
              type="button"
              className={`pf-dropzone${coverPreview ? ' has-image' : ''}`}
              onClick={() => {
                if (slotsLeft > 0) fileInputRef.current?.click();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (slotsLeft > 0) addFiles(e.dataTransfer.files);
              }}
              disabled={slotsLeft <= 0 && !coverPreview}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Cover preview" />
              ) : (
                <div className="pf-dropzone-empty">
                  <span className="pf-dropzone-icon" aria-hidden="true">
                    +
                  </span>
                  <strong>Add product photos</strong>
                  <span>PNG or JPG · up to {MAX_PRODUCT_IMAGES}</span>
                </div>
              )}
            </button>

            {images.length > 0 ? (
              <ul className="pf-image-grid">
                {images.map((img, index) => (
                  <li key={img.id} className="pf-image-tile">
                    <img
                      src={img.previewUrl}
                      alt={`Product ${index + 1}`}
                    />
                    {index === 0 ? (
                      <span className="pf-image-badge">Cover</span>
                    ) : null}
                    <button
                      type="button"
                      className="pf-image-remove"
                      aria-label={`Remove image ${index + 1}`}
                      onClick={() => removeImage(img.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="pf-file-input"
              onChange={(e) => addFiles(e.target.files)}
            />

            <div className="pf-media-actions">
              <button
                type="button"
                className="products-btn secondary"
                disabled={slotsLeft <= 0}
                onClick={() => fileInputRef.current?.click()}
              >
                {images.length === 0
                  ? 'Choose images'
                  : slotsLeft > 0
                    ? `Add more (${slotsLeft} left)`
                    : 'Limit reached'}
              </button>
            </div>
            <p className="product-form-hint">
              {images.length} of {MAX_PRODUCT_IMAGES} images
            </p>
          </aside>

          <div className="pf-main">
            <section className="products-card pf-section">
              <div className="pf-section-head">
                <h2>Basic details</h2>
                <p>Name, category, and how the product is described.</p>
              </div>
              <div className="product-form-grid">
                <OutlinedTextField
                  className="full"
                  label="Product name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />

                <OutlinedSelect
                  label="Category type"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  options={PRODUCT_CATEGORIES}
                  required
                />

                <OutlinedTextField
                  label="Brand"
                  value={form.brand}
                  onChange={(e) => updateField('brand', e.target.value)}
                />

                <OutlinedTextarea
                  className="full"
                  label="Product description"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                />
              </div>
            </section>

            <section className="products-card pf-section">
              <div className="pf-section-head">
                <h2>Specifications</h2>
                <p>Physical attributes customers care about.</p>
              </div>
              <div className="product-form-grid">
                <OutlinedTextField
                  label="Size"
                  value={form.size}
                  onChange={(e) => updateField('size', e.target.value)}
                />
                <OutlinedTextField
                  label="Colour"
                  value={form.colour}
                  onChange={(e) => updateField('colour', e.target.value)}
                />
                <OutlinedTextField
                  label="Material"
                  value={form.material}
                  onChange={(e) => updateField('material', e.target.value)}
                />
                <OutlinedTextField
                  label="Weight"
                  value={form.weight}
                  onChange={(e) => updateField('weight', e.target.value)}
                />
              </div>
            </section>

            <section className="products-card pf-section">
              <div className="pf-section-head row">
                <div>
                  <h2>Pricing</h2>
                  <p>MRP, selling price, and auto discount.</p>
                </div>
                <div
                  className={`pf-discount-chip${discount <= 0 ? ' is-zero' : ''}`}
                  aria-live="polite"
                >
                  <span>Off</span>
                  <strong>{discount.toFixed(1)}%</strong>
                </div>
              </div>
              <div className="product-form-grid pf-pricing-grid">
                <OutlinedTextField
                  label="MRP"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.mrp}
                  onChange={(e) => updateField('mrp', e.target.value)}
                  required
                  startAdornment={<span>₹</span>}
                />
                <OutlinedTextField
                  label="Selling price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(e) => updateField('sellingPrice', e.target.value)}
                  required
                  startAdornment={<span>₹</span>}
                />
              </div>
              {savings > 0 ? (
                <p className="pf-savings">
                  Customer saves ₹
                  {savings.toLocaleString('en-IN', {
                    maximumFractionDigits: 2,
                  })}{' '}
                  vs MRP
                </p>
              ) : (
                <p className="product-form-hint">
                  Discount updates automatically when MRP and selling price
                  differ.
                </p>
              )}
            </section>

            <section className="products-card pf-section">
              <div className="pf-section-head">
                <h2>Inventory & status</h2>
                <p>Stock, returns, and catalog visibility.</p>
              </div>
              <div className="product-form-grid">
                <OutlinedTextField
                  label="Available quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={form.availableQuantity}
                  onChange={(e) =>
                    updateField('availableQuantity', e.target.value)
                  }
                  required
                />
                <OutlinedSelect
                  label="Stock status"
                  value={form.stockStatus}
                  onChange={(e) => updateField('stockStatus', e.target.value)}
                  options={STOCK_STATUSES}
                />
                <OutlinedSelect
                  label="Return eligibility"
                  value={form.returnEligibility}
                  onChange={(e) =>
                    updateField('returnEligibility', e.target.value)
                  }
                  options={RETURN_ELIGIBILITIES}
                />
                <OutlinedSelect
                  label="Product status"
                  value={form.productStatus}
                  onChange={(e) => updateField('productStatus', e.target.value)}
                  options={PRODUCT_STATUSES}
                />
              </div>
            </section>
          </div>
        </div>

        <div className="pf-footer">
          <p className="pf-footer-note">
            {isEdit
              ? 'Changes apply to the live catalog after you save.'
              : 'Product ID is assigned automatically when you create.'}
          </p>
          <div className="product-form-actions">
            <Link to="/products" className="products-btn secondary">
              Cancel
            </Link>
            <button type="submit" className="products-btn" disabled={saving}>
              {saving
                ? 'Saving…'
                : isEdit
                  ? 'Update product'
                  : 'Create product'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
