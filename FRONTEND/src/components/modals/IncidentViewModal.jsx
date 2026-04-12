import { useState, useEffect, useContext } from 'react';
import { Dialog, Box, Typography, Chip, IconButton, Avatar, Divider, Button, List, ListItem, ListItemText, ListItemAvatar, Alert } from '@mui/material';
import { Close, Edit } from '@mui/icons-material';
import { ThemeContext } from '../../contexts/ThemeContext';
import StatusChip from '../common/StatusChip';
import { getIncidentById } from '../../services/incident.service';

const PRIORITY_COLORS = { P1: '#ef4444', P2: '#f59e0b', P3: '#3b82f6', P4: '#10b981' };
const PRIORITY_LABELS = { P1: 'Crítica', P2: 'Alta', P3: 'Média', P4: 'Baixa' };
const IMPACT_LABELS = { BAIXO: 'Baixo', MEDIO: 'Médio', ALTO: 'Alto', CRITICO: 'Crítico' };
const URGENCY_LABELS = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', CRITICA: 'Crítica' };

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const IncidentViewModal = ({ open, onClose, incident, onEdit }) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const [activeTab, setActiveTab] = useState('geral');
    const [fullIncident, setFullIncident] = useState(null);

    const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';
    const textMuted = isDark ? '#64748b' : '#94a3b8';
    const surfaceBg = isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

    useEffect(() => {
        if (open && incident?.id) {
            getIncidentById(incident.id).then(setFullIncident).catch(() => setFullIncident(incident));
            setActiveTab('geral');
        }
    }, [open, incident?.id]);

    if (!open || !incident) return null;

    const data = fullIncident || incident;
    const priorityColor = PRIORITY_COLORS[data.priority] || '#f59e0b';

    const tabs = [
        { key: 'geral', label: 'Geral', icon: '📋' },
        { key: 'diagnostico', label: 'Diagnóstico', icon: '🔍' },
        { key: 'historico', label: 'Histórico', icon: '📅' },
        { key: 'comentarios', label: 'Comentários', icon: '💬', count: data.comments?.length },
    ];

    const DataField = ({ label, value, icon, fullWidth = false }) => (
        <Box sx={{ p: 2, borderRadius: '10px', background: surfaceBg, border: `1px solid ${borderColor}`, gridColumn: fullWidth ? '1 / -1' : 'auto', minHeight: 60, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {icon && <span style={{ fontSize: '13px' }}>{icon}</span>}{label}
            </Typography>
            <Typography sx={{ fontSize: '14px', color: textPrimary, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {value || '—'}
            </Typography>
        </Box>
    );

    return (
        <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth
            PaperProps={{ sx: { background: isDark ? '#0f172a' : '#ffffff', borderRadius: '12px', border: `1px solid ${borderColor}`, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', color: textPrimary, maxHeight: '90vh', display: 'flex', flexDirection: 'column' } }}
            BackdropProps={{ sx: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.7)' } }}
        >
            <Box sx={{ p: 3, pb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
                        <Box sx={{ width: 44, height: 44, borderRadius: '10px', background: priorityColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⚠️</Box>
                        <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '15px', color: textMuted }}>{data.code}</Typography>
                                <StatusChip status={data.status} type="INCIDENT" />
                                {data.priority && <Chip label={PRIORITY_LABELS[data.priority] || data.priority} size="small" sx={{ height: 22, fontSize: '11px', bgcolor: `${priorityColor}20`, color: priorityColor, fontWeight: 600 }} />}
                                {data.slaBreached && <Chip label="SLA Estourado" size="small" sx={{ height: 22, fontSize: '11px', bgcolor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 600 }} />}
                            </Box>
                            <Typography sx={{ fontSize: '15px', color: textPrimary, mt: 0.5, fontWeight: 500 }}>{data.title}</Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={onClose} size="small" sx={{ color: textMuted }}><Close /></IconButton>
                </Box>
            </Box>

            {/* Tabs */}
            <Box sx={{ display: 'flex', gap: 0.5, px: 3, borderBottom: `1px solid ${borderColor}` }}>
                {tabs.map(tab => (
                    <Box key={tab.key} onClick={() => setActiveTab(tab.key)}
                        sx={{ px: 2, py: 1.5, cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: activeTab === tab.key ? '#2563eb' : textSecondary, borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 0.75, '&:hover': { color: textPrimary } }}>
                        <span style={{ fontSize: '13px' }}>{tab.icon}</span>
                        {tab.label}
                        {tab.count > 0 && <Chip label={tab.count} size="small" sx={{ height: 18, fontSize: '10px', bgcolor: 'rgba(37,99,235,0.15)', color: '#2563eb' }} />}
                    </Box>
                ))}
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                {/* GERAL */}
                {activeTab === 'geral' && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                        <DataField label="Impacto" value={IMPACT_LABELS[data.impact] || data.impact} icon="💥" />
                        <DataField label="Urgência" value={URGENCY_LABELS[data.urgency] || data.urgency} icon="⚡" />
                        <DataField label="Categoria" value={data.category?.name || '—'} icon="📂" />
                        <DataField label="Responsável" value={data.assignee?.name || 'Não atribuído'} icon="👤" />
                        <DataField label="Solicitante" value={data.requester?.name || '—'} icon="🙋" />
                        <DataField label="Criado em" value={formatDate(data.createdAt)} icon="🕐" />
                        <DataField label="Descrição" value={data.description} icon="📝" fullWidth />
                        {data.relatedChange && (
                            <Box sx={{ gridColumn: '1 / -1', p: 2, borderRadius: '10px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)' }}>
                                <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', mb: 1 }}>GMUD Relacionada</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography sx={{ color: '#818cf8', fontWeight: 600, fontSize: '14px' }}>{data.relatedChange.code}</Typography>
                                    <Typography sx={{ color: textSecondary, fontSize: '13px' }}>{data.relatedChange.title}</Typography>
                                    <StatusChip status={data.relatedChange.status} />
                                </Box>
                            </Box>
                        )}
                        {data.relatedAsset && (
                            <Box sx={{ gridColumn: '1 / -1', p: 2, borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', mb: 1 }}>Ativo Relacionado</Typography>
                                <Typography sx={{ color: '#10b981', fontWeight: 600, fontSize: '14px' }}>{data.relatedAsset.tag || data.relatedAsset.name}</Typography>
                                <Typography sx={{ color: textSecondary, fontSize: '13px' }}>{data.relatedAsset.name}</Typography>
                            </Box>
                        )}
                    </Box>
                )}

                {/* DIAGNÓSTICO */}
                {activeTab === 'diagnostico' && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                        <DataField label="Solução Aplicada" value={data.solution} icon="✅" fullWidth />
                        <DataField label="Causa Raiz" value={data.rootCause} icon="🔍" fullWidth />
                        <DataField label="Workaround (Contorno)" value={data.workaround} icon="🔀" fullWidth />
                        {data.resolvedAt && <DataField label="Resolvido em" value={formatDate(data.resolvedAt)} icon="✅" />}
                        {data.closedAt && <DataField label="Fechado em" value={formatDate(data.closedAt)} icon="🔒" />}
                    </Box>
                )}

                {/* HISTÓRICO */}
                {activeTab === 'historico' && (
                    <Box>
                        <Typography sx={{ color: textSecondary, mb: 2, fontSize: '13px' }}>Timeline de eventos do incidente</Typography>
                        {(data.history || []).length > 0 ? (
                            <List sx={{ bgcolor: surfaceBg, borderRadius: 2, border: `1px solid ${borderColor}`, p: 0 }}>
                                {data.history.map((h, idx) => (
                                    <Box key={h.id}>
                                        {idx > 0 && <Divider sx={{ borderColor }} />}
                                        <ListItem>
                                            <ListItemAvatar>
                                                <Avatar sx={{ bgcolor: 'rgba(37,99,235,0.15)', color: '#818cf8', width: 32, height: 32, fontSize: '13px' }}>
                                                    {h.user?.name?.charAt(0) || '?'}
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={<span style={{ color: textPrimary, fontSize: '14px' }}>{h.action}: {h.newValue || ''}</span>}
                                                secondary={<span style={{ color: textMuted, fontSize: '12px' }}>{h.user?.name} · {formatDate(h.createdAt)}</span>}
                                            />
                                        </ListItem>
                                    </Box>
                                ))}
                            </List>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 5, color: textMuted }}><Typography>Nenhum histórico ainda.</Typography></Box>
                        )}
                    </Box>
                )}

                {/* COMENTÁRIOS */}
                {activeTab === 'comentarios' && (
                    <Box>
                        {(data.comments || []).length > 0 ? (
                            <List>
                                {data.comments.map((c) => (
                                    <ListItem key={c.id} sx={{ bgcolor: c.isInternal ? 'rgba(245,158,11,0.08)' : surfaceBg, border: `1px solid ${borderColor}`, borderRadius: '10px', mb: 1.5 }}>
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: '#2563eb', width: 32, height: 32, fontSize: '13px' }}>{c.user?.name?.charAt(0)}</Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={<span style={{ color: textPrimary, fontSize: '14px' }}>{c.content}</span>}
                                            secondary={<span style={{ color: textMuted, fontSize: '12px' }}>{c.user?.name} · {formatDate(c.createdAt)}{c.isInternal ? ' · (Interno)' : ''}</span>}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 5, color: textMuted }}><Typography>Nenhum comentário ainda.</Typography></Box>
                        )}
                    </Box>
                )}
            </Box>

            {/* Footer */}
            <Box sx={{ p: 2, px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${borderColor}`, background: surfaceBg }}>
                <Typography sx={{ fontSize: '11px', color: textMuted }}>
                    Criado em {formatDate(data.createdAt)} · Atualizado em {formatDate(data.updatedAt)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button onClick={onClose} sx={{ color: textSecondary, textTransform: 'none', fontWeight: 600, fontSize: '13px', border: `1px solid ${borderColor}`, borderRadius: '8px', px: 3 }}>Fechar</Button>
                    {onEdit && (
                        <Button onClick={() => onEdit(incident)} startIcon={<Edit sx={{ fontSize: '16px !important' }} />}
                            sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: '#fff', textTransform: 'none', fontWeight: 600, fontSize: '13px', borderRadius: '8px', px: 3, '&:hover': { boxShadow: '0 4px 12px rgba(37,99,235,0.3)' } }}>
                            Editar
                        </Button>
                    )}
                </Box>
            </Box>
        </Dialog>
    );
};

export default IncidentViewModal;
