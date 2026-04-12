import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import {
    Box, Button, Typography, Avatar, Divider, Alert, Chip, List, ListItem, ListItemText, ListItemAvatar, IconButton, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { ThumbUp, Send, AttachFile, History, Comment, Link as LinkIcon, Add } from '@mui/icons-material';
import StatusChip from '../common/StatusChip';
import {
    assignIncident, resolveIncident, closeIncident, escalateIncident,
    addIncidentComment, uploadIncidentAttachment, getIncidentById,
    getIncidentCategories, createIncidentCategory
} from '../../services/incident.service';
import { getChanges } from '../../services/change-request.service';
import { getAssets } from '../../services/asset.service';
import { getFileURL } from '../../utils/urlUtils';
import InlineCreateSelect from '../common/InlineCreateSelect';

const schema = yup.object({
    title: yup.string().required('Título é obrigatório'),
    description: yup.string().required('Descrição é obrigatória'),
    categoryId: yup.string().required('Categoria é obrigatória'),
    impact: yup.string().required('Impacto é obrigatório'),
    urgency: yup.string().required('Urgência é obrigatória'),
}).required();

const IncidentModal = ({ open, onClose, onSave, onUpdate, onDelete, incident = null, isViewMode = false, loading = false, categories: propCategories = [], users = [] }) => {
    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState('geral');
    const [fullIncident, setFullIncident] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [isInternalComment, setIsInternalComment] = useState(false);
    const [availableGMUDs, setAvailableGMUDs] = useState([]);
    const [availableAssets, setAvailableAssets] = useState([]);
    const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
    const [escalateReason, setEscalateReason] = useState('');
    const [localCategories, setLocalCategories] = useState(propCategories);

    // Sync prop categories
    useEffect(() => { setLocalCategories(propCategories); }, [propCategories]);

    const refreshCategories = async () => {
        const cats = await getIncidentCategories();
        setLocalCategories(cats);
    };

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { impact: 'MEDIO', urgency: 'MEDIA', relatedChangeId: '', relatedAssetId: '', assigneeId: '' }
    });

    const selectedChangeId = watch('relatedChangeId');
    const selectedAssetId = watch('relatedAssetId');

    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

    useEffect(() => {
        if (open) {
            // Buscar GMUDs ativas para associação
            // Status que indicam "Em Andamento" ou ativas
            const activeStatuses = ['PENDING_APPROVAL', 'APPROVED', 'APPROVED_WAITING_EXECUTION', 'EXECUTED', 'REVISION_REQUESTED'];
            // Como a API pode não suportar array na query string diretamente dependendo da implementação, 
            // vamos buscar todas e filtrar no front ou buscar sem filtro de status se a API não suportar lista.
            // Assumindo que getChanges aceita filtros. 
            // Para simplificar e garantir, buscamos todas e filtramos aqui se a lista não for gigante.
            // Se a API suportar, melhor. Vamos tentar buscar tudo e filtrar aqui por segurança.
            getChanges().then(data => {
                const active = data.filter(g => activeStatuses.includes(g.status));
                setAvailableGMUDs(active);
            }).catch(console.error);

            // Buscar Ativos para associação
            getAssets().then(data => {
                setAvailableAssets(Array.isArray(data) ? data : (data?.data || []));
            }).catch(console.error);
        }

        if (open && incident) {
            // Buscar incidente completo com histórico e comentários
            getIncidentById(incident.id).then(data => {
                setFullIncident(data);
                reset({
                    ...data,
                    categoryId: data.categoryId || '',
                    relatedChangeId: data.relatedChangeId || '',
                    relatedAssetId: data.relatedAssetId || '',
                    assigneeId: data.assigneeId || ''
                });
            }).catch(console.error);
            setActiveTab('geral');
        } else if (open && !incident) {
            reset({ title: '', description: '', categoryId: '', impact: 'MEDIO', urgency: 'MEDIA', relatedChangeId: '', relatedAssetId: '', assigneeId: '' });
            setFullIncident(null);
            setActiveTab('geral');
        }
    }, [open, incident, reset]);

    const onSubmit = (data) => {
        if (isViewMode) return;
        const payload = {
            ...data,
            relatedChangeId: data.relatedChangeId || null,
            relatedAssetId: data.relatedAssetId || null,
            assigneeId: data.assigneeId || null
        };
        onSave(payload);
    };

    const handleAssign = async (assigneeId) => {
        try {
            await assignIncident(incident.id, assigneeId);
            enqueueSnackbar('Incidente atribuído com sucesso!', { variant: 'success' });
            if (onUpdate) onUpdate();
            // Refresh full incident
            const updated = await getIncidentById(incident.id);
            setFullIncident(updated);
        } catch (error) {
            enqueueSnackbar('Erro ao atribuir incidente.', { variant: 'error' });
        }
    };

    const handleResolve = async () => {
        const solution = document.getElementById('solution-input')?.value;
        const rootCause = document.getElementById('rootcause-input')?.value;
        if (!solution) {
            return enqueueSnackbar('Preencha a solução aplicada.', { variant: 'warning' });
        }
        try {
            await resolveIncident(incident.id, solution, rootCause);
            enqueueSnackbar('Incidente resolvido com sucesso!', { variant: 'success' });
            if (onUpdate) onUpdate();
            onClose();
        } catch (error) {
            enqueueSnackbar('Erro ao resolver incidente.', { variant: 'error' });
        }
    };

    const handleClose = async () => {
        try {
            await closeIncident(incident.id);
            enqueueSnackbar('Incidente fechado com sucesso!', { variant: 'success' });
            if (onUpdate) onUpdate();
            onClose();
        } catch (error) {
            enqueueSnackbar('Erro ao fechar incidente.', { variant: 'error' });
        }
    };

    const handleOpenEscalateDialog = () => {
        setEscalateReason('');
        setEscalateDialogOpen(true);
    };

    const handleEscalate = async () => {
        if (!escalateReason.trim()) {
            enqueueSnackbar('Informe o motivo do escalonamento.', { variant: 'warning' });
            return;
        }
        try {
            const result = await escalateIncident(incident.id, escalateReason);
            enqueueSnackbar(`Incidente escalonado para: ${result.escalatedTo}`, { variant: 'success' });
            setEscalateDialogOpen(false);
            setEscalateReason('');
            if (onUpdate) onUpdate();
        } catch (error) {
            enqueueSnackbar('Erro ao escalonar incidente.', { variant: 'error' });
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        try {
            await addIncidentComment(incident.id, newComment, isInternalComment);
            setNewComment('');
            enqueueSnackbar('Comentário adicionado!', { variant: 'success' });
            const updated = await getIncidentById(incident.id);
            setFullIncident(updated);
        } catch (error) {
            enqueueSnackbar('Erro ao adicionar comentário.', { variant: 'error' });
        }
    };

    if (!open || !mounted) return null;

    const currentIncident = fullIncident || incident;
    const inputClass = `form-input ${isViewMode ? 'disabled-input' : ''}`;
    const selectClass = `form-select ${isViewMode ? 'disabled-input' : ''}`;
    const textareaClass = `form-textarea ${isViewMode ? 'disabled-input' : ''}`;

    const priorityColors = { P1: '#ef4444', P2: '#f59e0b', P3: '#3b82f6', P4: '#10b981' };

    return (
        <Dialog
            open={true}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    background: 'var(--modal-bg)',
                    borderRadius: '16px',
                    border: '1px solid var(--modal-border)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    color: 'var(--modal-text)',
                    maxHeight: '90vh',
                    overflow: 'visible',
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
            BackdropProps={{
                sx: {
                    backdropFilter: 'blur(4px)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                }
            }}
        >
            <div className="incident-modal-inner" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                <div className="modal-header">
                    <div className="modal-icon" style={{ background: priorityColors[currentIncident?.priority] || '#f59e0b' }}>⚠️</div>
                    <div className="modal-header-info">
                        <h2>{isViewMode ? 'Detalhes do Incidente' : (incident ? 'Editar Incidente' : 'Novo Incidente')}</h2>
                        <p>{currentIncident?.code || 'Preencha os dados do incidente'}</p>
                    </div>
                    {currentIncident?.priority && (
                        <Chip label={currentIncident.priority} size="small" sx={{ bgcolor: priorityColors[currentIncident.priority], color: 'var(--modal-text)', fontWeight: 700, ml: 2 }} />
                    )}
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-tabs">
                    <button className={`modal-tab ${activeTab === 'geral' ? 'active' : ''}`} onClick={() => setActiveTab('geral')}>Geral</button>
                    {incident && <button className={`modal-tab ${activeTab === 'diagnostico' ? 'active' : ''}`} onClick={() => setActiveTab('diagnostico')}>Diagnóstico</button>}
                    {incident && <button className={`modal-tab ${activeTab === 'historico' ? 'active' : ''}`} onClick={() => setActiveTab('historico')}>Histórico</button>}
                    {incident && <button className={`modal-tab ${activeTab === 'comentarios' ? 'active' : ''}`} onClick={() => setActiveTab('comentarios')}>Comentários</button>}
                </div>

                <div className="modal-body">
                    <form id="incidentForm" onSubmit={handleSubmit(onSubmit)}>
                        {/* ABA GERAL */}
                        <div style={{ display: activeTab === 'geral' ? 'block' : 'none' }}>
                            <div className="form-section">
                                <div className="form-grid">
                                    <div className="form-group col-12">
                                        <label className="form-label">Título <span className="required">*</span></label>
                                        <input {...register('title')} className={inputClass} placeholder="Ex: Sistema ERP não abre" disabled={isViewMode} />
                                        {errors.title && <span style={{ color: 'red', fontSize: '11px' }}>{errors.title.message}</span>}
                                    </div>

                                    <div className="form-group col-4">
                                        <InlineCreateSelect
                                            label="Categoria"
                                            required
                                            value={watch('categoryId') || ''}
                                            onChange={(val) => setValue('categoryId', val, { shouldValidate: true })}
                                            options={localCategories}
                                            disabled={isViewMode}
                                            error={!!errors.categoryId}
                                            helperText={errors.categoryId?.message}
                                            onCreateNew={async (name) => createIncidentCategory({ name })}
                                            onRefresh={refreshCategories}
                                        />
                                    </div>



                                    {!incident && (
                                        <div className="form-group col-4">
                                            <label className="form-label">Responsavel</label>
                                            <select {...register('assigneeId')} className={selectClass} disabled={isViewMode}>
                                                <option value="">Selecionar responsavel...</option>
                                                {users.map(user => (<option key={user.id} value={user.id}>{user.name}</option>))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="form-group col-4">
                                        <label className="form-label">Impacto <span className="required">*</span></label>
                                        <select {...register('impact')} className={selectClass} disabled={isViewMode}>
                                            <option value="BAIXO">Baixo</option>
                                            <option value="MEDIO">Médio</option>
                                            <option value="ALTO">Alto</option>
                                            <option value="CRITICO">Crítico</option>
                                        </select>
                                    </div>

                                    <div className="form-group col-4">
                                        <label className="form-label">Urgência <span className="required">*</span></label>
                                        <select {...register('urgency')} className={selectClass} disabled={isViewMode}>
                                            <option value="BAIXA">Baixa</option>
                                            <option value="MEDIA">Média</option>
                                            <option value="ALTA">Alta</option>
                                            <option value="CRITICA">Crítica</option>
                                        </select>
                                    </div>

                                    <div className="form-group col-12">
                                        <label className="form-label">Descrição Detalhada <span className="required">*</span></label>
                                        <textarea {...register('description')} className={textareaClass} rows={4} placeholder="Descreva o incidente em detalhes..." disabled={isViewMode} />
                                        {errors.description && <span style={{ color: 'red', fontSize: '11px' }}>{errors.description.message}</span>}
                                    </div>

                                    {incident && (
                                        <div className="form-group col-12">
                                            <label className="form-label">Responsável</label>
                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                {currentIncident?.assignee ? (
                                                    <Chip avatar={<Avatar>{currentIncident.assignee.name?.[0]}</Avatar>} label={currentIncident.assignee.name} color="primary" variant="outlined" />
                                                ) : (
                                                    <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: 14 }}>Não atribuído</Typography>
                                                )}
                                                {!isViewMode && currentIncident?.status !== 'CLOSED' && (
                                                    <select onChange={(e) => e.target.value && handleAssign(e.target.value)} className={selectClass} style={{ width: 200 }}>
                                                        <option value="">Atribuir para...</option>
                                                        {users.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
                                                    </select>
                                                )}
                                            </Box>
                                        </div>
                                    )}

                                    {incident && currentIncident?.slaBreached && (
                                        <div className="form-group col-12">
                                            <Alert severity="error" sx={{ borderRadius: 2 }}>
                                                ⚠️ <strong>SLA Estourado!</strong> Este incidente excedeu o prazo de resolução.
                                            </Alert>
                                        </div>
                                    )}

                                    {/* GMUD RELACIONADA - Nova Lógica de Associação Bidirecional */}
                                    <div className="form-group col-12" style={{ marginTop: 16 }}>
                                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <LinkIcon sx={{ fontSize: 18, color: '#2563eb' }} />
                                            GMUD Relacionada
                                        </label>
                                        <Box sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: 'rgba(37, 99, 235, 0.08)',
                                            border: '1px solid rgba(37, 99, 235, 0.2)'
                                        }}>
                                            {/* Se já tiver GMUD vinculada (vinda do banco ou selecionada agora) */}
                                            {currentIncident?.relatedChange || (selectedChangeId && availableGMUDs.find(g => g.id === selectedChangeId)) ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Box>
                                                        {(() => {
                                                            const linked = currentIncident?.relatedChange || availableGMUDs.find(g => g.id === selectedChangeId);
                                                            return (
                                                                <>
                                                                    <Typography sx={{ color: '#818cf8', fontWeight: 600, fontSize: 14 }}>
                                                                        {linked.code}
                                                                    </Typography>
                                                                    <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: 13 }}>
                                                                        {linked.title}
                                                                    </Typography>
                                                                </>
                                                            );
                                                        })()}
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {currentIncident?.relatedChange && <StatusChip status={currentIncident.relatedChange.status} />}

                                                        {/* Botão Ver GMUD (só se já salvo) */}
                                                        {currentIncident?.relatedChange && (
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => { onClose(); navigate(`/changes?id=${currentIncident.relatedChange.id}`); }}
                                                                sx={{ borderColor: 'rgba(37, 99, 235, 0.5)', color: '#818cf8' }}
                                                            >
                                                                Ver GMUD
                                                            </Button>
                                                        )}

                                                        {!isViewMode && (
                                                            <Button
                                                                size="small"
                                                                variant="text"
                                                                color="error"
                                                                onClick={() => setValue('relatedChangeId', '')} // Remove a seleção
                                                            >
                                                                Desvincular
                                                            </Button>
                                                        )}
                                                    </Box>
                                                </Box>
                                            ) : (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: 13 }}>
                                                            Vincule este incidente a uma GMUD existente ou crie uma nova.
                                                        </Typography>
                                                    </Box>

                                                    {!isViewMode && (
                                                        <Box sx={{ display: 'flex', gap: 2 }}>
                                                            <div style={{ flex: 1 }}>
                                                                <select
                                                                    className={selectClass}
                                                                    onChange={(e) => setValue('relatedChangeId', e.target.value)}
                                                                    defaultValue=""
                                                                >
                                                                    <option value="">Selecione uma GMUD existente...</option>
                                                                    {availableGMUDs.map(gmud => (
                                                                        <option key={gmud.id} value={gmud.id}>
                                                                            {gmud.code} - {gmud.title} ({gmud.status})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                startIcon={<Add />}
                                                                onClick={() => {
                                                                    // Navegar para criação de GMUD com dados pré-preenchidos
                                                                    const params = new URLSearchParams({
                                                                        fromIncident: currentIncident?.id || '', // Se for novo, não tem ID ainda, cuidado
                                                                        title: `GMUD: ${watch('title') || ''}`,
                                                                        description: `GMUD originada do incidente: ${watch('description') || ''}`
                                                                    });
                                                                    onClose();
                                                                    navigate(`/changes?new=true&${params.toString()}`);
                                                                }}
                                                                disabled={!incident && !watch('title')} // Desabilita se for criação de incidente e não tiver tirulo
                                                                sx={{
                                                                    bgcolor: '#2563eb',
                                                                    '&:hover': { bgcolor: '#1d4ed8' },
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                Criar Nova GMUD
                                                            </Button>
                                                        </Box>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>
                                    </div>

                                    {/* ATIVO RELACIONADO */}
                                    <div className="form-group col-12" style={{ marginTop: 16 }}>
                                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <LinkIcon sx={{ fontSize: 18, color: '#10b981' }} />
                                            Ativo Relacionado
                                        </label>
                                        <Box sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: 'rgba(16, 185, 129, 0.08)',
                                            border: '1px solid rgba(16, 185, 129, 0.2)'
                                        }}>
                                            {currentIncident?.relatedAsset || (selectedAssetId && availableAssets.find(a => a.id === selectedAssetId)) ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Box>
                                                        {(() => {
                                                            const linked = currentIncident?.relatedAsset || availableAssets.find(a => a.id === selectedAssetId);
                                                            return (
                                                                <>
                                                                    <Typography sx={{ color: '#10b981', fontWeight: 600, fontSize: 14 }}>
                                                                        {linked.tag || linked.name}
                                                                    </Typography>
                                                                    <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: 13 }}>
                                                                        {linked.name} — {linked.type || 'Ativo'}
                                                                    </Typography>
                                                                </>
                                                            );
                                                        })()}
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {currentIncident?.relatedAsset && (
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => { onClose(); navigate(`/assets?id=${currentIncident.relatedAsset.id}`); }}
                                                                sx={{ borderColor: 'rgba(16, 185, 129, 0.5)', color: '#10b981' }}
                                                            >
                                                                Ver Ativo
                                                            </Button>
                                                        )}
                                                        {!isViewMode && (
                                                            <Button
                                                                size="small"
                                                                variant="text"
                                                                color="error"
                                                                onClick={() => setValue('relatedAssetId', '')}
                                                            >
                                                                Desvincular
                                                            </Button>
                                                        )}
                                                    </Box>
                                                </Box>
                                            ) : (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: 13 }}>
                                                        Vincule este incidente a um ativo de TI existente.
                                                    </Typography>
                                                    {!isViewMode && (
                                                        <div style={{ flex: 1 }}>
                                                            <select
                                                                className={selectClass}
                                                                onChange={(e) => setValue('relatedAssetId', e.target.value)}
                                                                defaultValue=""
                                                            >
                                                                <option value="">Selecione um ativo...</option>
                                                                {availableAssets.map(asset => (
                                                                    <option key={asset.id} value={asset.id}>
                                                                        {asset.tag || asset.name} - {asset.name} ({asset.type || 'N/A'})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ABA DIAGNÓSTICO */}
                        {incident && (
                            <div style={{ display: activeTab === 'diagnostico' ? 'block' : 'none' }}>
                                <div className="form-section">
                                    <div className="form-grid">
                                        <div className="form-group col-12">
                                            <label className="form-label">Solução Aplicada</label>
                                            <textarea id="solution-input" className={textareaClass} rows={3} defaultValue={currentIncident?.solution || ''} placeholder="Descreva a solução aplicada..." disabled={currentIncident?.status === 'CLOSED'} />
                                        </div>
                                        <div className="form-group col-12">
                                            <label className="form-label">Causa Raiz</label>
                                            <textarea id="rootcause-input" className={textareaClass} rows={2} defaultValue={currentIncident?.rootCause || ''} placeholder="Qual foi a causa raiz do problema?" disabled={currentIncident?.status === 'CLOSED'} />
                                        </div>
                                        <div className="form-group col-12">
                                            <label className="form-label">Workaround (Solução de Contorno)</label>
                                            <textarea {...register('workaround')} className={textareaClass} rows={2} placeholder="Existe uma solução temporária?" disabled={isViewMode} />
                                        </div>

                                        {['OPEN', 'IN_PROGRESS', 'PENDING'].includes(currentIncident?.status) && (
                                            <div className="form-group col-12" style={{ display: 'flex', gap: 15, marginTop: 20 }}>
                                                <Button variant="contained" color="success" onClick={handleResolve}>Resolver Incidente</Button>
                                                <Button variant="outlined" color="warning" onClick={handleOpenEscalateDialog}>Escalonar</Button>
                                            </div>
                                        )}

                                        {currentIncident?.status === 'RESOLVED' && (
                                            <div className="form-group col-12" style={{ marginTop: 20 }}>
                                                <Button variant="contained" color="secondary" onClick={handleClose}>Fechar Incidente</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ABA HISTÓRICO */}
                        {incident && (
                            <div style={{ display: activeTab === 'historico' ? 'block' : 'none' }}>
                                <div className="form-section">
                                    <Typography sx={{ color: 'var(--modal-text-secondary)', mb: 2, fontSize: 14 }}>Timeline de eventos do incidente</Typography>
                                    <List sx={{ bgcolor: 'var(--modal-surface-subtle)', borderRadius: 2, border: '1px solid var(--modal-border-strong)' }}>
                                        {(fullIncident?.history || []).map((h, idx) => (
                                            <ListItem key={h.id} sx={{ borderBottom: idx < (fullIncident?.history?.length - 1) ? '1px solid var(--modal-surface-hover)' : 'none' }}>
                                                <ListItemAvatar>
                                                    <Avatar sx={{ bgcolor: 'rgba(37, 99, 235, 0.2)', color: '#818cf8', width: 32, height: 32 }}>
                                                        <History sx={{ fontSize: 18 }} />
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={<span style={{ color: '#e0e0e0', fontSize: 14 }}>{h.action}: {h.newValue || ''}</span>}
                                                    secondary={<span style={{ color: 'var(--modal-text-muted)', fontSize: 12 }}>{h.user?.name} - {new Date(h.createdAt).toLocaleString('pt-BR')}</span>}
                                                />
                                            </ListItem>
                                        ))}
                                        {(!fullIncident?.history || fullIncident.history.length === 0) && (
                                            <ListItem><ListItemText primary={<span style={{ color: 'var(--modal-text-muted)' }}>Nenhum histórico ainda.</span>} /></ListItem>
                                        )}
                                    </List>
                                </div>
                            </div>
                        )}

                        {/* ABA COMENTÁRIOS */}
                        {incident && (
                            <div style={{ display: activeTab === 'comentarios' ? 'block' : 'none' }}>
                                <div className="form-section">
                                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="Adicionar comentário..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'var(--modal-surface-hover)', color: '#e0e0e0', '& fieldset': { borderColor: 'var(--modal-border-strong)' } } }}
                                        />
                                        <Button variant="contained" onClick={handleAddComment} sx={{ minWidth: 'auto', px: 2 }}><Send /></Button>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                        <Chip label="Público" size="small" variant={!isInternalComment ? 'filled' : 'outlined'} onClick={() => setIsInternalComment(false)} sx={{ cursor: 'pointer' }} />
                                        <Chip label="Interno" size="small" variant={isInternalComment ? 'filled' : 'outlined'} onClick={() => setIsInternalComment(true)} sx={{ cursor: 'pointer' }} />
                                    </Box>
                                    <Divider sx={{ my: 2, borderColor: 'var(--modal-border-strong)' }} />
                                    <List>
                                        {(fullIncident?.comments || []).map((c) => (
                                            <ListItem key={c.id} sx={{ bgcolor: c.isInternal ? 'rgba(245, 158, 11, 0.1)' : 'transparent', borderRadius: 2, mb: 1 }}>
                                                <ListItemAvatar>
                                                    <Avatar sx={{ bgcolor: '#2563eb', width: 32, height: 32 }}>{c.user?.name?.[0]}</Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={<span style={{ color: '#e0e0e0', fontSize: 14 }}>{c.content}</span>}
                                                    secondary={<span style={{ color: 'var(--modal-text-muted)', fontSize: 12 }}>{c.user?.name} - {new Date(c.createdAt).toLocaleString('pt-BR')} {c.isInternal && '(Interno)'}</span>}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                <div className="modal-footer">
                    {/* Botão Deletar - Somente ao editar */}
                    {!isViewMode && incident && onDelete && currentIncident?.status !== 'CLOSED' && (
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => {
                                if (window.confirm('Tem certeza que deseja excluir este incidente? Esta ação não pode ser desfeita.')) {
                                    onDelete(incident.id);
                                }
                            }}
                            style={{ marginRight: 'auto' }}
                        >
                            🗑️ Excluir
                        </button>
                    )}
                    <button type="button" className="btn btn-secondary" onClick={onClose}>{isViewMode ? 'Fechar' : 'Cancelar'}</button>

                    {/* Botão Finalizar - Status RESOLVED */}
                    {incident && currentIncident?.status === 'RESOLVED' && (
                        <button
                            type="button"
                            className="btn btn-success"
                            onClick={handleClose}
                            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                        >
                            ✓ Finalizar Incidente
                        </button>
                    )}

                    {/* Botão Salvar - Novo ou Editar */}
                    {!isViewMode && !incident && (
                        <button type="submit" form="incidentForm" className="btn btn-primary" disabled={loading}>
                            <span>✓</span> Registrar Incidente
                        </button>
                    )}
                    {!isViewMode && incident && currentIncident?.status !== 'CLOSED' && (
                        <button type="submit" form="incidentForm" className="btn btn-primary" disabled={loading}>
                            <span>✓</span> Salvar Alterações
                        </button>
                    )}
                </div>
            </div>

            {/* Dialog de Escalonamento */}
            <Dialog
                open={escalateDialogOpen}
                onClose={() => setEscalateDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                sx={{
                    zIndex: 1400,
                    '& .MuiDialog-paper': {
                        bgcolor: 'var(--modal-bg, #1e293b)',
                        color: 'var(--modal-text, #e0e0e0)',
                        borderRadius: 2
                    }
                }}
            >
                <DialogTitle sx={{ color: 'var(--modal-text, #e0e0e0)', fontWeight: 600 }}>
                    🚨 Escalonar Incidente
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: 'var(--modal-text-secondary, #94a3b8)', mb: 2, fontSize: 14 }}>
                        Informe o motivo do escalonamento. Esta ação notificará os gestores responsáveis.
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Descreva o motivo do escalonamento..."
                        value={escalateReason}
                        onChange={(e) => setEscalateReason(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                bgcolor: 'var(--modal-surface-hover, #334155)',
                                color: 'var(--modal-text, #e0e0e0)',
                                '& fieldset': { borderColor: 'var(--modal-border-strong, #475569)' },
                                '&:hover fieldset': { borderColor: '#2563eb' },
                                '&.Mui-focused fieldset': { borderColor: '#2563eb' }
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        onClick={() => setEscalateDialogOpen(false)}
                        sx={{ color: 'var(--modal-text-secondary, #94a3b8)' }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleEscalate}
                        sx={{ bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}
                    >
                        Confirmar Escalonamento
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};

export default IncidentModal;
