import { useId, useState } from 'react';
import './form-controls.css';

export default function OutlinedTextField({
  label,
  value = '',
  onChange,
  type = 'text',
  name,
  id,
  required = false,
  disabled = false,
  error = '',
  helperText = '',
  placeholder = ' ',
  className = '',
  startAdornment = null,
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
        filled ? 'of-filled' : '',
        focused ? 'of-focused' : '',
        showError ? 'of-error' : '',
        disabled ? 'of-disabled' : '',
        startAdornment ? 'of-with-start' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {startAdornment ? (
        <span className="of-start-adornment">{startAdornment}</span>
      ) : null}
      <input
        id={fieldId}
        className="of-input"
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
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
