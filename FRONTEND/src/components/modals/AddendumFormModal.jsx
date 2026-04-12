import { useState, useEffect } from 'react';
import {
    Dialog, Box, Typography, IconButton, Grid, TextField,
    InputAdornment, FormControl, FormLabel, RadioGroup,
    FormControlLabel, Radio, Button, Chip, CircularProgress
} from '@mui/material';
import { Close, NoteAdd, CloudUpload } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { createAddendum, updateAddendum } from '../../services/contract-details.service';

const AddendumFormModal = ({ open, onClose, contractId, addendum = null, onSaved }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [saving, setSaving] = useState(false);
    const isEdit = !!addendum;

    const [addendumType, setAddendumType] = useState('ACRESCIMO');
    const [addendumMonthly, setAddendumMonthly] = useState('');
    const [addendumMonths, setAddendumMonths] = useState('');
    const [form, setForm] = useState({
        number: '', description: '', date: '', value: '', endDate: '', file: null
    });

    useEffect(() => {
        if (open) {
            if (addendum) {
                setForm({
                    number: addendum.number || '',
                    description: addendum.description || '',
                    date: addendum.signatureDate ? addendum.signatureDate.split('T')[0] : '',
                    value: Math.abs(addendum.valueChange) || '',
                    endDate: addendum.newEndDate ? addendum.newEndDate.split('T')[0] : '',
                    file: null
                });
                setAddendumType(addendum.valueChange < 0 ? 'SUPRESSAO' : 'ACRESCIMO');
                setAddendumMonthly('');
                setAddendumMonths('');
            } else {
                setForm({ number: '', description: '', date: '', value: '', endDate: '', file: null });
                setAddendumType('ACRESCIMO');
                setAddendumMonthly('');
                setAddendumMonths('');
            }
        }
    }, [open, addendum]);

    useEffect(() => {
        if (addendumMonthly && addendumMonths) {
            const val = parseFloat(addendumMonthly) * parseFloat(addendumMonths);
            setForm(prev => ({ ...prev, value: val.toFixed(2) }));
        }
    }, [addendumMonthly, addendumMonths]);

    const handleSave = async () => {
        if (!form.number || !form.date) {
            enqueueSnackbar('Preencha Número e Data.', { variant: 'warning' });
            return;
        }

        let finalValue = parseFloat(form.value || 0);
        if (addendumType === 'SUPRESSAO') finalValue = -Math.abs(finalValue);
        else finalValue = Math.abs(finalValue);

        setSaving(true);
        try {
            const payload = {
                number: form.number,
                description: form.description,
                signatureDate: form.date,
                valueChange: finalValue,
                newEndDate: form.endDate,
                file: form.file
            };
            if (isEdit) {
                await updateAddendum(contractId, addendum.id, payload);
                enqueueSnackbar('Aditivo atualizado!', { variant: 'success' });
            } else {
                await createAddendum(contractId, payload);
                enqueueSnackbar('Aditivo criado!', { variant: 'success' });
            }
            if (onSaved) onSaved();
            onClose();
        } catch (e) {
            const msg = e.response?.data?.error || 'Erro ao salvar aditivo.';
            enqueueSnackbar(msg, { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <Dialog
            open={true}
            onClose={onClose}
            maxWidth={false}
            PaperProps={{
                sx: {
                    maxWidth: '640px',
                    width: '95%',
                    background: 'var(--modal-gradient)',
                    border: '1px solid var(--modal-border)',
                    borderRadius: '18px',
                    boxShadow: '0 24px 60px rgba(15, 23, 42, 0.6)',
                    overflow: 'hidden',
                }
            }}
            BackdropProps={{
                sx: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.7)' }
            }}
        >
            {/* Header */}
            <Box sx={{
                p: '20px 28px', borderBottom: '1px solid var(--modal-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 42, height: 42, borderRadius: '12px',
                        background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <NoteAdd fontSize="small" />
                    </Box>
                    <Box>
                        <Typography fontWeight="bold" sx={{ color: 'var(--modal-text)', fontSize: '1rem' }}>
                            {isEdit ? 'Editar Aditivo' : 'Novo Termo Aditivo'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--modal-text-muted)' }}>
                            {isEdit ? 'Altere os dados do aditivo' : 'Registre um novo termo aditivo'}
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'var(--modal-text-muted)', '&:hover': { color: 'var(--modal-text)' } }}>
                    <Close />
                </IconButton>
            </Box>

            {/* Body */}
            <Box sx={{ p: '28px', overflowY: 'auto', maxHeight: '65vh' }}>
                <FormControl component="fieldset" sx={{ mb: 3 }}>
                    <FormLabel component="legend" sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', mb: 1 }}>
                        Tipo de Movimentação
                    </FormLabel>
                    <RadioGroup row value={addendumType} onChange={(e) => setAddendumType(e.target.value)}>
                        <FormControlLabel
                            value="ACRESCIMO"
                            control={<Radio color="success" />}
                            label={<Typography sx={{ color: 'var(--modal-text)', fontSize: '14px' }}>Acréscimo (+)</Typography>}
                        />
                        <FormControlLabel
                            value="SUPRESSAO"
                            control={<Radio color="error" />}
                            label={<Typography sx={{ color: 'var(--modal-text)', fontSize: '14px' }}>Supressão (-)</Typography>}
                        />
                    </RadioGroup>
                </FormControl>

                <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Número do Aditivo"
                            fullWidth size="small"
                            value={form.number}
                            onChange={e => setForm({ ...form, number: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            type="date" label="Data Assinatura"
                            InputLabelProps={{ shrink: true }}
                            fullWidth size="small"
                            value={form.date}
                            onChange={e => setForm({ ...form, date: e.target.value })}
                        />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <TextField
                            type="number" label="Valor Mensal (Base)"
                            fullWidth size="small"
                            value={addendumMonthly}
                            onChange={e => setAddendumMonthly(e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <TextField
                            type="number" label="Meses"
                            fullWidth size="small"
                            value={addendumMonths}
                            onChange={e => setAddendumMonths(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            type="number"
                            label="Valor Total (Impacto)"
                            fullWidth size="small"
                            value={form.value}
                            onChange={e => setForm({ ...form, value: e.target.value })}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                style: {
                                    color: addendumType === 'SUPRESSAO' ? '#f43f5e' : '#10b981',
                                    fontWeight: 'bold'
                                }
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            type="date" label="Nova Vigência (Fim)"
                            InputLabelProps={{ shrink: true }}
                            fullWidth size="small"
                            value={form.endDate}
                            onChange={e => setForm({ ...form, endDate: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Button
                            component="label"
                            variant="outlined"
                            fullWidth
                            sx={{
                                height: '40px', textTransform: 'none', borderRadius: '10px',
                                borderColor: 'var(--modal-border)', color: 'var(--modal-text-secondary)',
                                '&:hover': { borderColor: '#3b82f6', color: '#3b82f6' }
                            }}
                            startIcon={<CloudUpload />}
                        >
                            {form.file ? form.file.name.substring(0, 20) + '...' : 'Anexar Documento'}
                            <input type="file" hidden onChange={e => setForm({ ...form, file: e.target.files[0] })} />
                        </Button>
                        {form.file && (
                            <Chip
                                label={form.file.name}
                                onDelete={() => setForm({ ...form, file: null })}
                                size="small"
                                sx={{ mt: 1 }}
                            />
                        )}
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            label="Descrição / Justificativa"
                            fullWidth size="small"
                            multiline rows={2}
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                        />
                    </Grid>
                </Grid>
            </Box>

            {/* Footer */}
            <Box sx={{
                p: '16px 28px', borderTop: '1px solid var(--modal-border)',
                display: 'flex', justifyContent: 'flex-end', gap: 1.5,
                backgroundColor: 'rgba(22, 29, 38, 0.5)'
            }}>
                <Button
                    onClick={onClose}
                    sx={{ color: 'var(--modal-text-secondary)', '&:hover': { bgcolor: 'var(--modal-surface-hover)' } }}
                >
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    sx={{
                        background: addendumType === 'SUPRESSAO'
                            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        px: 3, textTransform: 'none', borderRadius: '10px', fontWeight: 600,
                        boxShadow: addendumType === 'SUPRESSAO'
                            ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                            : '0 4px 12px rgba(59, 130, 246, 0.3)',
                    }}
                    startIcon={saving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <NoteAdd />}
                >
                    {addendumType === 'SUPRESSAO' ? 'Registrar Redução' : isEdit ? 'Salvar Aditivo' : 'Registrar Acréscimo'}
                </Button>
            </Box>
        </Dialog>
    );
};

export default AddendumFormModal;
