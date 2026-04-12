import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Box, Button, IconButton, TextField, MenuItem, Typography, Chip, CircularProgress, Select, Dialog
} from '@mui/material';
import {
    Close, ReceiptLong, CloudUpload, Description, AttachMoney
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import { getReferenceSuppliers, getReferenceContracts, getReferenceAccounts, getReferenceCostCenters } from '../../services/reference.service';
import { getFileURL } from '../../utils/urlUtils';

// ==============================================
// SCHEMA
// ==============================================
const getSchema = () => yup.object({
    description: yup.string().required('Descrição é obrigatória'),
    amount: yup.number().required('Valor é obrigatório'),
    date: yup.string().required('Data de competência é obrigatória'),
    type: yup.string().required('Categoria é obrigatória'),
    // Centro de Custo sempre obrigatório
    costCenterId: yup.string().required('Centro de Custo é obrigatório'),
    // Conta Contábil opcional
    accountId: yup.string().nullable(),
    // Campos obrigatórios para lançamento de custos
    dueDate: yup.string().required('Data de vencimento é obrigatória'),
    paymentDate: yup.string().nullable(),
    supplierId: yup.string().required('Fornecedor é obrigatório'),
    contractId: yup.string().nullable(),
    status: yup.string().default('PREVISTO'),
    approvalStatus: yup.string().default('PLANNED'),
    invoiceNumber: yup.string().required('Número da Nota Fiscal é obrigatório')
}).required();

// ==============================================
// DARK INPUT STYLES
// ==============================================
const darkInputStyles = {
    '& .MuiOutlinedInput-root': {
        background: 'var(--modal-surface-hover)',
        border: '1px solid var(--modal-border-strong)',
        borderRadius: '10px',
        color: 'var(--modal-text)',
        fontSize: '14px',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--modal-border-strong)' },
        '&:hover': { borderColor: 'var(--modal-border-strong)' },
        '&.Mui-focused': {
            borderColor: '#3b82f6',
            background: 'rgba(59, 130, 246, 0.05)',
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
        }
    },
    '& input::placeholder, & textarea::placeholder': { color: 'var(--modal-text-muted)' },
    '& .MuiInputAdornment-root': { color: 'var(--modal-text-muted)' }
};

const darkSelectStyles = {
    background: 'var(--modal-surface-hover)',
    border: '1px solid var(--modal-border-strong)',
    borderRadius: '10px',
    color: 'var(--modal-text)',
    fontSize: '14px',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--modal-border-strong)' },
    '&:hover': { borderColor: 'var(--modal-border-strong)' },
    '&.Mui-focused': {
        borderColor: '#3b82f6',
        background: 'rgba(59, 130, 246, 0.05)',
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    },
    '& .MuiSelect-icon': { color: 'var(--modal-text-muted)' }
};

// ==============================================
// CATEGORY OPTIONS
// ==============================================
const categoryOptions = [
    { value: 'SERVICO', label: 'Serviço', color: '#3b82f6' },
    { value: 'MATERIAL', label: 'Material', color: '#06b6d4' },
    { value: 'EQUIPAMENTO', label: 'Equipamento', color: '#10b981' },
    { value: 'MAO_OBRA', label: 'Mão de Obra', color: '#f59e0b' },
    { value: 'OPEX', label: 'OPEX', color: '#3b82f6' },
    { value: 'CAPEX', label: 'CAPEX', color: '#06b6d4' },
];

// Tipo de custo: se foi previsto no orçamento ou não (não afeta aprovação)
const costTypeOptions = [
    { value: 'PLANNED', label: 'Custo Previsto (no orçamento)' },
    { value: 'UNPLANNED', label: 'Custo Não Previsto (extra orçamentário)' },
];

// ==============================================
// MAIN COMPONENT
// ==============================================
const ExpenseModal = ({
    open,
    onClose,
    onSave,
    expense = null,
    isViewMode = false,
    isProjectContext = false
}) => {
    const [mounted, setMounted] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    const [suppliers, setSuppliers] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loadingDeps, setLoadingDeps] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
        resolver: yupResolver(getSchema()),
        defaultValues: {
            description: '', amount: '', date: '', dueDate: '', paymentDate: '',
            accountId: '', costCenterId: '', supplierId: '', contractId: '',
            status: 'PREVISTO', approvalStatus: 'PLANNED', invoiceNumber: '', type: 'SERVICO'
        }
    });

    const watchedType = watch('type');
    const watchedStatus = watch('status');
    const watchedSupplierId = watch('supplierId');

    // Filtrar contratos pelo fornecedor selecionado
    const filteredContracts = useMemo(() => {
        if (!watchedSupplierId) return [];
        return contracts.filter(c => c.supplierId === watchedSupplierId);
    }, [contracts, watchedSupplierId]);

    // Limpar contrato quando mudar fornecedor
    useEffect(() => {
        setValue('contractId', '');
    }, [watchedSupplierId, setValue]);

    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

    useEffect(() => {
        if (open) {
            loadDependencies();
            if (expense) {
                reset({
                    ...expense,
                    date: expense.date?.split('T')[0] || '',
                    dueDate: expense.dueDate?.split('T')[0] || '',
                    paymentDate: expense.paymentDate?.split('T')[0] || '',
                    supplierId: expense.supplierId || '',
                    contractId: expense.contractId || '',
                    costCenterId: expense.costCenterId || '',
                    accountId: expense.accountId || '',
                    type: expense.type || 'SERVICO',
                    approvalStatus: expense.approvalStatus || 'PLANNED'
                });
            } else {
                reset({
                    description: '', amount: '', date: '', dueDate: '', paymentDate: '',
                    accountId: '', costCenterId: '', supplierId: '', contractId: '',
                    status: 'PREVISTO', approvalStatus: 'PLANNED', invoiceNumber: '', type: 'SERVICO'
                });
                setSelectedFile(null);
            }
        }
    }, [open, expense, reset]);

    const loadDependencies = async () => {
        setLoadingDeps(true);
        try {
            const [s, c, cc, acc] = await Promise.all([
                getReferenceSuppliers(),
                getReferenceContracts(),
                getReferenceCostCenters(),
                getReferenceAccounts()
            ]);
            setSuppliers(s);
            setContracts(c);
            setCostCenters(cc);
            setAccounts(acc);
        } catch (error) {
            console.error("Erro ao carregar dependências", error);
            enqueueSnackbar('Erro ao carregar listas auxiliares', { variant: 'error' });
        } finally {
            setLoadingDeps(false);
        }
    };

    const onSubmit = (data) => {
        if (isViewMode) return;

        // Validar arquivo obrigatório (se não estiver editando um custo que já tem arquivo)
        if (!selectedFile && !expense?.fileUrl) {
            const contextLabel = isProjectContext ? 'custo' : 'despesa';
            enqueueSnackbar(`Anexe o documento comprobatório (PDF/Imagem) para lançar o ${contextLabel}.`, { variant: 'warning' });
            return;
        }

        const payload = { ...data };
        if (selectedFile) payload.file = selectedFile;
        onSave(payload);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            PaperProps={{
                sx: {
                    width: '100%',
                    maxWidth: '720px',
                    maxHeight: '90vh',
                    background: 'var(--modal-bg)',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--modal-surface-hover)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }
            }}
            BackdropProps={{
                sx: {
                    backdropFilter: 'blur(4px)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                }
            }}
        >
            {/* Header */}
            <Box sx={{
                padding: '24px 24px 20px 24px',
                borderBottom: '1px solid var(--modal-border-strong)',
                background: 'var(--modal-header-gradient)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                        <Box sx={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                        }}>
                            <ReceiptLong sx={{ color: 'var(--modal-text)', fontSize: '22px' }} />
                        </Box>
                        <Box>
                            <Typography sx={{ color: 'var(--modal-text)', fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                                {isViewMode ? 'Detalhes da Despesa' : (expense ? 'Editar Despesa' : 'Nova Despesa')}
                            </Typography>
                            <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '13px', mt: 0.25 }}>
                                Lançamento oficial de custos e despesas
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        onClick={onClose}
                        sx={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'var(--modal-surface-hover)',
                            color: 'var(--modal-text-muted)',
                            '&:hover': { background: 'var(--modal-border-strong)', color: 'var(--modal-text)' }
                        }}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                background: 'var(--modal-bg)',
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': { background: 'var(--modal-border-strong)', borderRadius: '3px' },
                '&::-webkit-scrollbar-thumb:hover': { background: 'var(--modal-border-strong)' }
            }}>
                {loadingDeps ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress sx={{ color: '#3b82f6' }} />
                    </Box>
                ) : (
                    <form id="expenseFormDark" onSubmit={handleSubmit(onSubmit)}>
                        {/* Descrição e Valor */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                            <Box sx={{ flex: 2 }}>
                                <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                    Descrição <span style={{ color: '#ef4444' }}>*</span>
                                </Typography>
                                <Controller name="description" control={control} render={({ field }) => (
                                    <TextField
                                        {...field}
                                        placeholder="Ex: Licenças de Software SAP"
                                        fullWidth
                                        error={!!errors.description}
                                        helperText={errors.description?.message}
                                        disabled={isViewMode}
                                        sx={darkInputStyles}
                                    />
                                )} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                    Valor <span style={{ color: '#ef4444' }}>*</span>
                                </Typography>
                                <Controller name="amount" control={control} render={({ field }) => (
                                    <TextField
                                        {...field}
                                        type="number"
                                        placeholder="0,00"
                                        fullWidth
                                        error={!!errors.amount}
                                        helperText={errors.amount?.message}
                                        disabled={isViewMode}
                                        InputProps={{
                                            startAdornment: <Typography sx={{ color: 'var(--modal-text-muted)', mr: 0.5 }}>R$</Typography>
                                        }}
                                        sx={darkInputStyles}
                                    />
                                )} />
                            </Box>
                        </Box>

                        {/* Categoria Section */}
                        <Box sx={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid var(--modal-border-strong)',
                            background: 'var(--modal-surface-subtle)',
                            mb: 2.5
                        }}>
                            <Typography sx={{
                                color: 'var(--modal-text-muted)',
                                fontSize: '11px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                mb: 1.5
                            }}>
                                CATEGORIA
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {categoryOptions.map(cat => (
                                    <Button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => !isViewMode && setValue('type', cat.value)}
                                        disabled={isViewMode}
                                        sx={{
                                            padding: '8px 16px',
                                            border: `1px solid ${watchedType === cat.value ? cat.color : 'var(--modal-border-strong)'}`,
                                            background: watchedType === cat.value ? `${cat.color}20` : 'var(--modal-surface-hover)',
                                            color: watchedType === cat.value ? cat.color : 'var(--modal-text-muted)',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            textTransform: 'none',
                                            minWidth: 'auto',
                                            '&:hover': {
                                                borderColor: cat.color,
                                                background: watchedType === cat.value ? `${cat.color}30` : 'var(--modal-border-strong)'
                                            },
                                            '&.Mui-disabled': {
                                                color: watchedType === cat.value ? cat.color : 'var(--modal-text-muted)',
                                                borderColor: watchedType === cat.value ? cat.color : 'var(--modal-surface-hover)'
                                            }
                                        }}
                                    >
                                        {cat.label}
                                    </Button>
                                ))}
                            </Box>
                        </Box>

                        {/* Datas Section */}
                        <Box sx={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid var(--modal-border-strong)',
                            background: 'var(--modal-surface-subtle)',
                            mb: 2.5
                        }}>
                            <Typography sx={{
                                color: 'var(--modal-text-muted)',
                                fontSize: '11px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                mb: 1.5
                            }}>
                                DATAS
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                        Data Competência <span style={{ color: '#ef4444' }}>*</span>
                                    </Typography>
                                    <Controller name="date" control={control} render={({ field }) => (
                                        <TextField
                                            {...field}
                                            type="date"
                                            fullWidth
                                            error={!!errors.date}
                                            helperText={errors.date?.message}
                                            disabled={isViewMode}
                                            sx={darkInputStyles}
                                        />
                                    )} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                        Data Vencimento <span style={{ color: '#ef4444' }}>*</span>
                                    </Typography>
                                    <Controller name="dueDate" control={control} render={({ field }) => (
                                        <TextField
                                            {...field}
                                            type="date"
                                            fullWidth
                                            value={field.value || ''}
                                            error={!!errors.dueDate}
                                            helperText={errors.dueDate?.message}
                                            disabled={isViewMode}
                                            sx={darkInputStyles}
                                        />
                                    )} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                        Data Pagamento
                                    </Typography>
                                    <Controller name="paymentDate" control={control} render={({ field }) => (
                                        <TextField
                                            {...field}
                                            type="date"
                                            fullWidth
                                            value={field.value || ''}
                                            disabled={isViewMode}
                                            sx={darkInputStyles}
                                        />
                                    )} />
                                </Box>
                            </Box>
                        </Box>

                        {/* Configurações Section */}
                        <Box sx={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid var(--modal-border-strong)',
                            background: 'var(--modal-surface-subtle)',
                            mb: 2.5
                        }}>
                            <Typography sx={{
                                color: 'var(--modal-text-muted)',
                                fontSize: '11px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                mb: 1.5
                            }}>
                                CONFIGURAÇÕES
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                {/* Tipo de Custo */}
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                        Tipo de Custo
                                    </Typography>
                                    <Controller name="approvalStatus" control={control} render={({ field }) => (
                                        <Select
                                            {...field}
                                            fullWidth
                                            disabled={isViewMode}
                                            sx={darkSelectStyles}
                                            MenuProps={{ sx: { zIndex: 1400 } }}
                                        >
                                            {costTypeOptions.map(opt => (
                                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                            ))}
                                        </Select>
                                    )} />
                                </Box>
                                {/* Nº NF */}
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                        Nº Nota Fiscal <span style={{ color: '#ef4444' }}>*</span>
                                    </Typography>
                                    <Controller name="invoiceNumber" control={control} render={({ field }) => (
                                        <TextField
                                            {...field}
                                            placeholder="Ex: NF-123456"
                                            fullWidth
                                            value={field.value || ''}
                                            error={!!errors.invoiceNumber}
                                            helperText={errors.invoiceNumber?.message}
                                            disabled={isViewMode}
                                            sx={darkInputStyles}
                                        />
                                    )} />
                                </Box>
                            </Box>

                            {/* Fornecedor e Contrato */}
                            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                        Fornecedor <span style={{ color: '#ef4444' }}>*</span>
                                    </Typography>
                                    <Controller name="supplierId" control={control} render={({ field }) => (
                                        <Select
                                            {...field}
                                            fullWidth
                                            displayEmpty
                                            value={field.value || ''}
                                            error={!!errors.supplierId}
                                            disabled={isViewMode}
                                            sx={darkSelectStyles}
                                            MenuProps={{ sx: { zIndex: 1400 } }}
                                        >
                                            <MenuItem value="">Selecione...</MenuItem>
                                            {suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                                        </Select>
                                    )} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                        Contrato
                                    </Typography>
                                    <Controller name="contractId" control={control} render={({ field }) => (
                                        <Select
                                            {...field}
                                            fullWidth
                                            displayEmpty
                                            value={field.value || ''}
                                            disabled={isViewMode}
                                            sx={darkSelectStyles}
                                            MenuProps={{ sx: { zIndex: 1400 } }}
                                        >
                                            <MenuItem value="">Nenhum</MenuItem>
                                            {filteredContracts.map(c => <MenuItem key={c.id} value={c.id}>{c.number} - {c.description}</MenuItem>)}
                                        </Select>
                                    )} />
                                </Box>
                            </Box>

                            {/* Centro de Custo (sempre obrigatório) e Conta Contábil (opcional) */}
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                        Centro de Custo <span style={{ color: '#ef4444' }}>*</span>
                                    </Typography>
                                    <Controller name="costCenterId" control={control} render={({ field }) => (
                                        <Select
                                            {...field}
                                            fullWidth
                                            displayEmpty
                                            value={field.value || ''}
                                            disabled={isViewMode}
                                            error={!!errors.costCenterId}
                                            sx={darkSelectStyles}
                                            MenuProps={{ sx: { zIndex: 1400 } }}
                                        >
                                            <MenuItem value="">Selecione...</MenuItem>
                                            {costCenters.map(cc => <MenuItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</MenuItem>)}
                                        </Select>
                                    )} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                        Conta Contábil
                                    </Typography>
                                    <Controller name="accountId" control={control} render={({ field }) => (
                                        <Select
                                            {...field}
                                            fullWidth
                                            displayEmpty
                                            value={field.value || ''}
                                            disabled={isViewMode}
                                            sx={darkSelectStyles}
                                            MenuProps={{ sx: { zIndex: 1400 } }}
                                        >
                                            <MenuItem value="">Nenhum</MenuItem>
                                            {accounts.map(acc => <MenuItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</MenuItem>)}
                                        </Select>
                                    )} />
                                </Box>
                            </Box>
                        </Box>

                        {/* Upload de Arquivo */}
                        <Box sx={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid var(--modal-border-strong)',
                            background: 'var(--modal-surface-subtle)',
                        }}>
                            <Typography sx={{
                                color: 'var(--modal-text-muted)',
                                fontSize: '11px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                mb: 1.5
                            }}>
                                ANEXO
                            </Typography>

                            {!isViewMode ? (
                                <Button
                                    component="label"
                                    fullWidth
                                    sx={{
                                        height: '60px',
                                        borderStyle: 'dashed',
                                        border: '1px dashed var(--modal-border-strong)',
                                        borderRadius: '10px',
                                        color: 'var(--modal-text-muted)',
                                        textTransform: 'none',
                                        fontSize: '14px',
                                        '&:hover': {
                                            borderColor: '#3b82f6',
                                            background: 'rgba(59, 130, 246, 0.05)',
                                            color: '#3b82f6'
                                        }
                                    }}
                                    startIcon={<CloudUpload />}
                                >
                                    {selectedFile ? selectedFile.name : 'Anexar Fatura/NF (PDF, Imagem)'}
                                    <input type="file" hidden onChange={(e) => setSelectedFile(e.target.files[0])} />
                                </Button>
                            ) : (
                                <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '13px', textAlign: 'center' }}>
                                    Upload desabilitado em visualização
                                </Typography>
                            )}

                            {expense?.fileUrl && !selectedFile && (
                                <Chip
                                    icon={<Description sx={{ color: '#3b82f6 !important' }} />}
                                    label="Ver Anexo Atual"
                                    size="small"
                                    onClick={() => window.open(getFileURL(expense.fileUrl), '_blank')}
                                    sx={{
                                        mt: 1.5,
                                        width: '100%',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        color: '#3b82f6',
                                        border: '1px solid rgba(59, 130, 246, 0.2)',
                                        cursor: 'pointer',
                                        '&:hover': { background: 'rgba(59, 130, 246, 0.2)' }
                                    }}
                                />
                            )}
                        </Box>
                    </form>
                )}
            </Box>

            {/* Footer */}
            <Box sx={{
                padding: '16px 24px',
                borderTop: '1px solid var(--modal-border-strong)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 1.5,
                background: 'var(--modal-surface-subtle)'
            }}>
                <Button
                    onClick={onClose}
                    sx={{
                        background: 'transparent',
                        border: '1px solid var(--modal-border)',
                        color: 'var(--modal-text-secondary)',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: 500,
                        textTransform: 'none',
                        '&:hover': {
                            borderColor: 'var(--modal-text-muted)',
                            background: 'var(--modal-surface-hover)',
                            color: 'var(--modal-text)'
                        }
                    }}
                >
                    {isViewMode ? 'Fechar' : 'Cancelar'}
                </Button>
                {!isViewMode && (
                    <Button
                        type="submit"
                        form="expenseFormDark"
                        sx={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'var(--modal-text)',
                            borderRadius: '8px',
                            padding: '10px 24px',
                            fontSize: '14px',
                            fontWeight: 600,
                            textTransform: 'none',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                boxShadow: '0 6px 16px rgba(16, 185, 129, 0.4)'
                            }
                        }}
                    >
                        ✓ {expense ? 'Salvar Alterações' : 'Lançar Despesa'}
                    </Button>
                )}
            </Box>
        </Dialog>
    );
};

export default ExpenseModal;
