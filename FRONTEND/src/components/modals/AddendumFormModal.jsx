import { useState, useEffect } from 'react';
import {
    Typography, Grid, TextField,
    InputAdornment, FormControl, FormLabel, RadioGroup,
    FormControlLabel, Radio, Button, Chip, CircularProgress
} from '@mui/material';
import { NoteAdd } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { createAddendum, updateAddendum } from '../../services/contract-details.service';
import StandardModal from '../common/StandardModal';

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

    const primaryLabel = addendumType === 'SUPRESSAO'
        ? 'Registrar redução'
        : isEdit
            ? 'Salvar aditivo'
            : 'Registrar acréscimo';

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title={isEdit ? 'Editar aditivo' : 'Novo termo aditivo'}
            subtitle={isEdit ? 'Altere os dados do aditivo' : 'Registre um novo termo aditivo'}
            icon="note_add"
            size="detail"
            loading={saving}
            footer={
                <>
                    <Button type="button" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color={addendumType === 'SUPRESSAO' ? 'error' : 'primary'}
                        onClick={handleSave}
                        disabled={saving}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                        startIcon={
                            saving ? (
                                <CircularProgress size={18} color="inherit" />
                            ) : (
                                <NoteAdd />
                            )
                        }
                    >
                        {primaryLabel}
                    </Button>
                </>
            }
        >
            <FormControl component="fieldset" sx={{ mb: 3 }}>
                <FormLabel component="legend" sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', mb: 1 }}>
                    Tipo de movimentação
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
                        label="Número do aditivo"
                        fullWidth size="small"
                        value={form.number}
                        onChange={e => setForm({ ...form, number: e.target.value })}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        type="date" label="Data assinatura"
                        InputLabelProps={{ shrink: true }}
                        fullWidth size="small"
                        value={form.date}
                        onChange={e => setForm({ ...form, date: e.target.value })}
                    />
                </Grid>

                <Grid item xs={12} sm={4}>
                    <TextField
                        type="number" label="Valor mensal (base)"
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
                        label="Valor total (impacto)"
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
                        type="date" label="Nova vigência (fim)"
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
                            height: '40px', textTransform: 'none', borderRadius: '8px',
                            borderColor: 'var(--modal-border)', color: 'var(--modal-text-secondary)',
                            '&:hover': { borderColor: '#3b82f6', color: '#3b82f6' }
                        }}
                        startIcon={<span className="material-icons-round" style={{ fontSize: 20 }}>cloud_upload</span>}
                    >
                        {form.file ? form.file.name.substring(0, 20) + '...' : 'Anexar documento'}
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
                        label="Descrição / justificativa"
                        fullWidth size="small"
                        multiline rows={2}
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                    />
                </Grid>
            </Grid>
        </StandardModal>
    );
};

export default AddendumFormModal;
