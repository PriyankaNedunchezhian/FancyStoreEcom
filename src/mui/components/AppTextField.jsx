import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';

export default function AppTextField({
  error = '',
  helperText = '',
  startAdornment = null,
  endAdornment = null,
  className = '',
  ...rest
}) {
  return (
    <TextField
      className={className}
      error={Boolean(error)}
      helperText={error || helperText || undefined}
      InputProps={{
        ...(startAdornment
          ? { startAdornment: <InputAdornment position="start">{startAdornment}</InputAdornment> }
          : null),
        ...(endAdornment
          ? { endAdornment: <InputAdornment position="end">{endAdornment}</InputAdornment> }
          : null),
      }}
      {...rest}
    />
  );
}
