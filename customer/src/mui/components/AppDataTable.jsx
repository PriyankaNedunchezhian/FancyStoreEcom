import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

export default function AppDataTable({
  columns = [],
  rows = [],
  loading = false,
  emptyMessage = 'No records found.',
  sortKey,
  sortDir = 'asc',
  onSort,
  getRowId = (row, index) => row.id ?? index,
}) {
  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!rows.length) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.id} align={column.align || 'left'} sx={column.sx}>
                {column.sortable && onSort ? (
                  <TableSortLabel
                    active={sortKey === column.id}
                    direction={sortKey === column.id ? sortDir : 'asc'}
                    onClick={() => onSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={getRowId(row, index)} hover>
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align || 'left'}>
                  {column.render ? column.render(row) : row[column.id]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
