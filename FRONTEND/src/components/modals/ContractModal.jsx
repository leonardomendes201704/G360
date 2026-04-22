import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Box, Button, Tabs, Tab, IconButton, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
    TextField, MenuItem, Grid, Accordion, AccordionSummary, AccordionDetails,
    Typography, InputAdornment, FormControlLabel, Switch,
} from '@mui/material';
import StandardModal from '../common/StandardModal';
import {
    CloudUpload, Delete, Download, NoteAdd, Edit, Calculate,
    ExpandMore, Description, AttachMoney, AccountBalance, Info,
    Business, Numbers, Visibility
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { getFileURL, getUploadURL } from '../../utils/urlUtils';
import AddendumFormModal from './AddendumFormModal';
import AddendumViewModal from './AddendumViewModal';
import ContractCreationWizard from './ContractCreationWizard';
import { computeAddendumContractImpact } from '../../utils/contractAddendumImpact';

// Serviços
import { getReferenceSuppliers, getReferenceCostCenters, getReferenceAccounts, clearReferenceCache } from '../../services/reference.service';
import { getContractById } from '../../services/contract.service';
import {
    getAttachments, uploadAttachment, deleteAttachment,
    getAddendums, createAddendum, updateAddendum, deleteAddendum
} from '../../services/contract-details.service';

// --- SCHEMA DE VALIDAÇÃO ---
const schema = yup.object({
    number: yup.string().required('Número é obrigatório'),
    description: yup.string().required('Descrição é obrigatória'),
    supplierId: yup.string().required('Fornecedor é obrigatório'),
    type: yup.string().required('Tipo é obrigatório'),

    value: yup.number()
        .transform((value) => (isNaN(value) ? undefined : value))
        .required('Valor Total é obrigatório'),

    monthlyValue: yup.number().nullable().transform((v, o) => o === '' ? null : v),
    readjustmentRate: yup.number().nullable().transform((v, o) => o === '' ? null : v),

    startDate: yup.string().required('Data de Início é obrigatória'),
    endDate: yup.string().required('Data de Fim é obrigatória'),
    signatureDate: yup.string().nullable(),

    costCenterId: yup.string().nullable(),
    accountId: yup.string().nullable(),
    autoRenew: yup.boolean().default(false)
}).required();

const MAX_UPLOAD_MB = 25;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

const ContractModal = ({ open, onClose, onSave, onRefresh, contract = null, isViewMode = false }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [activeTab, setActiveTab] = useState(0);
    const [wizardSaving, setWizardSaving] = useState(false);

    // Estados de Dados
    const [suppliers, setSuppliers] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [addendums, setAddendums] = useState([]);

    // Aditivo State
    const [addendumModalOpen, setAddendumModalOpen] = useState(false);
    const [editingAddendum, setEditingAddendum] = useState(null);
    const [viewingAddendum, setViewingAddendum] = useState(null);
    const [expanded, setExpanded] = useState('panel1');



    const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            number: '', description: '', type: 'SERVICO', autoRenew: false,
            supplierId: '', costCenterId: '', accountId: '',
            monthlyValue: '', readjustmentRate: '', value: '',
            startDate: '', endDate: '', signatureDate: ''
        }
    });

    const handleChangeAccordion = (panel) => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : false);
    };

    const [autoCalculate, setAutoCalculate] = useState(true);

    // --- CÁLCULO AUTOMÁTICO ---
    const watchStartDate = watch('startDate');
    const watchEndDate = watch('endDate');
    const watchMonthly = watch('monthlyValue');
    const watchRate = watch('readjustmentRate');
    const watchSignature = watch('signatureDate');

    useEffect(() => {
        if (isViewMode || !autoCalculate) return;

        if (watchStartDate && watchEndDate && watchMonthly) {
            const start = new Date(watchStartDate);
            const end = new Date(watchEndDate);
            const monthly = parseFloat(watchMonthly);
            const rate = watchRate ? parseFloat(watchRate) / 100 : 0;
            const baseDate = watchSignature ? new Date(watchSignature) : new Date(start);

            if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && !isNaN(monthly)) {
                let total = 0;
                let currentMonthly = monthly;
                let currentDate = new Date(start);
                currentDate.setHours(12, 0, 0, 0);

                let nextAdjustment = new Date(baseDate);
                nextAdjustment.setHours(12, 0, 0, 0);
                nextAdjustment.setFullYear(nextAdjustment.getFullYear() + 1);

                while (currentDate < end) {
                    if (currentDate >= nextAdjustment && rate > 0) {
                        currentMonthly = currentMonthly * (1 + rate);
                        nextAdjustment.setFullYear(nextAdjustment.getFullYear() + 1);
                    }
                    total += currentMonthly;
                    currentDate.setMonth(currentDate.getMonth() + 1);
                }
                setValue('value', parseFloat(total.toFixed(2)));
            }
        }
    }, [watchStartDate, watchEndDate, watchMonthly, watchRate, watchSignature, isViewMode, setValue, autoCalculate]);

    useEffect(() => {
        if (open) {
            clearReferenceCache();
            Promise.all([
                getReferenceSuppliers(),
                getReferenceCostCenters(),
                getReferenceAccounts()
            ])
                .then(([s, c, a]) => { setSuppliers(s); setCostCenters(c); setAccounts(a); })
                .catch(err => console.error("Erro ao carregar dados:", err));

            if (contract) {
                reset({
                    ...contract,
                    number: contract.number || '',
                    description: contract.description || '',
                    startDate: contract.startDate?.split('T')[0] || '',
                    endDate: contract.endDate?.split('T')[0] || '',
                    signatureDate: contract.signatureDate ? contract.signatureDate.split('T')[0] : '',
                    supplierId: contract.supplierId || '',
                    costCenterId: contract.costCenterId || '',
                    accountId: contract.accountId || '',
                    monthlyValue: contract.monthlyValue || '',
                    readjustmentRate: contract.readjustmentRate || '',
                    value: contract.value || ''
                });
                loadDetails();
            } else {
                reset({
                    number: '', description: '', supplierId: '', type: 'SERVICO', value: '',
                    startDate: '', endDate: '', monthlyValue: '', readjustmentRate: '',
                    costCenterId: '', accountId: '', signatureDate: '', autoRenew: false
                });
                setAttachments([]);
                setAddendums([]);
            }
            setActiveTab(0);
            setAddendumModalOpen(false);
            setEditingAddendum(null);
            setViewingAddendum(null);
            setExpanded('panel1');
        }
    }, [open, contract, reset]);

    const loadDetails = async () => {
        if (!contract) return;
        try {
            const [atts, adds] = await Promise.all([getAttachments(contract.id), getAddendums(contract.id)]);
            setAttachments(atts);
            setAddendums(adds);
        } catch (e) { console.error(e); }
    };

    const refreshContractData = async () => {
        if (!contract) return;
        try {
            const updated = await getContractById(contract.id);
            setValue('value', updated.value);
            setValue('endDate', updated.endDate.split('T')[0]);
            if (onRefresh) onRefresh();
        } catch (error) { console.error(error); }
    };

    const onSubmit = (data) => {
        if (isViewMode) return;
        const payload = {
            ...data,
            costCenterId: data.costCenterId === '' ? null : data.costCenterId,
            accountId: data.accountId === '' ? null : data.accountId,
            monthlyValue: data.monthlyValue === '' ? null : data.monthlyValue,
            readjustmentRate: data.readjustmentRate === '' ? null : data.readjustmentRate,
            signatureDate: data.signatureDate === '' ? null : data.signatureDate,
            // Inclui anexos pendentes se for criação
            attachments: !contract ? attachments.filter(a => a.isPending) : undefined
        };
        onSave(payload);
    };

    const onError = (errors) => {
        console.error("Erros validação:", errors);
        enqueueSnackbar('Preencha os campos obrigatórios.', { variant: 'error' });
    };

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > MAX_UPLOAD_BYTES) {
            enqueueSnackbar(`Arquivo excede ${MAX_UPLOAD_MB}MB. Reduza o tamanho e tente novamente.`, { variant: 'warning' });
            return;
        }

        // Se já existe contrato, fluxo normal
        if (contract) {
            try {
                await uploadAttachment(contract.id, file, type);
                enqueueSnackbar('Documento anexado!', { variant: 'success' });
                loadDetails();
            } catch (e) { enqueueSnackbar('Erro no upload.', { variant: 'error' }); }
        } else {
            // Fluxo de criação: Upload temporário
            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch(getUploadURL(), {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('g360_token')}`
                    }
                });

                if (!response.ok) {
                    const errorPayload = await response.json().catch(() => null);
                    const message = errorPayload?.message || 'Upload falhou.';
                    throw new Error(message);
                }

                const data = await response.json();
                const fileName = data.fileName || data.originalName;
                const fileUrl = data.fileUrl || data.url;
                if (!fileName || !fileUrl) {
                    throw new Error('Resposta de upload invÇ­lida.');
                }
                setAttachments(prev => {
                    const filtered = prev.filter(p => p.type !== type);
                    return [...filtered, {
                        type,
                        fileName,
                        fileUrl,
                        isPending: true
                    }];
                });
                enqueueSnackbar('Anexado (Pendente de Salvar)', { variant: 'info' });

            } catch (error) {
                console.error(error);
                enqueueSnackbar(error?.message || 'Erro ao fazer upload do arquivo.', { variant: 'error' });
            }
        }
    };

    const handleDeleteAttachment = async (file) => {
        if (file.isPending) {
            setAttachments(prev => prev.filter(p => p !== file));
        } else {
            try {
                await deleteAttachment(file.id);
                loadDetails();
            } catch (e) { console.error(e); }
        }
    };

    const getFileByType = (type) => attachments.find(a => a.type === type);

    // --- ADITIVOS ---
    const handleOpenAddendumCreate = () => {
        setEditingAddendum(null);
        setAddendumModalOpen(true);
    };

    const handleOpenAddendumEdit = (add) => {
        setEditingAddendum(add);
        setAddendumModalOpen(true);
    };

    const handleAddendumSaved = async () => {
        loadDetails();
        await refreshContractData();
    };

    const handleDeleteAdd = async (addId) => {
        if (!window.confirm('Excluir aditivo? O contrato será recalculado.')) return;
        try {
            await deleteAddendum(contract.id, addId);
            loadDetails();
            enqueueSnackbar('Aditivo excluído.', { variant: 'success' });
            await refreshContractData();
        } catch (e) { enqueueSnackbar('Erro ao excluir.', { variant: 'error' }); }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    const addendumContractDeltaCaption = (add) => {
        if (!contract || !addendums.length) return null;
        const imp = computeAddendumContractImpact(contract, addendums, add.id);
        if (!imp) return null;
        const valueDelta = Math.abs(Number(imp.before.value) - Number(imp.after.value)) > 0.0001;
        const endDelta =
            imp.before.endDate &&
            imp.after.endDate &&
            imp.before.endDate.getTime() !== imp.after.endDate.getTime();
        if (!valueDelta && !endDelta) return null;
        const bits = [];
        if (valueDelta) {
            bits.push(`Contrato: ${formatCurrency(imp.before.value)} → ${formatCurrency(imp.after.value)}`);
        }
        if (endDelta) {
            bits.push(`Vigência: ${format(imp.before.endDate, 'dd/MM/yyyy')} → ${format(imp.after.endDate, 'dd/MM/yyyy')}`);
        }
        return bits.join(' · ');
    };

    const FileUploadBox = ({ label, type }) => {
        const file = getFileByType(type);
        return (
            <Paper
                variant="outlined"
                sx={{
                    p: 2.5,
                    textAlign: 'center',
                    bgcolor: file ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.45)',
                    borderColor: file ? 'rgba(16, 185, 129, 0.4)' : 'var(--modal-border)',
                    borderStyle: 'dashed',
                    borderRadius: '8px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 1
                }}
            >
                <Box sx={{ width: 38, height: 38, borderRadius: '8px', bgcolor: file ? 'rgba(16, 185, 129, 0.2)' : 'rgba(37, 99, 235, 0.15)', color: file ? '#10b981' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CloudUpload fontSize="small" />
                </Box>
                <Typography variant="caption" fontWeight="bold" sx={{ color: 'var(--modal-text)' }}>{label}</Typography>
                {file ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Chip icon={<Description />} label={(file.fileName || 'Documento').substring(0, 15) + '...'} color="success" size="small" onClick={() => window.open(getFileURL(file.fileUrl), '_blank')} />
                        {!isViewMode && <IconButton size="small" color="error" onClick={() => handleDeleteAttachment(file)}><Delete fontSize="small" /></IconButton>}
                    </Box>
                ) : (
                    !isViewMode ? (
                        <Button component="label" size="small" startIcon={<CloudUpload />} sx={{ mt: 0.5, textTransform: 'none', borderRadius: '8px'}}>
                            Upload <input type="file" hidden onChange={(e) => handleFileUpload(e, type)} />
                        </Button>
                    ) : <Typography variant="caption" color="textDisabled">Pendente</Typography>
                )}
            </Paper>
        );
    };

    if (!open) return null;

    const selectProps = {
        MenuProps: { style: { zIndex: 10005 } }
    };

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title={contract ? `Contrato: ${contract.number}` : 'Novo Contrato'}
            subtitle={
                isViewMode
                    ? 'Modo de visualização'
                    : contract
                        ? 'Dados, documentos e aditivos'
                        : 'Assistente de cadastro de contrato'
            }
            icon="description"
            size="wide"
            loading={wizardSaving}
            footer={
                contract ? (
                    <>
                        <Button variant="outlined" onClick={onClose} size="large" sx={{ textTransform: 'none' }}>
                            {isViewMode ? 'Fechar' : 'Cancelar'}
                        </Button>
                        {!isViewMode && activeTab === 0 && (
                            <Button
                                type="submit"
                                form="contractForm"
                                variant="contained"
                                color="primary"
                                size="large"
                                sx={{ px: 3, textTransform: 'none' }}
                            >
                                Salvar Alterações
                            </Button>
                        )}
                    </>
                ) : null
            }
            contentSx={{
                p: 0,
                pt: 0,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
            }}
        >
            <Box className="contract-modal-inner" sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}>

                {/* WIZARD MODE for new contracts */}
                {!contract ? (
                    <ContractCreationWizard
                        onSave={async (data) => {
                            setWizardSaving(true);
                            try { await onSave(data); } finally { setWizardSaving(false); }
                        }}
                        onCancel={onClose}
                        loading={wizardSaving}
                    />
                ) : (
                    <>

                        {/* TABS */}
                        {contract && (
                            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="fullWidth" sx={{ borderBottom: '1px solid var(--modal-border)', bgcolor: 'transparent', '& .MuiTab-root': { color: 'var(--modal-text-secondary)' }, '& .Mui-selected': { color: '#2563eb' }, '& .MuiTabs-indicator': { bgcolor: '#2563eb' } }}>
                                <Tab label="Dados & Documentos" icon={<Info fontSize="small" />} iconPosition="start" style={{ minHeight: 48 }} />
                                <Tab label={`Aditivos (${addendums.length})`} icon={<NoteAdd fontSize="small" />} iconPosition="start" style={{ minHeight: 48 }} />
                            </Tabs>
                        )}

                        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '32px', background: 'transparent' }}>

                            {/* ABA 0: DADOS GERAIS */}
                            <div style={{ display: activeTab === 0 ? 'block' : 'none' }}>
                                <form id="contractForm" onSubmit={handleSubmit(onSubmit, onError)}>

                                    {/* 1. DADOS BÁSICOS */}
                                    <Accordion expanded={expanded === 'panel1'} onChange={handleChangeAccordion('panel1')} elevation={0} sx={{ mb: 3, borderRadius: '8px', bgcolor: 'var(--modal-surface)', border: '1px solid var(--modal-border)', overflow: 'hidden', '&.Mui-expanded': { boxShadow: '0 12px 30px rgba(2, 6, 23, 0.35)', borderColor: 'rgba(37, 99, 235, 0.35)' } }}>
                                        <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'var(--modal-text-secondary)' }} />} sx={{ bgcolor: 'transparent', borderBottom: '1px solid var(--modal-border)' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Box sx={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', border: '1px solid rgba(37, 99, 235, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Business fontSize="small" />
                                                </Box>
                                                <Box>
                                                    <Typography fontWeight="bold" sx={{ color: 'var(--modal-text)', fontSize: '0.95rem' }}>Dados do Contrato</Typography>
                                                    <Typography variant="caption" sx={{ color: 'var(--modal-text-muted)' }}>Identificacao e fornecedor</Typography>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{ pt: 3, pb: 3 }}>
                                            <Grid container spacing={3}>
                                                <Grid item xs={12} sm={4}><Controller name="number" control={control} render={({ field }) => (<TextField {...field} value={field.value ?? ''} label="Número" fullWidth disabled={isViewMode} error={!!errors.number} helperText={errors.number?.message} InputProps={{ startAdornment: <InputAdornment position="start"><Numbers fontSize="small" /></InputAdornment> }} />)} /></Grid>

                                                <Grid item xs={12} sm={4}>
                                                    <Controller name="type" control={control} render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            value={field.value ?? ''}
                                                            select
                                                            label="Tipo de Contrato"
                                                            fullWidth
                                                            disabled={isViewMode}
                                                            error={!!errors.type}
                                                            helperText={errors.type?.message}
                                                            SelectProps={selectProps}
                                                            sx={{ minWidth: 220 }}
                                                        >
                                                            {['SERVICO', 'PRODUTO', 'LOCACAO', 'MANUTENCAO', 'OUTROS'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                                        </TextField>
                                                    )} />
                                                </Grid>

                                                <Grid item xs={12} sm={4}><Controller name="signatureDate" control={control} render={({ field }) => (<TextField {...field} value={field.value ?? ''} type="date" label="Data de Assinatura" InputLabelProps={{ shrink: true }} fullWidth disabled={isViewMode} />)} /></Grid>

                                                <Grid item xs={12}>
                                                    <Controller name="supplierId" control={control} render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            value={field.value ?? ''}
                                                            select
                                                            label="Fornecedor / Razão Social"
                                                            fullWidth
                                                            disabled={isViewMode}
                                                            error={!!errors.supplierId}
                                                            helperText={errors.supplierId?.message}
                                                            SelectProps={selectProps}
                                                            sx={{ minWidth: 220 }}
                                                        >
                                                            <MenuItem value=""><em>Selecione...</em></MenuItem>
                                                            {suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name} - {s.document}</MenuItem>)}
                                                        </TextField>
                                                    )} />
                                                </Grid>

                                                <Grid item xs={12}><Controller name="description" control={control} render={({ field }) => (<TextField {...field} value={field.value ?? ''} label="Objeto do Contrato" fullWidth multiline rows={2} disabled={isViewMode} error={!!errors.description} helperText={errors.description?.message} />)} /></Grid>
                                            </Grid>
                                        </AccordionDetails>
                                    </Accordion>

                                    <Accordion expanded={expanded === 'panel2'} onChange={handleChangeAccordion('panel2')} elevation={0} sx={{ mb: 3, borderRadius: '8px', bgcolor: 'var(--modal-surface)', border: '1px solid var(--modal-border)', overflow: 'hidden', '&.Mui-expanded': { boxShadow: '0 12px 30px rgba(2, 6, 23, 0.35)', borderColor: 'rgba(16, 185, 129, 0.35)' } }}>
                                        <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'var(--modal-text-secondary)' }} />} sx={{ bgcolor: 'transparent', borderBottom: '1px solid var(--modal-border)' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Box sx={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <AttachMoney fontSize="small" />
                                                </Box>
                                                <Box>
                                                    <Typography fontWeight="bold" sx={{ color: 'var(--modal-text)', fontSize: '0.95rem' }}>Financeiro & Vigencia</Typography>
                                                    <Typography variant="caption" sx={{ color: 'var(--modal-text-muted)' }}>Valores, reajuste e periodo</Typography>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{ pt: 3, pb: 3 }}>
                                            <Grid container spacing={3}>
                                                <Grid item xs={12} sm={3}><Controller name="monthlyValue" control={control} render={({ field }) => (<TextField {...field} value={field.value ?? ''} label="Valor Mensal" type="number" fullWidth disabled={isViewMode} InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }} />)} /></Grid>
                                                <Grid item xs={12} sm={3}><Controller name="readjustmentRate" control={control} render={({ field }) => (<TextField {...field} value={field.value ?? ''} label="Reajuste Anual (%)" type="number" fullWidth disabled={isViewMode} />)} /></Grid>
                                                <Grid item xs={12} sm={3}><Controller name="startDate" control={control} render={({ field }) => (<TextField {...field} value={field.value ?? ''} label="Início Vigência" type="date" InputLabelProps={{ shrink: true }} fullWidth disabled={isViewMode} error={!!errors.startDate} helperText={errors.startDate?.message} />)} /></Grid>
                                                <Grid item xs={12} sm={3}><Controller name="endDate" control={control} render={({ field }) => (<TextField {...field} value={field.value ?? ''} label="Fim Vigência" type="date" InputLabelProps={{ shrink: true }} fullWidth disabled={isViewMode} error={!!errors.endDate} helperText={errors.endDate?.message} />)} /></Grid>
                                                <Grid item xs={12}>
                                                    <Paper elevation={0} sx={{ bgcolor: 'rgba(16, 185, 129, 0.12)', p: 2.5, border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                                                        <Box>
                                                            <Typography variant="caption" sx={{ color: '#10b981', letterSpacing: '0.08em' }} fontWeight="bold">VALOR TOTAL DO CONTRATO</Typography>
                                                            <Controller name="value" control={control} render={({ field }) => (<TextField {...field} value={field.value ?? ''} hiddenLabel variant="standard" fullWidth InputProps={{ disableUnderline: true, startAdornment: <InputAdornment position="start"><span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>R$</span></InputAdornment>, style: { fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' } }} disabled={isViewMode} />)} />
                                                        </Box>
                                                        <FormControlLabel
                                                            control={<Switch checked={autoCalculate} onChange={(e) => setAutoCalculate(e.target.checked)} color="success" size="small" />}
                                                            label={<Typography variant="caption" fontWeight="bold" sx={{ color: '#10b981' }}>Calculo Automatico</Typography>}
                                                            disabled={isViewMode}
                                                        />
                                                    </Paper>
                                                </Grid>
                                            </Grid>
                                        </AccordionDetails>
                                    </Accordion>

                                    <Accordion expanded={expanded === 'panel3'} onChange={handleChangeAccordion('panel3')} elevation={0} sx={{ mb: 3, borderRadius: '8px', bgcolor: 'var(--modal-surface)', border: '1px solid var(--modal-border)', overflow: 'hidden', '&.Mui-expanded': { boxShadow: '0 12px 30px rgba(2, 6, 23, 0.35)', borderColor: 'rgba(245, 158, 11, 0.35)' } }}>
                                        <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'var(--modal-text-secondary)' }} />} sx={{ bgcolor: 'transparent', borderBottom: '1px solid var(--modal-border)' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Box sx={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <AccountBalance fontSize="small" />
                                                </Box>
                                                <Box>
                                                    <Typography fontWeight="bold" sx={{ color: 'var(--modal-text)', fontSize: '0.95rem' }}>Classificacao Contabil</Typography>
                                                    <Typography variant="caption" sx={{ color: 'var(--modal-text-muted)' }}>Centro de custo e conta</Typography>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{ pt: 3, pb: 3 }}>
                                            <Grid container spacing={3}>
                                                <Grid item xs={12} sm={6}>
                                                    <Controller name="costCenterId" control={control} render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            value={field.value ?? ''}
                                                            select
                                                            label="Centro de Custo"
                                                            fullWidth
                                                            disabled={isViewMode}
                                                            SelectProps={selectProps}
                                                            sx={{ minWidth: 220 }}
                                                        >
                                                            <MenuItem value=""><em>Nenhum</em></MenuItem>
                                                            {costCenters.map(cc => <MenuItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</MenuItem>)}
                                                        </TextField>
                                                    )} />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Controller name="accountId" control={control} render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            value={field.value ?? ''}
                                                            select
                                                            label="Conta Contábil"
                                                            fullWidth
                                                            disabled={isViewMode}
                                                            SelectProps={selectProps}
                                                            sx={{ minWidth: 220 }}
                                                        >
                                                            <MenuItem value=""><em>Nenhuma</em></MenuItem>
                                                            {accounts.map(acc => <MenuItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</MenuItem>)}
                                                        </TextField>
                                                    )} />
                                                </Grid>
                                            </Grid>
                                        </AccordionDetails>
                                    </Accordion>

                                    <Accordion expanded={expanded === 'panel4'} onChange={handleChangeAccordion('panel4')} elevation={0} sx={{ borderRadius: '8px', bgcolor: 'var(--modal-surface)', border: '1px solid var(--modal-border)', overflow: 'hidden', '&.Mui-expanded': { boxShadow: '0 12px 30px rgba(2, 6, 23, 0.35)', borderColor: 'rgba(59, 130, 246, 0.35)' } }}>
                                        <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'var(--modal-text-secondary)' }} />} sx={{ bgcolor: 'transparent', borderBottom: '1px solid var(--modal-border)' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Box sx={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <CloudUpload fontSize="small" />
                                                </Box>
                                                <Box>
                                                    <Typography fontWeight="bold" sx={{ color: 'var(--modal-text)', fontSize: '0.95rem' }}>Documentos Anexados</Typography>
                                                    <Typography variant="caption" sx={{ color: 'var(--modal-text-muted)' }}>CNPJ, contrato e proposta</Typography>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{ pt: 3, pb: 3 }}>
                                            <Grid container spacing={3}>
                                                <Grid item xs={12} sm={4}><FileUploadBox label="Cartão CNPJ" type="CNPJ" /></Grid>
                                                <Grid item xs={12} sm={4}><FileUploadBox label="Contrato Assinado" type="CONTRATO" /></Grid>
                                                <Grid item xs={12} sm={4}><FileUploadBox label="Proposta Comercial" type="PROPOSTA" /></Grid>
                                            </Grid>
                                        </AccordionDetails>
                                    </Accordion>
                                    {/* Check de contract removido */}
                                </form>
                            </div>

                            {/* ABA 1: ADITIVOS */}
                            <div style={{ display: activeTab === 1 ? 'block' : 'none' }}>
                                {!isViewMode && (
                                    <Box display="flex" justifyContent="flex-end" mb={2}>
                                        <Button variant="contained" startIcon={<NoteAdd />} onClick={handleOpenAddendumCreate}
                                            sx={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', textTransform: 'none', borderRadius: '8px', fontWeight: 600, px: 3 }}>
                                            Registrar Novo Aditivo
                                        </Button>
                                    </Box>
                                )}

                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px'}}>
                                    <Table size="small">
                                        <TableHead sx={{ bgcolor: 'var(--modal-surface-subtle)' }}>
                                            <TableRow>
                                                <TableCell>Aditivo</TableCell>
                                                <TableCell>Data Assinatura</TableCell>
                                                <TableCell>Descrição</TableCell>
                                                <TableCell>Impacto</TableCell>
                                                <TableCell>Nova Vigência</TableCell>
                                                <TableCell>Anexo</TableCell>
                                                <TableCell align="right">Ações</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {addendums.length === 0 ? <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary', fontStyle: 'italic' }}>Nenhum aditivo registrado.</TableCell></TableRow> : addendums.map((add, index) => {
                                                const impactCaption = addendumContractDeltaCaption(add);
                                                return (
                                                <TableRow key={add.id} sx={index === 0 ? { bgcolor: 'rgba(16, 185, 129, 0.1)' } : {}}>
                                                    <TableCell><Typography variant="body2" fontWeight="bold">{add.number}</Typography>{index === 0 && <Chip label="VIGENTE" size="small" color="success" sx={{ height: 20, fontSize: '0.65rem' }} />}</TableCell>
                                                    <TableCell>{format(new Date(add.signatureDate), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell>{add.description}</TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ color: Number(add.valueChange) !== 0 ? 'primary.main' : 'inherit', fontWeight: 'bold' }}>
                                                            {Number(add.valueChange) !== 0 ? formatCurrency(add.valueChange) : '-'}
                                                        </Typography>
                                                        {impactCaption && (
                                                            <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary', lineHeight: 1.35 }}>
                                                                {impactCaption}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell sx={{ fontWeight: add.newEndDate ? 'bold' : 'normal' }}>{add.newEndDate ? format(new Date(add.newEndDate), 'dd/MM/yyyy') : '-'}</TableCell>
                                                    <TableCell>{add.fileUrl && <IconButton size="small" onClick={() => window.open(getFileURL(add.fileUrl), '_blank')}><Download fontSize="small" /></IconButton>}</TableCell>
                                                    <TableCell align="right">
                                                        <IconButton size="small" sx={{ color: '#06b6d4' }} onClick={() => setViewingAddendum(add)}><Visibility fontSize="small" /></IconButton>
                                                        {!isViewMode && <IconButton size="small" color="primary" onClick={() => handleOpenAddendumEdit(add)}><Edit fontSize="small" /></IconButton>}
                                                        {!isViewMode && <IconButton size="small" color="error" onClick={() => handleDeleteAdd(add.id)}><Delete fontSize="small" /></IconButton>}
                                                    </TableCell>
                                                </TableRow>
                                            );})}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {/* Addendum Modals */}
                                <AddendumFormModal
                                    open={addendumModalOpen}
                                    onClose={() => { setAddendumModalOpen(false); setEditingAddendum(null); }}
                                    contractId={contract?.id}
                                    addendum={editingAddendum}
                                    onSaved={handleAddendumSaved}
                                />
                                <AddendumViewModal
                                    open={!!viewingAddendum}
                                    onClose={() => setViewingAddendum(null)}
                                    addendum={viewingAddendum}
                                    contract={contract}
                                    allAddendums={addendums}
                                />
                            </div>

                        </div>
                    </> /* End of edit/view mode */
                )}
            </Box>
        </StandardModal>
    );
};

export default ContractModal;
