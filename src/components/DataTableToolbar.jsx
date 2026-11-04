import { useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';
import AppSearchField from '../mui/components/AppSearchField';

export default function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  countLabel,
  exportDisabled = false,
  onExportExcel,
  onExportPdf,
  onPrint,
  children,
}) {
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
      }}
    >
      <Box sx={{ flex: { xs: '1 1 100%', sm: '0 1 320px' }, minWidth: 0 }}>
        <AppSearchField
          label={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </Box>
      {countLabel ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ flex: '1 1 auto', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {countLabel}
        </Typography>
      ) : null}

      <Stack
        direction="row"
        useFlexGap
        sx={{ alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, ml: 'auto' }}
      >
        <Tooltip title="Download">
          <span>
            <IconButton
              disabled={exportDisabled}
              onClick={(event) => setAnchorEl(event.currentTarget)}
              aria-label="Download"
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              onExportExcel?.();
            }}
          >
            Excel (.xlsx)
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              onExportPdf?.();
            }}
          >
            PDF
          </MenuItem>
        </Menu>
        <Tooltip title="Print">
          <span>
            <IconButton disabled={exportDisabled} onClick={() => onPrint?.()} aria-label="Print">
              <PrintIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        {children}
      </Stack>
    </Box>
  );
}

export function SortableTh({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}) {
  const active = activeKey === sortKey;
  return (
    <TableCell sortDirection={active ? direction : false}>
      <TableSortLabel
        active={active}
        direction={active ? direction : 'asc'}
        onClick={() => onSort(sortKey)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}
