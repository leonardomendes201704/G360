import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Box, Button, TextField, MenuItem, Typography, InputAdornment
} from '@mui/material';
import { Build, Check, Info } from '@mui/icons-material';
import StandardModal from '../common/StandardModal';
import { useSnackbar } from 'notistack';
import { getFileURL, getUploadURL } from '../../utils/urlUtils';

const schema = yup.object({
    type: yup.string().required('Tipo é obrigatório'),
    description: yup.string().required('Descrição é obrigatória'),
    startDate: yup.string().required('Data de início é obrigatória'),
    status: yup.string().required('Status é obrigatório'),
    cost: yup.number().nullable().transform((v, o) => o === '' ? null : v),
    vendor: yup.string(),
    endDate: yup.string().nullable(),
    notes: yup.string(),
    invoiceUrl: yup.string().nullable(),
    invoiceName: yup.string().nullable()
}).required();

const modalStyles = {
    input: {
        '& .MuiOutlinedInput-root': {
            background: 'var(--modal-surface-subtle)', color: 'var(--modal-text-soft)', borderRadius: '8px',
            '& fieldset': { borderColor: 'var(--modal-border)' },
            '&:hover fieldset': { borderColor: 'rgba(234, 88, 12, 0.3)' },
            '&.Mui-focused fieldset': { borderColor: '#ea580c' }
        },
        '& .MuiInputLabel-root': { color: 'var(--modal-text-secondary)' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#ea580c' },
        '& .MuiInputBase-input': { color: 'var(--modal-text-soft)' },
        '& .MuiSelect-icon': { color: 'var(--modal-text-secondary)' },
        '& .MuiFormHelperText-root': { color: '#f43f5e' },
        '& .MuiInputAdornment-root': { color: 'var(--modal-text-secondary)' }
    }
};

const AssetMaintenanceModal = ({ open, onClose, onSave, maintenance = null }) => {
    const { enqueueSnackbar } = useSnackbar();
    const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            type: 'CORRETIVA', description: '', startDate: '', endDate: '',
            status: 'AGENDADO', cost: '', vendor: '', notes: '',
            invoiceUrl: '', invoiceName: ''
        }
    });

    useEffect(() => {
        if (open) {
            if (maintenance) {
                reset({
                    ...maintenance,
                    startDate: maintenance.startDate ? maintenance.startDate.split('T')[0] : '',
                    endDate: maintenance.endDate ? maintenance.endDate.split('T')[0] : '',
                    invoiceUrl: maintenance.invoiceUrl || '',
                    invoiceName: maintenance.invoiceName || ''
                });
            } else {
                reset({ type: 'CORRETIVA', description: '', startDate: '', endDate: '', status: 'AGENDADO', cost: '', vendor: '', notes: '', invoiceUrl: '', invoiceName: '' });
            }
        }
    }, [open, maintenance, reset]);

    const onSubmit = (data) => {
        const payload = {
            ...data,
            endDate: data.endDate || null,
            invoiceUrl: data.invoiceUrl || null,
            invoiceName: data.invoiceName || null
        };
        onSave(payload);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    return (
        <StandardModal
            open={open}
            onClose={handleClose}
            title={maintenance ? 'Editar manutenção' : 'Nova manutenção'}
            subtitle="Registro de serviços e reparos"
            icon="build"
            size="form"
            footer={
                <>
                    <Button type="button" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="maintForm"
                        variant="contained"
                        color="warning"
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                        startIcon={<Check />}
                    >
                        Salvar
                    </Button>
                </>
            }
        >
                <form id="maintForm" onSubmit={handleSubmit(onSubmit)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <Controller name="type" control={control} render={({ field }) => (
                                <TextField {...field} select label="Tipo" fullWidth
                                    SelectProps={{ MenuProps: { sx: { zIndex: 1500 } } }} value={field.value || ''} sx={modalStyles.input}>
                                    <MenuItem value="PREVENTIVA">Preventiva</MenuItem>
                                    <MenuItem value="CORRETIVA">Corretiva</MenuItem>
                                    <MenuItem value="MELHORIA">Melhoria / Upgrade</MenuItem>
                                </TextField>
                            )} />
                            <Controller name="status" control={control} render={({ field }) => (
                                <TextField {...field} select label="Status" fullWidth
                                    SelectProps={{ MenuProps: { sx: { zIndex: 1500 } } }} value={field.value || ''} sx={modalStyles.input}>
                                    <MenuItem value="AGENDADO">Agendado</MenuItem>
                                    <MenuItem value="EM_ANDAMENTO">Em Andamento</MenuItem>
                                    <MenuItem value="CONCLUIDO">Concluído</MenuItem>
                                    <MenuItem value="CANCELADO">Cancelado</MenuItem>
                                </TextField>
                            )} />
                        </Box>

                        <Controller name="description" control={control} render={({ field }) => (
                            <TextField {...field} label="Descrição do Serviço" fullWidth
                                error={!!errors.description} helperText={errors.description?.message} sx={modalStyles.input} required />
                        )} />

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <Controller name="startDate" control={control} render={({ field }) => (
                                <TextField {...field} type="date" label="Data Início" InputLabelProps={{ shrink: true }}
                                    fullWidth value={field.value || ''} error={!!errors.startDate} sx={modalStyles.input} required />
                            )} />
                            <Controller name="endDate" control={control} render={({ field }) => (
                                <TextField {...field} type="date" label="Data Término" InputLabelProps={{ shrink: true }}
                                    fullWidth value={field.value || ''} sx={modalStyles.input} />
                            )} />
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <Controller name="vendor" control={control} render={({ field }) => (
                                <TextField {...field} label="Prestador / Fornecedor" fullWidth value={field.value || ''} sx={modalStyles.input} />
                            )} />
                            <Controller name="cost" control={control} render={({ field }) => (
                                <TextField {...field} type="number" label="Custo (R$)" fullWidth
                                    InputProps={{ startAdornment: <InputAdornment position="start"><span style={{ color: 'var(--modal-text-secondary)' }}>R$</span></InputAdornment> }}
                                    value={field.value || ''} sx={modalStyles.input} />
                            )} />
                        </Box>

                        {/* File Upload */}
                        <Box sx={{
                            border: '1px dashed var(--modal-border-strong)', borderRadius: '8px', p: 2,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'var(--modal-surface-subtle)'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ background: 'var(--modal-surface-hover)', p: 1, borderRadius: '8px' }}>
                                    <Info sx={{ color: 'var(--modal-text-secondary)' }} />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--modal-text-soft)' }}>Nota Fiscal / Documento</Typography>
                                    <Typography sx={{ fontSize: '12px', color: 'var(--modal-text-secondary)' }}>
                                        {watch('invoiceName') ? `Arquivo: ${watch('invoiceName')}` : 'Nenhum arquivo anexado'}
                                    </Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button component="label" variant="outlined" size="small"
                                    sx={{ textTransform: 'none', borderColor: 'var(--modal-border-strong)', color: 'var(--modal-text-soft)', '&:hover': { borderColor: '#ea580c' } }}>
                                    Escolher Arquivo
                                    <input type="file" hidden onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const formData = new FormData();
                                            formData.append('file', file);
                                            try {
                                                const token = localStorage.getItem('g360_token');
                                                const res = await fetch(getUploadURL(), { method: 'POST', body: formData, headers: { 'Authorization': `Bearer ${token}` } });
                                                const data = await res.json();
                                                if (res.ok) { setValue('invoiceUrl', data.fileUrl); setValue('invoiceName', data.fileName); enqueueSnackbar('Upload concluído!', { variant: 'success' }); }
                                                else { throw new Error(data.message); }
                                            } catch (err) { enqueueSnackbar('Erro no upload', { variant: 'error' }); }
                                        }
                                    }} />
                                </Button>
                                {watch('invoiceUrl') && (
                                    <Button size="small" href={getFileURL(watch('invoiceUrl'))} target="_blank"
                                        sx={{ color: '#ea580c' }}>Baixar</Button>
                                )}
                            </Box>
                        </Box>
                        <Controller name="invoiceUrl" control={control} render={({ field }) => <input type="hidden" {...field} />} />
                        <Controller name="invoiceName" control={control} render={({ field }) => <input type="hidden" {...field} />} />

                        <Controller name="notes" control={control} render={({ field }) => (
                            <TextField {...field} label="Observações" multiline rows={2} fullWidth value={field.value || ''} sx={modalStyles.input} />
                        )} />
                    </Box>
                </form>
        </StandardModal>
    );
};

export default AssetMaintenanceModal;
