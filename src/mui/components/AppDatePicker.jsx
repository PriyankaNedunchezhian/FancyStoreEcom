import AppTextField from './AppTextField';

export default function AppDatePicker({ label = 'Date', ...rest }) {
  return <AppTextField type="date" label={label} InputLabelProps={{ shrink: true }} {...rest} />;
}
