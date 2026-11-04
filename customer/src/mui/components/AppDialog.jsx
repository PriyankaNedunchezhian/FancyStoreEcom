import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function AppDialog({
  open,
  title,
  message,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
  maxWidth = 'xs',
}) {
  return (
    <Dialog open={Boolean(open)} onClose={onCancel} maxWidth={maxWidth} fullWidth>
      {title ? <DialogTitle>{title}</DialogTitle> : null}
      <DialogContent>
        {message ? <DialogContentText>{message}</DialogContentText> : null}
        {children}
      </DialogContent>
      {onConfirm || onCancel ? (
        <DialogActions>
          {onCancel ? (
            <Button onClick={onCancel} color="inherit">
              {cancelLabel}
            </Button>
          ) : null}
          {onConfirm ? (
            <Button onClick={onConfirm} color={danger ? 'error' : 'primary'} variant="contained">
              {confirmLabel}
            </Button>
          ) : null}
        </DialogActions>
      ) : null}
    </Dialog>
  );
}
