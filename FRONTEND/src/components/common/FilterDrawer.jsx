import { Drawer, Box, Typography, Button, IconButton, Divider } from '@mui/material';
import { useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';

/**
 * FilterDrawer — Painel lateral (off-canvas) para filtros.
 *
 * @param {boolean}   open - Controla visibilidade
 * @param {function}  onClose - Handler de fechamento
 * @param {function}  onApply - Handler ao clicar "Aplicar"
 * @param {function}  onClear - Handler ao clicar "Limpar"
 * @param {ReactNode} children - Campos de filtro (renderizados no corpo)
 * @param {string}    [title='Filtros'] - Titulo do painel
 * @param {number}    [width=360] - Largura do drawer em px
 */
const FilterDrawer = ({ open, onClose, onApply, onClear, children, title = 'Filtros', width = 360 }) => {
    const { mode } = useContext(ThemeContext);

    const handleApply = () => {
        onApply?.();
        onClose();
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width,
                    maxWidth: '100vw',
                    bgcolor: mode === 'dark' ? '#1a222d' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
        >
            {/* Header */}
            <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <span className="material-icons-round" style={{ fontSize: 22, color: '#2563eb' }}>filter_list</span>
                    <Typography sx={{ fontSize: 18, fontWeight: 600 }}>{title}</Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <span className="material-icons-round" style={{ fontSize: 20 }}>close</span>
                </IconButton>
            </Box>

            <Divider />

            {/* Body — campos de filtro via children */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {children}
            </Box>

            <Divider />

            {/* Footer */}
            <Box sx={{ p: 2.5, display: 'flex', gap: 1.5 }}>
                <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => { onClear?.(); }}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                >
                    Limpar
                </Button>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleApply}
                    sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                    }}
                >
                    Aplicar
                </Button>
            </Box>
        </Drawer>
    );
};

export default FilterDrawer;
