import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Box, Button, Typography } from '@mui/material';
import { Check } from '@mui/icons-material';
import StandardModal from '../common/StandardModal';
import fiscalYearService from '../../services/fiscal-year.service';

const schema = yup
    .object({
        name: yup.string().required('Nome é obrigatório'),
        fiscalYearId: yup.string().required('Ano fiscal é obrigatório'),
        description: yup.string(),
        type: yup.string().oneOf(['OPEX', 'CAPEX', 'MIXED']).default('MIXED'),
        isOBZ: yup.boolean().default(false),
    })
    .required();

const BUDGET_FORM_ID = 'budget-form';

const nativeInput = {
    background: 'var(--modal-surface-subtle)',
    border: '1px solid var(--modal-border)',
    borderRadius: '8px',
    padding: '14px 16px',
    color: 'var(--modal-text-soft)',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
};

const nativeSelect = {
    ...nativeInput,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
};

const BudgetModal = ({ open, onClose, onSave, budget }) => {
    const [fiscalYears, setFiscalYears] = useState([]);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { name: '', fiscalYearId: '', description: '', isOBZ: false },
    });

    useEffect(() => {
        if (open) {
            fiscalYearService.getAll().then(setFiscalYears).catch(console.error);
            if (budget) {
                reset({
                    name: budget.name,
                    fiscalYearId: budget.fiscalYearId,
                    description: budget.description || '',
                    isOBZ: budget.isOBZ || false,
                });
            } else {
                reset({ name: '', fiscalYearId: '', description: '', isOBZ: false });
            }
        }
    }, [open, budget, reset]);

    useEffect(() => {
        if (!open) {
            reset({ name: '', fiscalYearId: '', description: '', isOBZ: false });
        }
    }, [open, reset]);

    const onSubmit = (data) => {
        onSave(data);
    };

    const title = budget ? 'Editar orçamento' : 'Novo orçamento';
    const subtitle = budget ? 'Alterar dados' : 'Planejamento financeiro anual';

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title={title}
            subtitle={subtitle}
            icon="account_balance_wallet"
            size="form"
            footer={
                <>
                    <Button type="button" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form={BUDGET_FORM_ID}
                        data-testid="btn-save-budget"
                        variant="contained"
                        color="primary"
                        startIcon={<Check />}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {budget ? 'Salvar alterações' : 'Criar orçamento'}
                    </Button>
                </>
            }
        >
            <form id={BUDGET_FORM_ID} onSubmit={handleSubmit(onSubmit)}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Box>
                        <label
                            style={{
                                fontSize: '12px',
                                color: 'var(--modal-text-secondary)',
                                fontWeight: 500,
                                marginBottom: '8px',
                                display: 'block',
                            }}
                        >
                            Nome do orçamento *
                        </label>
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <input
                                    {...field}
                                    data-testid="input-budget-name"
                                    style={{
                                        ...nativeInput,
                                        borderColor: errors.name ? '#f43f5e' : 'var(--modal-border)',
                                    }}
                                    placeholder="Ex: Orçamento TI 2025"
                                />
                            )}
                        />
                        {errors.name && (
                            <span style={{ fontSize: '11px', color: '#f43f5e', marginTop: '4px', display: 'block' }}>
                                {errors.name.message}
                            </span>
                        )}
                    </Box>

                    <Box>
                        <label
                            style={{
                                fontSize: '12px',
                                color: 'var(--modal-text-secondary)',
                                fontWeight: 500,
                                marginBottom: '8px',
                                display: 'block',
                            }}
                        >
                            Ano fiscal *
                        </label>
                        <Controller
                            name="fiscalYearId"
                            control={control}
                            render={({ field }) => (
                                <select
                                    {...field}
                                    data-testid="select-fiscal-year"
                                    style={{
                                        ...nativeSelect,
                                        borderColor: errors.fiscalYearId ? '#f43f5e' : 'var(--modal-border)',
                                    }}
                                >
                                    <option value="" style={{ background: '#1e293b' }}>
                                        Selecione...
                                    </option>
                                    {fiscalYears.map((fy) => (
                                        <option key={fy.id} value={fy.id} style={{ background: '#1e293b' }}>
                                            {fy.year} ({fy.isClosed ? 'Fechado' : 'Aberto'})
                                        </option>
                                    ))}
                                </select>
                            )}
                        />
                        {errors.fiscalYearId && (
                            <span style={{ fontSize: '11px', color: '#f43f5e', marginTop: '4px', display: 'block' }}>
                                {errors.fiscalYearId.message}
                            </span>
                        )}
                        {fiscalYears.length === 0 && (
                            <span style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px', display: 'block' }}>
                                Não há anos fiscais cadastrados.
                            </span>
                        )}
                    </Box>

                    <Box>
                        <label
                            style={{
                                fontSize: '12px',
                                color: 'var(--modal-text-secondary)',
                                fontWeight: 500,
                                marginBottom: '8px',
                                display: 'block',
                            }}
                        >
                            Descrição (opcional)
                        </label>
                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <textarea
                                    {...field}
                                    data-testid="input-budget-description"
                                    style={{ ...nativeInput, minHeight: '80px', resize: 'vertical' }}
                                    placeholder="Descreva o objetivo deste orçamento..."
                                />
                            )}
                        />
                    </Box>

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 2,
                            p: 2,
                            background: 'rgba(37, 99, 235, 0.08)',
                            borderRadius: '8px',
                            border: '1px solid rgba(37, 99, 235, 0.2)',
                        }}
                    >
                        <Controller
                            name="isOBZ"
                            control={control}
                            render={({ field }) => (
                                <Box
                                    data-testid="toggle-obz"
                                    onClick={() => field.onChange(!field.value)}
                                    sx={{
                                        width: 44,
                                        height: 24,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        background: field.value
                                            ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                                            : 'rgba(255, 255, 255, 0.1)',
                                        position: 'relative',
                                        transition: 'all 0.2s',
                                        flexShrink: 0,
                                        mt: '2px',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: '8px',
                                            background: 'white',
                                            position: 'absolute',
                                            top: 3,
                                            left: field.value ? 23 : 3,
                                            transition: 'all 0.2s',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                        }}
                                    />
                                </Box>
                            )}
                        />
                        <Box>
                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--modal-text-strong)' }}>
                                Metodologia OBZ (orçamento base zero)
                            </Typography>
                            <Typography sx={{ fontSize: '12px', color: 'var(--modal-text-secondary)', mt: 0.5 }}>
                                Cada linha do orçamento exigirá justificativa e classificação de prioridade (essencial,
                                importante, desejável)
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </form>
        </StandardModal>
    );
};

export default BudgetModal;
