import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Typography, Box, Alert, CircularProgress
} from '@mui/material';
import tenantService from '../../services/tenant.service';

const schema = yup.object().shape({
    name: yup.string().required('Nome é obrigatório'),
    slug: yup.string()
        .required('Slug/ID é obrigatório')
        .min(3, 'Mínimo 3 caracteres')
        .matches(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
    // Admin data is only for creation
    adminName: yup.string().optional(),
    adminEmail: yup.string().email('Email inválido').optional(),
    adminPassword: yup.string().test('password-required', 'Senha é obrigatória na criação', function (value) {
        // Se estamos em modo de EDIÇÃO (não criação), a senha é opcional.
        return true;
    })
});

const TenantModal = ({ open, onClose, onSuccess, editData }) => {
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema)
    });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!open) return;
        setError('');
        setSuccess(false);
        setSaving(false);
        if (editData) {
            setValue('name', editData.name);
            setValue('slug', editData.slug);

            if (editData.users && editData.users.length > 0) {
                const admin = editData.users[0];
                setValue('adminName', admin.name);
                setValue('adminEmail', admin.email);
            } else {
                setValue('adminName', '');
                setValue('adminEmail', '');
            }
            setValue('adminPassword', '');
        } else {
            reset({
                name: '',
                slug: '',
                adminName: '',
                adminEmail: '',
                adminPassword: '',
            });
        }
    }, [editData, setValue, reset, open]);

    const onSubmit = async (data) => {
        try {
            setError('');
            setSaving(true);
            if (editData) {
                const updatePayload = {
                    name: data.name,
                    slug: data.slug,
                    adminName: data.adminName,
                    adminEmail: data.adminEmail
                };
                if (data.adminPassword) {
                    updatePayload.adminPassword = data.adminPassword;
                }
                await tenantService.update(editData.id, updatePayload);
            } else {
                if (!data.adminEmail || !data.adminPassword) {
                    setError('Email e Senha do admin são obrigatórios para nova empresa.');
                    setSaving(false);
                    return;
                }
                await tenantService.create(data);
            }
            setSuccess(true);
            await onSuccess();
            setTimeout(() => {
                onClose();
            }, 600);
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao salvar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{editData ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>Empresa salva com sucesso!</Alert>}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">Dados da Empresa</Typography>

                        <TextField
                            fullWidth
                            label="Nome da Empresa"
                            {...register('name')}
                            error={!!errors.name}
                            helperText={errors.name?.message}
                        />

                        <TextField
                            fullWidth
                            label="ID Único (Slug)"
                            helperText={errors.slug?.message || "Identificador usado na URL e Login (Ex: g360-filial-rj)."}
                            {...register('slug')}
                            error={!!errors.slug}
                            disabled={!!editData}
                        />
                    </Box>

                    <Box sx={{ mt: 3, mb: 2, borderTop: 1, borderColor: 'divider', pt: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {editData ? 'Dados do Administrador (Editar)' : 'Administrador Global da Empresa'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                            {editData
                                ? 'Altere apenas os campos que deseja atualizar.'
                                : 'Crie o primeiro usuário administrador para esta empresa.'}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Nome do Admin"
                            {...register('adminName')}
                        />
                        <TextField
                            fullWidth
                            label="Email do Admin"
                            {...register('adminEmail')}
                            error={!!errors.adminEmail}
                            helperText={errors.adminEmail?.message}
                        />
                        <TextField
                            fullWidth
                            label={editData ? "Nova Senha (Deixe em branco para manter)" : "Senha Provisória"}
                            type="password"
                            {...register('adminPassword')}
                            error={!!errors.adminPassword}
                            helperText={errors.adminPassword?.message}
                        />
                    </Box>

                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={saving || success}
                        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
                    >
                        {saving ? 'Salvando...' : success ? 'Salvo!' : 'Salvar'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default TenantModal;
