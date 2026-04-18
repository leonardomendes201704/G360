import { Box, CircularProgress } from '@mui/material';
import { useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';

/**
 * LoadingOverlay — Overlay semi-transparente com spinner centralizado.
 * O container pai DEVE ter `position: relative`.
 *
 * @param {boolean} loading - Exibe o overlay quando true
 * @param {string}  [color='#2563eb'] - Cor do spinner
 * @param {number}  [size=36] - Tamanho do spinner
 */
const LoadingOverlay = ({ loading, color = '#2563eb', size = 36 }) => {
    const { mode } = useContext(ThemeContext);

    if (!loading) return null;

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)',
                borderRadius: '8px',
                transition: 'opacity 0.2s',
            }}
        >
            <CircularProgress sx={{ color }} size={size} />
        </Box>
    );
};

export default LoadingOverlay;
