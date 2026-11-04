import { useMemo } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createStoreMuiTheme } from './theme';

export default function MuiAppProvider({ children }) {
  const muiTheme = useMemo(() => createStoreMuiTheme(), []);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
