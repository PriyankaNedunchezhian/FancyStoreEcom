import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronDown } from 'lucide-react';
import './form-controls.css';

function collectOptions(options, children, placeholder, required) {
  if (Children.count(children) > 0) {
    const list = [];
    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return;
      const optionValue =
        child.props.value === undefined || child.props.value === null
          ? ''
          : String(child.props.value);
      const optionLabel = child.props.children;
      list.push({
        value: optionValue,
        label:
          typeof optionLabel === 'string' || typeof optionLabel === 'number'
            ? String(optionLabel)
            : optionValue || placeholder,
      });
    });
    return list;
  }

  const list = [];
  if (!required) {
    list.push({ value: '', label: placeholder });
  }
  for (const opt of options) {
    if (typeof opt === 'object' && opt !== null) {
      list.push({
        value: String(opt.value ?? ''),
        label: String(opt.label ?? opt.value ?? ''),
      });
    } else {
      list.push({ value: String(opt), label: String(opt) });
    }
  }
  return list;
}

export default function OutlinedSelect({
  label,
  value = '',
  onChange,
  name,
  id,
  required = false,
  disabled = false,
  error = '',
  helperText = '',
  options = [],
  placeholder = 'Select…',
  className = '',
  children,
  onFocus,
  onBlur,
}) {
  const autoId = useId();
  const fieldId = id || autoId;
  const listboxId = `${fieldId}-listbox`;
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const showError = Boolean(error);

  const items = useMemo(
    () => collectOptions(options, children, placeholder, required),
    [options, children, placeholder, required],
  );

  const selected = items.find((item) => item.value === String(value ?? '')) || null;
  const displayLabel = selected?.label || placeholder;

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
        setFocused(false);
        onBlur?.({ target: { value } });
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        setFocused(false);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onBlur, value]);

  function emitChange(nextValue) {
    onChange?.({
      target: {
        value: nextValue,
        name: name || '',
      },
      currentTarget: {
        value: nextValue,
        name: name || '',
      },
    });
  }

  function toggleOpen() {
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        setFocused(true);
        onFocus?.({ target: { value } });
      } else {
        setFocused(false);
        onBlur?.({ target: { value } });
      }
      return next;
    });
  }

  function choose(nextValue) {
    emitChange(nextValue);
    setOpen(false);
    setFocused(false);
    onBlur?.({ target: { value: nextValue } });
  }

  return (
    <div
      ref={rootRef}
      className={[
        'of-field',
        'of-select-field',
        'of-filled',
        focused || open ? 'of-focused' : '',
        showError ? 'of-error' : '',
        disabled ? 'of-disabled' : '',
        open ? 'of-open' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <select
        id={fieldId}
        className="of-native-select"
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={() => {}}
      >
        {items.map((item) => (
          <option key={`${item.value}::${item.label}`} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="of-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-invalid={showError || undefined}
        aria-describedby={
          showError || helperText ? `${fieldId}-helper` : undefined
        }
        onClick={toggleOpen}
      >
        <span
          className={`of-select-value${selected ? '' : ' of-select-placeholder'}`}
        >
          {displayLabel}
        </span>
        <ChevronDown
          className="of-select-chevron"
          size={15}
          strokeWidth={2.25}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          id={listboxId}
          className="of-select-menu"
          role="listbox"
          aria-labelledby={fieldId}
        >
          {items.map((item) => {
            const active = String(value ?? '') === item.value;
            return (
              <li key={`${item.value}::${item.label}`} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`of-select-option${active ? ' selected' : ''}`}
                  onClick={() => choose(item.value)}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {label ? (
        <label className="of-label" id={`${fieldId}-label`}>
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
