import { useContext } from 'react';
import { Dialog, Box, Typography, Chip, IconButton, Button } from '@mui/material';
import { Close, Edit, Warning } from '@mui/icons-material';
import { ThemeContext } from '../../contexts/ThemeContext';

const CATEGORY_LABELS = {
    technical: '🔧 Técnico', schedule: '📅 Cronograma', resource: '👥 Recursos',
    financial: '💰 Financeiro', external: '🌐 Externo', security: '🔒 Segurança',
    compliance: '📋 Compliance', strategic: '🎯 Estratégico'
};

const IMPACT_CONFIG = {
    BAIXO: { label: 'Baixo', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    MEDIO: { label: 'Médio', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    ALTO: { label: 'Alto', color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' },
    CRITICO: { label: 'Crítico', color: '#dc2626', bg: 'rgba(220,38,38,0.15)' }
};

const PROB_CONFIG = {
    BAIXA: { label: 'Baixa', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    MEDIA: { label: 'Média', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    ALTA: { label: 'Alta', color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' },
    CRITICO: { label: 'Crítica', color: '#dc2626', bg: 'rgba(220,38,38,0.15)' }
};

const STATUS_CONFIG = {
    OPEN: { label: 'Em Aberto', color: '#ef4444', dot: '#ef4444' },
    MONITORING: { label: 'Monitorando', color: '#d97706', dot: '#d97706' },
    MITIGATED: { label: 'Mitigado/Controlado', color: '#16a34a', dot: '#16a34a' },
    CLOSED: { label: 'Fechado', color: '#64748b', dot: '#64748b' }
};

const RiskViewModal = ({ open, onClose, risk, onEdit }) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';

    const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
    const textMuted = isDark ? '#64748b' : '#94a3b8';
    const surfaceBg = isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
    const bg = isDark ? '#0f172a' : '#ffffff';

    if (!open || !risk) return null;

    const impact = IMPACT_CONFIG[risk.impact] || {};
    const prob = PROB_CONFIG[risk.probability] || {};
    const status = STATUS_CONFIG[risk.status] || STATUS_CONFIG.OPEN;
    const cat = CATEGORY_LABELS[risk.category] || risk.category;

    // Score numérico 1-5
    const impactScore = { BAIXO: 1, MEDIO: 2, ALTO: 3, CRITICO: 5 }[risk.impact] || 2;
    const probScore = { BAIXA: 1, MEDIA: 2, ALTA: 3, CRITICO: 5 }[risk.probability] || 2;
    const riskScore = impactScore * probScore;
    const scoreColor = riskScore >= 15 ? '#dc2626' : riskScore >= 9 ? '#f59e0b' : '#10b981';

    const Badge = ({ label, color, bg: bgColor }) => (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 2, py: 0.75, borderRadius: '20px', bgcolor: bgColor, color, fontSize: '13px', fontWeight: 700 }}>
            {label}
        </Box>
    );

    const Field = ({ label, children }) => (
        <Box sx={{ p: 2, borderRadius: '10px', bgcolor: surfaceBg, border: `1px solid ${borderColor}` }}>
            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.75 }}>{label}</Typography>
            {children}
        </Box>
    );

    return (
        <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth
            PaperProps={{ sx: { background: bg, borderRadius: '16px', border: `1px solid ${borderColor}`, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', color: textPrimary, maxHeight: '90vh', display: 'flex', flexDirection: 'column' } }}
            BackdropProps={{ sx: { backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.7)' } }}
        >
            {/* Header */}
            <Box sx={{ p: 3, borderBottom: `1px solid ${borderColor}`, background: surfaceBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(244,63,94,0.3)' }}>
                        <Warning sx={{ color: '#fff', fontSize: 24 }} />
                    </Box>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: '17px', fontWeight: 700 }}>Detalhes do Risco</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: status.dot }} />
                                <Typography sx={{ fontSize: '12px', color: status.color, fontWeight: 600 }}>{status.label}</Typography>
                            </Box>
                        </Box>
                        <Typography sx={{ fontSize: '12px', color: textMuted }}>{cat}</Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: textMuted }}><Close /></IconButton>
            </Box>

            {/* Body */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* Score banner */}
                <Box sx={{ p: 2.5, borderRadius: '12px', bgcolor: `${scoreColor}12`, border: `1px solid ${scoreColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '13px', color: textMuted, fontWeight: 600 }}>Score de Risco</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography sx={{ fontSize: '28px', fontWeight: 800, color: scoreColor }}>{riskScore}</Typography>
                        <Typography sx={{ fontSize: '12px', color: textMuted }}>de 25</Typography>
                    </Box>
                </Box>

                {/* Avaliação */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Field label="Impacto">
                        <Badge label={impact.label} color={impact.color} bg={impact.bg} />
                    </Field>
                    <Field label="Probabilidade">
                        <Badge label={prob.label} color={prob.color} bg={prob.bg} />
                    </Field>
                </Box>

                {/* Descrição */}
                <Field label="Descrição do Risco">
                    <Typography sx={{ fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {risk.description || '—'}
                    </Typography>
                </Field>

                {/* Estratégia */}
                <Box sx={{ p: 2.5, borderRadius: '12px', background: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(255,251,235,0.8)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>⚡ Estratégia de Mitigação</Typography>
                    <Typography sx={{ fontSize: '14px', lineHeight: 1.6, color: textPrimary, whiteSpace: 'pre-wrap' }}>
                        {risk.strategy || 'Nenhuma estratégia definida.'}
                    </Typography>
                </Box>
            </Box>

            {/* Footer */}
            <Box sx={{ p: 2, px: 3, display: 'flex', justifyContent: 'flex-end', gap: 1.5, borderTop: `1px solid ${borderColor}`, background: surfaceBg }}>
                <Button onClick={onClose} sx={{ color: textMuted, textTransform: 'none', fontWeight: 600, fontSize: '13px', border: `1px solid ${borderColor}`, borderRadius: '8px', px: 3 }}>
                    Fechar
                </Button>
                {onEdit && (
                    <Button onClick={() => onEdit(risk)} startIcon={<Edit sx={{ fontSize: '16px !important' }} />}
                        sx={{ background: 'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)', color: '#fff', textTransform: 'none', fontWeight: 600, fontSize: '13px', borderRadius: '8px', px: 3, '&:hover': { boxShadow: '0 4px 12px rgba(244,63,94,0.35)' } }}>
                        Editar
                    </Button>
                )}
            </Box>
        </Dialog>
    );
};

export default RiskViewModal;
