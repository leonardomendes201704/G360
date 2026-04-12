import { useState, useEffect } from 'react';
import {
    Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    IconButton, Typography, TextField
} from '@mui/material';
import { Close, CalendarMonth, Check } from '@mui/icons-material';

const modalStyles = {
    backdrop: { backdropFilter: 'blur(8px)', backgroundColor: 'var(--modal-backdrop, rgba(0, 0, 0, 0.7))' },
    paper: {
        borderRadius: '16px',
        background: 'var(--modal-gradient)',
        border: '1px solid var(--modal-border)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: 'var(--modal-text)',
        maxWidth: '420px', width: '100%', m: 2
    },
    title: {
        borderBottom: '1px solid var(--modal-border)',
        padding: '24px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    input: {
        '& .MuiOutlinedInput-root': {
            background: 'var(--modal-surface-subtle)', color: 'var(--modal-text-soft)', borderRadius: '10px',
            '& fieldset': { borderColor: 'var(--modal-border)' },
            '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.3)' },
            '&.Mui-focused fieldset': { borderColor: '#2563eb' }
        },
        '& .MuiInputLabel-root': { color: 'var(--modal-text-secondary)' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#2563eb' },
        '& .MuiInputBase-input': { color: 'var(--modal-text-soft)' }
    }
};

const RescheduleModal = ({ open, onClose, onConfirm, currentDate = null, title = 'Reagendar Follow-up' }) => {
    const [newDate, setNewDate] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            const initialDate = currentDate
                ? new Date(currentDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            setNewDate(initialDate);
        }
    }, [open, currentDate]);

    const handleConfirm = async () => {
        if (!newDate) return;
        setLoading(true);
        try {
            await onConfirm(newDate);
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{ sx: modalStyles.paper }}
            BackdropProps={{ sx: modalStyles.backdrop }}
        >
            <DialogTitle sx={modalStyles.title}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 44, height: 44, borderRadius: '12px',
                        background: 'rgba(37, 99, 235, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <CalendarMonth sx={{ color: '#2563eb', fontSize: 24 }} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'var(--modal-text-strong)' }}>{title}</Typography>
                        <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)' }}>Selecione a nova data para o follow-up</Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { color: 'var(--modal-text)', background: 'var(--modal-surface-hover)' } }}>
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                <Box sx={{ mt: 1 }}>
                    <TextField
                        type="date"
                        label="Nova Data"
                        fullWidth
                        value={newDate}
                        onChange={e => setNewDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: new Date().toISOString().split('T')[0] }}
                        sx={modalStyles.input}
                        required
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: '1px solid var(--modal-border)', gap: 2 }}>
                <Button onClick={onClose} disabled={loading} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { background: 'var(--modal-surface-hover)' } }}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleConfirm}
                    disabled={loading || !newDate}
                    startIcon={<Check />}
                    sx={{
                        padding: '10px 24px', borderRadius: '10px', fontWeight: 600, textTransform: 'none',
                        background: 'linear-gradient(135deg, #2563eb 0%, #818cf8 100%)', color: 'white',
                        '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)' },
                        '&.Mui-disabled': { background: 'rgba(100, 116, 139, 0.3)', color: 'rgba(255,255,255,0.3)' }
                    }}
                >
                    {loading ? 'Reagendando...' : 'Confirmar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RescheduleModal;
