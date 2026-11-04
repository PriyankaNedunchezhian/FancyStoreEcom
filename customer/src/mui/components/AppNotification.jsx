import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

export default function AppNotification({
  open,
  message,
  severity = 'info',
  onClose,
  autoHideDuration = 4000,
  inline = false,
}) {
  if (inline) {
    if (!message) return null;
    return (
      <Alert severity={severity} onClose={onClose || undefined} sx={{ mb: 2 }}>
        {message}
      </Alert>
    );
  }

  return (
    <Snackbar
      open={Boolean(open && message)}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity={severity} onClose={onClose} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
