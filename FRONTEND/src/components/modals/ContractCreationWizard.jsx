import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Box, Typography, TextField, MenuItem, Button, Grid,
    InputAdornment, FormControlLabel, Switch, Paper, Chip, CircularProgress,
    IconButton, Tooltip,
} from '@mui/material';
import StandardModal from '../common/StandardModal';
import {
    ArrowForward, ArrowBack, Save, Business, AttachMoney,
    AccountBalance, CloudUpload, Description, Numbers, Check,
    Close, Add
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { getReferenceSuppliers, getReferenceCostCenters, getReferenceAccounts, clearReferenceCache } from '../../services/reference.service';
import { getFileURL, getUploadURL } from '../../utils/urlUtils';

// Import Inter font if not globally available, or rely on system
// We will apply it significantly via SX

const schema = yup.object({
    number: yup.string().required('Número é obrigatório'),
    description: yup.string().required('Descrição é obrigatória'),
    supplierId: yup.string().required('Fornecedor é obrigatório'),
    type: yup.string().required('Tipo é obrigatório'),
    value: yup.number()
        .transform((value, originalValue) => (String(originalValue).trim() === '' ? null : value))
        .required('Valor Total é obrigatório'),
    monthlyValue: yup.number().nullable().transform((value, originalValue) => (String(originalValue).trim() === '' ? null : value)),
    readjustmentRate: yup.number().nullable().transform((value, originalValue) => (String(originalValue).trim() === '' ? null : value)),
    startDate: yup.string().required('Data de Início é obrigatória'),
    endDate: yup.string().required('Data de Fim é obrigatória'),
    signatureDate: yup.string().nullable(),
    costCenterId: yup.string().nullable(),
    accountId: yup.string().nullable(),
    autoRenew: yup.boolean().default(false)
}).required();

// Precise styling from mockup
const modalStyles = {
    fontFamily: "'Inter', sans-serif",
    input: {
        '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#333',
            minHeight: '48px',
            '& fieldset': { borderColor: '#c4c4c4' },
            '&:hover fieldset': { borderColor: '#a0a0a0' },
            '&.Mui-focused fieldset': { borderColor: '#2563eb', borderWidth: '2px' }
        },
        '& .MuiInputLabel-root': {
            color: '#666',
            fontSize: '0.85rem',
        },
        '& .MuiInputLabel-shrink': {
            color: '#666',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.02em',
            background: 'white',
            padding: '0 6px'
        },
        '& .MuiInputLabel-root.Mui-focused': { color: '#2563eb' },
        '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            minHeight: '24px !important',
        },
    }
};

const steps = ['Identificação', 'Financeiro & Vigência', 'Classificação', 'Documentos'];

const MAX_UPLOAD_MB = 25;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Layout-stable Stepper
const LayoutStepper = ({ activeStep, steps }) => {
    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', width: '100%' }}>
            {steps.map((label, index) => {
                const isFirst = index === 0;
                const isLast = index === steps.length - 1;
                const isCompleted = index < activeStep;
                const isActive = index === activeStep;

                return (
                    <Box key={index} sx={{ flex: isLast ? 0 : 1, display: 'flex', alignItems: 'flex-start' }}>
                        {/* Node */}
                        <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
                            <Box sx={{
                                width: 32, height: 32, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.875rem', fontWeight: 600,
                                bgcolor: isActive ? '#2563eb' : (isCompleted ? '#10b981' : '#fff'),
                                color: isActive || isCompleted ? '#fff' : '#94a3b8',
                                border: (isActive || isCompleted) ? 'none' : '2px solid #e2e8f0',
                                boxShadow: isActive ? '0 0 0 4px rgba(37, 99, 235, 0.2)' : 'none',
                                zIndex: 10,
                                transition: 'all 0.3s ease'
                            }}>
                                {isCompleted ? '✓' : index + 1}
                            </Box>
                            <Typography sx={{
                                position: 'absolute', top: 38, whiteSpace: 'nowrap',
                                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                                color: isActive ? '#2563eb' : (isCompleted ? '#10b981' : '#94a3b8')
                            }}>
                                {label}
                            </Typography>
                        </Box>

                        {/* Line to next */}
                        {!isLast && (
                            <Box sx={{
                                flexGrow: 1, height: 2, bgcolor: index < activeStep ? '#2563eb' : '#e2e8f0',
                                mt: '15px', mx: 1, borderRadius: 1
                            }} />
                        )}
                    </Box>
                )
            })}
        </Box>
    );
}


const ContractCreationWizard = ({ onSave, onCancel, loading }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [activeStep, setActiveStep] = useState(0);
    const [autoCalculate, setAutoCalculate] = useState(true);
    const [attachments, setAttachments] = useState([]);

    const [suppliers, setSuppliers] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [customTypes, setCustomTypes] = useState([]);
    const [addTypeOpen, setAddTypeOpen] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');

    const defaultTypes = ['SERVIÇO', 'FORNECIMENTO', 'ALOCAÇÃO', 'MANUTENÇÃO', 'OUTROS'];
    const allTypes = [...defaultTypes, ...customTypes];

    const { control, trigger, watch, getValues, setValue, formState: { errors }, handleSubmit } = useForm({
        resolver: yupResolver(schema),
        mode: 'onChange',
        shouldUnregister: false,
        defaultValues: {
            number: '', description: '', type: 'SERVIÇO', autoRenew: false,
            supplierId: '', costCenterId: '', accountId: '',
            monthlyValue: '', readjustmentRate: '', value: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            signatureDate: new Date().toISOString().split('T')[0]
        }
    });

    useEffect(() => {
        clearReferenceCache();
        Promise.all([getReferenceSuppliers(), getReferenceCostCenters(), getReferenceAccounts()])
            .then(([s, c, a]) => { setSuppliers(s); setCostCenters(c); setAccounts(a); })
            .catch(err => console.error("Erro ao carregar dados:", err));
    }, []);

    // Auto-calculate logic (same as before)
    const watchStartDate = watch('startDate');
    const watchEndDate = watch('endDate');
    const watchMonthly = watch('monthlyValue');
    const watchRate = watch('readjustmentRate');
    const watchSignature = watch('signatureDate');

    useEffect(() => {
        if (!autoCalculate) return;
        if (watchStartDate && watchEndDate && watchMonthly) {
            const start = new Date(watchStartDate);
            const end = new Date(watchEndDate);
            const monthly = parseFloat(watchMonthly);
            const rate = watchRate ? parseFloat(watchRate) / 100 : 0;

            if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && !isNaN(monthly)) {
                let total = 0, currentMonthly = monthly;
                let currentDate = new Date(start);
                currentDate.setHours(12, 0, 0, 0);
                const diffTime = Math.abs(end - start);
                const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));

                // Simple calculation to match basic expectation
                total = monthly * diffMonths;

                if (rate > 0) {
                    // Basic adjustment logic if needed, but for now simple sum
                }

                setValue('value', parseFloat(total.toFixed(2)));
            }
        }
    }, [watchStartDate, watchEndDate, watchMonthly, watchRate, autoCalculate, setValue]);

    const handleNext = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        console.log("--- CLICOU NEXT --- Step Atual:", activeStep);
        let fieldsToValidate = [];
        if (activeStep === 0) fieldsToValidate = ['type', 'description', 'supplierId'];
        if (activeStep === 1) fieldsToValidate = ['startDate', 'endDate', 'value'];

        console.log("Validando campos:", fieldsToValidate);
        const isValid = await trigger(fieldsToValidate);

        if (isValid) {
            console.log("Campos válidos! Avançando para Step", activeStep + 1);
            setActiveStep((prev) => prev + 1);
        } else {
            console.log("Validation failed no wizard", errors);
            enqueueSnackbar('Preencha os campos obrigatórios', { variant: 'warning' });
        }
    };

    const handleBack = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setActiveStep((prev) => prev - 1);
    };

    const onSubmit = (formData, event) => {
        if (event && event.preventDefault) event.preventDefault();
        console.log('!!!!!!! RHF ONSUBMIT DISPARADO !!!!!!!');
        console.log('Submitter event:', event?.nativeEvent?.submitter);
        
        // Forçar captura de todos os valores registrados na UI para suplantar o bug do RHF
        const data = getValues();
        console.log('RHF ONSUBMIT DATA COM GETVALUES() FORCE:', data);
        
        const payload = {
            ...data,
            costCenterId: data.costCenterId || null,
            accountId: data.accountId || null,
            monthlyValue: data.monthlyValue === '' || isNaN(data.monthlyValue) ? null : Number(data.monthlyValue),
            readjustmentRate: data.readjustmentRate === '' || isNaN(data.readjustmentRate) ? null : Number(data.readjustmentRate),
            value: data.value === '' || isNaN(data.value) ? null : Number(data.value),
            attachments: attachments.filter(a => a.isPending)
        };
        onSave(payload);
    };

    const handleFileUpload = async (file, type) => {
        if (!file) return;
        if (file.size > MAX_UPLOAD_BYTES) {
            enqueueSnackbar(`Arquivo excede ${MAX_UPLOAD_MB}MB.`, { variant: 'warning' });
            return;
        }
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(getUploadURL(), {
                method: 'POST', body: formData,
                headers: { 'Authorization': `Bearer ${localStorage.getItem('g360_token')}` }
            });
            if (!response.ok) throw new Error('Upload falhou.');
            const data = await response.json();
            const fileName = data.fileName || data.originalName;
            const fileUrl = data.fileUrl || data.url;
            setAttachments(prev => [...prev.filter(p => p.type !== type), { type, fileName, fileUrl, isPending: true }]);
            enqueueSnackbar('Anexado', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Erro upload', { variant: 'error' });
        }
    };

    const getFileByType = (type) => attachments.find(a => a.type === type);

    const FileUploadBox = ({ label, type }) => {
        const file = getFileByType(type);
        return (
            <Box sx={{
                border: '2px dashed',
                borderColor: file ? '#818cf8' : '#e2e8f0', // Indigo-300 or Gray-200
                borderRadius: '16px', p: 3,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                bgcolor: '#f9fafb', // Gray-50
                cursor: 'pointer', transition: 'all 0.2s',
                '&:hover': { borderColor: '#c7d2fe' } // Indigo-200
            }}>
                <Box sx={{
                    width: 48, height: 48, borderRadius: '50%',
                    bgcolor: '#e0e7ff', color: '#2563eb', // Indigo-50, Indigo-500
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {file ? <Check /> : <CloudUpload />}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151' }}>{label}</Typography>
                <Button component="label" size="small" variant="outlined" sx={{
                    textTransform: 'none', borderRadius: '8px',
                    borderColor: '#e5e7eb', color: '#6b7280', fontWeight: 700, fontSize: '12px',
                    bgcolor: 'white', '&:hover': { bgcolor: '#f3f4f6' }
                }}>
                    Selecionar arquivo
                    <input type="file" hidden onChange={(e) => handleFileUpload(e.target.files[0], type)} />
                </Button>
            </Box>
        );
    };

    const renderStepContent = () => {
        // Animation keyframes injected via global styles or Box
        const fadeIn = { animation: 'fadeIn 0.4s ease-out', '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } } };

        return (
            <>
                {/* Step 0 */}
                <Box sx={{ ...fadeIn, display: activeStep === 0 ? 'block' : 'none' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, color: '#1e40af' }}>
                        <Business />
                        <Box>
                            <Typography fontWeight="800" fontSize="15px" color="#1f2937">Dados do Contrato</Typography>
                            <Typography fontSize="12px" color="#6b7280">Identificação e fornecedor</Typography>
                        </Box>
                    </Box>
                    <Grid container spacing={2.5}>
                        <Grid size={3}>
                            <Controller name="number" control={control} render={({ field }) => (
                                <TextField {...field} label="NÚMERO" fullWidth sx={modalStyles.input} placeholder="0000/2026" InputProps={{ startAdornment: <InputAdornment position="start"><Typography color="#9ca3af">#</Typography></InputAdornment> }} error={!!errors.number} helperText={errors.number?.message} />
                            )} />
                        </Grid>
                        <Grid size={5}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Controller name="type" control={control} render={({ field }) => (
                                        <TextField {...field} select label="TIPO DE CONTRATO" fullWidth sx={modalStyles.input} InputLabelProps={{ shrink: true }} error={!!errors.type} helperText={errors.type?.message} SelectProps={{ displayEmpty: true, renderValue: (value) => { if (!value) return <em style={{ color: '#9ca3af' }}>Selecione o tipo...</em>; return value; } }}>
                                            {allTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                        </TextField>
                                    )} />
                                </Box>
                                <Tooltip title="Adicionar novo tipo">
                                    <IconButton onClick={() => setAddTypeOpen(true)} sx={{ mt: '4px', bgcolor: '#f0f0ff', border: '1px solid #e0e0ff', borderRadius: '8px', width: 48, height: 48, color: '#1d4ed8', '&:hover': { bgcolor: '#e8e8ff' } }}>
                                        <Add />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <StandardModal
                                open={addTypeOpen}
                                onClose={() => { setNewTypeName(''); setAddTypeOpen(false); }}
                                title="Novo Tipo de Contrato"
                                subtitle="Defina um tipo personalizado para esta pasta"
                                icon="folder_special"
                                size="form"
                                footer={
                                    <>
                                        <Button variant="outlined" onClick={() => { setNewTypeName(''); setAddTypeOpen(false); }}>
                                            Cancelar
                                        </Button>
                                        <Button
                                            variant="contained"
                                            disabled={!newTypeName.trim() || allTypes.includes(newTypeName.trim())}
                                            onClick={() => {
                                                setCustomTypes(prev => [...prev, newTypeName.trim()]);
                                                setValue('type', newTypeName.trim());
                                                setNewTypeName('');
                                                setAddTypeOpen(false);
                                            }}
                                            sx={{ textTransform: 'none', fontWeight: 700 }}
                                        >
                                            Adicionar
                                        </Button>
                                    </>
                                }
                                contentSx={{ pt: 2 }}
                            >
                                <TextField
                                    autoFocus
                                    fullWidth
                                    label="Nome do tipo"
                                    value={newTypeName}
                                    onChange={(e) => setNewTypeName(e.target.value.toUpperCase())}
                                    placeholder="Ex: CONSULTORIA"
                                    sx={{ ...modalStyles.input }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newTypeName.trim()) {
                                            e.preventDefault();
                                            if (!allTypes.includes(newTypeName.trim())) {
                                                setCustomTypes(prev => [...prev, newTypeName.trim()]);
                                                setValue('type', newTypeName.trim());
                                            }
                                            setNewTypeName('');
                                            setAddTypeOpen(false);
                                        }
                                    }}
                                />
                            </StandardModal>
                        </Grid>
                        <Grid size={4}>
                            <Controller name="signatureDate" control={control} render={({ field }) => (
                                <TextField {...field} type="date" label="DATA DE ASSINATURA" fullWidth sx={modalStyles.input} InputLabelProps={{ shrink: true }} />
                            )} />
                        </Grid>
                        <Grid size={12}>
                            <Controller name="description" control={control} render={({ field }) => (
                                <TextField {...field} label="OBJETO DO CONTRATO" fullWidth multiline rows={3} sx={modalStyles.input} placeholder="Descreva o objeto principal deste contrato..." />
                            )} />
                        </Grid>
                        <Grid size={12}>
                            <Controller name="supplierId" control={control} render={({ field }) => (
                                <TextField {...field} select label="Fornecedor (Obrigatório)" fullWidth sx={modalStyles.input} InputLabelProps={{ shrink: true }} error={!!errors.supplierId} helperText={errors.supplierId?.message} SelectProps={{ displayEmpty: true, renderValue: (value) => { if (!value) return <em style={{ color: '#9ca3af' }}>Selecione o fornecedor...</em>; const supplier = suppliers.find(s => s.id === value); return supplier ? (supplier.document ? `${supplier.name} - ${supplier.document}` : supplier.name) : value; } }}>
                                    <MenuItem value=""><em>Selecione...</em></MenuItem>
                                    {suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}{s.document ? ` - ${s.document}` : ''}</MenuItem>)}
                                </TextField>
                            )} />
                        </Grid>
                    </Grid>
                </Box>

                {/* Step 1 */}
                <Box sx={{ ...fadeIn, display: activeStep === 1 ? 'block' : 'none' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, color: '#059669' }}>
                        <AttachMoney />
                        <Box>
                            <Typography fontWeight="800" fontSize="16px" color="#1f2937">Financeiro & Vigência</Typography>
                            <Typography fontSize="12px" color="#6b7280">Valores, reajuste e período</Typography>
                        </Box>
                    </Box>
                    <Grid container spacing={3}>
                        <Grid size={6}>
                            <Controller name="monthlyValue" control={control} render={({ field }) => (
                                <TextField {...field} label="Valor Mensal" fullWidth sx={modalStyles.input} type="number" InputProps={{ startAdornment: <InputAdornment position="start"><Typography fontWeight="bold" color="#9ca3af">R$</Typography></InputAdornment> }} />
                            )} />
                        </Grid>
                        <Grid size={6}>
                            <Controller name="readjustmentRate" control={control} render={({ field }) => (
                                <TextField {...field} label="Reajuste Anual (%)" fullWidth sx={modalStyles.input} type="number" placeholder="Ex: 3" />
                            )} />
                        </Grid>
                        <Grid size={6}>
                            <Controller name="startDate" control={control} render={({ field }) => (
                                <TextField {...field} label="Início Vigência" type="date" fullWidth sx={modalStyles.input} InputLabelProps={{ shrink: true }} />
                            )} />
                        </Grid>
                        <Grid size={6}>
                            <Controller name="endDate" control={control} render={({ field }) => (
                                <TextField {...field} label="Fim Vigência" type="date" fullWidth sx={modalStyles.input} InputLabelProps={{ shrink: true }} />
                            )} />
                        </Grid>
                        <Grid size={12}>
                            <Box sx={{ border: '1px solid #d1fae5', borderRadius: '12px', p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', bgcolor: 'white' }}>
                                <Box>
                                    <Typography sx={{ fontSize: '10px', fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>Valor Total do Contrato</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                        <Typography sx={{ color: '#10b981', fontWeight: 700, fontSize: '18px' }}>R$</Typography>
                                        <Typography sx={{ color: '#1f2937', fontWeight: 900, fontSize: '30px' }}>{watch('value') ? parseFloat(watch('value')).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ bgcolor: '#ecfdf5', px: 2, py: 1, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Switch checked={autoCalculate} onChange={e => setAutoCalculate(e.target.checked)} color="success" size="small" />
                                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#047857' }}>Cálculo Automático</Typography>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>

                {/* Step 2 */}
                <Box sx={{ ...fadeIn, display: activeStep === 2 ? 'block' : 'none' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, color: '#d97706' }}>
                        <AccountBalance />
                        <Box>
                            <Typography fontWeight="800" fontSize="16px" color="#1f2937">Classificação</Typography>
                            <Typography fontSize="12px" color="#6b7280">Categorização e centro de custo</Typography>
                        </Box>
                    </Box>
                    <Grid container spacing={3}>
                        <Grid size={12}>
                            <Controller name="costCenterId" control={control} render={({ field }) => (
                                <TextField {...field} select label="Centro de Custo" fullWidth sx={modalStyles.input}>
                                    <MenuItem value=""><em>Selecione...</em></MenuItem>
                                    {costCenters.map(cc => <MenuItem key={cc.id} value={cc.id}>{cc.name}</MenuItem>)}
                                </TextField>
                            )} />
                        </Grid>
                        <Grid size={6}>
                            <Controller name="accountId" control={control} render={({ field }) => (
                                <TextField {...field} select label="Categoria / Conta" fullWidth sx={modalStyles.input}>
                                    <MenuItem value=""><em>Selecione...</em></MenuItem>
                                    {accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                                </TextField>
                            )} />
                        </Grid>
                        <Grid size={6}>
                            <Controller name="autoRenew" control={control} render={({ field }) => (
                                <Box sx={{ height: '56px', border: '1px solid #c4c4c4', borderRadius: '8px', display: 'flex', alignItems: 'center', px: 2, justifyContent: 'space-between' }}>
                                    <Typography sx={{ fontSize: '14px', color: '#666', fontWeight: 600 }}>Renovação Automática</Typography>
                                    <Switch {...field} checked={!!field.value} color="primary" />
                                </Box>
                            )} />
                        </Grid>
                    </Grid>
                </Box>

                {/* Step 3 */}
                <Box sx={{ ...fadeIn, display: activeStep === 3 ? 'block' : 'none' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, color: '#1d4ed8' }}>
                        <CloudUpload />
                        <Box>
                            <Typography fontWeight="800" fontSize="16px" color="#1f2937">Documentos Anexados</Typography>
                            <Typography fontSize="12px" color="#6b7280">CNPJ, contrato e proposta</Typography>
                        </Box>
                    </Box>
                    <Grid container spacing={3}>
                        <Grid size={4}><FileUploadBox label="Cartão CNPJ" type="CNPJ" /></Grid>
                        <Grid size={4}><FileUploadBox label="Contrato Assinado" type="CONTRATO" /></Grid>
                        <Grid size={4}><FileUploadBox label="Proposta Comercial" type="PROPOSTA" /></Grid>
                    </Grid>
                </Box>
            </>
        );
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Inter, sans-serif' }}>
            {/* Header Fix - if Modal doesn't have it, we might need to rely on parent. But likely parent has it. */}

            {/* Stepper Container */}
            <Box sx={{ px: 5, py: 3, borderBottom: '1px solid #f1f5f9' }}>
                <LayoutStepper activeStep={activeStep} steps={steps} />
            </Box>

            {/* Content Container */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 4, py: 3 }}>
                <form 
                  id="contractWizardForm" 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                    }
                  }}
                  onSubmit={handleSubmit(onSubmit, (err) => console.log('HOOK FORM ERRORS:', err))}>
                    {renderStepContent(activeStep)}
                </form>
            </Box>

            {/* Footer Container */}
            <Box sx={{
                px: 4, py: 2, bgcolor: '#f9fafb', borderTop: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <Button onClick={onCancel} sx={{ color: '#6b7280', fontWeight: 700, textTransform: 'none' }}>
                    Cancelar
                </Button>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    {activeStep > 0 && (
                        <Button onClick={handleBack} variant="outlined" sx={{
                            borderRadius: '8px', textTransform: 'none', fontWeight: 700,
                            borderColor: '#e5e7eb', color: '#374151', bgcolor: 'white'
                        }} startIcon={<ArrowBack />}>
                            Voltar
                        </Button>
                    )}

                    {activeStep < steps.length - 1 ? (
                        <Button type="button" onClick={handleNext} variant="contained" sx={{
                            borderRadius: '8px', textTransform: 'none', fontWeight: 700,
                            bgcolor: '#1d4ed8', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)',
                            '&:hover': { bgcolor: '#1e40af' }, px: 4
                        }} endIcon={<ArrowForward />}>
                            Próximo
                        </Button>
                    ) : (
                        <Button type="submit" form="contractWizardForm" disabled={loading} variant="contained" sx={{
                            borderRadius: '8px', textTransform: 'none', fontWeight: 700,
                            bgcolor: '#10b981', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
                            '&:hover': { bgcolor: '#059669' }, px: 4
                        }} startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}>
                            {loading ? 'Criando...' : 'Criar Contrato'}
                        </Button>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default ContractCreationWizard;
