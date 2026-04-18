import { createTheme } from '@mui/material/styles';

const lightPremiumTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#2563eb', // Blue 600 - Corporate blue
            light: '#3b82f6',
            dark: '#1d4ed8',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#64748b', // Slate 500 - Neutro para ações secundárias
            light: '#94a3b8',
            dark: '#475569',
            contrastText: '#ffffff',
        },
        success: {
            main: '#059669', // Emerald 600
            light: '#34d399',
            dark: '#047857',
        },
        warning: {
            main: '#d97706', // Amber 600
            light: '#fbbf24',
            dark: '#b45309',
        },
        error: {
            main: '#dc2626', // Red 600 - Atenção clara
            light: '#f87171',
            dark: '#b91c1c',
        },
        info: {
            main: '#0284c7', // Sky 600
            light: '#38bdf8',
            dark: '#0369a1',
        },
        background: {
            default: '#f8fafc', // Slate 50
            paper: '#ffffff',   // White
        },
        text: {
            primary: '#0f172a',   // Slate 900
            secondary: '#475569', // Slate 600
            disabled: '#94a3b8',  // Slate 400
        },
        divider: '#e2e8f0', // Slate 200
    },
    typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontFeatureSettings: '"tnum"',

        // Headers são escuros e nítidos
        h1: {
            fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '-0.5px',
            color: '#0f172a',
        },
        h2: {
            fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '1.75rem',
            fontWeight: 700,
            letterSpacing: '-0.5px',
            color: '#0f172a',
        },
        h3: {
            fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1e293b',
        },
        h4: {
            fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1e293b',
        },
        h5: {
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#334155',
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 600,
            color: '#334155',
        },
        body1: { fontSize: '1rem', color: '#334155', lineHeight: 1.6 },
        body2: { fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 },
        button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: {
        borderRadius: 12,
    },
    shadows: [
        'none',
        '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', // sm
        '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', // md
        '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', // lg
        '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', // xl
        '0 25px 50px -12px rgb(0 0 0 / 0.25)', // 2xl
        // ...filler shadows for MUI
        ...Array(19).fill('0 4px 6px -1px rgb(0 0 0 / 0.1)'),
    ],
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: '#f8fafc',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none', // No gradients by default
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0', // Subtle border
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)', // Soft shadow
                },
                elevation0: {
                    border: 'none',
                    boxShadow: 'none',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 16,
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    padding: '8px 16px',
                    boxShadow: 'none',
                },
                contained: {
                    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)', // Blue shadow
                    '&:hover': {
                        boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
                    },
                },
                outlined: {
                    borderColor: '#e2e8f0',
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    backgroundColor: '#ffffff',
                    '& fieldset': {
                        borderColor: '#e2e8f0',
                    },
                    '&:hover fieldset': {
                        borderColor: '#cbd5e1',
                    },
                    '&.Mui-focused fieldset': {
                        borderColor: '#2563eb',
                    },
                },
                input: ({ theme }) => ({
                    '&.MuiNativeSelect-select': {
                        display: 'inline-block',
                        color: theme.palette.text.primary,
                        WebkitTextFillColor: theme.palette.text.primary,
                    },
                }),
            },
        },
        MuiAutocomplete: {
            styleOverrides: {
                inputRoot: {
                    borderRadius: 8,
                },
            },
        },
        MuiMenu: {
            styleOverrides: {
                paper: {
                    borderRadius: 8,
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
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 8,
                },
            },
        },
        MuiTableHead: {
            styleOverrides: {
                root: {
                    '& .MuiTableCell-head': {
                        backgroundColor: '#f1f5f9', // Slate 100 header
                        color: '#475569',
                        fontWeight: 600,
                    },
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid #e2e8f0',
                },
            },
        },
    },
});

export default lightPremiumTheme;
