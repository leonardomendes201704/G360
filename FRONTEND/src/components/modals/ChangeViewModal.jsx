import { useState, useEffect, useContext } from 'react';
import {
    Dialog, Box, Typography, Chip, IconButton, Avatar, Divider, Button, Alert
} from '@mui/material';
import { Close, Edit, Schedule, CalendarToday, Person, Description, AttachFile } from '@mui/icons-material';
import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';
import StatusChip from '../common/StatusChip';
import ChangeLifecycle from '../changes/ChangeLifecycle';
import RiskGauge from '../changes/RiskGauge';
import ExecutionTimeline from '../changes/ExecutionTimeline';
import { getAttachments } from '../../services/change-request.service';
import { getFileURL } from '../../utils/urlUtils';
import './ChangeModal.css';

const STATUS_LABELS = {
    DRAFT: 'Rascunho',
    PENDING_APPROVAL: 'Aguardando Aprovação',
    APPROVED: 'Aprovada',
    APPROVED_WAITING_EXECUTION: 'Aguardando Execução',
    REJECTED: 'Rejeitada',
    EXECUTED: 'Executada',
    FAILED: 'Falha na Execução',
    REVISION_REQUESTED: 'Revisão Solicitada',
    CANCELLED: 'Cancelada'
};

const TYPE_LABELS = { NORMAL: 'Normal', PADRAO: 'Padrão', EMERGENCIAL: 'Emergencial' };
const IMPACT_LABELS = { MENOR: 'Menor', SIGNIFICATIVO: 'Significativo', MAIOR: 'Maior' };

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function formatShortDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR');
}

const ChangeViewModal = ({ open, onClose, change, onEdit }) => {
    const { mode } = useContext(ThemeContext);
    const { user } = useContext(AuthContext);
    const isDark = mode === 'dark';
    const [activeTab, setActiveTab] = useState('geral');
    const [attachments, setAttachments] = useState([]);

    const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';
    const textMuted = isDark ? '#64748b' : '#94a3b8';
    const surfaceBg = isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

    useEffect(() => {
        if (open && change?.id) {
            getAttachments(change.id).then(setAttachments).catch(() => setAttachments([]));
            setActiveTab('geral');
        }
    }, [open, change?.id]);

    if (!open || !change) return null;

    const riskAssessment = change.riskAssessment || {};
    let riskScore = 0;
    if (riskAssessment.affectsProduction) riskScore += 5;
    if (riskAssessment.hasDowntime) riskScore += 10;
    if (!riskAssessment.tested) riskScore += 5;
    if (!riskAssessment.easyRollback) riskScore += 5;
    let riskLevel = 'BAIXO';
    if (riskScore > 15) riskLevel = 'CRITICO';
    else if (riskScore > 10) riskLevel = 'ALTO';
    else if (riskScore > 5) riskLevel = 'MEDIO';

    const approvers = change.approvers || [];
    const showExecution = ['APPROVED', 'APPROVED_WAITING_EXECUTION', 'EXECUTED', 'FAILED'].includes(change.status);

    const tabs = [
        { key: 'geral', label: 'Geral', icon: '📋' },
        { key: 'plano', label: 'Plano', icon: '📅' },
        { key: 'aprovacao', label: 'Aprovações', icon: '👥' },
    ];
    if (showExecution) tabs.push({ key: 'execucao', label: 'Execução', icon: '🚀' });

    const DataField = ({ label, value, icon, fullWidth = false }) => (
        <Box sx={{
            p: 2, borderRadius: '10px', background: surfaceBg, border: `1px solid ${borderColor}`,
            gridColumn: fullWidth ? '1 / -1' : 'auto',
            minHeight: 60, display: 'flex', flexDirection: 'column', gap: 0.5
        }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {icon && <span style={{ fontSize: '14px' }}>{icon}</span>}
                {label}
            </Typography>
            <Typography sx={{ fontSize: '14px', color: textPrimary, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {value || '—'}
            </Typography>
        </Box>
    );

    return (
        <Dialog
            open={true}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    background: isDark ? '#0f172a' : '#ffffff',
                    borderRadius: '12px',
                    border: `1px solid ${borderColor}`,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    color: textPrimary,
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
            BackdropProps={{
                sx: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.7)' }
            }}
        >
            <div className="change-modal-inner" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                {/* Header */}
                <Box sx={{ p: 3, pb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
                            <Box sx={{
                                width: 44, height: 44, borderRadius: '10px',
                                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '20px', flexShrink: 0
                            }}>
                                🔄
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                    <Typography sx={{ fontWeight: 700, fontSize: '18px', color: textPrimary }}>
                                        {change.code}
                                    </Typography>
                                    <StatusChip status={change.status} type="CHANGE" />
                                    {change.type && (
                                        <Chip
                                            label={TYPE_LABELS[change.type] || change.type}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontSize: '11px', height: 22, borderColor: borderColor, color: textSecondary }}
                                        />
                                    )}
                                </Box>
                                <Typography sx={{ fontSize: '15px', color: textPrimary, mt: 0.5, fontWeight: 500 }}>
                                    {change.title}
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton onClick={onClose} size="small" sx={{ color: textMuted }}>
                            <Close />
                        </IconButton>
                    </Box>
                </Box>

                {/* Lifecycle Stepper */}
                <ChangeLifecycle
                    status={change.status}
                    createdAt={change.createdAt}
                    updatedAt={change.updatedAt}
                />

                {/* Tabs */}
                <Box sx={{ display: 'flex', gap: 0.5, px: 3, borderBottom: `1px solid ${borderColor}` }}>
                    {tabs.map(tab => (
                        <Box
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            sx={{
                                px: 2, py: 1.5, cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                                color: activeTab === tab.key ? '#2563eb' : textSecondary,
                                borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: 0.75,
                                '&:hover': { color: textPrimary }
                            }}
                        >
                            <span style={{ fontSize: '14px' }}>{tab.icon}</span>
                            {tab.label}
                            {tab.key === 'aprovacao' && approvers.length > 0 && (
                                <Chip label={approvers.length} size="small" sx={{ height: 18, fontSize: '10px', bgcolor: 'rgba(37,99,235,0.15)', color: '#2563eb' }} />
                            )}
                        </Box>
                    ))}
                </Box>

                {/* Tab Content */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>

                    {/* TAB: Geral */}
                    {activeTab === 'geral' && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                            <DataField label="Tipo" value={TYPE_LABELS[change.type] || change.type} icon="📦" />
                            <DataField label="Impacto" value={IMPACT_LABELS[change.impact] || change.impact} icon="💥" />
                            <DataField label="Solicitante" value={change.requester?.name || '—'} icon="👤" />

                            <DataField label="Descrição" value={change.description} fullWidth icon="📝" />

                            {/* Risk Gauge */}
                            <Box sx={{
                                gridColumn: '1 / -1', p: 2, borderRadius: '10px',
                                background: surfaceBg, border: `1px solid ${borderColor}`,
                                display: 'grid', gridTemplateColumns: '1fr 180px', gap: 2, alignItems: 'center'
                            }}>
                                <Box>
                                    <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
                                        Avaliação de Risco
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {[
                                            { label: 'Afeta produção?', value: riskAssessment.affectsProduction },
                                            { label: 'Causa downtime?', value: riskAssessment.hasDowntime },
                                            { label: 'Testado em homologação?', value: riskAssessment.tested },
                                            { label: 'Rollback fácil?', value: riskAssessment.easyRollback },
                                        ].map((item, i) => (
                                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <span style={{ color: textSecondary }}>{item.label}</span>
                                                <Chip
                                                    label={item.value ? 'Sim' : 'Não'}
                                                    size="small"
                                                    sx={{
                                                        height: 20, fontSize: '11px', fontWeight: 600,
                                                        bgcolor: item.value ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                        color: item.value ? '#10b981' : '#ef4444'
                                                    }}
                                                />
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <RiskGauge riskLevel={riskLevel} riskScore={riskScore} />
                                </Box>
                            </Box>

                            {/* Assets */}
                            {change.assets?.length > 0 && (
                                <Box sx={{ gridColumn: '1 / -1' }}>
                                    <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
                                        Ativos / Sistemas Afetados
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {change.assets.map(asset => (
                                            <Chip key={asset.id} label={`${asset.name} (${asset.code})`} size="small"
                                                sx={{ bgcolor: 'rgba(37,99,235,0.1)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)' }} />
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {/* Project Link */}
                            {change.project && (
                                <DataField label="Projeto Vinculado" value={`${change.project.name} (${change.project.code})`} icon="📂" fullWidth />
                            )}

                            {/* Related Incidents */}
                            {change.relatedIncidents?.length > 0 && (
                                <Box sx={{ gridColumn: '1 / -1' }}>
                                    <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
                                        ⚠️ Incidentes Relacionados
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {change.relatedIncidents.map(inc => (
                                            <Chip key={inc.id} label={`${inc.code || 'INC'} — ${inc.title}`} size="small"
                                                sx={{ bgcolor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }} />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* TAB: Plano */}
                    {activeTab === 'plano' && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                            <DataField label="Início Agendado" value={formatDate(change.scheduledStart)} icon="🕐" />
                            <DataField label="Fim Agendado" value={formatDate(change.scheduledEnd)} icon="🕐" />
                            <DataField label="Justificativa" value={change.justification} icon="📋" fullWidth />
                            <DataField label="Pré-requisitos" value={change.prerequisites} icon="✅" fullWidth />
                            <DataField label="Plano de Testes" value={change.testPlan} icon="🧪" fullWidth />
                            <DataField label="Plano de Rollback" value={change.backoutPlan} icon="↩️" fullWidth />

                            {/* Attachments */}
                            {attachments.length > 0 && (
                                <Box sx={{ gridColumn: '1 / -1' }}>
                                    <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5 }}>
                                        Anexos ({attachments.length})
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {attachments.map(att => (
                                            <Box key={att.id} sx={{
                                                p: 1.5, borderRadius: '8px', background: surfaceBg, border: `1px solid ${borderColor}`,
                                                display: 'flex', alignItems: 'center', gap: 1.5
                                            }}>
                                                <AttachFile sx={{ fontSize: 18, color: textMuted }} />
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: '13px', fontWeight: 500, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {att.originalName || att.filename}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '11px', color: textMuted }}>
                                                        {formatShortDate(att.createdAt)}
                                                    </Typography>
                                                </Box>
                                                <Button
                                                    size="small"
                                                    href={getFileURL(att.path || att.url)}
                                                    target="_blank"
                                                    sx={{ fontSize: '11px', textTransform: 'none', color: '#2563eb', minWidth: 'auto' }}
                                                >
                                                    Baixar
                                                </Button>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* TAB: Aprovações */}
                    {activeTab === 'aprovacao' && (
                        <Box>
                            {approvers.length > 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {approvers.map((app) => (
                                        <Box key={app.id} sx={{
                                            p: 2, borderRadius: '10px', background: surfaceBg,
                                            border: `1px solid ${borderColor}`,
                                            display: 'flex', alignItems: 'center', gap: 2
                                        }}>
                                            <Avatar sx={{
                                                width: 40, height: 40, fontSize: '14px', fontWeight: 600,
                                                bgcolor: app.status === 'APPROVED' ? 'rgba(16,185,129,0.15)' :
                                                    app.status === 'REJECTED' ? 'rgba(239,68,68,0.15)' : 'rgba(37,99,235,0.15)',
                                                color: app.status === 'APPROVED' ? '#10b981' :
                                                    app.status === 'REJECTED' ? '#ef4444' : '#2563eb'
                                            }}>
                                                {app.user?.name?.charAt(0) || 'U'}
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary }}>
                                                    {app.user?.name || 'Usuário'}
                                                </Typography>
                                                <Typography sx={{ fontSize: '12px', color: textMuted }}>
                                                    {app.role || 'Aprovador'} • {app.user?.email || ''}
                                                </Typography>
                                                {app.comment && (
                                                    <Typography sx={{ fontSize: '12px', color: textSecondary, mt: 0.5, fontStyle: 'italic' }}>
                                                        "{app.comment}"
                                                    </Typography>
                                                )}
                                            </Box>
                                            <StatusChip status={app.status} type="CHANGE_APPROVER" />
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 6, color: textMuted }}>
                                    <Typography sx={{ fontSize: '14px' }}>Nenhum aprovador atribuído</Typography>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* TAB: Execução */}
                    {activeTab === 'execucao' && showExecution && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                            <DataField label="Início Real" value={formatDate(change.actualStart)} icon="▶️" />
                            <DataField label="Fim Real" value={formatDate(change.actualEnd)} icon="⏹️" />

                            {(change.actualStart || change.actualEnd) && (
                                <Box sx={{ gridColumn: '1 / -1', p: 2, borderRadius: '10px', background: surfaceBg, border: `1px solid ${borderColor}` }}>
                                    <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 2 }}>
                                        Variação Planejado vs Real
                                    </Typography>
                                    <ExecutionTimeline
                                        scheduledStart={change.scheduledStart}
                                        scheduledEnd={change.scheduledEnd}
                                        actualStart={change.actualStart}
                                        actualEnd={change.actualEnd}
                                        status={change.status}
                                    />
                                </Box>
                            )}

                            <DataField label="Notas de Fechamento" value={change.closureNotes} icon="📝" fullWidth />

                            {/* PIR Section */}
                            {change.rootCause && (
                                <>
                                    <DataField label="Causa Raiz" value={change.rootCause} icon="🔍" fullWidth />
                                    <DataField label="Ação Corretiva" value={change.correctiveAction} icon="🔧" fullWidth />
                                    <DataField label="Lições Aprendidas" value={change.lessonsLearned} icon="💡" fullWidth />
                                </>
                            )}
                        </Box>
                    )}
                </Box>

                {/* Footer */}
                <Box sx={{
                    p: 2, px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderTop: `1px solid ${borderColor}`, background: surfaceBg
                }}>
                    <Typography sx={{ fontSize: '11px', color: textMuted }}>
                        Criado em {formatDate(change.createdAt)} • Atualizado em {formatDate(change.updatedAt)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button onClick={onClose} sx={{
                            color: textSecondary, textTransform: 'none', fontWeight: 600, fontSize: '13px',
                            border: `1px solid ${borderColor}`, borderRadius: '8px', px: 3
                        }}>
                            Fechar
                        </Button>
                        {onEdit && (
                            <Button onClick={() => onEdit(change)} sx={{
                                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                color: '#fff', textTransform: 'none', fontWeight: 600, fontSize: '13px',
                                borderRadius: '8px', px: 3,
                                '&:hover': { boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }
                            }}
                                startIcon={<Edit sx={{ fontSize: '16px !important' }} />}
                            >
                                Editar
                            </Button>
                        )}
                    </Box>
                </Box>
            </div>
        </Dialog>
    );
};

export default ChangeViewModal;
