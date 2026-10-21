import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import { deleteProduct, getProducts } from '../supabase/products';
import './Products.css';

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadProducts() {
    setError('');
    setLoading(true);
    try {
      const list = await getProducts();
      setProducts(list);
    } catch (err) {
      console.error(err);
      setError('Could not load products. Check Supabase URL/key, table setup, and RLS policies.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleDeleteConfirm() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setError('');
    try {
      await deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      setError('Could not delete product. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="products-page">
      <div className="products-toolbar">
        <p>
          {loading
            ? 'Loading catalog…'
            : `${products.length} product${products.length === 1 ? '' : 's'}`}
        </p>
        <Link to="/products/new" className="products-btn">
          Add product
        </Link>
      </div>

      {error ? <p className="products-alert error">{error}</p> : null}

      <div className="products-card">
        {loading ? (
          <p className="products-loading">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="products-empty">
            No products yet. Add your first catalog item to get started.
          </p>
        ) : (
          <div className="products-table-wrap">
            <table className="products-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>MRP</th>
                  <th>Selling</th>
                  <th>Discount</th>
                  <th>Stock</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.productId}</td>
                    <td>
                      {product.imageUrl || product.imageUrls?.[0] ? (
                        <img
                          src={product.imageUrl || product.imageUrls[0]}
                          alt=""
                          className="products-thumb"
                        />
                      ) : (
                        <span className="products-thumb placeholder">N/A</span>
                      )}
                    </td>
                    <td className="products-name">{product.name}</td>
                    <td>{product.category || '—'}</td>
                    <td>{formatMoney(product.mrp)}</td>
                    <td>{formatMoney(product.sellingPrice)}</td>
                    <td>{Number(product.discount || 0).toFixed(1)}%</td>
                    <td>
                      <span
                        className={`products-badge ${
                          product.stockStatus === 'In stock'
                            ? 'in-stock'
                            : 'out-of-stock'
                        }`}
                      >
                        {product.stockStatus}
                      </span>
                    </td>
                    <td>{product.availableQuantity}</td>
                    <td>
                      <span
                        className={`products-badge ${
                          product.productStatus === 'Active'
                            ? 'active'
                            : 'inactive'
                        }`}
                      >
                        {product.productStatus}
                      </span>
                    </td>
                    <td>
                      <div className="products-actions">
                        <Link
                          to={`/products/${product.id}/edit`}
                          className="products-btn secondary"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="products-btn danger"
                          onClick={() => setDeleteTarget(product)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete product?"
        message={
          deleteTarget
            ? `Delete “${deleteTarget.name}” (ID ${deleteTarget.productId})? This cannot be undone.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        cancelLabel="Cancel"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
