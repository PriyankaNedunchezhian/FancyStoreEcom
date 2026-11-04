import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

export default function AppButton({
  children,
  loading = false,
  variant = 'contained',
  color = 'primary',
  fullWidth = false,
  startIcon,
  ...rest
}) {
  return (
    <Button
      variant={variant}
      color={color}
      fullWidth={fullWidth}
      disabled={loading || rest.disabled}
      startIcon={
        loading ? <CircularProgress color="inherit" size={16} /> : startIcon
      }
      {...rest}
    >
      {children}
    </Button>
  );
}
