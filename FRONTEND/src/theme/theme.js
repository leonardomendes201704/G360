import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';

// --- DESIGN TOKENS (G360 Deep Navy Enterprise) ---
const colors = {
  // Deep Navy Enterprise - Slate Scale
  primary: '#6366F1',       // Indigo - Brand/Ação Principal
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',

  // Backgrounds (Light Mode - mantém light para compatibilidade)
  bgPrimary: '#F8FAFC',     // Slate 50
  bgSecondary: '#FFFFFF',
  bgTertiary: '#F1F5F9',    // Slate 100

  // Backgrounds (Dark Mode - Slate Scale)
  bgDarkPrimary: '#0F172A',   // Slate 900 - Background Base
  bgDarkSecondary: '#1E293B', // Slate 800 - Surface 1 (Cards/Sidebar)
  bgDarkTertiary: '#334155',  // Slate 700 - Surface 2 (Inputs/Hover)

  // Text (Light Mode)
  textPrimary: '#0F172A',     // Slate 900
  textSecondary: '#475569',   // Slate 600
  textMuted: '#94A3B8',       // Slate 400

  // Text (Dark Mode - sem white puro para evitar halation)
  textDarkPrimary: '#F8FAFC',   // Slate 50 - Títulos/Dados
  textDarkSecondary: '#94A3B8', // Slate 400 - Labels/Descrições
  textDarkMuted: '#475569',     // Slate 600 - Desabilitado/Placeholder

  // Borders
  borderSubtle: 'rgba(0, 0, 0, 0.06)',
  borderDefault: 'rgba(0, 0, 0, 0.1)',
  borderDarkSubtle: '#334155',  // Slate 700 - 1px divisores dark mode

  // Semantic Colors (ajustadas conforme especificação)
  success: '#10B981',   // Emerald - Tarefas/Conclusão
  warning: '#F59E0B',   // Amber - Alertas/GMUDs
  error: '#EF4444',     // Red - Erro/Crítico
  info: '#0EA5E9',      // Sky - Projetos/Neutro
};

// Sombras customizadas (Tailwind-like + Glow effects)
const customShadows = [
  'none',
  '0 1px 2px rgba(0, 0, 0, 0.05)', // shadow-sm (elevation 1)
  '0 4px 12px rgba(0, 0, 0, 0.08)', // shadow-md (elevation 2)
  '0 8px 24px rgba(0, 0, 0, 0.12)', // shadow-lg (elevation 3)
  '0 0 40px rgba(37, 99, 235, 0.2)', // shadow-glow (usado em destaques)
  // ...preenchendo o restante para não quebrar o MUI (elevation 4-24)
  ...Array(20).fill('0 8px 24px rgba(0, 0, 0, 0.12)'),
];

let theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      light: colors.primaryLight,
      dark: colors.primaryDark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.textSecondary, // Usado para botões neutros/cinzas
      light: '#94a3b8',
      dark: '#334155',
      contrastText: '#ffffff',
    },
    error: {
      main: colors.error,
      bg: 'rgba(239, 68, 68, 0.1)',
    },
    warning: {
      main: colors.warning,
      bg: 'rgba(245, 158, 11, 0.1)',
    },
    success: {
      main: colors.success,
      bg: 'rgba(16, 185, 129, 0.1)',
    },
    info: {
      main: colors.info,
      bg: 'rgba(59, 130, 246, 0.1)',
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
      disabled: colors.textMuted,
    },
    background: {
      default: colors.bgPrimary,
      paper: colors.bgSecondary,
      neutral: colors.bgTertiary,
    },
    divider: colors.borderDefault,
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyCode: '"JetBrains Mono", monospace', // Para IDs e códigos

    // ========== HEADINGS (G360 Type Scale) ==========
    // H1 - Títulos de Página: 26px / 600 / line-height 120%
    h1: {
      fontSize: '1.625rem',       // 26px (--font-size-2xl)
      fontWeight: 600,
      letterSpacing: '-0.025em',
      lineHeight: 1.2,
      color: colors.textPrimary,
      fontFeatureSettings: '"tnum"',  // Tabular numbers
    },
    // H2 - Títulos de Cards/Seções: 18px / 600 / line-height 120%
    h2: {
      fontSize: '1.125rem',       // 18px (--font-size-medium)
      fontWeight: 600,
      letterSpacing: '-0.025em',
      lineHeight: 1.2,
      color: colors.textPrimary,
      fontFeatureSettings: '"tnum"',
    },
    // H3 - Destaques Numéricos/KPIs: 40px / 700 / line-height 120%
    h3: {
      fontSize: '2.5rem',         // 40px (--font-size-4xl)
      fontWeight: 700,
      letterSpacing: '-0.025em',
      lineHeight: 1.2,
      color: colors.textPrimary,
      fontFeatureSettings: '"tnum"',
    },
    h4: {
      fontSize: '1.25rem',        // 20px (--font-size-large)
      fontWeight: 600,
      letterSpacing: '-0.025em',
      lineHeight: 1.2,
      color: colors.textPrimary,
      fontFeatureSettings: '"tnum"',
    },
    h5: {
      fontSize: '1rem',           // 16px (--font-size-body)
      fontWeight: 600,
      lineHeight: 1.2,
      color: colors.textPrimary,
      fontFeatureSettings: '"tnum"',
    },
    h6: {
      fontSize: '0.875rem',       // 14px (--font-size-base)
      fontWeight: 600,
      lineHeight: 1.2,
      color: colors.textPrimary,
      fontFeatureSettings: '"tnum"',
    },

    // ========== BODY TEXT (Densidade de Informação) ==========
    // Body1 - Texto de leitura: 16px / line-height 150%
    body1: {
      fontSize: '1rem',           // 16px
      lineHeight: 1.5,
      color: colors.textPrimary,
      fontFeatureSettings: '"tnum"',
    },
    // Body2 - UI padrão (tabelas, formulários): 14px / line-height 150%
    body2: {
      fontSize: '0.875rem',       // 14px - Densidade de informação
      lineHeight: 1.5,
      color: colors.textSecondary,
      fontFeatureSettings: '"tnum"',
    },

    // ========== UTILITY VARIANTS ==========
    subtitle1: {
      fontSize: '1rem',           // 16px
      fontWeight: 500,
      lineHeight: 1.5,
      color: colors.textSecondary,
      fontFeatureSettings: '"tnum"',
    },
    subtitle2: {
      fontSize: '0.875rem',       // 14px
      fontWeight: 600,
      lineHeight: 1.5,
      color: colors.textSecondary,
      fontFeatureSettings: '"tnum"',
    },
    // Caption - Metadados/Labels: 12px / 500 / line-height 150%
    caption: {
      fontSize: '0.75rem',        // 12px (--font-size-small)
      fontWeight: 500,
      lineHeight: 1.5,
      color: colors.textMuted,
      fontFeatureSettings: '"tnum"',
    },
    overline: {
      fontSize: '0.625rem',       // 10px (--font-size-micro)
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      lineHeight: 1.2,
      color: colors.textMuted,
    },
    button: {
      fontSize: '0.875rem',       // 14px
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.01em',
      fontFeatureSettings: '"tnum"',
    },
  },
  shape: {
    borderRadius: 8, // Padrão para botões/inputs (--dark-radius-sm)
  },
  shadows: customShadows,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#e2e8f0 transparent',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            backgroundColor: 'transparent',
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#e2e8f0',
            minHeight: 24,
            border: '2px solid transparent',
            backgroundClip: 'content-box',
          },
          '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
            backgroundColor: '#cbd5e1',
          },
          '&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active': {
            backgroundColor: '#cbd5e1',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#cbd5e1',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,  // --dark-radius-sm
          padding: '10px 18px',
          boxShadow: 'none',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: customShadows[2],
          },
        },
        containedPrimary: {
          backgroundColor: '#2563eb',
          '&:hover': { backgroundColor: '#1d4ed8' },
        },
        outlined: {
          borderColor: colors.borderDefault,
          color: colors.textSecondary,
          '&:hover': {
            backgroundColor: colors.bgTertiary,
            borderColor: '#cbd5e1',
            color: colors.textPrimary,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: 8 },
        elevation0: { border: `1px solid ${colors.borderSubtle}` },
        elevation1: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #f1f5f9'
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: 8,
          padding: 24,      // Padding interno conforme especificação
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,  // --dark-radius-sm
          backgroundColor: '#ffffff',
          '& fieldset': { borderColor: '#e2e8f0' },
          '&:hover fieldset': { borderColor: '#cbd5e1' },
          '&.Mui-focused fieldset': {
            borderColor: '#2563eb',
            borderWidth: 2,
            boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.1)'
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 }, // Chips/Tags: 8px
        filled: {},
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#f8fafc',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
          color: '#64748b',
          fontWeight: 700,
        },
      },
    },
  },
}, ptBR);

theme = responsiveFontSizes(theme);

export default theme;