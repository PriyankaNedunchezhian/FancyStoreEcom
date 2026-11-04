import AppTextField from '../../mui/components/AppTextField';

export default function OutlinedTextarea({ rows = 3, ...rest }) {
  return <AppTextField multiline minRows={rows} {...rest} />;
}
