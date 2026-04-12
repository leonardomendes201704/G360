import { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Typography } from '@mui/material';
import { Download, TableChart, InsertDriveFile } from '@mui/icons-material';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';

/**
 * Botão de exportação reutilizável com menu dropdown
 * @param {Object} props
 * @param {Array<Object>} props.data - Dados para exportar
 * @param {Array<{key: string, label: string}>} props.columns - Configuração de colunas
 * @param {string} props.filename - Nome do arquivo base
 * @param {string} [props.variant] - Variante do botão MUI
 * @param {boolean} [props.compact] - Modo compacto (só ícone)
 */
const ExportButton = ({ data = [], columns = [], filename = 'exportacao', variant = 'outlined', compact = false, sx = {} }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleExportCSV = () => {
        exportToCSV(data, columns, filename);
        handleClose();
    };

    const handleExportExcel = () => {
        exportToExcel(data, columns, filename);
        handleClose();
    };

    if (!data || data.length === 0) return null;

    return (
        <>
            <Button
                onClick={handleClick}
                variant={variant}
                size="small"
                startIcon={!compact ? <Download /> : undefined}
                sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: '13px',
                    borderColor: 'rgba(37, 99, 235, 0.3)',
                    color: '#2563eb',
                    '&:hover': {
                        borderColor: '#2563eb',
                        bgcolor: 'rgba(37, 99, 235, 0.08)',
                    },
                    minWidth: compact ? 36 : undefined,
                    px: compact ? 1 : 2,
                    ...sx,
                }}
            >
                {compact ? <Download fontSize="small" /> : 'Exportar'}
            </Button>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        minWidth: 200,
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                        border: '1px solid',
                        borderColor: 'divider',
                    }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Typography sx={{ px: 2, py: 1, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                    Formato de Exportação
                </Typography>
                <Divider />
                <MenuItem onClick={handleExportCSV} sx={{ py: 1.5 }}>
                    <ListItemIcon>
                        <InsertDriveFile fontSize="small" sx={{ color: '#10b981' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary="CSV"
                        secondary={`${data.length} registros`}
                        primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                        secondaryTypographyProps={{ fontSize: 11 }}
                    />
                </MenuItem>
                <MenuItem onClick={handleExportExcel} sx={{ py: 1.5 }}>
                    <ListItemIcon>
                        <TableChart fontSize="small" sx={{ color: '#2563eb' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary="Excel"
                        secondary={`${data.length} registros`}
                        primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                        secondaryTypographyProps={{ fontSize: 11 }}
                    />
                </MenuItem>
            </Menu>
        </>
    );
};

export default ExportButton;
