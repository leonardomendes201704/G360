import { useState } from 'react';
import {
    Box, Select, MenuItem, IconButton, TextField, CircularProgress,
    InputAdornment, Typography
} from '@mui/material';
import { Add, Check, Close } from '@mui/icons-material';

/**
 * InlineCreateSelect — Reusable select with inline "+" creation.
 *
 * Props:
 *  - value: current selected value
 *  - onChange: (newValue) => void
 *  - options: [{ id, name }]
 *  - onCreateNew: async (name) => createdItem  (should return the new item with {id, name})
 *  - onRefresh: () => void  (called after creation to refresh options)
 *  - label: string (field label)
 *  - placeholder: string
 *  - required: boolean
 *  - disabled: boolean
 *  - error: boolean
 *  - helperText: string
 *  - emptyLabel: string (shown when no options, default "Nenhuma opção")
 *  - sx: extra styles for the wrapper
 *  - selectSx: extra styles passed to Select
 *  - variant: 'native' | 'mui' (default 'mui')
 */
const InlineCreateSelect = ({
    value = '',
    onChange,
    options = [],
    onCreateNew,
    onRefresh,
    label = '',
    placeholder = 'Selecione...',
    required = false,
    disabled = false,
    error = false,
    helperText = '',
    emptyLabel = 'Nenhuma opção cadastrada',
    sx = {},
    selectSx = {},
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [saving, setSaving] = useState(false);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            const created = await onCreateNew(newName.trim());
            if (onRefresh) await onRefresh();
            if (created?.id) onChange(created.id);
            setNewName('');
            setIsCreating(false);
        } catch (e) {
            console.error('InlineCreateSelect create error:', e);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setNewName('');
        setIsCreating(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCreate();
        }
        if (e.key === 'Escape') handleCancel();
    };

    const defaultSelectSx = {
        background: 'var(--modal-surface)',
        borderRadius: '10px',
        color: 'var(--modal-text)',
        fontSize: '14px',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--modal-border-strong)' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--modal-border-strong)' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
        '& .MuiSelect-icon': { color: 'var(--modal-text-muted)' },
        ...selectSx,
    };

    return (
        <Box sx={sx}>
            {label && (
                <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                    {label} {required && <span style={{ color: '#f43f5e' }}>*</span>}
                </Typography>
            )}

            {isCreating ? (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Nome da nova opção..."
                        autoFocus
                        size="small"
                        fullWidth
                        disabled={saving}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                background: 'var(--modal-surface)',
                                color: 'var(--modal-text)',
                                borderRadius: '10px',
                                '& fieldset': { borderColor: '#2563eb' },
                            },
                            '& input': { color: 'var(--modal-text)', fontSize: '14px' },
                        }}
                        InputProps={{
                            endAdornment: saving ? (
                                <InputAdornment position="end">
                                    <CircularProgress size={18} sx={{ color: '#2563eb' }} />
                                </InputAdornment>
                            ) : null,
                        }}
                    />
                    <IconButton
                        onClick={handleCreate}
                        disabled={saving || !newName.trim()}
                        sx={{
                            bgcolor: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            borderRadius: '10px',
                            width: 36, height: 36,
                            '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.25)' },
                            '&.Mui-disabled': { opacity: 0.4 },
                        }}
                    >
                        <Check fontSize="small" />
                    </IconButton>
                    <IconButton
                        onClick={handleCancel}
                        disabled={saving}
                        sx={{
                            bgcolor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            borderRadius: '10px',
                            width: 36, height: 36,
                            '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' },
                        }}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Select
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        fullWidth
                        displayEmpty
                        disabled={disabled}
                        error={error}
                        sx={defaultSelectSx}
                    >
                        <MenuItem value="">{placeholder}</MenuItem>
                        {options.length === 0 && (
                            <MenuItem disabled value="__empty__">
                                <em style={{ color: 'var(--modal-text-muted)' }}>{emptyLabel}</em>
                            </MenuItem>
                        )}
                        {options.map((opt) => (
                            <MenuItem key={opt.id} value={opt.id}>{opt.name}</MenuItem>
                        ))}
                    </Select>
                    {onCreateNew && !disabled && (
                        <IconButton
                            onClick={() => setIsCreating(true)}
                            sx={{
                                bgcolor: 'rgba(37, 99, 235, 0.1)',
                                color: '#2563eb',
                                borderRadius: '10px',
                                width: 40, height: 40,
                                flexShrink: 0,
                                border: '1px solid rgba(37, 99, 235, 0.2)',
                                '&:hover': {
                                    bgcolor: 'rgba(37, 99, 235, 0.2)',
                                    transform: 'scale(1.05)',
                                },
                                transition: 'all 0.2s ease',
                            }}
                            title="Criar nova opção"
                        >
                            <Add fontSize="small" />
                        </IconButton>
                    )}
                </Box>
            )}
            {helperText && (
                <Typography sx={{ fontSize: '11px', color: error ? '#f43f5e' : 'var(--modal-text-muted)', mt: 0.5 }}>
                    {helperText}
                </Typography>
            )}
        </Box>
    );
};

export default InlineCreateSelect;
