import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Box, Button, Typography } from '@mui/material';
import { Check } from '@mui/icons-material';
import { getReferenceAccounts, getMyScopedCostCenters, getReferenceSuppliers } from '../../services/reference.service';
import StandardModal from '../common/StandardModal';

const modalStyles = {
    nativeInput: {
        background: 'var(--modal-surface-subtle)',
        border: '1px solid var(--modal-border)',
        borderRadius: '8px',
        padding: '12px 14px',
        color: 'var(--modal-text-soft)',
        fontSize: '14px',
        width: '100%',
        outline: 'none',
        fontFamily: 'inherit'
    },
    nativeSelect: {
        background: 'var(--modal-surface-subtle)',
        border: '1px solid var(--modal-border)',
        borderRadius: '8px',
        padding: '12px 14px',
        color: 'var(--modal-text-soft)',
        fontSize: '14px',
        width: '100%',
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none',
        fontFamily: 'inherit',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center'
    }
};

const BudgetItemModal = ({ open, onClose, onSave, item = null, isOBZ = false }) => {
    const [accounts, setAccounts] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);

    const defaultMonths = { jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0 };

    const { control, handleSubmit, reset, watch, setValue } = useForm({
        defaultValues: {
            accountId: '', costCenterId: '', supplierId: '', description: '',
            justification: '', priority: '', isNewExpense: true,
            ...defaultMonths
        }
    });

    const values = watch();
    const total = Object.keys(defaultMonths).reduce((acc, month) => acc + Number(values[month] || 0), 0);

    useEffect(() => {
        if (open) {
            Promise.all([getReferenceAccounts(), getMyScopedCostCenters(), getReferenceSuppliers()]).then(([acc, ccData, supp]) => {
                setAccounts(acc);
                setCostCenters(ccData.costCenters || []);
                setIsAdmin(ccData.isAdmin || false);
                setSuppliers(supp);
            });
            if (item) {
                reset({
                    ...item, supplierId: item.supplierId || '', costCenterId: item.costCenterId || '',
                    justification: item.justification || '', priority: item.priority || '',
                    isNewExpense: item.isNewExpense !== false
                });
            } else {
                reset({ accountId: '', costCenterId: '', supplierId: '', description: '', justification: '', priority: '', isNewExpense: true, ...defaultMonths });
            }
        }
    }, [open, item, reset]);

    // Clear validation errors when modal opens/closes
    useEffect(() => { if (open) setValidationErrors({}); }, [open]);

    const [validationErrors, setValidationErrors] = useState({});

    const onSubmit = (data) => {
        const errors = {};
        if (!data.accountId) errors.accountId = 'Conta Contábil é obrigatória';
        if (!isAdmin && !data.costCenterId) errors.costCenterId = 'Centro de Custo é obrigatório';
        if (isOBZ) {
            if (!data.priority) errors.priority = 'Prioridade é obrigatória para OBZ';
            if (!data.justification || data.justification.trim().length < 10) errors.justification = 'Justificativa é obrigatória (mínimo 10 caracteres)';
        }
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }
        setValidationErrors({});
        const payload = {
            ...data,
            supplierId: data.supplierId === '' ? null : data.supplierId,
            costCenterId: data.costCenterId === '' ? null : data.costCenterId,
            justification: data.justification || null,
            priority: data.priority || null,
            isNewExpense: data.isNewExpense
        };
        Object.keys(defaultMonths).forEach(m => payload[m] = Number(data[m]));
        onSave(payload);
    };

    const handleReplicate = () => {
        const janValue = values.jan;
        Object.keys(defaultMonths).forEach(m => setValue(m, janValue));
    };

    const monthLabels = { jan: 'JAN', feb: 'FEV', mar: 'MAR', apr: 'ABR', may: 'MAI', jun: 'JUN', jul: 'JUL', aug: 'AGO', sep: 'SET', oct: 'OUT', nov: 'NOV', dec: 'DEZ' };

    const handleClose = () => {
        reset();
        onClose();
    };

    return (
        <StandardModal
            open={open}
            onClose={handleClose}
            title={item ? 'Editar lançamento' : 'Novo lançamento'}
            subtitle="Valores mensais por conta"
            icon="playlist_add"
            size="wide"
            footer={
                <>
                    <Button type="button" onClick={handleClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { background: 'var(--modal-surface-hover)' } }}>Cancelar</Button>
                    <Button type="submit" form="itemForm" startIcon={<Check />}
                        variant="contained"
                        color="primary"
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >Salvar lançamento</Button>
                </>
            }
        >
                <form id="itemForm" onSubmit={handleSubmit(onSubmit)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                            <Box>
                                <label style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>Conta Contábil *</label>
                                <Controller name="accountId" control={control} render={({ field }) => (
                                    <select {...field} style={{ ...modalStyles.nativeSelect, ...(validationErrors.accountId ? { borderColor: '#f43f5e' } : {}) }}>
                                        <option value="" style={{ background: '#1e293b' }}>Selecione...</option>
                                        {accounts.map(a => <option key={a.id} value={a.id} style={{ background: '#1e293b' }}>{a.code} - {a.name}{a.type ? ` (${a.type})` : ''}</option>)}
                                    </select>
                                )} />
                                {validationErrors.accountId && <span style={{ color: '#f43f5e', fontSize: '11px', marginTop: '4px', display: 'block' }}>{validationErrors.accountId}</span>}
                            </Box>
                            <Box>
                                <label style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>Centro de Custo {!isAdmin && <span style={{ color: '#f43f5e' }}>*</span>}</label>
                                <Controller name="costCenterId" control={control} render={({ field }) => (
                                    <select {...field} style={{ ...modalStyles.nativeSelect, ...(validationErrors.costCenterId ? { borderColor: '#f43f5e' } : {}) }}>
                                        {isAdmin ? (
                                            <option value="" style={{ background: '#1e293b' }}>Geral (sem CC)</option>
                                        ) : (
                                            <option value="" style={{ background: '#1e293b' }}>Selecione seu centro de custo...</option>
                                        )}
                                        {costCenters.map(cc => <option key={cc.id} value={cc.id} style={{ background: '#1e293b' }}>{cc.code} - {cc.name}</option>)}
                                    </select>
                                )} />
                                {validationErrors.costCenterId && <span style={{ color: '#f43f5e', fontSize: '11px', marginTop: '4px', display: 'block' }}>{validationErrors.costCenterId}</span>}
                            </Box>
                            <Box>
                                <label style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>Fornecedor (Opcional)</label>
                                <Controller name="supplierId" control={control} render={({ field }) => (
                                    <select {...field} style={modalStyles.nativeSelect}>
                                        <option value="" style={{ background: '#1e293b' }}>Nenhum</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id} style={{ background: '#1e293b' }}>{s.name}</option>)}
                                    </select>
                                )} />
                            </Box>
                        </Box>

                        <Box>
                            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, marginBottom: '8px', display: 'block' }}>Descrição / Detalhe (Opcional)</label>
                            <Controller name="description" control={control} render={({ field }) => (
                                <input {...field} style={modalStyles.nativeInput} placeholder="Ex: Renovação anual de licenças Adobe" />
                            )} />
                        </Box>

                        {isOBZ && (
                            <Box sx={{ p: 2, background: 'rgba(37, 99, 235, 0.08)', borderRadius: '8px', border: '1px solid rgba(37, 99, 235, 0.3)' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>
                                        💡 Metodologia OBZ (Base Zero) <span style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', padding: '2px 8px', borderRadius: '8px', fontSize: '10px', marginLeft: '8px' }}>Campos Obrigatórios</span>
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                                    <Box>
                                        <label style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>Prioridade <span style={{ color: '#f43f5e' }}>*</span></label>
                                        <Controller name="priority" control={control} render={({ field }) => (
                                            <select {...field} style={{ ...modalStyles.nativeSelect, ...(validationErrors.priority ? { borderColor: '#f43f5e' } : {}) }}>
                                                <option value="" style={{ background: '#1e293b' }}>Selecione a prioridade...</option>
                                                <option value="ESSENCIAL" style={{ background: '#1e293b' }}>🔴 Essencial</option>
                                                <option value="IMPORTANTE" style={{ background: '#1e293b' }}>🟡 Importante</option>
                                                <option value="DESEJAVEL" style={{ background: '#1e293b' }}>🟢 Desejável</option>
                                            </select>
                                        )} />
                                        {validationErrors.priority && <span style={{ color: '#f43f5e', fontSize: '11px', marginTop: '4px', display: 'block' }}>{validationErrors.priority}</span>}
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', pt: 3 }}>
                                        <Controller name="isNewExpense" control={control} render={({ field }) => (
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)}
                                                    style={{ width: '18px', height: '18px', accentColor: '#2563eb' }} />
                                                <span style={{ fontSize: '13px', color: 'var(--modal-text-secondary)' }}>Despesa nova (sem histórico)</span>
                                            </label>
                                        )} />
                                    </Box>
                                </Box>
                                <Box>
                                    <label style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
                                        Justificativa <span style={{ color: '#f43f5e' }}>*</span> <span style={{ color: '#64748b' }}>(Por que esta despesa é necessária?)</span>
                                    </label>
                                    <Controller name="justification" control={control} render={({ field }) => (
                                        <textarea {...field} style={{ ...modalStyles.nativeInput, minHeight: '70px', resize: 'vertical', ...(validationErrors.justification ? { borderColor: '#f43f5e' } : {}) }}
                                            placeholder="Ex: Essencial para manutenção da operação. Licença utilizada por 15 colaboradores..." />
                                    )} />
                                    {validationErrors.justification && <span style={{ color: '#f43f5e', fontSize: '11px', marginTop: '4px', display: 'block' }}>{validationErrors.justification}</span>}
                                </Box>
                            </Box>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid var(--modal-border)' }}>
                            <Typography sx={{ fontSize: '12px', color: 'var(--modal-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valores Mensais (R$)</Typography>
                            <button type="button" onClick={handleReplicate} style={{ background: 'rgba(37, 99, 235, 0.1)', border: 'none', padding: '6px 12px', borderRadius: '8px', color: '#2563eb', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                Replicar Janeiro para todos
                            </button>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1.5 }}>
                            {Object.keys(defaultMonths).map((month) => (
                                <Box key={month}>
                                    <label style={{ fontSize: '10px', color: 'var(--modal-text-secondary)', fontWeight: 600, marginBottom: '4px', display: 'block', textAlign: 'center' }}>{monthLabels[month]}</label>
                                    <Controller name={month} control={control} render={({ field }) => (
                                        <input {...field} type="number" style={{ ...modalStyles.nativeInput, padding: '10px 8px', textAlign: 'center', fontSize: '13px' }} />
                                    )} />
                                </Box>
                            ))}
                        </Box>

                        <Box sx={{ background: 'var(--modal-surface-subtle)', p: 2, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--modal-border)' }}>
                            <Typography sx={{ fontWeight: 600, color: 'var(--modal-text-secondary)', fontSize: '13px' }}>TOTAL ANUAL</Typography>
                            <Typography sx={{ fontSize: '22px', fontWeight: 700, color: '#10b981' }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                            </Typography>
                        </Box>
                    </Box>
                </form>
        </StandardModal>
    );
};

export default BudgetItemModal;
