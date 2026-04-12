import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Box,
    Button,
    IconButton,
    TextField,
    MenuItem,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { AccountBalance, Close, Check } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { getAccounts } from '../../services/account.service';
import { getCostCenters } from '../../services/cost-center.service';

const schema = yup.object({
    code: yup.string().required('Código é obrigatório'),
    name: yup.string().required('Nome é obrigatório'),
    type: yup.string().required('Tipo é obrigatório'),
    parentId: yup.string().nullable(),
    costCenterId: yup.string().nullable()
}).required();

// Theme-aware Styles
const modalStyles = {
    backdrop: {
        backdropFilter: 'blur(8px)',
        backgroundColor: 'var(--modal-backdrop, rgba(0, 0, 0, 0.7))'
    },
    paper: {
        borderRadius: '16px',
        background: 'var(--modal-gradient)',
        border: '1px solid var(--modal-border)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: 'var(--modal-text)',
        maxWidth: '600px',
        width: '100%',
        m: 2
    },
    title: {
        borderBottom: '1px solid var(--modal-border)',
        padding: '24px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    input: {
        '& .MuiOutlinedInput-root': {
            background: 'var(--modal-surface-subtle)',
            color: 'var(--modal-text-soft)',
            borderRadius: '10px',
            '& fieldset': { borderColor: 'var(--modal-border)' },
            '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.3)' },
            '&.Mui-focused fieldset': { borderColor: '#10b981' }
        },
        '& .MuiInputLabel-root': { color: 'var(--modal-text-secondary)' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#10b981' },
        '& .MuiInputBase-input': { color: 'var(--modal-text-soft)' },
        '& .MuiSelect-icon': { color: 'var(--modal-text-secondary)' },
        '& .MuiFormHelperText-root': { color: '#f43f5e' }
    }
};

const AccountModal = ({ open, onClose, onSave, account = null }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [parentAccounts, setParentAccounts] = useState([]);
    const [costCenters, setCostCenters] = useState([]);

    const { control, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            code: '',
            name: '',
            type: 'OPEX',
            parentId: '',
            costCenterId: ''
        }
    });

    useEffect(() => {
        if (open) {
            getAccounts().then(setParentAccounts).catch(console.error);
            getCostCenters().then(setCostCenters).catch(console.error);

            if (account) {
                reset({
                    ...account,
                    parentId: account.parentId || '',
                    costCenterId: account.costCenterId || ''
                });
            } else {
                reset({ code: '', name: '', type: 'OPEX', parentId: '', costCenterId: '' });
            }
        }
    }, [open, account, reset]);

    const onSubmit = (data) => {
        const payload = {
            ...data,
            parentId: data.parentId === '' ? null : data.parentId,
            costCenterId: data.costCenterId === '' ? null : data.costCenterId
        };
        onSave(payload);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{ sx: modalStyles.paper }}
            BackdropProps={{ sx: modalStyles.backdrop }}
            TransitionProps={{ onExited: () => reset() }}
            maxWidth="md"
        >
            {/* Header */}
            <DialogTitle sx={modalStyles.title}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 44, height: 44, borderRadius: '12px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <AccountBalance sx={{ color: '#10b981', fontSize: 24 }} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'var(--modal-text-strong)' }}>
                            {account ? 'Editar Conta Contábil' : 'Nova Conta Contábil'}
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)' }}>
                            {account ? 'Alterar informações da conta' : 'Estruturação do plano de contas'}
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { color: 'var(--modal-text)', background: 'var(--modal-surface-hover)' } }}>
                    <Close />
                </IconButton>
            </DialogTitle>

            {/* Body */}
            <DialogContent sx={{ p: 3 }}>
                <form id="accForm" onSubmit={handleSubmit(onSubmit)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                        {/* Code & Name Row */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2 }}>
                            <Controller
                                name="code"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Código"
                                        placeholder="Ex: 3.1.01"
                                        fullWidth
                                        error={!!errors.code}
                                        helperText={errors.code?.message}
                                        value={field.value ?? ''}
                                        sx={modalStyles.input}
                                        required
                                    />
                                )}
                            />
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Nome da Conta"
                                        placeholder="Ex: Licenças de Software"
                                        fullWidth
                                        error={!!errors.name}
                                        helperText={errors.name?.message}
                                        value={field.value ?? ''}
                                        sx={modalStyles.input}
                                        required
                                    />
                                )}
                            />
                        </Box>

                        {/* Type & Parent Row */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <Controller
                                name="type"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        select
                                        label="Tipo de Conta"
                                        fullWidth
                                        SelectProps={{ MenuProps: { sx: { zIndex: 1400 } } }}
                                        value={field.value ?? ''}
                                        sx={modalStyles.input}
                                        required
                                    >
                                        <MenuItem value="OPEX">Despesa Operacional (OPEX)</MenuItem>
                                        <MenuItem value="CAPEX">Investimento (CAPEX)</MenuItem>
                                        <MenuItem value="RECEITA">Receita</MenuItem>
                                    </TextField>
                                )}
                            />
                            <Controller
                                name="parentId"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        select
                                        label="Conta Pai (Agrupadora)"
                                        fullWidth
                                        SelectProps={{ MenuProps: { sx: { zIndex: 1400 } } }}
                                        value={field.value ?? ''}
                                        sx={modalStyles.input}
                                    >
                                        <MenuItem value=""><em>Nenhuma (Raiz)</em></MenuItem>
                                        {parentAccounts
                                            .filter(pa => pa.id !== account?.id)
                                            .map(pa => (
                                                <MenuItem key={pa.id} value={pa.id}>{pa.code} - {pa.name}</MenuItem>
                                            ))
                                        }
                                    </TextField>
                                )}
                            />
                        </Box>

                        {/* Centro de Custo Row */}
                        <Controller
                            name="costCenterId"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    label="Centro de Custo"
                                    fullWidth
                                    SelectProps={{ MenuProps: { sx: { zIndex: 1400 } } }}
                                    value={field.value ?? ''}
                                    sx={modalStyles.input}
                                    helperText="Deixe vazio para conta global (visível para todos)"
                                >
                                    <MenuItem value=""><em>🌐 Conta Global</em></MenuItem>
                                    {costCenters.map(cc => (
                                        <MenuItem key={cc.id} value={cc.id}>
                                            {cc.code} - {cc.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                    </Box>
                </form>
            </DialogContent>

            {/* Footer */}
            <DialogActions sx={{ p: 3, borderTop: '1px solid var(--modal-border)', gap: 2 }}>
                <Button onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { background: 'var(--modal-surface-hover)' } }}>
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    form="accForm"
                    startIcon={<Check />}
                    sx={{
                        padding: '10px 24px', borderRadius: '10px', fontWeight: 600, textTransform: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white',
                        '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)' }
                    }}
                >
                    {account ? 'Salvar Alterações' : 'Criar Conta'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AccountModal;



