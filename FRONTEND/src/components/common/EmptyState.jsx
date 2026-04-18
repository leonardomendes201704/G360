import React from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { SearchOff, Add } from '@mui/icons-material';

const EmptyState = ({
    title = 'Nenhum dado encontrado',
    description = 'Tente ajustar os filtros ou criar um novo registro.',
    icon = <SearchOff fontSize="inherit" />,
    actionLabel,
    actionIcon = <Add />,
    onAction,
    action, // backward compat: pass a full JSX element
    compact = false,
}) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: compact ? 5 : 8,
            px: 3,
            textAlign: 'center',
        }}>
            {/* Decorative animated icon container */}
            <Box sx={{
                width: compact ? 80 : 120,
                height: compact ? 80 : 120,
                borderRadius: '8px',
                background: isDark
                    ? 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0.03) 70%, transparent 100%)'
                    : 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.02) 70%, transparent 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: compact ? 2 : 3,
                position: 'relative',
                animation: 'emptyStatePulse 3s ease-in-out infinite',
                '@keyframes emptyStatePulse': {
                    '0%, 100%': {
                        transform: 'scale(1)',
                        opacity: 1,
                    },
                    '50%': {
                        transform: 'scale(1.05)',
                        opacity: 0.85,
                    },
                },
            }}>
                <Box sx={{
                    fontSize: compact ? 40 : 56,
                    color: isDark ? 'rgba(37, 99, 235, 0.5)' : 'rgba(37, 99, 235, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                }}>
                    {icon}
                </Box>
            </Box>

            <Typography
                variant={compact ? 'subtitle1' : 'h6'}
                sx={{
                    fontWeight: 700,
                    color: 'text.primary',
                    mb: 1,
                    letterSpacing: '-0.02em',
                }}
            >
                {title}
            </Typography>

            <Typography
                variant="body2"
                sx={{
                    color: 'text.secondary',
                    maxWidth: 420,
                    mb: (actionLabel || action) ? 3 : 0,
                    lineHeight: 1.6,
                    fontSize: compact ? '13px' : '14px',
                }}
            >
                {description}
            </Typography>

            {/* Action Button */}
            {actionLabel && onAction && (
                <Button
                    variant="contained"
                    startIcon={actionIcon}
                    onClick={onAction}
                    sx={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                        color: 'white',
                        borderRadius: '8px',
                        padding: '10px 24px',
                        fontSize: '14px',
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #1d4ed8 0%, #1d4ed8 100%)',
                            boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
                            transform: 'translateY(-1px)',
                        },
                        transition: 'all 0.2s ease',
                    }}
                >
                    {actionLabel}
                </Button>
            )}

            {/* Backward compat: full JSX action */}
            {action && !actionLabel && (
                <Box>{action}</Box>
            )}
        </Box>
    );
};

export default EmptyState;
