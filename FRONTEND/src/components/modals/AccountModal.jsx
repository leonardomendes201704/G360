import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Box, Button, TextField, MenuItem } from '@mui/material';
import { Check } from '@mui/icons-material';
import StandardModal from '../common/StandardModal';
import { getAccounts } from '../../services/account.service';
import { getCostCenters } from '../../services/cost-center.service';

const schema = yup
    .object({
        code: yup.string().required('Código é obrigatório'),
        name: yup.string().required('Nome é obrigatório'),
        type: yup.string().required('Tipo é obrigatório'),
        parentId: yup.string().nullable(),
        costCenterId: yup.string().nullable(),
    })
    .required();

const ACCOUNT_FORM_ID = 'account-form';

const AccountModal = ({ open, onClose, onSave, account = null }) => {
    const [parentAccounts, setParentAccounts] = useState([]);
    const [costCenters, setCostCenters] = useState([]);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            code: '',
            name: '',
            type: 'OPEX',
            parentId: '',
            costCenterId: '',
        },
    });

    useEffect(() => {
        if (open) {
            getAccounts().then(setParentAccounts).catch(console.error);
            getCostCenters().then(setCostCenters).catch(console.error);

            if (account) {
                reset({
                    ...account,
                    parentId: account.parentId || '',
                    costCenterId: account.costCenterId || '',
                });
            } else {
                reset({ code: '', name: '', type: 'OPEX', parentId: '', costCenterId: '' });
            }
        }
    }, [open, account, reset]);

    useEffect(() => {
        if (!open) {
            reset({ code: '', name: '', type: 'OPEX', parentId: '', costCenterId: '' });
        }
    }, [open, reset]);

    const onSubmit = (data) => {
        const payload = {
            ...data,
            parentId: data.parentId === '' ? null : data.parentId,
            costCenterId: data.costCenterId === '' ? null : data.costCenterId,
        };
        onSave(payload);
    };

    const title = account ? 'Editar conta contábil' : 'Nova conta contábil';
    const subtitle = account ? 'Alterar informações da conta' : 'Estruturação do plano de contas';

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title={title}
            subtitle={subtitle}
            icon="account_balance"
            size="detail"
            footer={
                <>
                    <Button type="button" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form={ACCOUNT_FORM_ID}
                        variant="contained"
                        color="primary"
                        startIcon={<Check />}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {account ? 'Salvar alterações' : 'Criar conta'}
                    </Button>
                </>
            }
        >
            <form id={ACCOUNT_FORM_ID} onSubmit={handleSubmit(onSubmit)}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' }, gap: 2 }}>
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
                                    label="Nome da conta"
                                    placeholder="Ex: Licenças de software"
                                    fullWidth
                                    error={!!errors.name}
                                    helperText={errors.name?.message}
                                    value={field.value ?? ''}
                                    required
                                />
                            )}
                        />
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                        <Controller
                            name="type"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    label="Tipo de conta"
                                    fullWidth
                                    SelectProps={{ MenuProps: { sx: { zIndex: 1600 } } }}
                                    value={field.value ?? ''}
                                    required
                                >
                                    <MenuItem value="OPEX">Despesa operacional (OPEX)</MenuItem>
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
                                    label="Conta pai (agrupadora)"
                                    fullWidth
                                    SelectProps={{ MenuProps: { sx: { zIndex: 1600 } } }}
                                    value={field.value ?? ''}
                                >
                                    <MenuItem value="">
                                        <em>Nenhuma (raiz)</em>
                                    </MenuItem>
                                    {parentAccounts
                                        .filter((pa) => pa.id !== account?.id)
                                        .map((pa) => (
                                            <MenuItem key={pa.id} value={pa.id}>
                                                {pa.code} - {pa.name}
                                            </MenuItem>
                                        ))}
                                </TextField>
                            )}
                        />
                    </Box>

                    <Controller
                        name="costCenterId"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                select
                                label="Centro de custo"
                                fullWidth
                                SelectProps={{ MenuProps: { sx: { zIndex: 1600 } } }}
                                value={field.value ?? ''}
                                helperText="Deixe vazio para conta global (visível para todos)"
                            >
                                <MenuItem value="">
                                    <em>Conta global</em>
                                </MenuItem>
                                {costCenters.map((cc) => (
                                    <MenuItem key={cc.id} value={cc.id}>
                                        {cc.code} - {cc.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                    />
                </Box>
            </form>
        </StandardModal>
    );
};

export default AccountModal;
