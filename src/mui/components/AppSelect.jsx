import { Children, isValidElement } from 'react';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

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

export default function AppSelect({
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
  ...rest
}) {
  const items = collectOptions(options, children, placeholder, required);
  const labelId = id ? `${id}-label` : undefined;
  const showError = Boolean(error);

  return (
    <FormControl
      className={className}
      error={showError}
      disabled={disabled}
      required={required}
    >
      {label ? <InputLabel id={labelId}>{label}</InputLabel> : null}
      <Select
        id={id}
        labelId={labelId}
        label={label}
        name={name}
        value={value ?? ''}
        displayEmpty
        onChange={(event) => {
          onChange?.({
            target: { value: event.target.value, name: name || event.target.name || '' },
            currentTarget: { value: event.target.value, name: name || event.target.name || '' },
          });
        }}
        {...rest}
      >
        {items.map((item) => (
          <MenuItem key={`${item.value}::${item.label}`} value={item.value}>
            {item.label}
          </MenuItem>
        ))}
      </Select>
      {showError || helperText ? (
        <FormHelperText>{error || helperText}</FormHelperText>
      ) : null}
    </FormControl>
  );
}
