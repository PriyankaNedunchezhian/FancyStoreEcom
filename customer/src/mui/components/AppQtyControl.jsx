import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function AppQtyControl({
  value,
  onDecrease,
  onIncrease,
  decreaseLabel = 'Decrease quantity',
  increaseLabel = 'Increase quantity',
  disabled = false,
}) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        width: 'fit-content',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      <IconButton
        size="small"
        onClick={onDecrease}
        aria-label={decreaseLabel}
        disabled={disabled}
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Typography component="span" sx={{ minWidth: 28, textAlign: 'center', fontWeight: 600 }}>
        {value}
      </Typography>
      <IconButton
        size="small"
        onClick={onIncrease}
        aria-label={increaseLabel}
        disabled={disabled}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
