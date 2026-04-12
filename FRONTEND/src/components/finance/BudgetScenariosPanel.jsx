import { useState, useEffect, useContext, useMemo } from 'react';
import { Box, Button, IconButton, Typography, Slider, CircularProgress, Tooltip, useTheme } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import {
    getScenariosByBudget, createScenarioFromMultiplier, compareScenarios, getScenarioImpact, selectScenario, deleteScenario
} from '../../services/budget-scenario.service';
import { ThemeContext } from '../../contexts/ThemeContext';

const buildScenarioTheme = (isDark, theme) => {
    const colors = {
        cardBg: isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#ffffff',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)',
        borderSubtle: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        surface: isDark ? '#1c2632' : '#f8fafc',
        textPrimary: isDark ? '#f1f5f9' : theme.palette.text.primary,
        textSecondary: isDark ? '#94a3b8' : theme.palette.text.secondary,
        textMuted: isDark ? '#64748b' : theme.palette.text.disabled
    };

    const inputStyle = {
        background: colors.surface,
        border: colors.border,
        borderRadius: '12px',
        padding: '12px 16px',
        color: colors.textPrimary,
        fontSize: '14px',
        width: '100%',
        outline: 'none'
    };

    return {
        colors,
        cardStyle: {
            background: colors.cardBg,
            border: colors.border,
            borderRadius: '16px',
            padding: '24px'
        },
        inputStyle,
        selectStyle: {
            ...inputStyle,
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center'
        }
    };
};

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);
const formatPercent = (val) => `${(val || 0).toFixed(1)}%`;

// Create Scenario Modal
const CreateScenarioModal = ({ open, onClose, budgetId, onCreated, ui }) => {
    const [name, setName] = useState('');
    const [multiplier, setMultiplier] = useState(100);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            await createScenarioFromMultiplier(budgetId, name, multiplier / 100, description);
            onCreated();
            onClose();
            setName(''); setMultiplier(100); setDescription('');
        } catch (error) { console.error('Erro ao criar cenário:', error); }
        finally { setLoading(false); }
    };

    const isReduction = multiplier < 100;
    const changePercent = multiplier - 100;

    if (!open) return null;

    return (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }} onClick={onClose}>
            <Box sx={{ ...ui.cardStyle, maxWidth: 500, width: '90%' }} onClick={(e) => e.stopPropagation()}>
                <Typography sx={{ fontSize: '18px', fontWeight: 600, color: ui.colors.textPrimary, mb: 3 }}>Criar Novo Cenário</Typography>

                <Box sx={{ mb: 3 }}>
                    <label style={{ fontSize: '11px', color: ui.colors.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Nome do Cenário</label>
                    <input style={ui.inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Cenário Conservador" />
                </Box>

                <Box sx={{ mb: 3 }}>
                    <label style={{ fontSize: '11px', color: ui.colors.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Ajuste do Orçamento</label>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Slider value={multiplier} onChange={(e, val) => setMultiplier(val)} min={50} max={150} step={5} sx={{ flex: 1, color: isReduction ? '#10b981' : '#f59e0b' }} />
                        <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, background: isReduction ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: isReduction ? '#10b981' : '#f59e0b' }}>
                            {changePercent > 0 ? '+' : ''}{changePercent}%
                        </span>
                    </Box>
                    <Typography sx={{ fontSize: '12px', color: ui.colors.textMuted, mt: 1 }}>
                        {isReduction ? `Redução de ${Math.abs(changePercent)}% em todos os itens` : changePercent > 0 ? `Aumento de ${changePercent}% em todos os itens` : 'Sem alteração nos valores'}
                    </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                    <label style={{ fontSize: '11px', color: ui.colors.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Descrição (opcional)</label>
                    <textarea style={{ ...ui.inputStyle, minHeight: '60px', resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o objetivo deste cenário..." />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button onClick={onClose} sx={{ color: ui.colors.textSecondary }}>Cancelar</Button>
                    <Button onClick={handleCreate} disabled={!name.trim() || loading} sx={{
                        padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white',
                        '&:disabled': { opacity: 0.5 }
                    }}>
                        {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Criar Cenário'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

// Scenario Card
const ScenarioCard = ({ scenario, onSelect, onDelete, onViewImpact, isSelected, ui }) => {
    const multiplierPercent = (Number(scenario.multiplier) - 1) * 100;
    const isReduction = multiplierPercent < 0;

    return (
        <Box sx={{ ...ui.cardStyle, p: 2, border: isSelected ? '2px solid #10b981' : ui.colors.border }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                    <Typography sx={{ fontSize: '15px', fontWeight: 600, color: ui.colors.textPrimary }}>{scenario.name}</Typography>
                    <Typography sx={{ fontSize: '12px', color: ui.colors.textMuted }}>{scenario.description || 'Sem descrição'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {isSelected && <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>✓ Selecionado</span>}
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: isReduction ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: isReduction ? '#10b981' : '#f59e0b' }}>
                        {multiplierPercent > 0 ? '+' : ''}{multiplierPercent.toFixed(0)}%
                    </span>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                <Box>
                    <Typography sx={{ fontSize: '11px', color: ui.colors.textMuted }}>OPEX</Typography>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#2563eb' }}>{formatCurrency(scenario.totalOpex)}</Typography>
                </Box>
                <Box>
                    <Typography sx={{ fontSize: '11px', color: ui.colors.textMuted }}>CAPEX</Typography>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#06b6d4' }}>{formatCurrency(scenario.totalCapex)}</Typography>
                </Box>
                <Box>
                    <Typography sx={{ fontSize: '11px', color: ui.colors.textMuted }}>TOTAL</Typography>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: ui.colors.textPrimary }}>{formatCurrency(Number(scenario.totalOpex) + Number(scenario.totalCapex))}</Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
                <button onClick={() => onViewImpact(scenario)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: ui.colors.surface, color: ui.colors.textSecondary, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-icons-round" style={{ fontSize: '14px' }}>analytics</span> Análise
                </button>
                {!isSelected && (
                    <button onClick={() => onSelect(scenario.id)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-icons-round" style={{ fontSize: '14px' }}>check</span> Selecionar
                    </button>
                )}
                <Tooltip title="Excluir cenário">
                    <IconButton size="small" onClick={() => onDelete(scenario.id)} sx={{ color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', '&:hover': { background: 'rgba(244, 63, 94, 0.2)' } }}>
                        <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
};

// Impact Analysis Modal
const ImpactAnalysisModal = ({ open, onClose, scenario, ui }) => {
    const [impact, setImpact] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && scenario) {
            setLoading(true);
            getScenarioImpact(scenario.id).then(data => setImpact(data)).catch(console.error).finally(() => setLoading(false));
        }
    }, [open, scenario]);

    if (!open || !scenario) return null;

    return (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }} onClick={onClose}>
            <Box sx={{ ...ui.cardStyle, maxWidth: 700, width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                <Typography sx={{ fontSize: '18px', fontWeight: 600, color: ui.colors.textPrimary, mb: 3 }}>Análise de Impacto: {scenario.name}</Typography>

                {loading ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress sx={{ color: '#2563eb' }} /></Box>
                ) : impact ? (
                    <>
                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3 }}>
                            <Box sx={{ flex: 1, minWidth: '120px', p: 2, background: ui.colors.surface, borderRadius: '12px' }}>
                                <Typography sx={{ fontSize: '11px', color: ui.colors.textMuted }}>Original</Typography>
                                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: ui.colors.textPrimary }}>{formatCurrency(impact.summary?.originalTotal)}</Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: '120px', p: 2, background: ui.colors.surface, borderRadius: '12px' }}>
                                <Typography sx={{ fontSize: '11px', color: ui.colors.textMuted }}>Cenário</Typography>
                                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: ui.colors.textPrimary }}>{formatCurrency(impact.summary?.scenarioTotal)}</Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: '120px', p: 2, background: impact.summary?.savingsOrExcess > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', borderRadius: '12px' }}>
                                <Typography sx={{ fontSize: '11px', color: ui.colors.textMuted }}>{impact.summary?.savingsOrExcess > 0 ? 'Economia' : 'Aumento'}</Typography>
                                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: impact.summary?.savingsOrExcess > 0 ? '#10b981' : '#f43f5e' }}>{formatCurrency(Math.abs(impact.summary?.savingsOrExcess))}</Typography>
                            </Box>
                        </Box>
                        <Button onClick={onClose} sx={{ float: 'right', color: ui.colors.textSecondary }}>Fechar</Button>
                    </>
                ) : <Typography sx={{ color: ui.colors.textMuted }}>Erro ao carregar análise</Typography>}
            </Box>
        </Box>
    );
};

// Comparison Modal
const ComparisonModal = ({ open, onClose, scenarios, ui }) => {
    const [scenario1Id, setScenario1Id] = useState('');
    const [scenario2Id, setScenario2Id] = useState('');
    const [comparison, setComparison] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('summary');

    const handleCompare = async () => {
        if (!scenario1Id || !scenario2Id || scenario1Id === scenario2Id) return;
        setLoading(true);
        try {
            const data = await compareScenarios(scenario1Id, scenario2Id);
            setComparison(data);
        } catch (error) { console.error('Erro ao comparar:', error); }
        finally { setLoading(false); }
    };

    if (!open) return null;

    const tabs = [
        { id: 'summary', label: 'Resumo', icon: 'dashboard' },
        { id: 'accounts', label: 'Por Conta', icon: 'account_balance' },
        { id: 'suppliers', label: 'Por Fornecedor', icon: 'business' }
    ];

    return (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }} onClick={onClose}>
            <Box sx={{ ...ui.cardStyle, maxWidth: 900, width: '95%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography sx={{ fontSize: '18px', fontWeight: 600, color: ui.colors.textPrimary }}>Comparar Cenários</Typography>
                    <IconButton onClick={onClose} sx={{ color: ui.colors.textMuted }}><span className="material-icons-round">close</span></IconButton>
                </Box>

                {/* Scenario Selection */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 2, alignItems: 'center', mb: 3 }}>
                    <Box>
                        <label style={{ fontSize: '11px', color: ui.colors.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Cenário 1</label>
                        <select style={ui.selectStyle} value={scenario1Id} onChange={(e) => setScenario1Id(e.target.value)}>
                            <option value="" style={{ background: ui.colors.surface }}>Selecione...</option>
                            {scenarios.map(s => <option key={s.id} value={s.id} style={{ background: ui.colors.surface }}>{s.name}</option>)}
                        </select>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', pt: 3 }}>
                        <span className="material-icons-round" style={{ color: '#2563eb', fontSize: '28px' }}>sync_alt</span>
                    </Box>
                    <Box>
                        <label style={{ fontSize: '11px', color: ui.colors.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Cenário 2</label>
                        <select style={ui.selectStyle} value={scenario2Id} onChange={(e) => setScenario2Id(e.target.value)}>
                            <option value="" style={{ background: ui.colors.surface }}>Selecione...</option>
                            {scenarios.map(s => <option key={s.id} value={s.id} style={{ background: ui.colors.surface }}>{s.name}</option>)}
                        </select>
                    </Box>
                </Box>

                <Button onClick={handleCompare} disabled={!scenario1Id || !scenario2Id || scenario1Id === scenario2Id || loading} sx={{
                    mb: 3, padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white', '&:disabled': { opacity: 0.5 }
                }}>
                    {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Comparar'}
                </Button>

                {comparison && (
                    <>
                        {/* Tabs */}
                        <Box sx={{ display: 'flex', gap: 1, mb: 2, borderBottom: `1px solid ${ui.colors.borderSubtle}`, pb: 2 }}>
                            {tabs.map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                                    background: activeTab === tab.id ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                                    color: activeTab === tab.id ? '#2563eb' : ui.colors.textMuted,
                                    fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                }}>
                                    <span className="material-icons-round" style={{ fontSize: '16px' }}>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </Box>

                        {/* Content */}
                        <Box sx={{ flex: 1, overflowY: 'auto' }}>
                            {activeTab === 'summary' && (
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                                    <Box sx={{ p: 2, background: ui.colors.surface, borderRadius: '12px' }}>
                                        <Typography sx={{ fontSize: '11px', color: ui.colors.textMuted, mb: 1 }}>{comparison.scenario1.name}</Typography>
                                        <Typography sx={{ fontSize: '22px', fontWeight: 700, color: ui.colors.textPrimary }}>{formatCurrency(comparison.scenario1.total)}</Typography>
                                    </Box>
                                    <Box sx={{ p: 2, background: ui.colors.surface, borderRadius: '12px' }}>
                                        <Typography sx={{ fontSize: '11px', color: ui.colors.textMuted, mb: 1 }}>{comparison.scenario2.name}</Typography>
                                        <Typography sx={{ fontSize: '22px', fontWeight: 700, color: ui.colors.textPrimary }}>{formatCurrency(comparison.scenario2.total)}</Typography>
                                    </Box>
                                    <Box sx={{ p: 2, background: comparison.difference.total < 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', borderRadius: '12px' }}>
                                        <Typography sx={{ fontSize: '11px', color: ui.colors.textMuted, mb: 1 }}>Diferença</Typography>
                                        <Typography sx={{ fontSize: '22px', fontWeight: 700, color: comparison.difference.total < 0 ? '#10b981' : '#f59e0b' }}>
                                            {comparison.difference.total > 0 ? '+' : ''}{formatCurrency(comparison.difference.total)}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}

                            {activeTab === 'accounts' && comparison.byAccount && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {comparison.byAccount.map((acc, i) => (
                                        <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px', gap: 2, p: 2, background: ui.colors.surface, borderRadius: '8px', alignItems: 'center' }}>
                                            <Box>
                                                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: ui.colors.textPrimary }}>{acc.name}</Typography>
                                                <Typography sx={{ fontSize: '11px', color: ui.colors.textMuted }}>{acc.code}</Typography>
                                            </Box>
                                            <Typography sx={{ fontSize: '13px', color: ui.colors.textSecondary, textAlign: 'right' }}>{formatCurrency(acc.scenario1Total)}</Typography>
                                            <Typography sx={{ fontSize: '13px', color: ui.colors.textSecondary, textAlign: 'right' }}>{formatCurrency(acc.scenario2Total)}</Typography>
                                            <Typography sx={{ fontSize: '13px', fontWeight: 600, textAlign: 'right', color: acc.difference < 0 ? '#10b981' : acc.difference > 0 ? '#f59e0b' : ui.colors.textMuted }}>
                                                {acc.difference > 0 ? '+' : ''}{formatCurrency(acc.difference)}
                                            </Typography>
                                        </Box>
                                    ))}
                                    {comparison.byAccount.length === 0 && <Typography sx={{ color: ui.colors.textMuted, textAlign: 'center', py: 4 }}>Nenhuma conta para comparar</Typography>}
                                </Box>
                            )}

                            {activeTab === 'suppliers' && comparison.bySupplier && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {comparison.bySupplier.map((sup, i) => (
                                        <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px', gap: 2, p: 2, background: ui.colors.surface, borderRadius: '8px', alignItems: 'center' }}>
                                            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: ui.colors.textPrimary }}>{sup.name}</Typography>
                                            <Typography sx={{ fontSize: '13px', color: ui.colors.textSecondary, textAlign: 'right' }}>{formatCurrency(sup.scenario1Total)}</Typography>
                                            <Typography sx={{ fontSize: '13px', color: ui.colors.textSecondary, textAlign: 'right' }}>{formatCurrency(sup.scenario2Total)}</Typography>
                                            <Typography sx={{ fontSize: '13px', fontWeight: 600, textAlign: 'right', color: sup.difference < 0 ? '#10b981' : sup.difference > 0 ? '#f59e0b' : ui.colors.textMuted }}>
                                                {sup.difference > 0 ? '+' : ''}{formatCurrency(sup.difference)}
                                            </Typography>
                                        </Box>
                                    ))}
                                    {comparison.bySupplier.length === 0 && <Typography sx={{ color: ui.colors.textMuted, textAlign: 'center', py: 4 }}>Nenhum fornecedor para comparar</Typography>}
                                </Box>
                            )}
                        </Box>
                    </>
                )}
            </Box>
        </Box>
    );
};

// Main Component
const BudgetScenariosPanel = ({ budgetId, budgetTotal }) => {
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();
    const isDark = mode === 'dark';
    const ui = useMemo(() => buildScenarioTheme(isDark, theme), [isDark, theme]);
    const [scenarios, setScenarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [impactModalOpen, setImpactModalOpen] = useState(false);
    const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
    const [selectedScenarioForImpact, setSelectedScenarioForImpact] = useState(null);

    const fetchScenarios = async () => {
        try { setLoading(true); const data = await getScenariosByBudget(budgetId); setScenarios(data); }
        catch (error) { console.error('Erro ao buscar cenários:', error); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchScenarios(); }, [budgetId]);

    const handleSelectScenario = async (scenarioId) => {
        try { await selectScenario(scenarioId); fetchScenarios(); } catch (error) { console.error('Erro ao selecionar cenário:', error); }
    };

    const handleDeleteScenario = async (scenarioId) => {
        if (!window.confirm('Tem certeza que deseja excluir este cenário?')) return;
        try { await deleteScenario(scenarioId); fetchScenarios(); } catch (error) { console.error('Erro ao excluir cenário:', error); }
    };

    const handleViewImpact = (scenario) => { setSelectedScenarioForImpact(scenario); setImpactModalOpen(true); };

    const chartData = scenarios.length > 0 ? [
        { name: 'Original', value: budgetTotal || 0 },
        ...scenarios.map(s => ({ name: s.name.length > 15 ? s.name.substring(0, 15) + '...' : s.name, value: Number(s.totalOpex) + Number(s.totalCapex) }))
    ] : [];

    return (
        <Box sx={ui.cardStyle}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-icons-round" style={{ color: '#2563eb', fontSize: '22px' }}>compare_arrows</span>
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '16px', fontWeight: 600, color: ui.colors.textPrimary }}>Cenários de Orçamento</Typography>
                        <Typography sx={{ fontSize: '12px', color: ui.colors.textMuted }}>Compare diferentes projeções e selecione o cenário ideal</Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    {scenarios.length >= 2 && (
                        <Button onClick={() => setComparisonModalOpen(true)} sx={{
                            padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
                            background: ui.colors.surface, border: ui.colors.border, color: ui.colors.textSecondary,
                            '&:hover': { background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', borderColor: '#2563eb' }
                        }} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>compare</span>}>
                            Comparar
                        </Button>
                    )}
                    <Button onClick={() => setCreateModalOpen(true)} sx={{
                        padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white'
                    }} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}>
                        Novo Cenário
                    </Button>
                </Box>
            </Box>

            {loading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress sx={{ color: '#2563eb' }} /></Box>
            ) : scenarios.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <span className="material-icons-round" style={{ fontSize: '48px', color: ui.colors.textMuted, opacity: 0.5, display: 'block', marginBottom: '12px' }}>content_copy</span>
                    <Typography sx={{ color: ui.colors.textMuted, fontSize: '14px' }}>Nenhum cenário criado</Typography>
                    <Typography sx={{ color: ui.colors.textMuted, fontSize: '12px' }}>Crie cenários para simular diferentes projeções</Typography>
                </Box>
            ) : (
                <>
                    {chartData.length > 1 && (
                        <Box sx={{ height: 200, mb: 3 }}>
                            <BarChart dataset={chartData} xAxis={[{ scaleType: 'band', dataKey: 'name', tickLabelStyle: { fill: ui.colors.textMuted, fontSize: 11 } }]} yAxis={[{ tickLabelStyle: { fill: ui.colors.textMuted, fontSize: 11 } }]} series={[{ dataKey: 'value', label: 'Total', color: '#2563eb' }]} height={200} margin={{ top: 20, bottom: 30, left: 80, right: 20 }} slotProps={{ legend: { hidden: true } }} sx={{ '& .MuiChartsAxis-line': { stroke: ui.colors.borderSubtle } }} />
                        </Box>
                    )}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
                        {scenarios.map(scenario => (
                            <ScenarioCard key={scenario.id} scenario={scenario} isSelected={scenario.isSelected} onSelect={handleSelectScenario} onDelete={handleDeleteScenario} onViewImpact={handleViewImpact} ui={ui} />
                        ))}
                    </Box>
                </>
            )}

            <CreateScenarioModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} budgetId={budgetId} onCreated={fetchScenarios} ui={ui} />
            <ImpactAnalysisModal open={impactModalOpen} onClose={() => setImpactModalOpen(false)} scenario={selectedScenarioForImpact} ui={ui} />
            <ComparisonModal open={comparisonModalOpen} onClose={() => setComparisonModalOpen(false)} scenarios={scenarios} ui={ui} />
        </Box>
    );
};

export default BudgetScenariosPanel;



