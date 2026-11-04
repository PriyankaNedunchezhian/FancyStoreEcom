import SearchIcon from '@mui/icons-material/Search';
import AppTextField from './AppTextField';

export default function AppSearchField({
  label = 'Search',
  placeholder = 'Search…',
  ...rest
}) {
  return (
    <AppTextField
      type="search"
      label={label}
      placeholder={placeholder}
      startAdornment={<SearchIcon fontSize="small" />}
      {...rest}
    />
  );
}
