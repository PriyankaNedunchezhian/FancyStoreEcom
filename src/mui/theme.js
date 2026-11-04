import { createTheme } from '@mui/material/styles';

const FIELD_HEIGHT = 44;

const ADMIN_TOKENS = {
  background: '#F8FAFC',
  paper: '#FFFFFF',
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  secondary: '#64748B',
  text: '#1E293B',
  muted: '#64748B',
  border: '#E2E8F0',
  borderHover: '#CBD5E1',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  selected: '#EFF6FF',
  selectedHover: '#DBEAFE',
  disabled: '#F1F5F9',
};

const STORE_TOKENS = {
  background: '#FAF7F2',
  paper: '#FFFFFF',
  primary: '#1C1917',
  primaryHover: '#000000',
  secondary: '#8C6A3D',
  text: '#1C1917',
  muted: '#78716C',
  border: '#E7E0D6',
  borderHover: '#CFC6BA',
  success: '#067647',
  warning: '#B45309',
  error: '#9F3D2F',
  info: '#8C6A3D',
  selected: '#F3EEE6',
  selectedHover: '#EAE2D6',
  disabled: '#F5F2EC',
};

function cssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

const menuPaperSx = (t) => ({
  mt: 0.75,
  maxHeight: 320,
  borderRadius: 2,
  border: `1px solid ${t.border}`,
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
});

function sharedComponents(t) {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: "'Poppins', system-ui, sans-serif",
          backgroundColor: t.background,
          color: t.text,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: FIELD_HEIGHT,
          paddingInline: 16,
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: 0,
          borderRadius: 10,
        },
        sizeSmall: { minHeight: 36, paddingInline: 12 },
        containedPrimary: {
          backgroundColor: t.primary,
          '&:hover': { backgroundColor: t.primaryHover },
        },
        outlined: {
          borderColor: t.border,
          color: t.text,
          backgroundColor: t.paper,
          '&:hover': { borderColor: t.primary, backgroundColor: t.selected },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          width: 40,
          height: 40,
          color: t.text,
          '&:hover': { backgroundColor: t.selected },
        },
        sizeSmall: { width: 32, height: 32 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          minHeight: FIELD_HEIGHT,
          backgroundColor: t.paper,
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.borderHover },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: t.primary,
            borderWidth: 2,
          },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: t.error },
          '&.Mui-disabled': { backgroundColor: t.disabled },
        },
        notchedOutline: { borderColor: t.border },
        input: { padding: '10px 14px', fontSize: '0.875rem' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          color: t.muted,
          '&.Mui-focused': { color: t.primary },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'medium', fullWidth: true },
    },
    MuiFormControl: {
      defaultProps: { fullWidth: true, size: 'medium' },
    },
    MuiSelect: {
      defaultProps: {
        fullWidth: true,
        MenuProps: { PaperProps: { sx: menuPaperSx(t) } },
      },
    },
    MuiAutocomplete: {
      defaultProps: {
        fullWidth: true,
        slotProps: { paper: { sx: menuPaperSx(t) } },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 40,
          fontSize: '0.875rem',
          '&.Mui-selected': {
            backgroundColor: t.selected,
            color: t.primary,
            '&:hover': { backgroundColor: t.selectedHover },
          },
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${t.border}`,
          backgroundColor: t.paper,
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        rounded: { borderRadius: 12 },
        outlined: { borderColor: t.border, backgroundColor: t.paper },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiDialog: {
      defaultProps: { fullWidth: true, maxWidth: 'xs' },
      styleOverrides: {
        paper: { borderRadius: 12, boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontFamily: "'Poppins', system-ui, sans-serif",
          borderColor: t.border,
          padding: '10px 14px',
          verticalAlign: 'middle',
        },
        head: {
          fontWeight: 700,
          fontSize: '0.72rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          color: t.muted,
          backgroundColor: t.background,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.MuiTableRow-hover:hover': { backgroundColor: t.selected },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: { color: t.borderHover, '&.Mui-checked': { color: t.primary } },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: { color: t.borderHover, '&.Mui-checked': { color: t.primary } },
      },
    },
  };
}

function typography(t) {
  return {
    fontFamily: "'Poppins', system-ui, sans-serif",
    h1: { fontWeight: 700, letterSpacing: '-0.03em', color: t.text },
    h2: { fontWeight: 700, letterSpacing: '-0.03em', color: t.text },
    h3: { fontWeight: 700, letterSpacing: '-0.02em', color: t.text },
    button: { fontFamily: "'Poppins', system-ui, sans-serif", textTransform: 'none', fontWeight: 600 },
  };
}

function buildTheme(t) {
  return createTheme({
    palette: {
      mode: 'light',
      primary: { main: t.primary },
      secondary: { main: t.secondary },
      error: { main: t.error },
      success: { main: t.success },
      warning: { main: t.warning },
      info: { main: t.info },
      background: { default: t.background, paper: t.paper },
      text: { primary: t.text, secondary: t.muted },
      divider: t.border,
    },
    typography: typography(t),
    shape: { borderRadius: 10 },
    spacing: 8,
    components: sharedComponents(t),
  });
}

export function createAdminMuiTheme(_themeId = 'classic') {
  const accent = cssVar('--accent', ADMIN_TOKENS.primary);
  return buildTheme({
    ...ADMIN_TOKENS,
    primary: accent,
    info: accent,
    primaryHover: accent,
    selected: cssVar('--info-bg', ADMIN_TOKENS.selected),
  });
}

export function createStoreMuiTheme() {
  return buildTheme(STORE_TOKENS);
}
