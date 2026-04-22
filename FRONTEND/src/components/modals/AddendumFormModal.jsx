import { useState, useEffect } from 'react';
import {
    Typography,
    Grid,
    TextField,
    InputAdornment,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Button,
    Chip,
    CircularProgress,
    Box,
    Stack,
} from '@mui/material';
import { NoteAdd } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { createAddendum, updateAddendum } from '../../services/contract-details.service';
import StandardModal from '../common/StandardModal';

const sectionShellSx = {
    p: 2,
    borderRadius: '8px',
    border: '1px solid var(--modal-border-strong, rgba(148, 163, 184, 0.35))',
    background: 'var(--modal-surface-subtle, rgba(148, 163, 184, 0.06))',
};

const sectionTitleSx = {
    color: 'var(--modal-text-muted, #64748b)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    mb: 1.5,
};

const fieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '8px',
        background: 'var(--modal-surface-hover, rgba(255,255,255,0.04))',
    },
    '& .MuiInputLabel-root': { color: 'var(--modal-text-secondary, #64748b)' },
    '& .MuiOutlinedInput-input': { color: 'var(--modal-text, inherit)' },
};

const srOnlyLegendSx = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
};

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
            size="wide"
            loading={saving}
            paperProps={{ 'data-testid': 'modal-addendum-form' }}
            contentSx={{ pt: 0 }}
            footer={
                <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Button type="button" onClick={onClose} disabled={saving} variant="text" sx={{ textTransform: 'none', fontWeight: 600, color: 'var(--modal-text-secondary, inherit)' }}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color={addendumType === 'SUPRESSAO' ? 'error' : 'primary'}
                        onClick={handleSave}
                        disabled={saving}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
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
                </Box>
            }
        >
            <Stack spacing={2.5} sx={{ pt: 0.5 }}>
                <Box sx={sectionShellSx}>
                    <Typography component="h3" sx={sectionTitleSx}>
                        Tipo de movimentação
                    </Typography>
                    <FormControl component="fieldset" variant="standard" sx={{ m: 0 }}>
                        <FormLabel component="legend" sx={srOnlyLegendSx}>
                            Tipo de movimentação do aditivo
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
                </Box>

                <Box sx={sectionShellSx}>
                    <Typography component="h3" sx={sectionTitleSx}>
                        Identificação
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Número do aditivo"
                                fullWidth
                                size="small"
                                value={form.number}
                                onChange={e => setForm({ ...form, number: e.target.value })}
                                sx={fieldSx}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                type="date"
                                label="Data assinatura"
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                size="small"
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                                sx={fieldSx}
                            />
                        </Grid>
                    </Grid>
                </Box>

                <Box sx={sectionShellSx}>
                    <Typography component="h3" sx={sectionTitleSx}>
                        Valores e vigência
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                type="number"
                                label="Valor mensal (base)"
                                fullWidth
                                size="small"
                                value={addendumMonthly}
                                onChange={e => setAddendumMonthly(e.target.value)}
                                InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                                sx={fieldSx}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                            <TextField
                                type="number"
                                label="Meses"
                                fullWidth
                                size="small"
                                value={addendumMonths}
                                onChange={e => setAddendumMonths(e.target.value)}
                                sx={fieldSx}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                type="number"
                                label="Valor total (impacto)"
                                fullWidth
                                size="small"
                                value={form.value}
                                onChange={e => setForm({ ...form, value: e.target.value })}
                                helperText={addendumMonthly && addendumMonths ? 'Calculado a partir de valor mensal × meses (pode ajustar manualmente).' : ' '}
                                FormHelperTextProps={{ sx: { m: 0, mt: 0.5, minHeight: '1.25em' } }}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                    sx: {
                                        color: addendumType === 'SUPRESSAO' ? '#f43f5e' : '#10b981',
                                        fontWeight: 700,
                                    },
                                }}
                                sx={fieldSx}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                type="date"
                                label="Nova vigência (fim)"
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                size="small"
                                value={form.endDate}
                                onChange={e => setForm({ ...form, endDate: e.target.value })}
                                sx={fieldSx}
                            />
                        </Grid>
                    </Grid>
                </Box>

                <Box sx={sectionShellSx}>
                    <Typography component="h3" sx={sectionTitleSx}>
                        Documento
                    </Typography>
                    <Button
                        component="label"
                        variant="outlined"
                        fullWidth
                        sx={{
                            py: 1.25,
                            textTransform: 'none',
                            borderRadius: '8px',
                            borderStyle: 'dashed',
                            borderColor: 'var(--modal-border-strong, #cbd5e1)',
                            color: 'var(--modal-text-secondary, #64748b)',
                            '&:hover': { borderColor: '#3b82f6', color: '#3b82f6', bgcolor: 'rgba(59, 130, 246, 0.04)' },
                        }}
                        startIcon={<span className="material-icons-round" style={{ fontSize: 20 }}>cloud_upload</span>}
                    >
                        {form.file ? `${form.file.name.slice(0, 36)}${form.file.name.length > 36 ? '…' : ''}` : 'Anexar documento'}
                        <input type="file" hidden onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} />
                    </Button>
                    {form.file && (
                        <Chip
                            label={form.file.name}
                            onDelete={() => setForm({ ...form, file: null })}
                            size="small"
                            sx={{ mt: 1.5 }}
                        />
                    )}
                </Box>

                <Box sx={sectionShellSx}>
                    <Typography component="h3" sx={sectionTitleSx}>
                        Descrição / justificativa
                    </Typography>
                    <TextField
                        label="Texto livre"
                        fullWidth
                        size="small"
                        multiline
                        minRows={4}
                        maxRows={12}
                        placeholder="Descreva o motivo e o impacto do aditivo no contrato."
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        sx={fieldSx}
                        InputLabelProps={{ shrink: true }}
                    />
                </Box>
            </Stack>
        </StandardModal>
    );
};

export default AddendumFormModal;
