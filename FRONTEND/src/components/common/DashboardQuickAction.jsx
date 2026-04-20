import { useContext } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';

const BTN_WIDTH = 118;

/**
 * Botão de ação rápida — faixa colorida (proporção próxima do quadrado) + título + subtítulo.
 */
const DashboardQuickAction = ({ icon, label, subtitle, color, onClick }) => {
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();
    const isDark = mode === 'dark';

    return (
        <Box
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.();
                }
            }}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                cursor: 'pointer',
                flex: '0 0 auto',
                width: BTN_WIDTH,
                minWidth: BTN_WIDTH,
                maxWidth: BTN_WIDTH,
                borderRadius: '8px',
                overflow: 'hidden',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)',
                bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 24px ${color}35`,
                },
            }}
        >
            {/* Área do ícone: quadrada → cartão mais alto e menos “achatado” */}
            <Box
                sx={{
                    width: '100%',
                    aspectRatio: '1',
                    minHeight: 96,
                    bgcolor: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <span className="material-icons-round" style={{ color: '#ffffff', fontSize: '36px' }}>
                    {icon}
                </span>
            </Box>
            <Box
                sx={{
                    width: '100%',
                    py: 1,
                    px: 0.75,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                }}
            >
                <Typography
                    sx={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isDark ? '#e2e8f0' : color,
                        textAlign: 'center',
                        lineHeight: 1.25,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                    }}
                >
                    {label}
                </Typography>
                {subtitle ? (
                    <Typography
                        sx={{
                            fontSize: '10px',
                            fontWeight: 500,
                            color: theme.palette.text.secondary,
                            textAlign: 'center',
                            lineHeight: 1.3,
                            mt: 0.35,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }}
                    >
                        {subtitle}
                    </Typography>
                ) : null}
            </Box>
        </Box>
    );
};

export default DashboardQuickAction;
