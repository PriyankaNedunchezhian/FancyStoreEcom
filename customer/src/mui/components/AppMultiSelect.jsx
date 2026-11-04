import AppAutocomplete from './AppAutocomplete';

export default function AppMultiSelect(props) {
  return (
    <AppAutocomplete
      multiple
      disableCloseOnSelect
      {...props}
      value={props.value ?? []}
    />
  );
}
