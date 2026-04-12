import React from 'react';
import { Chip } from '@mui/material';
import { getStatusConfig } from '../../utils/statusUtils';

/**
 * StatusChip Component
 * 
 * Displays a consistent status badge based on the provided status code.
 * Uses `statusUtils.js` for color and label mapping.
 * 
 * @param {string} status - The status code (e.g., 'IN_PROGRESS', 'APPROVED')
 * @param {string} [label] - Optional override for the label
 * @param {string} [size='small'] - Chip size
 * @param {object} [sx] - Custom styles
 */
const StatusChip = ({ status, label: customLabel, size = 'small', sx = {}, ...props }) => {
    const config = getStatusConfig(status);

    // Allow custom label or fallback to config
    const displayLabel = customLabel || config.label;

    const fontWeight = 700;

    // Enhanced contrast colors for light mode readability
    const contrastMap = {
        success: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
        error: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
        warning: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
        primary: { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
        info: { bg: '#e0f2fe', color: '#075985', border: '#7dd3fc' },
    };

    const contrast = contrastMap[config.color];

    return (
        <Chip
            label={displayLabel}
            color={config.color}
            size={size}
            variant={config.color === 'default' ? 'outlined' : 'filled'}
            sx={{
                fontWeight,
                borderRadius: '8px',
                height: size === 'small' ? '24px' : '32px',
                fontSize: size === 'small' ? '0.75rem' : '0.875rem',
                ...(contrast && {
                    bgcolor: contrast.bg,
                    color: contrast.color,
                    border: `1px solid ${contrast.border}`,
                    '.MuiChip-label': { color: contrast.color },
                }),
                ...sx
            }}
            {...props}
        />
    );
};

export default StatusChip;
