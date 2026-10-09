import './ConfirmDialog.css';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="confirm-backdrop" onClick={onCancel} role="presentation">
      <div
        className="confirm-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-message">{message}</p>

        <div className="confirm-actions">
          <button type="button" className="confirm-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-ok${danger ? ' danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
