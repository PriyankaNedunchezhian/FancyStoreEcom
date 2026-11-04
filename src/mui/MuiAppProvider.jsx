import { useMemo } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { useTheme } from '../context/ThemeContext';
import { createAdminMuiTheme } from './theme';

export default function MuiAppProvider({ children }) {
  const { theme } = useTheme();
  const muiTheme = useMemo(() => createAdminMuiTheme(theme), [theme]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
