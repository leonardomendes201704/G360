import { useState, useRef } from 'react';
import { Box, Typography, Popover, MenuItem, Tooltip } from '@mui/material';

/**
 * Renders a clickable status pill that opens a popover with status options.
 * Calls onStatusChange(newStatus) when the user selects a new status.
 *
 * Props:
 *   status        – current status key
 *   statusConfig  – map of { key: { label, color } }
 *   onStatusChange – async fn(newStatus)
 *   disabled      – if true, acts as a plain display badge
 */
const InlineStatusSelect = ({ status, statusConfig = {}, onStatusChange, disabled = false }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [loading, setLoading] = useState(false);
    const anchorRef = useRef(null);

    const current = statusConfig[status] || { label: status, color: '#64748b' };

    const handleClick = (e) => {
        if (disabled) return;
        e.stopPropagation();
        setAnchorEl(e.currentTarget);
    };

    const handleSelect = async (newStatus) => {
        if (newStatus === status) { setAnchorEl(null); return; }
        setLoading(true);
        setAnchorEl(null);
        try {
            await onStatusChange(newStatus);
        } finally {
            setLoading(false);
        }
    };

    const pill = (
        <Box
            ref={anchorRef}
            onClick={handleClick}
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                py: 0.4,
                borderRadius: '8px',
                bgcolor: `${current.color}18`,
                border: `1px solid ${current.color}35`,
                cursor: disabled ? 'default' : 'pointer',
                userSelect: 'none',
                transition: 'all 0.15s',
                opacity: loading ? 0.6 : 1,
                ...(disabled ? {} : {
                    '&:hover': {
                        bgcolor: `${current.color}28`,
                        border: `1px solid ${current.color}55`,
                    }
                })
            }}
        >
            <Box sx={{ width: 7, height: 7, borderRadius: '8px', bgcolor: current.color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: current.color, lineHeight: 1 }}>
                {current.label}
            </Typography>
            {!disabled && (
                <Box sx={{ width: '10px', height: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
                    <svg width="8" height="5" viewBox="0 0 8 5" fill={current.color}><path d="M0 0l4 5 4-5z" /></svg>
                </Box>
            )}
        </Box>
    );

    return (
        <>
            {disabled ? pill : (
                <Tooltip title="Alterar status" placement="top" arrow>
                    {pill}
                </Tooltip>
            )}

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                onClick={(e) => e.stopPropagation()}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    sx: {
                        mt: 0.5,
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: '#1a2232',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                        minWidth: 180,
                        overflow: 'hidden',
                        p: 0.5,
                    }
                }}
            >
                {Object.entries(statusConfig).map(([key, cfg]) => (
                    <MenuItem
                        key={key}
                        onClick={() => handleSelect(key)}
                        selected={key === status}
                        sx={{
                            borderRadius: '8px',
                            mb: 0.25,
                            gap: 1.5,
                            py: 1,
                            '&.Mui-selected': { bgcolor: `${cfg.color}20` },
                            '&:hover': { bgcolor: `${cfg.color}15` },
                        }}
                    >
                        <Box sx={{ width: 9, height: 9, borderRadius: '8px', bgcolor: cfg.color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '13px', fontWeight: key === status ? 700 : 500, color: key === status ? cfg.color : '#cbd5e1' }}>
                            {cfg.label}
                        </Typography>
                        {key === status && (
                            <Box sx={{ ml: 'auto', fontSize: '16px', color: cfg.color }}>✓</Box>
                        )}
                    </MenuItem>
                ))}
            </Popover>
        </>
    );
};

export default InlineStatusSelect;
