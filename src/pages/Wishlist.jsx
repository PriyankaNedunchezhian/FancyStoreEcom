import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database } from 'lucide-react';
import DataTableToolbar, { SortableTh } from '../components/DataTableToolbar';
import {
  getWishlistOverview,
  seedWishlistDemo,
} from '../supabase/wishlist';
import { exportToExcel, exportToPdf, printTable } from '../utils/tableExport';
import { filterRows, nextSortState, sortRows } from '../utils/tableHelpers';
import './Products.css';

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const EXPORT_COLUMNS = [
  { label: 'ID', getValue: (row) => row.productId },
  { label: 'Name', getValue: (row) => row.name },
  { label: 'Category', getValue: (row) => row.category || '—' },
  { label: 'Selling', getValue: (row) => Number(row.sellingPrice || 0) },
  { label: 'Stock', getValue: (row) => row.stockStatus },
  { label: 'Qty', getValue: (row) => row.availableQuantity },
  { label: 'Wishlist count', getValue: (row) => row.wishlistCount },
  {
    label: 'Last added',
    getValue: (row) => formatDate(row.lastAddedAt),
  },
];

function getSortValue(row, key) {
  switch (key) {
    case 'productId':
      return Number(row.productId);
    case 'name':
      return row.name;
    case 'category':
      return row.category;
    case 'sellingPrice':
      return Number(row.sellingPrice || 0);
    case 'stockStatus':
      return row.stockStatus;
    case 'availableQuantity':
      return Number(row.availableQuantity || 0);
    case 'wishlistCount':
      return Number(row.wishlistCount || 0);
    case 'lastAddedAt':
      return row.lastAddedAt || '';
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
    row.sellingPrice,
    row.availableQuantity,
    row.wishlistCount,
  ].join(' ');
}

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('wishlistCount');
  const [sortDir, setSortDir] = useState('desc');

  const loadOverview = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const list = await getWishlistOverview();
      setItems(list);
    } catch (err) {
      console.error(err);
      const detail = (err?.message || '').toLowerCase();
      if (
        detail.includes('relation') ||
        detail.includes('does not exist') ||
        detail.includes('schema cache') ||
        detail.includes('wishlists')
      ) {
        setError(
          'Wishlists table missing. Run supabase/schema.sql in the Supabase SQL Editor, then try again.',
        );
      } else {
        setError(
          'Could not load wishlist data. Check Supabase setup and RLS policies.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const visibleItems = useMemo(() => {
    const filtered = filterRows(items, search, getSearchText);
    return sortRows(filtered, sortKey, sortDir, getSortValue);
  }, [items, search, sortKey, sortDir]);

  function handleSort(key) {
    const next = nextSortState(sortKey, sortDir, key);
    setSortKey(next.sortKey);
    setSortDir(next.sortDir);
  }

  function handleExportError(err) {
    console.error(err);
    setError(err?.message || 'Could not export table.');
    setNotice('');
  }

  function handleExportExcel() {
    try {
      exportToExcel({
        filename: 'wishlist',
        sheetName: 'Wishlist',
        columns: EXPORT_COLUMNS,
        rows: visibleItems,
      });
    } catch (err) {
      handleExportError(err);
    }
  }

  function handleExportPdf() {
    try {
      exportToPdf({
        title: 'Fancy Store — Wishlist',
        filename: 'wishlist',
        columns: EXPORT_COLUMNS,
        rows: visibleItems,
      });
    } catch (err) {
      handleExportError(err);
    }
  }

  function handlePrint() {
    try {
      printTable({
        title: 'Fancy Store — Wishlist',
        columns: EXPORT_COLUMNS,
        rows: visibleItems,
      });
    } catch (err) {
      handleExportError(err);
    }
  }

  async function handleSeedDemo() {
    setSeeding(true);
    setError('');
    setNotice('');
    try {
      const total = await seedWishlistDemo();
      setNotice(
        `Sample wishlist data loaded (${total} demo customer save${total === 1 ? '' : 's'}).`,
      );
      await loadOverview();
    } catch (err) {
      console.error(err);
      const detail = (err?.message || '').toLowerCase();
      if (detail.includes('no products found')) {
        setError(
          'Add at least one product in the catalog, then load sample wishlist data again.',
        );
      } else if (
        detail.includes('function') ||
        detail.includes('seed_wishlist_demo') ||
        detail.includes('does not exist') ||
        detail.includes('schema cache')
      ) {
        setError(
          'Demo seeder missing. Run supabase/seed_wishlists.sql in the Supabase SQL Editor once, then try again.',
        );
      } else {
        setError(
          err?.message ||
            'Could not load sample data. Run supabase/seed_wishlists.sql first.',
        );
      }
    } finally {
      setSeeding(false);
    }
  }

  const totalSaves = visibleItems.reduce(
    (sum, item) => sum + item.wishlistCount,
    0,
  );

  const countLabel = loading
    ? 'Loading wishlist…'
    : items.length === 0
      ? 'No wishlist activity yet'
      : search.trim()
        ? `${visibleItems.length} of ${items.length} product${items.length === 1 ? '' : 's'}`
        : `${visibleItems.length} product${visibleItems.length === 1 ? '' : 's'} · ${totalSaves} save${totalSaves === 1 ? '' : 's'}`;

  return (
    <div className="products-page">
      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search wishlist…"
        countLabel={countLabel}
        exportDisabled={loading || visibleItems.length === 0}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        onPrint={handlePrint}
      >
        <button
          type="button"
          className="products-btn secondary dtt-icon-only"
          disabled={seeding || loading}
          title={seeding ? 'Loading sample…' : 'Load sample data'}
          aria-label={seeding ? 'Loading sample…' : 'Load sample data'}
          onClick={handleSeedDemo}
        >
          <Database size={22} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </DataTableToolbar>

      {error ? <p className="products-alert error">{error}</p> : null}
      {notice ? <p className="products-alert success">{notice}</p> : null}

      <div className="products-card">
        {loading ? (
          <p className="products-loading">Loading wishlist…</p>
        ) : items.length === 0 ? (
          <p className="products-empty">
            No products have been added to customer wishlists yet. Use “Load
            sample data” after running supabase/seed_wishlists.sql once.
          </p>
        ) : visibleItems.length === 0 ? (
          <p className="products-empty">No wishlist rows match your search.</p>
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
                    label="Selling"
                    sortKey="sellingPrice"
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
                    label="Wishlist count"
                    sortKey="wishlistCount"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Last added"
                    sortKey="lastAddedAt"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.productId}</td>
                    <td>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="products-thumb"
                        />
                      ) : (
                        <span className="products-thumb placeholder">N/A</span>
                      )}
                    </td>
                    <td className="products-name">{item.name}</td>
                    <td>{item.category || '—'}</td>
                    <td>{formatMoney(item.sellingPrice)}</td>
                    <td>
                      <span
                        className={`products-badge ${
                          item.stockStatus === 'In stock'
                            ? 'in-stock'
                            : 'out-of-stock'
                        }`}
                      >
                        {item.stockStatus}
                      </span>
                    </td>
                    <td>{item.availableQuantity}</td>
                    <td>{item.wishlistCount}</td>
                    <td>{formatDate(item.lastAddedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
