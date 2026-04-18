import { useState, useEffect, useContext, useMemo } from 'react';
import { Box, Typography, CircularProgress, LinearProgress, Tooltip, useTheme } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { getBudgetInsights } from '../../services/budget-scenario.service';
import { ThemeContext } from '../../contexts/ThemeContext';

const buildInsightsTheme = (isDark, theme) => {
    const colors = {
        cardBg: isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#ffffff',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)',
        surface: isDark ? '#1c2632' : '#f8fafc',
        textPrimary: isDark ? '#f1f5f9' : theme.palette.text.primary,
        textSecondary: isDark ? '#94a3b8' : theme.palette.text.secondary,
        textMuted: isDark ? '#64748b' : theme.palette.text.disabled,
        warn: '#f59e0b',
        success: '#10b981',
        warnSoft: 'rgba(245, 158, 11, 0.15)',
        successSoft: 'rgba(16, 185, 129, 0.15)'
    };

    return {
        colors,
        cardStyle: {
            background: colors.cardBg,
            border: colors.border,
            borderRadius: '8px',
            padding: '24px'
        }
    };
};

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);
const formatPercent = (val) => `${(val || 0).toFixed(1)}%`;

// Insight Card
const InsightCard = ({ title, value, subtitle, icon, color = '#2563eb', trend, colors }) => (
    <Box sx={{ flex: 1, minWidth: 150, p: 2.5, background: colors.surface, borderRadius: '8px', borderLeft: `4px solid ${color}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <span className="material-icons-round" style={{ fontSize: '18px', color }}>{icon}</span>
            <Typography sx={{ fontSize: '11px', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>{title}</Typography>
        </Box>
        <Typography sx={{ fontSize: '24px', fontWeight: 700, color: colors.textPrimary }}>{value}</Typography>
        {subtitle && <Typography sx={{ fontSize: '12px', color: colors.textMuted }}>{subtitle}</Typography>}
        {trend && (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px',
                padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                background: trend.value >= 0 ? colors.warnSoft : colors.successSoft,
                color: trend.value >= 0 ? colors.warn : colors.success
            }}>
                <span className="material-icons-round" style={{ fontSize: '14px' }}>{trend.value >= 0 ? 'trending_up' : 'trending_down'}</span>
                {trend.value >= 0 ? '+' : ''}{formatPercent(trend.value)}
            </span>
        )}
    </Box>
);

// Progress Bar
const ProgressBar = ({ label, value, color = '#2563eb', colors }) => (
    <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: colors.textSecondary }}>{label}</Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color }}>{formatPercent(value)}</Typography>
        </Box>
        <LinearProgress variant="determinate" value={Math.min(value, 100)} sx={{ height: 8, borderRadius: '8px', bgcolor: colors.surface, '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: '8px'} }} />
    </Box>
);

const BudgetInsightsPanel = ({ budgetId }) => {
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();
    const isDark = mode === 'dark';
    const ui = useMemo(() => buildInsightsTheme(isDark, theme), [isDark, theme]);
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try { setLoading(true); const data = await getBudgetInsights(budgetId); setInsights(data); }
            catch (error) { console.error('Erro ao buscar insights:', error); }
            finally { setLoading(false); }
        };
        fetchInsights();
    }, [budgetId]);

    if (loading) {
        return (
            <Box sx={{ ...ui.cardStyle, textAlign: 'center', py: 6 }}>
                <CircularProgress sx={{ color: '#2563eb' }} />
                <Typography sx={{ color: ui.colors.textMuted, fontSize: '14px', mt: 2 }}>Analisando orçamento...</Typography>
            </Box>
        );
    }

    if (!insights) {
        return (
            <Box sx={{ ...ui.cardStyle, py: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                    <span className="material-icons-round" style={{ color: '#f59e0b', fontSize: '24px' }}>warning</span>
                    <Typography sx={{ color: '#f59e0b', fontSize: '14px' }}>Não foi possível carregar os insights</Typography>
                </Box>
            </Box>
        );
    }

    const { summary, obzAnalysis, distribution, yearOverYear, risks, recommendations } = insights;

    const priorityColors = { ESSENCIAL: '#10b981', IMPORTANTE: '#2563eb', DESEJAVEL: '#f59e0b', SEM_CLASSIFICACAO: '#64748b' };
    const priorityData = distribution?.byPriority?.map((p, i) => ({ id: i, value: p.value, label: p.name === 'SEM_CLASSIFICACAO' ? 'Sem Classificação' : p.name, color: priorityColors[p.name] || '#64748b' })) || [];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header KPIs */}
            <Box sx={ui.cardStyle}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-icons-round" style={{ color: '#f59e0b', fontSize: '22px' }}>lightbulb</span>
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '16px', fontWeight: 600, color: ui.colors.textPrimary }}>Insights OBZ</Typography>
                        <Typography sx={{ fontSize: '12px', color: ui.colors.textMuted }}>Análise automática baseada na metodologia Base Zero</Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <InsightCard title="Total Orçado" value={formatCurrency(summary?.total)} subtitle={`${summary?.itemsCount || 0} itens`} icon="assessment" color="#2563eb" colors={ui.colors} />
                    <InsightCard title="OPEX" value={formatCurrency(summary?.totalOpex)} subtitle={formatPercent(summary?.opexPercent)} icon="trending_up" color="#06b6d4" colors={ui.colors} />
                    <InsightCard title="CAPEX" value={formatCurrency(summary?.totalCapex)} subtitle={formatPercent(summary?.capexPercent)} icon="trending_down" color="#f59e0b" colors={ui.colors} />
                    {yearOverYear?.available && (
                        <InsightCard title="vs Ano Anterior" value={formatCurrency(yearOverYear.variance)} icon={yearOverYear.variance >= 0 ? 'trending_up' : 'trending_down'} color={yearOverYear.variance >= 0 ? '#f59e0b' : '#10b981'} trend={{ value: yearOverYear.variancePercent }} colors={ui.colors} />
                    )}
                </Box>
            </Box>

            {/* OBZ Compliance */}
            <Box sx={ui.cardStyle}>
                <Typography sx={{ fontSize: '15px', fontWeight: 600, color: ui.colors.textPrimary, mb: 3 }}>Qualidade do Preenchimento OBZ</Typography>
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 250 }}>
                        <ProgressBar label="Itens com Justificativa" value={obzAnalysis?.justificationRate || 0} color={obzAnalysis?.justificationRate >= 80 ? '#10b981' : '#f59e0b'} colors={ui.colors} />
                        <ProgressBar label="Itens com Prioridade" value={obzAnalysis?.priorityRate || 0} color={obzAnalysis?.priorityRate >= 80 ? '#10b981' : '#f59e0b'} colors={ui.colors} />
                        <ProgressBar label="Compliance OBZ Geral" value={obzAnalysis?.obzCompliance || 0} color={obzAnalysis?.obzCompliance >= 80 ? '#10b981' : obzAnalysis?.obzCompliance >= 50 ? '#f59e0b' : '#f43f5e'} colors={ui.colors} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Tooltip title="Novas despesas (sem histórico)">
                            <Box sx={{ textAlign: 'center', p: 2, background: ui.colors.surface, borderRadius: '8px', minWidth: 80 }}>
                                <Typography sx={{ fontSize: '28px', fontWeight: 700, color: '#2563eb' }}>{obzAnalysis?.newExpenses || 0}</Typography>
                                <Typography sx={{ fontSize: '11px', color: ui.colors.textMuted }}>Novas</Typography>
                            </Box>
                        </Tooltip>
                        <Tooltip title="Despesas com histórico">
                            <Box sx={{ textAlign: 'center', p: 2, background: ui.colors.surface, borderRadius: '8px', minWidth: 80 }}>
                                <Typography sx={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>{obzAnalysis?.historicalExpenses || 0}</Typography>
                                <Typography sx={{ fontSize: '11px', color: ui.colors.textMuted }}>Históricas</Typography>
                            </Box>
                        </Tooltip>
                    </Box>
                </Box>
            </Box>

            {/* Priority Distribution */}
            {priorityData.length > 0 && priorityData.some(p => p.value > 0) && (
                <Box sx={ui.cardStyle}>
                    <Typography sx={{ fontSize: '15px', fontWeight: 600, color: ui.colors.textPrimary, mb: 3 }}>Distribuição por Prioridade</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Box sx={{ width: 200, height: 200 }}>
                            <PieChart series={[{ data: priorityData.filter(p => p.value > 0), innerRadius: 50, outerRadius: 80, paddingAngle: 2, cornerRadius: 4 }]} width={200} height={200} slotProps={{ legend: { hidden: true } }} />
                        </Box>
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {priorityData.filter(p => p.value > 0).map((p, i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{ width: 12, height: 12, borderRadius: '8px', bgcolor: p.color }} />
                                    <Typography sx={{ flex: 1, fontSize: '13px', color: ui.colors.textSecondary }}>{p.label}</Typography>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: ui.colors.textPrimary }}>{formatCurrency(p.value)}</Typography>
                                    <span style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600, background: p.color, color: 'white' }}>
                                        {formatPercent((p.value / summary?.total) * 100)}
                                    </span>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Box>
            )}

            {/* Risks & Recommendations */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                {risks?.length > 0 && (
                    <Box sx={ui.cardStyle}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <span className="material-icons-round" style={{ color: '#f59e0b', fontSize: '20px' }}>warning</span>
                            <Typography sx={{ fontSize: '15px', fontWeight: 600, color: ui.colors.textPrimary }}>Riscos Identificados</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {risks.map((risk, i) => (
                                <Box key={i} sx={{ p: 2, background: risk.severity === 'HIGH' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', borderLeft: risk.severity === 'HIGH' ? '3px solid #f43f5e' : '3px solid #f59e0b' }}>
                                    <Typography sx={{ fontSize: '13px', color: risk.severity === 'HIGH' ? '#f43f5e' : '#f59e0b' }}>{risk.message}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}

                {recommendations?.length > 0 && (
                    <Box sx={ui.cardStyle}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <span className="material-icons-round" style={{ color: '#06b6d4', fontSize: '20px' }}>lightbulb</span>
                            <Typography sx={{ fontSize: '15px', fontWeight: 600, color: ui.colors.textPrimary }}>Recomendações</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {recommendations.map((rec, i) => (
                                <Box key={i} sx={{ p: 2, background: ui.colors.surface, borderRadius: '8px', borderLeft: `3px solid ${rec.priority === 'HIGH' ? '#f43f5e' : rec.priority === 'MEDIUM' ? '#f59e0b' : '#06b6d4'}` }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600, background: rec.priority === 'HIGH' ? 'rgba(244, 63, 94, 0.15)' : rec.priority === 'MEDIUM' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.15)', color: rec.priority === 'HIGH' ? '#f43f5e' : rec.priority === 'MEDIUM' ? '#f59e0b' : '#06b6d4' }}>
                                            {rec.priority}
                                        </span>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: ui.colors.textPrimary }}>{rec.title}</Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: '12px', color: ui.colors.textSecondary }}>{rec.description}</Typography>
                                    {rec.action && <Typography sx={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, mt: 1 }}>→ {rec.action}</Typography>}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default BudgetInsightsPanel;



