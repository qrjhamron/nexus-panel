import { createTheme, type ThemeOptions, type Theme } from '@mui/material/styles';

const sharedTypography: ThemeOptions['typography'] = {
  fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
  h1: { fontWeight: 700, letterSpacing: '-0.02em' },
  h2: { fontWeight: 700, letterSpacing: '-0.01em' },
  h3: { fontWeight: 600 },
  h4: { fontWeight: 600 },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
  subtitle1: { fontWeight: 500 },
  subtitle2: { fontWeight: 500 },
  button: { fontWeight: 600, textTransform: 'none' as const },
  overline: { fontWeight: 600, letterSpacing: '0.08em' },
};

const sharedShape = { borderRadius: 12 };

const darkPalette: ThemeOptions['palette'] = {
  mode: 'dark',
  primary: { main: '#00E5FF', light: '#6EFFFF', dark: '#00B2CC', contrastText: '#0A0E14' },
  secondary: { main: '#7C4DFF', light: '#B47CFF', dark: '#3F1DCB' },
  success: { main: '#00E676', light: '#66FFA6', dark: '#00B248' },
  warning: { main: '#FFAB00', light: '#FFD740', dark: '#FF8F00' },
  error: { main: '#FF5252', light: '#FF8A80', dark: '#D32F2F' },
  info: { main: '#40C4FF', light: '#82F7FF', dark: '#0094CC' },
  background: { default: '#0A0E14', paper: '#131922' },
  text: { primary: 'rgba(255, 255, 255, 0.92)', secondary: 'rgba(255, 255, 255, 0.58)' },
  divider: 'rgba(255, 255, 255, 0.08)',
  action: {
    hover: 'rgba(255, 255, 255, 0.05)',
    selected: 'rgba(0, 229, 255, 0.12)',
    disabled: 'rgba(255, 255, 255, 0.26)',
    disabledBackground: 'rgba(255, 255, 255, 0.08)',
  },
};

const lightPalette: ThemeOptions['palette'] = {
  mode: 'light',
  primary: { main: '#0097A7', light: '#00BCD4', dark: '#006064', contrastText: '#FFFFFF' },
  secondary: { main: '#5C6BC0', light: '#7986CB', dark: '#3949AB' },
  success: { main: '#2E7D32', light: '#4CAF50', dark: '#1B5E20' },
  warning: { main: '#F57F17', light: '#FFB300', dark: '#E65100' },
  error: { main: '#D32F2F', light: '#EF5350', dark: '#B71C1C' },
  info: { main: '#0288D1', light: '#03A9F4', dark: '#01579B' },
  background: { default: '#F5F7FA', paper: '#FFFFFF' },
  text: { primary: 'rgba(0, 0, 0, 0.87)', secondary: 'rgba(0, 0, 0, 0.54)' },
  divider: 'rgba(0, 0, 0, 0.08)',
};

function buildComponents(mode: 'dark' | 'light'): ThemeOptions['components'] {
  const isDark = mode === 'dark';
  const surfaceBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const elevated = isDark ? '#1A2233' : '#F0F2F5';
  const sidebarBg = isDark ? '#0D1117' : '#FAFBFC';

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: { scrollbarWidth: 'thin' },
        '::-webkit-scrollbar': { width: 6, height: 6 },
        '::-webkit-scrollbar-thumb': {
          background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
          borderRadius: 3,
        },
        '::-webkit-scrollbar-track': { background: 'transparent' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          backgroundColor: isDark ? '#131922' : '#FFFFFF',
          border: `1px solid ${surfaceBorder}`,
          borderRadius: 12,
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12, backgroundImage: 'none' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, textTransform: 'none', fontWeight: 600, padding: '8px 20px' },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
      defaultProps: { disableElevation: true },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 6, fontWeight: 500 } },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: sidebarBg,
          borderRight: `1px solid ${surfaceBorder}`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: isDark ? 'rgba(10,14,20,0.72)' : 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${surfaceBorder}`,
          boxShadow: 'none',
          color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.87)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: elevated,
            fontWeight: 600,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 6 },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: 8, margin: '2px 8px' },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  };
}

export const darkTheme: Theme = createTheme({
  palette: darkPalette,
  typography: sharedTypography,
  shape: sharedShape,
  components: buildComponents('dark'),
});

export const lightTheme: Theme = createTheme({
  palette: lightPalette,
  typography: sharedTypography,
  shape: sharedShape,
  components: buildComponents('light'),
});
