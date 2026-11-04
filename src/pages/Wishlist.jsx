import { useCallback, useEffect, useMemo, useState } from 'react';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import DataTableToolbar, { SortableTh } from '../components/DataTableToolbar';
import AppNotification from '../mui/components/AppNotification';
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
        <Tooltip title={seeding ? 'Loading sample…' : 'Load sample data'}>
          <span>
            <IconButton disabled={seeding || loading} onClick={handleSeedDemo} aria-label="Load sample data">
              <StorageOutlinedIcon />
            </IconButton>
          </span>
        </Tooltip>
      </DataTableToolbar>

      <AppNotification inline severity="error" message={error} />
      <AppNotification inline severity="success" message={notice} />

      <Paper variant="outlined" className="products-card table-card">
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
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <SortableTh
                    label="ID"
                    sortKey="productId"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <TableCell>Image</TableCell>
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
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleItems.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.productId}</TableCell>
                    <TableCell>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="products-thumb"
                        />
                      ) : (
                        <span className="products-thumb placeholder">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="products-name">{item.name}</TableCell>
                    <TableCell>{item.category || '—'}</TableCell>
                    <TableCell>{formatMoney(item.sellingPrice)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={item.stockStatus === 'In stock' ? 'success' : 'error'}
                        label={item.stockStatus}
                      />
                    </TableCell>
                    <TableCell>{item.availableQuantity}</TableCell>
                    <TableCell>{item.wishlistCount}</TableCell>
                    <TableCell>{formatDate(item.lastAddedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </div>
  );
}
