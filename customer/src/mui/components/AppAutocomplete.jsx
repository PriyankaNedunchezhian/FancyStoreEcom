import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

export default function AppAutocomplete({
  options = [],
  value = null,
  onChange,
  label,
  placeholder = 'Search…',
  error = '',
  helperText = '',
  loading = false,
  disabled = false,
  getOptionLabel = (option) =>
    typeof option === 'string' ? option : String(option?.label ?? option?.name ?? ''),
  isOptionEqualToValue,
  renderOption,
  ...rest
}) {
  return (
    <Autocomplete
      options={options}
      value={value}
      loading={loading}
      disabled={disabled}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={
        isOptionEqualToValue ||
        ((option, selected) =>
          (option?.value ?? option?.id ?? option) === (selected?.value ?? selected?.id ?? selected))
      }
      onChange={(event, next) => onChange?.(next, event)}
      renderOption={renderOption}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={Boolean(error)}
          helperText={error || helperText || undefined}
        />
      )}
      {...rest}
    />
  );
}
