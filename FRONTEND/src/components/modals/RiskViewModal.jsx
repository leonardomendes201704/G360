import { useContext } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Edit } from '@mui/icons-material';
import { ThemeContext } from '../../contexts/ThemeContext';
import StandardModal from '../common/StandardModal';

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

const RiskViewBadge = ({ label, color, bg: bgColor }) => (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 2, py: 0.75, borderRadius: '8px', bgcolor: bgColor, color, fontSize: '13px', fontWeight: 700 }}>
        {label}
    </Box>
);

const RiskViewField = ({ label, children, surfaceBg, borderColor, textMuted }) => (
    <Box sx={{ p: 2, borderRadius: '8px', bgcolor: surfaceBg, border: `1px solid ${borderColor}` }}>
        <Typography sx={{ fontSize: '10px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.75 }}>{label}</Typography>
        {children}
    </Box>
);

const RiskViewModal = ({ open, onClose, risk, onEdit }) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';

    const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
    const textMuted = isDark ? '#64748b' : '#94a3b8';
    const surfaceBg = isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

    if (!open || !risk) return null;

    const impact = IMPACT_CONFIG[risk.impact] || {};
    const prob = PROB_CONFIG[risk.probability] || {};
    const status = STATUS_CONFIG[risk.status] || STATUS_CONFIG.OPEN;
    const cat = CATEGORY_LABELS[risk.category] || risk.category;

    const impactScore = { BAIXO: 1, MEDIO: 2, ALTO: 3, CRITICO: 5 }[risk.impact] || 2;
    const probScore = { BAIXA: 1, MEDIA: 2, ALTA: 3, CRITICO: 5 }[risk.probability] || 2;
    const riskScore = impactScore * probScore;
    const scoreColor = riskScore >= 15 ? '#dc2626' : riskScore >= 9 ? '#f59e0b' : '#10b981';

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title="Detalhes do Risco"
            subtitle={`${cat} · ${status.label}`}
            icon="warning"
            size="detail"
            footer={
                <>
                    <Button variant="outlined" onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
                        Fechar
                    </Button>
                    {onEdit && (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => onEdit(risk)}
                            startIcon={<Edit sx={{ fontSize: 16 }} />}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            Editar
                        </Button>
                    )}
                </>
            }
            contentSx={{ pt: 2 }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ p: 2.5, borderRadius: '8px', bgcolor: `${scoreColor}12`, border: `1px solid ${scoreColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '13px', color: textMuted, fontWeight: 600 }}>Score de Risco</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography sx={{ fontSize: '28px', fontWeight: 800, color: scoreColor }}>{riskScore}</Typography>
                        <Typography sx={{ fontSize: '12px', color: textMuted }}>de 25</Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <RiskViewField label="Impacto" surfaceBg={surfaceBg} borderColor={borderColor} textMuted={textMuted}>
                        <RiskViewBadge label={impact.label} color={impact.color} bg={impact.bg} />
                    </RiskViewField>
                    <RiskViewField label="Probabilidade" surfaceBg={surfaceBg} borderColor={borderColor} textMuted={textMuted}>
                        <RiskViewBadge label={prob.label} color={prob.color} bg={prob.bg} />
                    </RiskViewField>
                </Box>

                <RiskViewField label="Descrição do Risco" surfaceBg={surfaceBg} borderColor={borderColor} textMuted={textMuted}>
                    <Typography sx={{ fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: textPrimary }}>
                        {risk.description || '—'}
                    </Typography>
                </RiskViewField>

                <Box sx={{ p: 2.5, borderRadius: '8px', background: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(255,251,235,0.8)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>⚡ Estratégia de Mitigação</Typography>
                    <Typography sx={{ fontSize: '14px', lineHeight: 1.6, color: textPrimary, whiteSpace: 'pre-wrap' }}>
                        {risk.strategy || 'Nenhuma estratégia definida.'}
                    </Typography>
                </Box>
            </Box>
        </StandardModal>
    );
};

export default RiskViewModal;
