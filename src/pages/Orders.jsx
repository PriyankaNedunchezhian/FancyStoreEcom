import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
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
import {
  canDeleteOrder,
  canEditOrder,
  deleteOrder,
  getOrders,
  seedOrdersDemo,
} from '../supabase/orders';
import { exportToExcel, exportToPdf, printTable } from '../utils/tableExport';
import { filterRows, nextSortState, sortRows } from '../utils/tableHelpers';
import './Products.css';
import './Orders.css';

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

function statusClass(status) {
  return String(status || '')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

const EXPORT_COLUMNS = [
  { label: 'Order ID', getValue: (row) => row.orderId },
  { label: 'Customer', getValue: (row) => row.customerName || '—' },
  { label: 'Phone', getValue: (row) => row.customerPhone || '—' },
  { label: 'Items', getValue: (row) => row.itemCount },
  { label: 'Total', getValue: (row) => Number(row.total || 0) },
  { label: 'Status', getValue: (row) => row.status },
  { label: 'Payment', getValue: (row) => row.paymentStatus },
  { label: 'Created', getValue: (row) => formatDate(row.createdAt) },
];

function getSortValue(row, key) {
  switch (key) {
    case 'orderId':
      return Number(row.orderId);
    case 'customerName':
      return row.customerName;
    case 'itemCount':
      return Number(row.itemCount || 0);
    case 'total':
      return Number(row.total || 0);
    case 'status':
      return row.status;
    case 'paymentStatus':
      return row.paymentStatus;
    case 'createdAt':
      return row.createdAt || '';
    default:
      return '';
  }
}

function getSearchText(row) {
  return [
    row.orderId,
    row.customerName,
    row.customerPhone,
    row.customerEmail,
    row.status,
    row.paymentStatus,
    row.total,
    row.notes,
  ].join(' ');
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('orderId');
  const [sortDir, setSortDir] = useState('desc');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadOrders = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const list = await getOrders();
      setOrders(list);
    } catch (err) {
      console.error(err);
      const detail = (err?.message || '').toLowerCase();
      if (
        detail.includes('relation') ||
        detail.includes('does not exist') ||
        detail.includes('schema cache') ||
        detail.includes('orders')
      ) {
        setError(
          'Orders table missing. Run supabase/schema.sql in the Supabase SQL Editor, then try again.',
        );
      } else {
        setError(
          'Could not load orders. Check Supabase setup and RLS policies.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const visibleOrders = useMemo(() => {
    const filtered = filterRows(orders, search, getSearchText);
    return sortRows(filtered, sortKey, sortDir, getSortValue);
  }, [orders, search, sortKey, sortDir]);

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
        filename: 'orders',
        sheetName: 'Orders',
        columns: EXPORT_COLUMNS,
        rows: visibleOrders,
      });
    } catch (err) {
      handleExportError(err);
    }
  }

  function handleExportPdf() {
    try {
      exportToPdf({
        title: 'Fancy Store — Orders',
        filename: 'orders',
        columns: EXPORT_COLUMNS,
        rows: visibleOrders,
      });
    } catch (err) {
      handleExportError(err);
    }
  }

  function handlePrint() {
    try {
      printTable({
        title: 'Fancy Store — Orders',
        columns: EXPORT_COLUMNS,
        rows: visibleOrders,
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
      const total = await seedOrdersDemo();
      setNotice(
        `Sample orders loaded (${total} demo order${total === 1 ? '' : 's'}).`,
      );
      await loadOrders();
    } catch (err) {
      console.error(err);
      const detail = (err?.message || '').toLowerCase();
      if (detail.includes('no products found')) {
        setError(
          'Add at least one product in the catalog, then load sample orders again.',
        );
      } else if (
        detail.includes('function') ||
        detail.includes('seed_orders_demo') ||
        detail.includes('does not exist') ||
        detail.includes('schema cache')
      ) {
        setError(
          'Demo seeder missing. Run supabase/seed_orders.sql in the Supabase SQL Editor once, then try again.',
        );
      } else {
        setError(
          err?.message ||
            'Could not load sample data. Run supabase/seed_orders.sql first.',
        );
      }
    } finally {
      setSeeding(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setError('');
    try {
      await deleteOrder(deleteTarget.id);
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not delete order.');
    } finally {
      setDeleting(false);
    }
  }

  const countLabel = loading
    ? 'Loading orders…'
    : search.trim()
      ? `${visibleOrders.length} of ${orders.length} order${orders.length === 1 ? '' : 's'}`
      : `${orders.length} order${orders.length === 1 ? '' : 's'}`;

  return (
    <div className="products-page">
      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search orders…"
        countLabel={countLabel}
        exportDisabled={loading || visibleOrders.length === 0}
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
        <Tooltip title="Add order">
          <IconButton component={Link} to="/orders/new" color="primary" aria-label="Add order">
            <AddIcon />
          </IconButton>
        </Tooltip>
      </DataTableToolbar>

      <AppNotification inline severity="error" message={error} />
      <AppNotification inline severity="success" message={notice} />

      <Paper variant="outlined" className="products-card table-card">
        {loading ? (
          <p className="products-loading">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="products-empty">
            No orders yet. Create an order or load sample data after running
            supabase/seed_orders.sql.
          </p>
        ) : visibleOrders.length === 0 ? (
          <p className="products-empty">No orders match your search.</p>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <SortableTh
                    label="Order ID"
                    sortKey="orderId"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Customer"
                    sortKey="customerName"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Items"
                    sortKey="itemCount"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Total"
                    sortKey="total"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Status"
                    sortKey="status"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Payment"
                    sortKey="paymentStatus"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Created"
                    sortKey="createdAt"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleOrders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>{order.orderId}</TableCell>
                    <TableCell className="products-name">
                      {order.customerName || '—'}
                    </TableCell>
                    <TableCell>{order.itemCount}</TableCell>
                    <TableCell>{formatMoney(order.total)}</TableCell>
                    <TableCell>
                      <Chip size="small" className={`orders-badge ${statusClass(order.status)}`} label={order.status} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" className={`orders-badge ${statusClass(order.paymentStatus)}`} label={order.paymentStatus} />
                    </TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="View">
                          <IconButton component={Link} to={`/orders/${order.id}`} size="small" aria-label={`View order ${order.orderId}`}>
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {canEditOrder(order) ? (
                          <Tooltip title="Edit">
                            <IconButton component={Link} to={`/orders/${order.id}/edit`} size="small" aria-label={`Edit order ${order.orderId}`}>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                        {canDeleteOrder(order) ? (
                          <Tooltip title="Delete">
                            <IconButton color="error" size="small" aria-label={`Delete order ${order.orderId}`} onClick={() => setDeleteTarget(order)}>
                              <DeleteOutlineOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}
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
        title="Delete order?"
        message={
          deleteTarget
            ? `Delete order #${deleteTarget.orderId}? This cannot be undone.`
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
