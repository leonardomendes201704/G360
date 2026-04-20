import { useState, useEffect, useContext } from 'react';
import { Box, Typography, Chip, Avatar, Button } from '@mui/material';
import { AttachFile } from '@mui/icons-material';
import { ThemeContext } from '../../contexts/ThemeContext';
import StatusChip from '../common/StatusChip';
import ChangeLifecycle from './ChangeLifecycle';
import RiskGauge from './RiskGauge';
import ExecutionTimeline from './ExecutionTimeline';
import { getAttachments } from '../../services/change-request.service';
import { getFileURL } from '../../utils/urlUtils';
import '../modals/ChangeModal.css';

const TYPE_LABELS = { NORMAL: 'Normal', PADRAO: 'Padrão', EMERGENCIAL: 'Emergencial' };
const IMPACT_LABELS = { MENOR: 'Menor', SIGNIFICATIVO: 'Significativo', MAIOR: 'Maior' };

export function formatChangeViewDate(dateStr) {
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

function ChangeViewDataField({ label, value, icon, fullWidth = false, surfaceBg, borderColor, textMuted, textPrimary }) {
    return (
        <Box sx={{
            p: 2, borderRadius: '8px', background: surfaceBg, border: `1px solid ${borderColor}`,
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
}

/**
 * Corpo da visualização read-only de uma GMUD (tabs, grids, anexos).
 * @param {'modal'|'page'} variant — modal usa altura máxima; page preenche o espaço disponível
 */
const ChangeRequestViewContent = ({
    change,
    initialTab = 'geral',
    variant = 'page',
}) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [attachments, setAttachments] = useState([]);

    const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';
    const textMuted = isDark ? '#64748b' : '#94a3b8';
    const surfaceBg = isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

    useEffect(() => {
        if (!change?.id) return;
        setActiveTab(initialTab || 'geral');
        getAttachments(change.id).then(setAttachments).catch(() => setAttachments([]));
    }, [change?.id, initialTab]);

    if (!change) return null;

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

    const df = (props) => <ChangeViewDataField {...props} surfaceBg={surfaceBg} borderColor={borderColor} textMuted={textMuted} textPrimary={textPrimary} />;

    const innerStyle = variant === 'modal'
        ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, maxHeight: 'min(78dvh, 820px)' }
        : { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 };

    return (
        <div className="change-modal-inner" style={innerStyle}>
            <Box sx={{ px: 3, pt: variant === 'page' ? 2 : 1.5, pb: 1.5, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
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
            </Box>

            <ChangeLifecycle
                status={change.status}
                createdAt={change.createdAt}
                updatedAt={change.updatedAt}
            />

            <Box sx={{ display: 'flex', gap: 0.5, px: 3, borderBottom: `1px solid ${borderColor}`, flexShrink: 0 }}>
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

            <Box sx={{ flex: 1, overflow: 'auto', p: 3, minHeight: 0 }}>

                {activeTab === 'geral' && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                        {df({ label: 'Tipo', value: TYPE_LABELS[change.type] || change.type, icon: '📦' })}
                        {df({ label: 'Impacto', value: IMPACT_LABELS[change.impact] || change.impact, icon: '💥' })}
                        {df({ label: 'Solicitante', value: change.requester?.name || '—', icon: '👤' })}
                        {df({ label: 'Descrição', value: change.description, fullWidth: true, icon: '📝' })}

                        <Box sx={{
                            gridColumn: '1 / -1', p: 2, borderRadius: '8px',
                            background: surfaceBg, border: `1px solid ${borderColor}`,
                            display: 'grid', gridTemplateColumns: '1fr 180px', gap: 2, alignItems: 'center'
                        }}>
                            <Box>
                                <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
                                    Avaliação de risco
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

                        {change.assets?.length > 0 && (
                            <Box sx={{ gridColumn: '1 / -1' }}>
                                <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
                                    Ativos / sistemas afetados
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {change.assets.map(asset => (
                                        <Chip key={asset.id} label={`${asset.name} (${asset.code})`} size="small"
                                            sx={{ bgcolor: 'rgba(37,99,235,0.1)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)' }} />
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {change.project && (
                            df({ label: 'Projeto vinculado', value: `${change.project.name} (${change.project.code})`, icon: '📂', fullWidth: true })
                        )}

                        {change.relatedIncidents?.length > 0 && (
                            <Box sx={{ gridColumn: '1 / -1' }}>
                                <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
                                    Incidentes relacionados
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

                {activeTab === 'plano' && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                        {df({ label: 'Início agendado', value: formatChangeViewDate(change.scheduledStart), icon: '🕐' })}
                        {df({ label: 'Fim agendado', value: formatChangeViewDate(change.scheduledEnd), icon: '🕐' })}
                        {df({ label: 'Justificativa', value: change.justification, icon: '📋', fullWidth: true })}
                        {df({ label: 'Pré-requisitos', value: change.prerequisites, icon: '✅', fullWidth: true })}
                        {df({ label: 'Plano de testes', value: change.testPlan, icon: '🧪', fullWidth: true })}
                        {df({ label: 'Plano de rollback', value: change.backoutPlan, icon: '↩️', fullWidth: true })}

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

                {activeTab === 'aprovacao' && (
                    <Box>
                        {approvers.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {approvers.map((app) => (
                                    <Box key={app.id} sx={{
                                        p: 2, borderRadius: '8px', background: surfaceBg,
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
                                                    &quot;{app.comment}&quot;
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

                {activeTab === 'execucao' && showExecution && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                        {df({ label: 'Início real', value: formatChangeViewDate(change.actualStart), icon: '▶️' })}
                        {df({ label: 'Fim real', value: formatChangeViewDate(change.actualEnd), icon: '⏹️' })}

                        {(change.actualStart || change.actualEnd) && (
                            <Box sx={{ gridColumn: '1 / -1', p: 2, borderRadius: '8px', background: surfaceBg, border: `1px solid ${borderColor}` }}>
                                <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 2 }}>
                                    Variação planejado vs real
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

                        {df({ label: 'Notas de fechamento', value: change.closureNotes, icon: '📝', fullWidth: true })}

                        {change.rootCause && (
                            <>
                                {df({ label: 'Causa raiz', value: change.rootCause, icon: '🔍', fullWidth: true })}
                                {df({ label: 'Ação corretiva', value: change.correctiveAction, icon: '🔧', fullWidth: true })}
                                {df({ label: 'Lições aprendidas', value: change.lessonsLearned, icon: '💡', fullWidth: true })}
                            </>
                        )}
                    </Box>
                )}
            </Box>
        </div>
    );
};

export default ChangeRequestViewContent;
