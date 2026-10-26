import { useId, useState } from 'react';
import './form-controls.css';

export default function OutlinedTextarea({
  label,
  value = '',
  onChange,
  name,
  id,
  required = false,
  disabled = false,
  error = '',
  helperText = '',
  rows = 3,
  placeholder = ' ',
  className = '',
  onFocus,
  onBlur,
  ...rest
}) {
  const autoId = useId();
  const fieldId = id || autoId;
  const [focused, setFocused] = useState(false);
  const filled = String(value ?? '').length > 0;
  const showError = Boolean(error);

  return (
    <div
      className={[
        'of-field',
        'of-textarea-field',
        filled ? 'of-filled' : '',
        focused ? 'of-focused' : '',
        showError ? 'of-error' : '',
        disabled ? 'of-disabled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <textarea
        id={fieldId}
        className="of-textarea"
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={showError || undefined}
        aria-describedby={
          showError || helperText ? `${fieldId}-helper` : undefined
        }
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {label ? (
        <label className="of-label" htmlFor={fieldId}>
          {label}
          {required ? ' *' : ''}
        </label>
      ) : null}
      {showError || helperText ? (
        <span
          id={`${fieldId}-helper`}
          className={`of-helper${showError ? ' of-error-text' : ''}`}
        >
          {error || helperText}
        </span>
      ) : null}
    </div>
  );
}
