import { Box, Typography, CircularProgress } from '@mui/material';

/**
 * Generic widget wrapper used in the customizable dashboard.
 * Handles consistent header, loading state, and border styling.
 */
const DashboardWidget = ({
    title,
    icon,
    iconColor = '#667eea',
    children,
    loading = false,
    action,          // optional JSX in the header right side
    isDark = false,
    minHeight = 200,
    noPad = false,
}) => {
    const cardBg = isDark ? 'rgba(22, 29, 38, 0.6)' : '#FFFFFF';
    const cardBorder = isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)';
    const cardShadow = isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.07)';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const borderSubtle = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

    return (
        <Box sx={{
            borderRadius: '16px',
            background: cardBg,
            border: cardBorder,
            boxShadow: cardShadow,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight,
        }}>
            {/* Header */}
            <Box sx={{
                px: 2.5, py: 1.75,
                borderBottom: `1px solid ${borderSubtle}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                        width: 32, height: 32, borderRadius: '8px',
                        bgcolor: `${iconColor}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: iconColor,
                    }}>
                        <span className="material-icons-round" style={{ fontSize: '18px' }}>{icon}</span>
                    </Box>
                    <Typography sx={{ fontSize: '14px', fontWeight: 700, color: textPrimary }}>
                        {title}
                    </Typography>
                </Box>
                {action && <Box>{action}</Box>}
            </Box>

            {/* Body */}
            <Box sx={{ flex: 1, p: noPad ? 0 : 2.5, position: 'relative' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
                        <CircularProgress size={26} sx={{ color: iconColor }} />
                    </Box>
                ) : children}
            </Box>
        </Box>
    );
};

export default DashboardWidget;
