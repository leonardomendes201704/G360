import { createTheme } from '@mui/material/styles';

const darkPremiumTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#2563eb',
            light: '#3b82f6',
            dark: '#1d4ed8',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#6366f1',
            light: '#818cf8',
            dark: '#4f46e5',
        },
        success: {
            main: '#10b981',
            light: '#34d399',
            dark: '#059669',
        },
        warning: {
            main: '#f59e0b',
            light: '#fbbf24',
            dark: '#d97706',
        },
        error: {
            main: '#f43f5e',
            light: '#fb7185',
            dark: '#e11d48',
        },
        info: {
            main: '#06b6d4',
            light: '#22d3ee',
            dark: '#0891b2',
        },
        background: {
            default: '#0f1419',
            paper: '#161d26',
        },
        text: {
            primary: '#f1f5f9',
            secondary: '#94a3b8',
            disabled: '#64748b',
        },
        divider: 'rgba(255, 255, 255, 0.06)',
    },
    typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontFeatureSettings: '"tnum"',  // Tabular numbers for data clarity

        // ========== HEADINGS - Inter with Tabular Numbers ==========
        h1: {
            fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '2rem',           // 32px (--font-size-3xl)
            fontWeight: 700,
            letterSpacing: '-0.5px',
            fontFeatureSettings: '"tnum"',
        },
        h2: {
            fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '1.75rem',        // 28px (--font-size-2xl)
            fontWeight: 700,
            letterSpacing: '-0.5px',
            fontFeatureSettings: '"tnum"',
        },
        h3: {
            fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '1.5rem',         // 24px (--font-size-xl)
            fontWeight: 700,
            letterSpacing: '-0.025em',
            fontFeatureSettings: '"tnum"',
        },
        h4: {
            fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '1.25rem',        // 20px (--font-size-large)
            fontWeight: 700,
            letterSpacing: '-0.025em',
            fontFeatureSettings: '"tnum"',
        },
        h5: {
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '1.125rem',       // 18px (--font-size-medium)
            fontWeight: 600,
            fontFeatureSettings: '"tnum"',
        },
        h6: {
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '1rem',           // 16px (--font-size-body)
            fontWeight: 600,
            fontFeatureSettings: '"tnum"',
        },

        // ========== BODY TEXT ==========
        body1: {
            fontSize: '1rem',           // 16px - Texto de leitura
            lineHeight: 1.5,
        },
        body2: {
            fontSize: '0.875rem',       // 14px - UI padrão
            lineHeight: 1.5,
        },

        // ========== UTILITY VARIANTS ==========
        subtitle1: {
            fontSize: '1rem',           // 16px
            fontWeight: 500,
        },
        subtitle2: {
            fontSize: '0.875rem',       // 14px
            fontWeight: 600,
        },
        caption: {
            fontSize: '0.75rem',        // 12px - Metadados
            lineHeight: 1.4,
        },
        overline: {
            fontSize: '0.625rem',       // 10px - Labels uppercase
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
        },
        button: {
            fontSize: '0.875rem',       // 14px
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 12,
    },
    shadows: [
        'none',
        '0 2px 8px rgba(0, 0, 0, 0.3)',
        '0 4px 12px rgba(0, 0, 0, 0.3)',
        '0 8px 16px rgba(0, 0, 0, 0.35)',
        '0 8px 24px rgba(0, 0, 0, 0.4)',
        '0 12px 28px rgba(0, 0, 0, 0.4)',
        '0 16px 32px rgba(0, 0, 0, 0.45)',
        '0 0 40px rgba(0, 0, 0, 0.15)',
        ...Array(17).fill('none'),
    ],
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: '#0f1419',
                    backgroundImage: 'none',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    transition: 'border-color 0.2s ease',
                    '&:hover': {
                        borderColor: 'rgba(37, 99, 235, 0.2)',
                    },
                },
                elevation0: {
                    backgroundImage: 'none',
                    border: 'none',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 16,
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    padding: '10px 20px',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                },
                contained: {
                    background: '#2563eb',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                    '&:hover': {
                        background: '#1d4ed8',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                    },
                },
                outlined: {
                    borderColor: 'rgba(255, 255, 255, 0.06)',
                    '&:hover': {
                        borderColor: 'rgba(37, 99, 235, 0.3)',
                        background: 'rgba(37, 99, 235, 0.05)',
                    },
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                        backgroundColor: '#1c2632',
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                    borderRadius: 20,
                },
                outlined: {
                    borderWidth: 1,
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',    // 14px - Consistente com sistema
                    minHeight: 48,
                    color: '#64748b',
                    '&.Mui-selected': {
                        color: '#2563eb',
                    },
                    '&:hover': {
                        color: '#94a3b8',
                    },
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                indicator: {
                    backgroundColor: '#2563eb',
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderColor: 'rgba(255, 255, 255, 0.06)',
                },
                head: {
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',    // 12px - Consistente com tema light
                    letterSpacing: '1px',
                    color: '#64748b',
                },
            },
        },
        MuiLinearProgress: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    height: 8,
                    backgroundColor: '#1c2632',
                },
                bar: {
                    borderRadius: 6,
                    background: '#2563eb',
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    backgroundColor: '#1c2632',
                    '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.06)',
                    },
                    '&:hover fieldset': {
                        borderColor: 'rgba(37, 99, 235, 0.3)',
                    },
                    '&.Mui-focused fieldset': {
                        borderColor: '#2563eb',
                    },
                },
                // TextField select + SelectProps.native — display:flex no input quebra o texto fechado no Chrome/Edge
                input: ({ theme }) => ({
                    '&.MuiNativeSelect-select': {
                        display: 'inline-block',
                        color: theme.palette.text.primary,
                        WebkitTextFillColor: theme.palette.text.primary,
                    },
                }),
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                        backgroundColor: '#1c2632',
                        '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.06)',
                        },
                        '&:hover fieldset': {
                            borderColor: 'rgba(37, 99, 235, 0.3)',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#2563eb',
                        },
                    },
                },
            },
        },
        MuiAutocomplete: {
            styleOverrides: {
                inputRoot: {
                    borderRadius: 8,
                },
            },
        },
        MuiSelect: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    backgroundColor: '#1c2632',
                },
            },
        },
        MuiMenu: {
            styleOverrides: {
                paper: {
                    borderRadius: 8,
                    backgroundImage: 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                },
            },
        },
        MuiPopover: {
            styleOverrides: {
                paper: {
                    borderRadius: 8,
                },
            },
        },
        MuiMenuItem: {
            styleOverrides: {
                root: {
                    '&:hover': {
                        backgroundColor: '#1c2632',
                    },
                    '&.Mui-selected': {
                        backgroundColor: 'rgba(37, 99, 235, 0.15)',
                        '&:hover': {
                            backgroundColor: 'rgba(37, 99, 235, 0.2)',
                        },
                    },
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 8,
                    backgroundImage: 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                },
            },
        },
    },
});

export default darkPremiumTheme;
