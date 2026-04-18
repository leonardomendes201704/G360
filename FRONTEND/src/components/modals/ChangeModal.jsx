import { useEffect, useState, useContext, useRef, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useSnackbar } from 'notistack';
import {
    Add, Delete, ThumbUp, ThumbDown, AttachFile, CheckCircle,
    Schedule, Assignment, People, PlayArrow, History, Warning
} from '@mui/icons-material';
import { IconButton, Button, Box, List, ListItem, ListItemText, ListItemAvatar, Avatar, Alert, Chip, Divider, LinearProgress, Tooltip } from '@mui/material';
import StandardModal from '../common/StandardModal';
import StatusChip from '../common/StatusChip';
import userService from '../../services/user.service';
import * as assetService from '../../services/asset.service';
import projectService from '../../services/project.service';
import { getIncidents } from '../../services/incident.service';
import { addApprover, reviewChange, getAttachments, uploadAttachment, deleteAttachment, checkScheduleConflicts } from '../../services/change-request.service';
import { AuthContext } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import RiskAssessment from '../changes/RiskAssessment';
import RiskGauge from '../changes/RiskGauge';
import ExecutionTimeline from '../changes/ExecutionTimeline';
import ChangeLifecycle from '../changes/ChangeLifecycle';
import ConfirmDialog from '../common/ConfirmDialog';
import { getFileURL } from '../../utils/urlUtils';
import { getTemplates, applyTemplate } from '../../services/change-template.service';
import './ChangeModal.css';

const schema = yup.object({
    code: yup.string().required('Código é obrigatório'),
    title: yup.string().required('Título é obrigatório'),
    description: yup.string().required('Descrição é obrigatória'),
    justification: yup.string().required('Justificativa é obrigatória'),
    type: yup.string().required('Tipo é obrigatório'),
    impact: yup.string().required('Impacto é obrigatório'),
    scheduledStart: yup.string().required('Início agendado é obrigatório'),
    scheduledEnd: yup.string().required('Fim agendado é obrigatório'),
    backoutPlan: yup.string(),
    projectId: yup.string().nullable(),
}).required();

const ChangeModal = ({ open, onClose, onSave, onUpdate, change = null, isViewMode = false, loading = false, initialTab = 'geral' }) => {
    const { user } = useContext(AuthContext);
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const { enqueueSnackbar } = useSnackbar();
    const [mounted, setMounted] = useState(false);

    // Wizard mode for new GMUDs, tab mode for existing
    const isWizardMode = !change && !isViewMode;
    const [activeStep, setActiveStep] = useState(0); // Wizard: 0=Geral, 1=Planejamento
    const [activeTab, setActiveTab] = useState(initialTab); // Tabs: para GMUDs existentes

    useEffect(() => {
        if (open) {
            setActiveTab(initialTab);
            setActiveStep(0); // Reset wizard
        }
    }, [open, initialTab]);

    // Estados
    const [users, setUsers] = useState([]);
    const [assetsList, setAssetsList] = useState([]); // ASSETS STATE
    const [projectsList, setProjectsList] = useState([]); // PROJECTS STATE
    const [availableIncidents, setAvailableIncidents] = useState([]); // INCIDENTS STATE
    const [selectedApproverId, setSelectedApproverId] = useState('');
    const [currentApprovers, setCurrentApprovers] = useState([]);

    // Dialog State
    const [confirmDialog, setConfirmDialog] = useState({ open: false });

    // ATTACHMENTS STATE
    const [attachments, setAttachments] = useState([]);
    const fileInputRef = useRef();

    // SCHEDULE CONFLICTS STATE
    const [scheduleConflicts, setScheduleConflicts] = useState([]);
    const [checkingConflicts, setCheckingConflicts] = useState(false);

    // TEMPLATES STATE
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [loadingTemplate, setLoadingTemplate] = useState(false);

    // AUTOSAVE STATE
    const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle, saving, saved
    const autoSaveTimeoutRef = useRef(null);

    // Calculated risk from RiskAssessment
    const [calculatedRisk, setCalculatedRisk] = useState({ level: 'BAIXO', score: 0 });

    const { register, handleSubmit, control, watch, reset, formState: { errors }, setValue } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { type: 'NORMAL', impact: 'MENOR', assetIds: [], projectId: '' }
    });

    const watchType = watch('type');
    const watchScheduledStart = watch('scheduledStart');
    const watchScheduledEnd = watch('scheduledEnd');
    const watchTitle = watch('title');
    const watchDescription = watch('description');
    const watchJustification = watch('justification');
    const watchBackoutPlan = watch('backoutPlan');
    const watchRiskAssessment = watch('riskAssessment');

    // Calculate form progress percentage
    const formProgress = useMemo(() => {
        const fields = [
            { value: watchTitle, weight: 1 },
            { value: watchDescription, weight: 1 },
            { value: watchJustification, weight: 1 },
            { value: watchScheduledStart, weight: 1 },
            { value: watchScheduledEnd, weight: 1 },
            { value: watchBackoutPlan, weight: 0.5 },
            { value: currentApprovers.length > 0, weight: 1 }
        ];

        const total = fields.reduce((acc, f) => acc + f.weight, 0);
        const filled = fields.reduce((acc, f) => acc + (f.value ? f.weight : 0), 0);

        return Math.round((filled / total) * 100);
    }, [watchTitle, watchDescription, watchJustification, watchScheduledStart, watchScheduledEnd, watchBackoutPlan, currentApprovers]);

    // Calculate estimated duration
    const estimatedDuration = useMemo(() => {
        if (!watchScheduledStart || !watchScheduledEnd) return null;

        const start = new Date(watchScheduledStart);
        const end = new Date(watchScheduledEnd);

        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;

        const diffMs = end - start;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return `${days}d ${remainingHours}h`;
        }

        return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
    }, [watchScheduledStart, watchScheduledEnd]);

    // Sync risk from RiskAssessment component
    const handleRiskChange = useCallback((riskData) => {
        let score = 0;
        if (riskData.affectsProduction) score += 5;
        if (riskData.hasDowntime) score += 10;
        if (!riskData.tested) score += 5;
        if (!riskData.easyRollback) score += 5;

        let level = 'BAIXO';
        if (score > 15) level = 'CRITICO';
        else if (score > 10) level = 'ALTO';
        else if (score > 5) level = 'MEDIO';

        setCalculatedRisk({ level, score });
        setValue('riskAssessment', riskData);
    }, [setValue]);

    // Tab completion status
    const tabStatus = useMemo(() => ({
        geral: !!(watchTitle && watchDescription),
        plano: !!(watchScheduledStart && watchScheduledEnd && watchJustification),
        aprovacao: currentApprovers.length > 0,
        execucao: change?.status && ['EXECUTED', 'FAILED'].includes(change.status)
    }), [watchTitle, watchDescription, watchScheduledStart, watchScheduledEnd, watchJustification, currentApprovers, change?.status]);

    // Wizard step validation
    const canProceedStep = useMemo(() => {
        if (activeStep === 0) {
            // Step 1: Visão Geral - precisa de título e descrição
            return !!(watchTitle && watchDescription);
        }
        if (activeStep === 1) {
            // Step 2: Planejamento - precisa de datas e justificativa
            return !!(watchScheduledStart && watchScheduledEnd && watchJustification);
        }
        return true;
    }, [activeStep, watchTitle, watchDescription, watchScheduledStart, watchScheduledEnd, watchJustification]);

    // Wizard navigation
    const handleNextStep = () => {
        if (!canProceedStep) {
            enqueueSnackbar('Preencha todos os campos obrigatórios para continuar.', { variant: 'warning' });
            return;
        }
        setActiveStep(prev => prev + 1);
    };

    const handleBackStep = () => {
        setActiveStep(prev => prev - 1);
    };

    // Preview de aprovadores automáticos (informativo)
    const autoApproverPreview = useMemo(() => {
        const approvers = [];

        // Sempre inclui gestor do centro de custo do usuário logado
        if (user?.costCenter?.manager) {
            approvers.push({
                name: user.costCenter.manager.name,
                role: 'Gestor do Centro de Custo',
                status: 'pending'
            });
        } else {
            approvers.push({
                name: 'Gestor do seu Centro de Custo',
                role: 'Gestor',
                status: 'pending'
            });
        }

        // Se risco crítico, adiciona CAB
        if (calculatedRisk.level === 'CRITICO') {
            approvers.push({
                name: 'Membros do CAB',
                role: 'Comitê de Aprovação',
                status: 'pending'
            });
        }

        return approvers;
    }, [user, calculatedRisk.level]);

    // Check for schedule conflicts when dates change
    useEffect(() => {
        const checkConflicts = async () => {
            if (!watchScheduledStart || !watchScheduledEnd) {
                setScheduleConflicts([]);
                return;
            }

            // Only check if both dates are valid
            const start = new Date(watchScheduledStart);
            const end = new Date(watchScheduledEnd);
            if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
                return;
            }

            setCheckingConflicts(true);
            try {
                const result = await checkScheduleConflicts(
                    watchScheduledStart,
                    watchScheduledEnd,
                    change?.id || null
                );
                setScheduleConflicts(result.conflicts || []);
            } catch (error) {
                console.error('Error checking conflicts:', error);
            } finally {
                setCheckingConflicts(false);
            }
        };

        const debounceTimer = setTimeout(checkConflicts, 500);
        return () => clearTimeout(debounceTimer);
    }, [watchScheduledStart, watchScheduledEnd, change?.id]);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (open) {
            userService.getAll().then(setUsers).catch(console.error);
            assetService.getAssets().then(setAssetsList).catch(console.error);
            projectService.getAll().then(res => setProjectsList(Array.isArray(res) ? res : res?.data || [])).catch(console.error); // FETCH PROJECTS

            // Fetch Open Incidents
            getIncidents({ status: 'OPEN,IN_PROGRESS,PENDING' }).then(data => {
                setAvailableIncidents(data);
            }).catch(console.error);

            setActiveTab('geral');

            // Fetch templates for new GMUD
            if (!change) {
                getTemplates().then(setTemplates).catch(console.error);
                setSelectedTemplateId('');
            }

            if (change) {
                reset({
                    ...change,
                    scheduledStart: change.scheduledStart ? change.scheduledStart.slice(0, 16) : '',
                    scheduledEnd: change.scheduledEnd ? change.scheduledEnd.slice(0, 16) : '',
                    assetIds: change.assets ? change.assets.map(a => a.id) : [],
                    projectId: change.projectId || '', // SET EXISTING PROJECT
                    relatedIncidentIds: change.relatedIncidents ? change.relatedIncidents.map(i => i.id) : []
                });
                setCurrentApprovers(change.approvers || []);
                // FETCH ATTACHMENTS
                getAttachments(change.id).then(setAttachments).catch(console.error);
            } else {
                const suggestedCode = `GMUD-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;
                // Check for fromIncident param if creating from IncidentModal
                const urlParams = new URLSearchParams(window.location.search);
                const fromIncidentId = urlParams.get('fromIncident');

                reset({
                    code: suggestedCode,
                    title: '', description: '', justification: '', backoutPlan: '',
                    type: 'NORMAL', impact: 'MENOR',
                    scheduledStart: '', scheduledEnd: '',
                    riskAssessment: { // Default answers
                        affectsProduction: false,
                        hasDowntime: false,
                        tested: true,
                        easyRollback: true
                    },
                    relatedIncidentIds: fromIncidentId ? [fromIncidentId] : []
                });
                setCurrentApprovers([]);
                setAttachments([]);
            }
        }
    }, [open, change, reset]);

    const onSubmit = (data) => {
        if (isViewMode) return;
        const payload = {
            ...data,
            scheduledStart: new Date(data.scheduledStart).toISOString(),
            scheduledEnd: new Date(data.scheduledEnd).toISOString(),
            approvers: !change ? currentApprovers.map(a => a.userId) : undefined
        };
        onSave(payload);
    };

    // Handle template selection and apply
    const handleApplyTemplate = async (templateId) => {
        if (!templateId) return;

        setLoadingTemplate(true);
        try {
            const templateData = await applyTemplate(templateId);

            // Apply template data to form
            reset({
                ...templateData,
                code: `GMUD-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
                scheduledStart: templateData.scheduledStart ? templateData.scheduledStart.slice(0, 16) : '',
                scheduledEnd: templateData.scheduledEnd ? templateData.scheduledEnd.slice(0, 16) : '',
                assetIds: [],
                projectId: ''
            });

            enqueueSnackbar(`Template "${templateData._templateName}" aplicado!`, { variant: 'success' });
        } catch (error) {
            console.error('Error applying template:', error);
            enqueueSnackbar('Erro ao aplicar template.', { variant: 'error' });
        } finally {
            setLoadingTemplate(false);
        }
    };

    // Manual Add Removed
    const handleAddApprover = null;

    const handleReview = async (status) => {
        // Solicitar comentário dependendo da ação
        let comment = '';
        if (status === 'APPROVED') {
            comment = prompt('Comentário de aprovação (opcional):') || 'Aprovado';
        } else if (status === 'REVISION_REQUESTED') {
            comment = prompt('Descreva o que precisa ser revisado:');
            if (!comment) {
                return enqueueSnackbar('É necessário informar o motivo da revisão.', { variant: 'warning' });
            }
        } else if (status === 'REJECTED') {
            comment = prompt('Motivo da rejeição:');
            if (!comment) {
                return enqueueSnackbar('É necessário informar o motivo da rejeição.', { variant: 'warning' });
            }
        }

        try {
            await reviewChange(change.id, status, comment);

            const updatedApprovers = currentApprovers.map(app => {
                if (app.userId === user.id || app.user?.id === user.id) {
                    return { ...app, status: status };
                }
                return app;
            });
            setCurrentApprovers(updatedApprovers);

            const messages = {
                'APPROVED': 'GMUD Aprovada com sucesso!',
                'REVISION_REQUESTED': 'Revisão solicitada! O solicitante foi notificado.',
                'REJECTED': 'GMUD Rejeitada.'
            };
            enqueueSnackbar(messages[status] || 'Ação registrada.', {
                variant: status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'error' : 'warning'
            });
            if (onUpdate) onUpdate(); // Refresh parent

        } catch (error) {
            enqueueSnackbar('Erro ao registrar avaliação.', { variant: 'error' });
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const newAttachment = await uploadAttachment(change.id, file);
            setAttachments([newAttachment, ...attachments]);
            enqueueSnackbar('Arquivo anexado com sucesso!', { variant: 'success' });
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error(error);
            enqueueSnackbar('Erro ao enviar arquivo.', { variant: 'error' });
        }
    };

    const handleDeleteAttachment = async (id) => {
        if (!window.confirm('Excluir este anexo?')) return;
        try {
            await deleteAttachment(id);
            setAttachments(attachments.filter(a => a.id !== id));
            enqueueSnackbar('Anexo excluído.', { variant: 'success' });
        } catch (error) {
            console.error(error);
            enqueueSnackbar('Erro ao excluir anexo.', { variant: 'error' });
        }
    };

    const myApproval = currentApprovers.find(app => (app.userId === user?.id || app.user?.id === user?.id));
    const isMyApprovalPending = myApproval && myApproval.status === 'PENDING';

    const gmudModalTitle = isViewMode ? 'Detalhes da GMUD' : (change ? 'Editar GMUD' : 'Nova solicitação');
    const gmudModalSubtitle = change?.code || 'Preencha os dados para registrar a mudança';

    if (!open) return null;

    const inputClass = `form-input ${isViewMode ? 'disabled-input' : ''}`;
    const selectClass = `form-select ${isViewMode ? 'disabled-input' : ''}`;
    const textareaClass = `form-textarea ${isViewMode ? 'disabled-input' : ''}`;

    return (
        <>
            <StandardModal
                open={open}
                onClose={onClose}
                title={gmudModalTitle}
                subtitle={gmudModalSubtitle}
                icon="sync"
                size="wide"
                loading={loading}
                contentSx={{
                    p: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden',
                }}
                footer={
                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Button type="button" variant="outlined" color="inherit" onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600, mr: 'auto' }}>
                            {isViewMode ? 'Fechar' : 'Cancelar'}
                        </Button>
                        {isWizardMode && (
                            <>
                                {activeStep > 0 && (
                                    <Button type="button" variant="outlined" onClick={handleBackStep} sx={{ textTransform: 'none' }}>
                                        ← Voltar
                                    </Button>
                                )}
                                {activeStep < 1 && (
                                    <Button type="button" variant="contained" color="primary" onClick={handleNextStep} disabled={!canProceedStep} sx={{ textTransform: 'none' }}>
                                        Próximo →
                                    </Button>
                                )}
                                {activeStep === 1 && (
                                    <Button type="submit" form="gmudForm" variant="contained" color="success" disabled={loading || !canProceedStep} sx={{ textTransform: 'none', fontWeight: 600 }}>
                                        Criar GMUD
                                    </Button>
                                )}
                            </>
                        )}
                        {!isWizardMode && !isViewMode && (!change || change.status === 'DRAFT' || change.status === 'REVISION_REQUESTED') && (
                            <Button type="submit" form="gmudForm" variant="contained" color="primary" disabled={loading} sx={{ textTransform: 'none', fontWeight: 600 }}>
                                {change ? 'Salvar alterações' : 'Criar GMUD'}
                            </Button>
                        )}
                    </Box>
                }
            >
            <div className="change-modal-inner" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, maxHeight: 'min(85dvh, 900px)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, px: 3, pt: 1, pb: 0.5, flexShrink: 0 }}>
                    {change && (
                        <Chip
                            label={calculatedRisk.level || change.riskLevel}
                            size="small"
                            sx={{
                                bgcolor: calculatedRisk.level === 'CRITICO' ? 'error.main' :
                                    calculatedRisk.level === 'ALTO' ? 'warning.main' :
                                        calculatedRisk.level === 'MEDIO' ? 'info.main' : 'success.main',
                                color: 'var(--modal-text)',
                                fontWeight: 600,
                                fontSize: 10
                            }}
                        />
                    )}
                    {!isViewMode && !change && (
                        <div className={`autosave-indicator ${autoSaveStatus}`} style={{ marginLeft: change ? undefined : 'auto' }}>
                            <span className="autosave-dot" style={{
                                background: autoSaveStatus === 'saving' ? '#f59e0b' :
                                    autoSaveStatus === 'saved' ? '#10b981' : 'var(--modal-text-muted)'
                            }} />
                            {autoSaveStatus === 'saving' ? 'Salvando...' :
                                autoSaveStatus === 'saved' ? 'Rascunho salvo' : ''}
                        </div>
                    )}
                </Box>

                {/* Status Banner - Only for existing changes */}
                {change && (
                    <div className={`gmud-status-banner ${change.status === 'DRAFT' ? 'draft' :
                        change.status === 'PENDING_APPROVAL' ? 'pending' :
                            change.status === 'APPROVED' || change.status === 'APPROVED_WAITING_EXECUTION' ? 'approved' :
                                change.status === 'REJECTED' ? 'rejected' :
                                    change.status === 'EXECUTED' ? 'executed' :
                                        change.status === 'FAILED' ? 'failed' :
                                            change.status === 'REVISION_REQUESTED' ? 'revision' : ''
                        }`} style={{ margin: '0 24px' }}>
                        {change.status === 'DRAFT' && <Assignment />}
                        {change.status === 'PENDING_APPROVAL' && <Schedule />}
                        {(change.status === 'APPROVED' || change.status === 'APPROVED_WAITING_EXECUTION') && <CheckCircle />}
                        {change.status === 'REJECTED' && <Warning />}
                        {change.status === 'EXECUTED' && <CheckCircle />}
                        {change.status === 'FAILED' && <Warning />}
                        {change.status === 'REVISION_REQUESTED' && <History />}
                        <div>
                            <div style={{ fontWeight: 600 }}>
                                {change.status === 'DRAFT' && 'Rascunho'}
                                {change.status === 'PENDING_APPROVAL' && 'Aguardando Aprovação'}
                                {change.status === 'APPROVED' && 'Aprovada - Pronta para Execução'}
                                {change.status === 'APPROVED_WAITING_EXECUTION' && 'Aprovada - Aguardando Janela'}
                                {change.status === 'REJECTED' && 'Rejeitada'}
                                {change.status === 'EXECUTED' && 'Executada com Sucesso'}
                                {change.status === 'FAILED' && 'Falha na Execução'}
                                {change.status === 'REVISION_REQUESTED' && 'Revisão Solicitada'}
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.8 }}>
                                {change.status === 'PENDING_APPROVAL' && `${currentApprovers.filter(a => a.status === 'PENDING').length} aprovação(ões) pendente(s)`}
                                {change.status === 'REVISION_REQUESTED' && 'Ajustes solicitados pelos aprovadores'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress Bar / Stepper - Só para novos GMUDs */}
                {isWizardMode && (
                    <div style={{ padding: '16px 24px' }}>
                        {/* Stepper */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                            {/* Step 1 */}
                            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '8px',
                                    background: activeStep >= 0 ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'var(--modal-border-strong)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 600,
                                    color: '#ffffff',
                                    boxShadow: activeStep === 0 ? '0 0 20px rgba(37, 99, 235, 0.5)' : 'none',
                                    transition: 'all 0.3s ease'
                                }}>
                                    {tabStatus.geral ? '✓' : '1'}
                                </div>
                                <div style={{ marginLeft: 12 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: activeStep === 0 ? '#a5b4fc' : 'var(--modal-text-secondary)' }}>Visão Geral</div>
                                    <div style={{ fontSize: 11, color: 'var(--modal-text-muted)' }}>Título, descrição e risco</div>
                                </div>
                            </div>

                            {/* Linha conectora */}
                            <div style={{
                                flex: 0.5,
                                height: 2,
                                background: activeStep >= 1 ? 'linear-gradient(90deg, #2563eb, #3b82f6)' : 'var(--modal-border-strong)',
                                margin: '0 16px',
                                transition: 'all 0.3s ease'
                            }} />

                            {/* Step 2 */}
                            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '8px',
                                    background: activeStep >= 1 ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'var(--modal-border-strong)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 600,
                                    color: '#ffffff',
                                    boxShadow: activeStep === 1 ? '0 0 20px rgba(37, 99, 235, 0.5)' : 'none',
                                    transition: 'all 0.3s ease'
                                }}>
                                    {tabStatus.plano ? '✓' : '2'}
                                </div>
                                <div style={{ marginLeft: 12 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: activeStep === 1 ? '#a5b4fc' : 'var(--modal-text-secondary)' }}>Planejamento</div>
                                    <div style={{ fontSize: 11, color: 'var(--modal-text-muted)' }}>Datas, justificativa e plano</div>
                                </div>
                            </div>
                        </div>

                        {/* Preview de Aprovadores Automáticos */}
                        <div style={{
                            padding: 12,
                            borderRadius: '8px',
                            background: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12
                        }}>
                            <div style={{ fontSize: 20 }}>👥</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#34d399' }}>Aprovadores Automáticos</div>
                                <div style={{ fontSize: 11, color: 'var(--modal-text-secondary)' }}>
                                    {autoApproverPreview.map((a, i) => (
                                        <span key={i}>
                                            {a.name} ({a.role})
                                            {i < autoApproverPreview.length - 1 ? ' • ' : ''}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Lifecycle Stepper - Visual de progresso da GMUD */}
                {!isWizardMode && change && (
                    <ChangeLifecycle
                        status={change.status}
                        createdAt={change.createdAt}
                        updatedAt={change.updatedAt}
                    />
                )}

                {/* Tabs - Apenas para GMUDs existentes */}
                {!isWizardMode && (
                    <div className="gmud-tabs" style={{ margin: '16px 24px', overflowX: 'hidden' }}>
                        <button
                            className={`gmud-tab ${activeTab === 'geral' ? 'active' : ''}`}
                            onClick={() => setActiveTab('geral')}
                        >
                            <span className="tab-icon">📋</span>
                            <span className="tab-label">Geral</span>
                        </button>
                        <button
                            className={`gmud-tab ${activeTab === 'plano' ? 'active' : ''}`}
                            onClick={() => setActiveTab('plano')}
                        >
                            <span className="tab-icon">📅</span>
                            <span className="tab-label">Plano</span>
                        </button>
                        {change && (
                            <button
                                className={`gmud-tab ${activeTab === 'aprovacao' ? 'active' : ''}`}
                                onClick={() => setActiveTab('aprovacao')}
                            >
                                <span className="tab-icon">👥</span>
                                <span className="tab-label">Aprovações</span>
                            </button>
                        )}
                        {change && ['APPROVED', 'APPROVED_WAITING_EXECUTION', 'EXECUTED', 'FAILED'].includes(change.status) && (
                            <button
                                className={`gmud-tab ${activeTab === 'execucao' ? 'active' : ''}`}
                                onClick={() => setActiveTab('execucao')}
                            >
                                <span className="tab-icon">🚀</span>
                                <span className="tab-label">Execução</span>
                            </button>
                        )}
                    </div>
                )}

                <div className="modal-body">
                    <form id="gmudForm" onSubmit={handleSubmit(onSubmit)}>

                        {/* ETAPA 1 / ABA GERAL */}
                        <div className="gmud-tab-content" style={{ display: (isWizardMode ? activeStep === 0 : activeTab === 'geral') ? 'block' : 'none' }}>
                            <div className="form-section">
                                <div className="form-grid">
                                    {/* TEMPLATE SELECTOR - Apenas para nova GMUD */}
                                    {!change && templates.length > 0 && (
                                        <div className="form-group col-12" style={{ marginBottom: 16 }}>
                                            <div style={{
                                                padding: 16,
                                                borderRadius: '8px',
                                                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                                                border: '1px solid rgba(37, 99, 235, 0.2)'
                                            }}>
                                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                    <span style={{ fontSize: 16 }}>📋</span>
                                                    Usar Template de Mudança Padrão (Opcional)
                                                </label>
                                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                    <select
                                                        value={selectedTemplateId}
                                                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                                                        className={selectClass}
                                                        style={{ flex: 1 }}
                                                        disabled={loadingTemplate}
                                                    >
                                                        <option value="">Selecione um template...</option>
                                                        {templates.map(t => (
                                                            <option key={t.id} value={t.id}>
                                                                {t.name} ({t.type} - Risco {t.riskLevel})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        disabled={!selectedTemplateId || loadingTemplate}
                                                        onClick={() => handleApplyTemplate(selectedTemplateId)}
                                                        sx={{
                                                            bgcolor: '#2563eb',
                                                            '&:hover': { bgcolor: '#1d4ed8' },
                                                            textTransform: 'none',
                                                            px: 3
                                                        }}
                                                    >
                                                        {loadingTemplate ? 'Aplicando...' : 'Aplicar Template'}
                                                    </Button>
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--modal-text-muted)', marginTop: 8 }}>
                                                    Templates pré-configuram tipo, risco, planos e duração para GMUDs recorrentes.
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-group col-3">
                                        <label className="form-label">Código <span className="required">*</span></label>
                                        <input {...register('code')} className={inputClass} disabled={isViewMode || !!change} />
                                        {errors.code && <span style={{ color: 'red', fontSize: '11px' }}>{errors.code.message}</span>}
                                    </div>
                                    <div className="form-group col-9">
                                        <label className="form-label">Título <span className="required">*</span></label>
                                        <input {...register('title')} className={inputClass} placeholder="Ex: Atualização de Kernel" disabled={isViewMode} />
                                        {errors.title && <span style={{ color: 'red', fontSize: '11px' }}>{errors.title.message}</span>}
                                    </div>

                                    <div className="form-group col-4">
                                        <label className="form-label">Tipo</label>
                                        <select {...register('type')} className={selectClass} disabled={isViewMode}>
                                            <option value="NORMAL">Normal</option>
                                            <option value="PADRAO">Padrão</option>
                                            <option value="EMERGENCIAL">Emergencial</option>
                                        </select>
                                    </div>

                                    <div className="form-group col-4">
                                        <label className="form-label">Impacto</label>
                                        <select {...register('impact')} className={selectClass} disabled={isViewMode}>
                                            <option value="MENOR">Menor</option>
                                            <option value="SIGNIFICATIVO">Significativo</option>
                                            <option value="MAIOR">Maior</option>
                                        </select>
                                    </div>

                                    {/* MATRIZ DE RISCO COM GAUGE VISUAL */}
                                    <div className="form-group col-12">
                                        <div className="gmud-section" style={{ padding: 20 }}>
                                            <div className="gmud-section-header">
                                                <div className="gmud-section-icon risk">⚠️</div>
                                                <div className="gmud-section-title">Avaliação de Risco</div>
                                            </div>
                                            {watchType === 'PADRAO' ? (
                                                <div className="alert-info" style={{ padding: 10, borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontSize: 13 }}>
                                                    ℹ️ <strong>Mudança Padrão:</strong> Risco Baixo e Aprovação Automática.
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 20, alignItems: 'start' }}>
                                                    {/* Risk Assessment Questions */}
                                                    <div>
                                                        <Controller
                                                            name="riskAssessment"
                                                            control={control}
                                                            render={({ field }) => (
                                                                <RiskAssessment
                                                                    value={field.value}
                                                                    onChange={(data) => {
                                                                        field.onChange(data);
                                                                        handleRiskChange(data);
                                                                    }}
                                                                    disabled={isViewMode}
                                                                />
                                                            )}
                                                        />
                                                    </div>
                                                    {/* Risk Gauge Visual */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <RiskGauge
                                                            riskLevel={calculatedRisk.level}
                                                            riskScore={calculatedRisk.score}
                                                        />
                                                        {calculatedRisk.level === 'CRITICO' && (
                                                            <Alert severity="error" sx={{ mt: 2, fontSize: 11, py: 0.5 }}>
                                                                Aprovação CAB obrigatória
                                                            </Alert>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* SELEÇÃO DE ATIVOS */}
                                    <div className="form-group col-12">
                                        <label className="form-label">Ativos / Sistemas Afetados</label>
                                        <Controller
                                            name="assetIds"
                                            control={control}
                                            render={({ field }) => (
                                                <select
                                                    className={selectClass}
                                                    multiple
                                                    style={{ height: '120px' }}
                                                    disabled={isViewMode}
                                                    value={field.value || []}
                                                    onChange={(e) => {
                                                        const values = Array.from(e.target.selectedOptions, option => option.value);
                                                        field.onChange(values);
                                                    }}
                                                >
                                                    {assetsList.map(asset => (
                                                        <option key={asset.id} value={asset.id}>
                                                            {asset.name} ({asset.code})
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        />
                                        <div style={{ fontSize: '11px', color: 'var(--modal-text-muted)', marginTop: '4px' }}>
                                            * Segure Ctrl (Windows) para selecionar múltiplos. O sistema buscará o Gestor do Ativo automaticamente.
                                        </div>
                                    </div>

                                    {/* SELEÇÃO DE PROJETO (OPCIONAL) */}
                                    <div className="form-group col-12">
                                        <label className="form-label">Vincular a Projeto (Opcional)</label>
                                        <select {...register('projectId')} className={selectClass} disabled={isViewMode}>
                                            <option value="">Selecione um projeto...</option>
                                            {projectsList.map(proj => (
                                                <option key={proj.id} value={proj.id}>
                                                    {proj.name} ({proj.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group col-12">
                                        <label className="form-label">Descrição Detalhada</label>
                                        <textarea {...register('description')} className={textareaClass} rows={4} disabled={isViewMode} />
                                        {errors.description && <span style={{ color: 'red', fontSize: '11px' }}>{errors.description.message}</span>}
                                    </div>

                                    {/* INCIDENTES RELACIONADOS - Integração Bidirecional */}
                                    <div className="form-group col-12" style={{ marginTop: 16 }}>
                                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            ⚠️ Incidentes Relacionados
                                        </label>
                                        <div style={{
                                            padding: 12,
                                            borderRadius: '8px',
                                            background: 'rgba(245, 158, 11, 0.08)',
                                            border: '1px solid rgba(245, 158, 11, 0.2)'
                                        }}>
                                            <Controller
                                                name="relatedIncidentIds"
                                                control={control}
                                                render={({ field }) => (
                                                    <select
                                                        className={selectClass}
                                                        multiple
                                                        style={{ height: '100px', marginBottom: 8 }}
                                                        disabled={isViewMode}
                                                        value={field.value || []}
                                                        onChange={(e) => {
                                                            const values = Array.from(e.target.selectedOptions, option => option.value);
                                                            field.onChange(values);
                                                        }}
                                                    >
                                                        {availableIncidents.map(inc => (
                                                            <option key={inc.id} value={inc.id}>
                                                                {inc.code} - {inc.title} ({inc.status})
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            />
                                            <div style={{ fontSize: '11px', color: '#f59e0b', fontStyle: 'italic' }}>
                                                * Selecione os incidentes que esta GMUD resolve. Segure Ctrl para múltiplos.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ETAPA 2 / ABA PLANEJAMENTO */}
                        <div style={{ display: (isWizardMode ? activeStep === 1 : activeTab === 'plano') ? 'block' : 'none' }}>
                            <div className="form-section">
                                <div className="form-grid">
                                    <div className="form-group col-6">
                                        <label className="form-label">Início Agendado <span className="required">*</span></label>
                                        <input type="datetime-local" {...register('scheduledStart')} className={inputClass} disabled={isViewMode} />
                                    </div>
                                    <div className="form-group col-6">
                                        <label className="form-label">Fim Agendado <span className="required">*</span></label>
                                        <input type="datetime-local" {...register('scheduledEnd')} className={inputClass} disabled={isViewMode} />
                                    </div>

                                    {/* SCHEDULE CONFLICTS WARNING */}
                                    {scheduleConflicts.length > 0 && (
                                        <div className="form-group col-12">
                                            {/* FREEZE WINDOW ALERTS (Governance) */}
                                            {scheduleConflicts.filter(c => c.code === 'FREEZE').map(freeze => (
                                                <Alert
                                                    key={freeze.id}
                                                    severity={watchType === 'EMERGENCIAL' ? 'info' : 'error'}
                                                    sx={{
                                                        mb: 2,
                                                        borderRadius: '8px',
                                                        bgcolor: watchType === 'EMERGENCIAL' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        border: `1px solid ${watchType === 'EMERGENCIAL' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        {watchType === 'EMERGENCIAL' ? '🛡️ Bypass de Governança Ativo' : '❄️ Janela de Congelamento (Freeze)'}
                                                    </div>
                                                    <div style={{ fontSize: 13, marginTop: 4 }}>
                                                        {watchType === 'EMERGENCIAL'
                                                            ? `A mudança será permitida durante a janela "${freeze.title.replace('Janela de Congelamento: ', '')}" devido ao caráter emergencial.`
                                                            : `Status: ${freeze.title}. Alterações normais estão bloqueadas neste período.`
                                                        }
                                                    </div>
                                                    {watchType !== 'EMERGENCIAL' && (
                                                        <div style={{ fontSize: 11, marginTop: 8, fontWeight: 600 }}>
                                                            Ação Requerida: Altere o tipo para "Emergencial" se esta mudança for crítica.
                                                        </div>
                                                    )}
                                                </Alert>
                                            ))}

                                            {/* STANDARD GMUD CONFLICTS */}
                                            {scheduleConflicts.filter(c => c.code !== 'FREEZE').length > 0 && (
                                                <Alert severity="warning" sx={{
                                                    borderRadius: '8px',
                                                    bgcolor: 'rgba(245, 158, 11, 0.15)',
                                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                                    '& .MuiAlert-message': { width: '100%' }
                                                }}>
                                                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                                                        ⚠️ Conflito de Horário ({scheduleConflicts.filter(c => c.code !== 'FREEZE').length} GMUDs)
                                                    </div>
                                                    <div style={{ fontSize: 13 }}>
                                                        {scheduleConflicts.filter(c => c.code !== 'FREEZE').map(conflict => (
                                                            <div key={conflict.id} style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                padding: '6px 8px',
                                                                marginBottom: 4,
                                                                background: 'rgba(0,0,0,0.1)',
                                                                borderRadius: '8px'}}>
                                                                <span><strong>{conflict.code}</strong> - {conflict.title}</span>
                                                                <Chip
                                                                    label={conflict.status}
                                                                    size="small"
                                                                    sx={{
                                                                        fontSize: 10,
                                                                        height: 20,
                                                                        bgcolor: conflict.riskLevel === 'CRITICO' ? 'error.main' : 'warning.main',
                                                                        color: 'var(--modal-text)'
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div style={{ fontSize: 11, marginTop: 8, color: '#92400e' }}>
                                                        Considere ajustar o horário para evitar sobrecarga de mudanças simultâneas.
                                                    </div>
                                                </Alert>
                                            )}
                                        </div>
                                    )}

                                    {checkingConflicts && (
                                        <div className="form-group col-12">
                                            <div style={{ fontSize: 12, color: 'var(--modal-text-muted)', fontStyle: 'italic' }}>
                                                🔍 Verificando conflitos de horário...
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-group col-12">
                                        <label className="form-label">Justificativa da Mudança</label>
                                        <textarea {...register('justification')} className={textareaClass} rows={3} disabled={isViewMode} />
                                    </div>

                                    {/* NOVO: Pré-requisitos */}
                                    <div className="form-group col-12">
                                        <label className="form-label">Pré-requisitos</label>
                                        <textarea
                                            {...register('prerequisites')}
                                            className={textareaClass}
                                            rows={2}
                                            placeholder="Ex: Backup realizado, Janela de manutenção confirmada, Equipe de suporte avisada..."
                                            disabled={isViewMode}
                                        />
                                        <div style={{ fontSize: '11px', color: 'var(--modal-text-muted)', marginTop: '4px' }}>
                                            Liste o que precisa estar pronto antes de iniciar a mudança
                                        </div>
                                    </div>

                                    {/* NOVO: Plano de Testes */}
                                    <div className="form-group col-12">
                                        <label className="form-label">Plano de Testes</label>
                                        <textarea
                                            {...register('testPlan')}
                                            className={textareaClass}
                                            rows={3}
                                            placeholder="Descreva os testes que serão realizados após a mudança para validar o sucesso..."
                                            disabled={isViewMode}
                                        />
                                        <div style={{ fontSize: '11px', color: 'var(--modal-text-muted)', marginTop: '4px' }}>
                                            Como você vai validar que a mudança foi bem-sucedida?
                                        </div>
                                    </div>

                                    <div className="form-group col-12">
                                        <label className="form-label">Plano de Rollback (Backout Plan)</label>
                                        <textarea {...register('backoutPlan')} className={textareaClass} rows={3} disabled={isViewMode} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ABA APROVADORES */}
                        <div style={{ display: activeTab === 'aprovacao' ? 'block' : 'none' }}>
                            <div className="form-section">
                                <div className="approval-container">

                                    {/* APROVAÇÃO APENAS NO MÓDULO MINHAS APROVAÇÕES */}
                                    {isMyApprovalPending && change?.status === 'PENDING_APPROVAL' && (
                                        <Alert severity="info" sx={{ mb: 3, borderRadius: '8px', bgcolor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <span style={{ fontSize: 20 }}>🔔</span>
                                                <div>
                                                    <strong style={{ color: '#2563eb' }}>Sua aprovação está pendente!</strong>
                                                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                                                        Para aprovar ou rejeitar esta GMUD, acesse o módulo <strong>"Minhas Aprovações"</strong> no menu principal.
                                                    </div>
                                                </div>
                                            </div>
                                        </Alert>
                                    )}

                                    {!change ? (
                                        <Alert severity="info" sx={{ mb: 2 }}>
                                            <strong>Aprovação Automática:</strong> O seu Gestor de Centro de Custo será atribuído automaticamente como aprovador ao salvar esta GMUD.
                                        </Alert>
                                    ) : (
                                        <>
                                            {change.status === 'DRAFT' && (
                                                <Alert severity="warning" icon={false} sx={{ mb: 2, bgcolor: '#fffbeb', color: '#b45309' }}>
                                                    ℹ️ Esta GMUD está em rascunho. Envie para aprovação através da lista ("Ícone de Enviar").
                                                </Alert>
                                            )}

                                            <h4 style={{ margin: '0 0 16px 0', color: 'var(--modal-text-secondary)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aprovadores Designados</h4>

                                            {currentApprovers.length > 0 ? (
                                                <List sx={{ bgcolor: 'var(--modal-surface)', borderRadius: '8px', border: '1px solid var(--modal-border)', p: 0 }}>
                                                    {currentApprovers.map((app, index) => (
                                                        <div key={app.id}>
                                                            {index > 0 && <Divider />}
                                                            <ListItem>
                                                                <ListItemAvatar>
                                                                    <Avatar sx={{ bgcolor: 'var(--modal-surface-subtle)', color: 'var(--modal-text-muted)' }}>
                                                                        {app.user?.name?.charAt(0) || 'U'}
                                                                    </Avatar>
                                                                </ListItemAvatar>
                                                                <ListItemText
                                                                    primary={<span style={{ fontWeight: 600, color: 'var(--modal-text)' }}>{app.user?.name}</span>}
                                                                    secondary={app.user?.email}
                                                                />
                                                                <StatusChip status={app.status} type="CHANGE_APPROVER" />
                                                            </ListItem>
                                                        </div>
                                                    ))}
                                                </List>
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--modal-text-secondary)', background: 'var(--modal-surface-subtle)', borderRadius: '8px', border: '1px dashed var(--modal-border-strong)' }}>
                                                    Nenhum aprovador atribuído. Verifique seu Centro de Custo.
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>


                        {/* ABA EXECUÇÃO E FECHAMENTO */}
                        {change && ['APPROVED', 'APPROVED_WAITING_EXECUTION', 'EXECUTED', 'FAILED'].includes(change.status) && (
                            <div style={{ display: activeTab === 'execucao' ? 'block' : 'none' }}>
                                <div className="form-section">
                                    <div className="form-grid">
                                        <div className="form-group col-12">
                                            <div className="alert-info" style={{ marginBottom: 20, padding: 12, borderRadius: '8px', background: '#f0fdf4', border: '1px solid #dcfce7', color: '#166534' }}>
                                                ✅ <strong>Aprovada!</strong> Utilize este espaço para registrar os detalhes da execução.
                                            </div>
                                        </div>

                                        {/* EXECUÇÃO REAL - Novo recurso de Governança */}
                                        <div className="form-group col-6">
                                            <label className="form-label">Início Real da Execução</label>
                                            <input
                                                type="datetime-local"
                                                {...register('actualStart')}
                                                className={inputClass}
                                                disabled={!['APPROVED', 'APPROVED_WAITING_EXECUTION'].includes(change.status)}
                                            />
                                            <div style={{ fontSize: '11px', color: 'var(--modal-text-muted)', marginTop: '4px' }}>
                                                Quando a execução realmente começou
                                            </div>
                                        </div>
                                        <div className="form-group col-6">
                                            <label className="form-label">Fim Real da Execução</label>
                                            <input
                                                type="datetime-local"
                                                {...register('actualEnd')}
                                                className={inputClass}
                                                disabled={!['APPROVED', 'APPROVED_WAITING_EXECUTION'].includes(change.status)}
                                            />
                                            <div style={{ fontSize: '11px', color: 'var(--modal-text-muted)', marginTop: '4px' }}>
                                                Quando a execução foi concluída
                                            </div>
                                        </div>

                                        {/* Comparação Planejado vs Real - Visual Timeline */}
                                        {(change.actualStart || change.actualEnd) && (
                                            <div className="form-group col-12" style={{ marginTop: 12 }}>
                                                <div className="gmud-section" style={{ padding: 20 }}>
                                                    <div className="gmud-section-header">
                                                        <div className="gmud-section-icon exec">📊</div>
                                                        <div className="gmud-section-title">Variação Planejado vs Real</div>
                                                    </div>
                                                    <ExecutionTimeline
                                                        scheduledStart={change.scheduledStart}
                                                        scheduledEnd={change.scheduledEnd}
                                                        actualStart={change.actualStart}
                                                        actualEnd={change.actualEnd}
                                                        status={change.status}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="form-group col-12">
                                            <label className="form-label">Notas de Fechamento / Evidências</label>
                                            <textarea
                                                {...register('closureNotes')}
                                                className={textareaClass}
                                                rows={5}
                                                placeholder="Descreva como foi a execução, logs de erro ou sucesso..."
                                                disabled={!['APPROVED', 'APPROVED_WAITING_EXECUTION'].includes(change.status)}
                                            />
                                        </div>

                                        {/* PIR SECTION (Governance) - Investigation Style */}
                                        {/* Show PIR section when APPROVED (so user can fill before confirming failure) OR when already FAILED/CANCELLED (read-only view) */}
                                        {['APPROVED', 'APPROVED_WAITING_EXECUTION', 'FAILED', 'CANCELLED'].includes(change.status) && (
                                            <div className="pir-section">
                                                <div className="pir-header">
                                                    <div className="pir-icon">🔍</div>
                                                    <div>
                                                        <div className="pir-title">Revisão Pós-Implantação (PIR)</div>
                                                        <div className="pir-subtitle">
                                                            {['FAILED', 'CANCELLED'].includes(change.status)
                                                                ? 'Análise obrigatória para fechamento de GMUDs falhas'
                                                                : 'Preencha obrigatoriamente antes de marcar como "Falha na Execução"'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pir-form-grid">
                                                    <div className="pir-form-group">
                                                        <label className="pir-label">
                                                            <Warning sx={{ fontSize: 14 }} />
                                                            Causa Raiz da Falha/Cancelamento
                                                            <span className="required">*</span>
                                                        </label>
                                                        <textarea
                                                            {...register('rootCause')}
                                                            className="pir-textarea"
                                                            rows={3}
                                                            placeholder="Descreva o motivo técnico, processual ou humano que causou a falha..."
                                                        />
                                                    </div>

                                                    <div className="pir-form-group">
                                                        <label className="pir-label">
                                                            📚 Lições Aprendidas
                                                            <span className="required">*</span>
                                                        </label>
                                                        <textarea
                                                            {...register('lessonsLearned')}
                                                            className="pir-textarea"
                                                            rows={3}
                                                            placeholder="O que aprendemos com este incidente?"
                                                        />
                                                    </div>

                                                    <div className="pir-form-group">
                                                        <label className="pir-label">
                                                            🛡️ Ações Preventivas
                                                        </label>
                                                        <textarea
                                                            {...register('preventiveActions')}
                                                            className="pir-textarea"
                                                            rows={3}
                                                            placeholder="Que medidas serão tomadas para evitar reincidência?"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="form-group col-12" style={{ marginTop: '20px', borderTop: '1px solid var(--modal-border)', paddingTop: '20px' }}>
                                            <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#334155' }}>Evidências e Anexos</h4>

                                            {['APPROVED', 'APPROVED_WAITING_EXECUTION'].includes(change.status) && (
                                                <div style={{ marginBottom: '15px' }}>
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        style={{ display: 'none' }}
                                                        onChange={handleFileUpload}
                                                    />
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={<AttachFile />}
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={loading}
                                                    >
                                                        Anexar Arquivo
                                                    </Button>
                                                </div>
                                            )}

                                            {attachments.length > 0 ? (
                                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                                    {attachments.map(att => (
                                                        <li key={att.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--modal-surface-subtle)', borderRadius: '8px', marginBottom: '8px', border: '1px solid var(--modal-border)' }}>
                                                            <a href={getFileURL(att.fileUrl)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: 500 }}>
                                                                📎 {att.fileName}
                                                            </a>
                                                            <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--modal-text-muted)' }}>
                                                                <span>{(att.fileSize / 1024).toFixed(1)} KB</span>
                                                                {['APPROVED', 'APPROVED_WAITING_EXECUTION'].includes(change.status) && (
                                                                    <span
                                                                        style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}
                                                                        onClick={() => handleDeleteAttachment(att.id)}
                                                                    >
                                                                        Excluir
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div style={{ color: 'var(--modal-text-secondary)', fontStyle: 'italic', fontSize: '13px' }}>Nenhum anexo.</div>
                                            )}
                                        </div>

                                        {['APPROVED', 'APPROVED_WAITING_EXECUTION'].includes(change.status) && (
                                            <div className="form-group col-12" style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    onClick={() => {
                                                        if (attachments.length === 0) {
                                                            return enqueueSnackbar('É obrigatório anexar evidências antes de concluir.', { variant: 'warning' });
                                                        }
                                                        const notes = watch('closureNotes');
                                                        if (!notes) return enqueueSnackbar('Preencha as notas de fechamento.', { variant: 'warning' });

                                                        setConfirmDialog({
                                                            open: true,
                                                            title: 'Confirmar Execução',
                                                            content: 'Tem certeza que deseja marcar esta GMUD como EXECUTADA COM SUCESSO?',
                                                            confirmText: 'Sim, Confirmar',
                                                            confirmColor: 'success',
                                                            variant: 'info',
                                                            onConfirm: async () => {
                                                                await onSave({ status: 'EXECUTED', closureNotes: notes });
                                                                if (onUpdate) onUpdate();
                                                                setConfirmDialog({ open: false });
                                                                onClose();
                                                            }
                                                        });
                                                    }}
                                                >
                                                    Executado com Sucesso
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="error"
                                                    onClick={() => {
                                                        if (attachments.length === 0) {
                                                            return enqueueSnackbar('É obrigatório anexar evidências antes de concluir.', { variant: 'warning' });
                                                        }
                                                        const notes = watch('closureNotes');
                                                        if (!notes) return enqueueSnackbar('Preencha as notas de fechamento (erro).', { variant: 'warning' });

                                                        // PIR Validation: rootCause and lessonsLearned are REQUIRED for failure
                                                        const rootCause = watch('rootCause');
                                                        const lessonsLearned = watch('lessonsLearned');
                                                        const preventiveActions = watch('preventiveActions');

                                                        if (!rootCause) {
                                                            return enqueueSnackbar('Para marcar como Falha, preencha a Causa Raiz no campo PIR abaixo.', { variant: 'error' });
                                                        }
                                                        if (!lessonsLearned) {
                                                            return enqueueSnackbar('Para marcar como Falha, preencha as Lições Aprendidas no campo PIR abaixo.', { variant: 'error' });
                                                        }

                                                        setConfirmDialog({
                                                            open: true,
                                                            title: 'Confirmar Falha',
                                                            content: 'Tem certeza que deseja marcar esta GMUD como FALHA NA EXECUÇÃO?',
                                                            confirmText: 'Sim, Confirmar',
                                                            confirmColor: 'error',
                                                            variant: 'danger',
                                                            onConfirm: async () => {
                                                                await onSave({
                                                                    status: 'FAILED',
                                                                    closureNotes: notes,
                                                                    rootCause,
                                                                    lessonsLearned,
                                                                    preventiveActions: preventiveActions || null
                                                                });
                                                                if (onUpdate) onUpdate();
                                                                setConfirmDialog({ open: false });
                                                                onClose();
                                                            }
                                                        });
                                                    }}
                                                >
                                                    Falha na Execução
                                                </Button>
                                            </div>
                                        )}

                                        {['EXECUTED', 'FAILED'].includes(change.status) && (
                                            <div className="form-group col-12">
                                                <label className="form-label">Status Final</label>
                                                <div style={{ fontWeight: 'bold', color: change.status === 'EXECUTED' ? 'green' : 'red' }}>
                                                    {change.status === 'EXECUTED' ? 'EXECUÇÃO BEM-SUCEDIDA' : 'FALHA NA EXECUÇÃO'}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
            </StandardModal>
            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                content={confirmDialog.content}
                onConfirm={confirmDialog.onConfirm}
                onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
                confirmText={confirmDialog.confirmText}
                confirmColor={confirmDialog.confirmColor}
                variant={confirmDialog.variant}
            />
        </>
    );
};

export default ChangeModal;
