import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import ConfirmDialog from '../components/ConfirmDialog';
import DataTableToolbar, { SortableTh } from '../components/DataTableToolbar';
import AppNotification from '../mui/components/AppNotification';
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
        <Tooltip title="Add product">
          <IconButton component={Link} to="/products/new" color="primary" aria-label="Add product">
            <AddIcon />
          </IconButton>
        </Tooltip>
      </DataTableToolbar>

      <AppNotification inline severity="error" message={error} />

      <Paper variant="outlined" className="products-card table-card">
        {loading ? (
          <p className="products-loading">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="products-empty">
            No products yet. Add your first catalog item to get started.
          </p>
        ) : visibleProducts.length === 0 ? (
          <p className="products-empty">No products match your search.</p>
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
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleProducts.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell>{product.productId}</TableCell>
                    <TableCell>
                      {product.imageUrl || product.imageUrls?.[0] ? (
                        <img
                          src={product.imageUrl || product.imageUrls[0]}
                          alt=""
                          className="products-thumb"
                        />
                      ) : (
                        <span className="products-thumb placeholder">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="products-name">{product.name}</TableCell>
                    <TableCell>{product.category || '—'}</TableCell>
                    <TableCell>{formatMoney(product.mrp)}</TableCell>
                    <TableCell>{formatMoney(product.sellingPrice)}</TableCell>
                    <TableCell>{Number(product.discount || 0).toFixed(1)}%</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={product.stockStatus === 'In stock' ? 'success' : 'error'}
                        label={product.stockStatus}
                      />
                    </TableCell>
                    <TableCell>{product.availableQuantity}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={product.productStatus === 'Active' ? 'info' : 'default'}
                        label={product.productStatus}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Edit">
                          <IconButton
                            component={Link}
                            to={`/products/${product.id}/edit`}
                            aria-label={`Edit ${product.name}`}
                            size="small"
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            color="error"
                            aria-label={`Delete ${product.name}`}
                            size="small"
                            onClick={() => setDeleteTarget(product)}
                          >
                            <DeleteOutlineOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

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
