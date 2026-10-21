import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import DataTableToolbar, { SortableTh } from '../components/DataTableToolbar';
import { deleteProduct, getProducts } from '../supabase/products';
import { exportToExcel, exportToPdf, printTable } from '../utils/tableExport';
import { filterRows, nextSortState, sortRows } from '../utils/tableHelpers';
import './Products.css';

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const EXPORT_COLUMNS = [
  { label: 'ID', getValue: (row) => row.productId },
  { label: 'Name', getValue: (row) => row.name },
  { label: 'Category', getValue: (row) => row.category || '—' },
  { label: 'MRP', getValue: (row) => Number(row.mrp || 0) },
  { label: 'Selling', getValue: (row) => Number(row.sellingPrice || 0) },
  {
    label: 'Discount %',
    getValue: (row) => Number(row.discount || 0).toFixed(1),
  },
  { label: 'Stock', getValue: (row) => row.stockStatus },
  { label: 'Qty', getValue: (row) => row.availableQuantity },
  { label: 'Status', getValue: (row) => row.productStatus },
];

function getSortValue(row, key) {
  switch (key) {
    case 'productId':
      return Number(row.productId);
    case 'name':
      return row.name;
    case 'category':
      return row.category;
    case 'mrp':
      return Number(row.mrp || 0);
    case 'sellingPrice':
      return Number(row.sellingPrice || 0);
    case 'discount':
      return Number(row.discount || 0);
    case 'stockStatus':
      return row.stockStatus;
    case 'availableQuantity':
      return Number(row.availableQuantity || 0);
    case 'productStatus':
      return row.productStatus;
    default:
      return '';
  }
}

function getSearchText(row) {
  return [
    row.productId,
    row.name,
    row.category,
    row.stockStatus,
    row.productStatus,
    row.mrp,
    row.sellingPrice,
    row.availableQuantity,
  ].join(' ');
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('productId');
  const [sortDir, setSortDir] = useState('desc');

  async function loadProducts() {
    setError('');
    setLoading(true);
    try {
      const list = await getProducts();
      setProducts(list);
    } catch (err) {
      console.error(err);
      setError(
        'Could not load products. Check Supabase URL/key, table setup, and RLS policies.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const visibleProducts = useMemo(() => {
    const filtered = filterRows(products, search, getSearchText);
    return sortRows(filtered, sortKey, sortDir, getSortValue);
  }, [products, search, sortKey, sortDir]);

  function handleSort(key) {
    const next = nextSortState(sortKey, sortDir, key);
    setSortKey(next.sortKey);
    setSortDir(next.sortDir);
  }

  function handleExportError(err) {
    console.error(err);
    setError(err?.message || 'Could not export table.');
  }

  function handleExportExcel() {
    try {
      exportToExcel({
        filename: 'products',
        sheetName: 'Products',
        columns: EXPORT_COLUMNS,
        rows: visibleProducts,
      });
    } catch (err) {
      handleExportError(err);
    }
  }

  function handleExportPdf() {
    try {
      exportToPdf({
        title: 'Fancy Store — Products',
        filename: 'products',
        columns: EXPORT_COLUMNS,
        rows: visibleProducts,
      });
    } catch (err) {
      handleExportError(err);
    }
  }

  function handlePrint() {
    try {
      printTable({
        title: 'Fancy Store — Products',
        columns: EXPORT_COLUMNS,
        rows: visibleProducts,
      });
    } catch (err) {
      handleExportError(err);
    }
  }

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

  const countLabel = loading
    ? 'Loading catalog…'
    : search.trim()
      ? `${visibleProducts.length} of ${products.length} product${products.length === 1 ? '' : 's'}`
      : `${products.length} product${products.length === 1 ? '' : 's'}`;

  return (
    <div className="products-page">
      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search products…"
        countLabel={countLabel}
        exportDisabled={loading || visibleProducts.length === 0}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        onPrint={handlePrint}
      >
        <Link
          to="/products/new"
          className="products-btn dtt-icon-only"
          title="Add product"
          aria-label="Add product"
        >
          <Plus size={22} strokeWidth={2.25} aria-hidden="true" />
        </Link>
      </DataTableToolbar>

      {error ? <p className="products-alert error">{error}</p> : null}

      <div className="products-card">
        {loading ? (
          <p className="products-loading">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="products-empty">
            No products yet. Add your first catalog item to get started.
          </p>
        ) : visibleProducts.length === 0 ? (
          <p className="products-empty">No products match your search.</p>
        ) : (
          <div className="products-table-wrap">
            <table className="products-table">
              <thead>
                <tr>
                  <SortableTh
                    label="ID"
                    sortKey="productId"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <th>Image</th>
                  <SortableTh
                    label="Name"
                    sortKey="name"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Category"
                    sortKey="category"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="MRP"
                    sortKey="mrp"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Selling"
                    sortKey="sellingPrice"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Discount"
                    sortKey="discount"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Stock"
                    sortKey="stockStatus"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Qty"
                    sortKey="availableQuantity"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Status"
                    sortKey="productStatus"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => (
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
                          className="products-btn secondary dtt-icon-only"
                          title="Edit"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil size={20} strokeWidth={2.25} aria-hidden="true" />
                        </Link>
                        <button
                          type="button"
                          className="products-btn danger dtt-icon-only"
                          title="Delete"
                          aria-label={`Delete ${product.name}`}
                          onClick={() => setDeleteTarget(product)}
                        >
                          <Trash2 size={20} strokeWidth={2.25} aria-hidden="true" />
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
