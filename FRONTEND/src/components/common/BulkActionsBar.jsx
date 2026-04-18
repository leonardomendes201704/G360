import { Box, Typography, Button, Tooltip, IconButton, Checkbox } from '@mui/material';
import { Delete, Close, CheckBox, CheckBoxOutlineBlank } from '@mui/icons-material';

/**
 * BulkActionsBar — appears above tables when ≥1 row is selected.
 *
 * Props:
 *   selectedCount  – number of selected items
 *   totalCount     – total rows
 *   onSelectAll    – fn() — selects/deselects all
 *   onClearAll     – fn() — deselects all
 *   actions        – array of { label, icon, color?, onClick, confirm? }
 *   allSelected    – boolean
 */
const BulkActionsBar = ({ selectedCount, totalCount, onSelectAll, onClearAll, actions = [], allSelected }) => {
    if (selectedCount === 0) return null;

    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2.5,
            py: 1.5,
            background: 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(59,130,246,0.08) 100%)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: '8px',
            mb: 1.5,
            backdropFilter: 'blur(8px)',
            animation: 'slideInDown 0.2s ease',
        }}>
            {/* Select all checkbox */}
            <Tooltip title={allSelected ? 'Desmarcar tudo' : 'Selecionar tudo'}>
                <Checkbox
                    checked={allSelected}
                    indeterminate={selectedCount > 0 && !allSelected}
                    onChange={() => allSelected ? onClearAll() : onSelectAll()}
                    size="small"
                    sx={{
                        color: '#3b82f6',
                        '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#3b82f6' },
                        p: 0.5,
                    }}
                />
            </Tooltip>

            {/* Count label */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '8px', bgcolor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{selectedCount}</Typography>
                </Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#93c5fd' }}>
                    {selectedCount === totalCount ? 'todos selecionados' : `de ${totalCount} selecionados`}
                </Typography>
            </Box>

            <Box sx={{ width: '1px', height: 24, bgcolor: 'rgba(59,130,246,0.3)' }} />

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
                {actions.map((action, idx) => (
                    <Button
                        key={idx}
                        size="small"
                        startIcon={action.icon && <span className="material-icons-round" style={{ fontSize: '16px' }}>{action.icon}</span>}
                        onClick={action.onClick}
                        sx={{
                            fontSize: '13px',
                            fontWeight: 600,
                            textTransform: 'none',
                            borderRadius: '8px',
                            px: 2,
                            color: action.color || '#f1f5f9',
                            bgcolor: action.color ? `${action.color}18` : 'rgba(255,255,255,0.08)',
                            border: `1px solid ${action.color ? `${action.color}30` : 'rgba(255,255,255,0.12)'}`,
                            '&:hover': {
                                bgcolor: action.color ? `${action.color}28` : 'rgba(255,255,255,0.14)',
                            },
                        }}
                    >
                        {action.label}
                    </Button>
                ))}
            </Box>

            {/* Clear selection */}
            <Tooltip title="Limpar seleção">
                <IconButton size="small" onClick={onClearAll} sx={{ color: '#64748b', '&:hover': { color: '#f1f5f9' } }}>
                    <Close fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
    );
};

export default BulkActionsBar;
