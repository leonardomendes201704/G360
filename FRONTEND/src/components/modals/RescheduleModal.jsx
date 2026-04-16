import { useState, useEffect } from 'react';
import { Box, Button, TextField } from '@mui/material';
import { Check } from '@mui/icons-material';
import StandardModal from '../common/StandardModal';

const modalStyles = {
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
        <StandardModal
            open={open}
            onClose={onClose}
            title={title}
            subtitle="Selecione a nova data para o follow-up"
            icon="calendar_month"
            size="form"
            loading={loading}
            footer={
                <>
                    <Button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        sx={{ color: 'var(--modal-text-secondary)', '&:hover': { background: 'var(--modal-surface-hover)' } }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        variant="contained"
                        color="primary"
                        onClick={() => void handleConfirm()}
                        disabled={loading || !newDate}
                        startIcon={<Check />}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {loading ? 'Reagendando...' : 'Confirmar'}
                    </Button>
                </>
            }
        >
            <Box sx={{ mt: 0.5 }}>
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
        </StandardModal>
    );
};

export default RescheduleModal;
