import { useState, useEffect, useContext } from 'react';
import { Box, Typography, CircularProgress, Button, IconButton, Tooltip, LinearProgress, Paper, useTheme } from '@mui/material';
import { useSnackbar } from 'notistack';
import { ThemeContext } from '../../contexts/ThemeContext';
import { getAvailableBudgets, compareMultipleBudgets } from '../../services/budget-comparison.service';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);
const formatPercent = (val) => `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;

// Priority labels
const priorityLabels = {
    ESSENCIAL: { label: 'Essencial', color: '#ef4444', icon: '🔴' },
    IMPORTANTE: { label: 'Importante', color: '#f59e0b', icon: '🟡' },
    DESEJAVEL: { label: 'Desejável', color: '#10b981', icon: '🟢' },
    SEM_PRIORIDADE: { label: 'Sem Prioridade', color: '#64748b', icon: '⚪' }
};

// Generate colors for budgets
const budgetColors = ['#2563eb', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#14b8a6'];

// Variation indicator component
const VariationBadge = ({ current, previous, showPercent = true }) => {
    if (previous === 0 && current > 0) {
        return <Tooltip title="Novo item"><span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600, marginLeft: '6px' }}>NOVO</span></Tooltip>;
    }
    if (current === 0 && previous > 0) {
        return <Tooltip title="Item removido"><span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', fontWeight: 600, marginLeft: '6px' }}>REMOVIDO</span></Tooltip>;
    }
    if (previous === 0 || !showPercent) return null;

    const diff = current - previous;
    const variation = previous !== 0 ? (diff / previous) * 100 : 0;
    const isUp = variation > 0;
    return (
        <Tooltip title={`Variação Nominal: ${formatCurrency(diff)} (${formatPercent(variation)})`}>
            <span style={{
                fontSize: '10px', padding: '2px 6px', borderRadius: '8px', marginLeft: '6px', fontWeight: 600,
                background: isUp ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isUp ? '#f43f5e' : '#10b981',
                display: 'inline-flex', alignItems: 'center', gap: '2px', cursor: 'help'
            }}>
                <span className="material-icons-round" style={{ fontSize: '12px' }}>{isUp ? 'arrow_upward' : 'arrow_downward'}</span>
                {Math.abs(variation).toFixed(0)}%
            </span>
        </Tooltip>
    );
};

// Progress bar for budget allocation
// Progress bar for budget allocation
const AllocationBar = ({ value, max, color, mode }) => {
    const percent = max > 0 ? (value / max) * 100 : 0;
    const trackColor = mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
            <Box sx={{ flex: 1, height: 6, background: trackColor, borderRadius: '8px', overflow: 'hidden' }}>
                <Box sx={{ width: `${Math.min(percent, 100)}%`, height: '100%', background: color, borderRadius: '8px', transition: 'width 0.3s' }} />
            </Box>
            <Typography sx={{ fontSize: '10px', color: mode === 'dark' ? '#64748b' : '#334155', minWidth: 35 }}>{percent.toFixed(0)}%</Typography>
        </Box>
    );
};

const BudgetComparisonPage = () => {
    const { enqueueSnackbar } = useSnackbar();
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();

    const [budgets, setBudgets] = useState([]);
    const [selectedIds, setSelectedIds] = useState(['', '']);
    const [comparison, setComparison] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingBudgets, setLoadingBudgets] = useState(true);
    const [activeTab, setActiveTab] = useState('accounts');

    // Theme-aware styles
    // Theme-aware styles
    const textPrimary = mode === 'dark' ? '#f1f5f9' : '#0f172a';
    const textSecondary = mode === 'dark' ? '#64748b' : '#334155';
    const textMuted = mode === 'dark' ? '#94a3b8' : '#64748b';
    const surfaceBg = mode === 'dark' ? '#1c2632' : '#FFFFFF';
    const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const tableHeaderBg = mode === 'dark' ? '#1c2632' : '#f1f5f9';
    const progressBarBg = mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    const cardStyle = {
        bgcolor: mode === 'dark' ? 'background.paper' : '#FFFFFF',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '24px',
        boxShadow: mode === 'dark' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.07)',
    };

    const selectStyle = {
        background: surfaceBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '12px 14px',
        color: textPrimary,
        fontSize: '14px',
        width: '100%',
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='${mode === 'dark' ? '%2394a3b8' : '%23475569'}'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center'
    };

    useEffect(() => {
        const fetchBudgets = async () => {
            try {
                const data = await getAvailableBudgets();
                setBudgets(data);
            } catch (error) {
                enqueueSnackbar('Erro ao carregar orçamentos', { variant: 'error' });
            } finally {
                setLoadingBudgets(false);
            }
        };
        fetchBudgets();
    }, []);

    const addBudgetSlot = () => {
        if (selectedIds.length < 8) {
            setSelectedIds([...selectedIds, '']);
        }
    };

    const removeBudgetSlot = (index) => {
        if (selectedIds.length > 2) {
            setSelectedIds(selectedIds.filter((_, i) => i !== index));
        }
    };

    const updateBudgetId = (index, value) => {
        const newIds = [...selectedIds];
        newIds[index] = value;
        setSelectedIds(newIds);
    };

    const handleCompare = async () => {
        const validIds = selectedIds.filter(id => id !== '');
        if (validIds.length < 2) {
            enqueueSnackbar('Selecione pelo menos 2 orçamentos', { variant: 'warning' });
            return;
        }

        const uniqueIds = [...new Set(validIds)];
        if (uniqueIds.length < 2) {
            enqueueSnackbar('Selecione orçamentos diferentes', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const data = await compareMultipleBudgets(uniqueIds);
            setComparison(data);
            setActiveTab('accounts');
        } catch (error) {
            enqueueSnackbar('Erro ao comparar orçamentos', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const getMaxTotal = () => comparison?.budgets?.reduce((max, b) => Math.max(max, b.total), 0) || 0;

    const tabs = [
        { id: 'accounts', label: 'Por Conta', icon: 'account_balance', desc: 'Onde o dinheiro está alocado' },
        { id: 'suppliers', label: 'Por Fornecedor', icon: 'business', desc: 'Concentração e dependência' },
        ...(comparison?.byPriority ? [{ id: 'priority', label: 'Por Prioridade OBZ', icon: 'priority_high', desc: 'Criticidade das despesas' }] : [])
    ];

    const maxTotal = getMaxTotal();

    return (
        <Box sx={{ p: 4, maxWidth: '1600px', margin: '0 auto' }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography sx={{ fontSize: '28px', fontWeight: 700, color: textPrimary, mb: 1 }}>
                    📊 Análise Comparativa de Orçamentos
                </Typography>
                <Typography sx={{ fontSize: '14px', color: textSecondary }}>
                    Compare múltiplos orçamentos com variações percentuais, indicadores visuais e insights estratégicos
                </Typography>
            </Box>

            {/* Budget Selection */}
            <Box sx={{ ...cardStyle, mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary }}>
                        Selecione os orçamentos para comparar
                    </Typography>
                    <Button
                        onClick={addBudgetSlot}
                        disabled={selectedIds.length >= 8}
                        sx={{
                            minWidth: 'auto', padding: '6px 12px', borderRadius: '8px',
                            background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', fontSize: '12px',
                            '&:hover': { background: 'rgba(37, 99, 235, 0.2)' },
                            '&:disabled': { opacity: 0.5 }
                        }}
                        data-testid="btn-add-budget-slot"
                        startIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>}
                    >
                        Adicionar Orçamento
                    </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                    {selectedIds.map((id, index) => (
                        <Box key={index} sx={{ flex: '1 1 200px', maxWidth: '280px', position: 'relative' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Box sx={{ width: 12, height: 12, borderRadius: '8px', background: budgetColors[index] }} />
                                <label style={{ fontSize: '12px', color: textMuted, fontWeight: 500 }}>
                                    Orçamento {index + 1}
                                </label>
                                {selectedIds.length > 2 && (
                                    <IconButton
                                        size="small"
                                        onClick={() => removeBudgetSlot(index)}
                                        sx={{ ml: 'auto', width: 20, height: 20, color: '#f43f5e', '&:hover': { background: 'rgba(244, 63, 94, 0.1)' } }}
                                    >
                                        <span className="material-icons-round" style={{ fontSize: '14px' }}>close</span>
                                    </IconButton>
                                )}
                            </Box>
                            <select
                                data-testid={`select-budget-${index}`}
                                style={{ ...selectStyle, borderColor: budgetColors[index] }}
                                value={id}
                                onChange={(e) => updateBudgetId(index, e.target.value)}
                                disabled={loadingBudgets}
                            >
                                <option value="" style={{ background: surfaceBg }}>Selecione...</option>
                                {budgets.map(b => (
                                    <option key={b.id} value={b.id} style={{ background: surfaceBg }}>
                                        {b.name} ({b.fiscalYear}) {b.isOBZ ? '- OBZ' : ''} - {formatCurrency(b.total)}
                                    </option>
                                ))}
                            </select>
                        </Box>
                    ))}
                </Box>

                <Button
                    onClick={handleCompare}
                    disabled={selectedIds.filter(id => id).length < 2 || loading}
                    sx={{
                        padding: '14px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white',
                        '&:disabled': { opacity: 0.5 },
                        '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)' }
                    }}
                    data-testid="btn-run-comparison"
                    startIcon={loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <span className="material-icons-round" style={{ fontSize: '18px' }}>compare</span>}
                >
                    {loading ? 'Comparando...' : 'Comparar Orçamentos'}
                </Button>
            </Box>

            {/* Comparison Results */}
            {comparison && (
                <>
                    {/* Budget Summaries with visual comparison */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${comparison.budgets.length}, 1fr)`, gap: 2, mb: 4 }}>
                        {comparison.budgets.map((b, i) => (
                            <Box key={b.id} sx={{ ...cardStyle, borderTop: `3px solid ${budgetColors[i]}`, p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary, flex: 1 }}>{b.name}</Typography>
                                    {b.isOBZ && <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 600, background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' }}>OBZ</span>}
                                </Box>
                                <Typography sx={{ fontSize: '11px', color: textSecondary, mb: 1 }}>Ano: {b.fiscalYear} • {b.itemCount} itens</Typography>
                                <Typography sx={{ fontSize: '20px', fontWeight: 700, color: budgetColors[i], mb: 1.5 }}>{formatCurrency(b.total)}</Typography>

                                {/* Visual bar comparison */}
                                <AllocationBar value={b.total} max={maxTotal} color={budgetColors[i]} mode={mode} />

                                {/* Variation vs first budget */}
                                {i > 0 && (
                                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${borderColor}` }}>
                                        <VariationBadge current={b.total} previous={comparison.budgets[0].total} />
                                        <Typography sx={{ fontSize: '11px', color: textSecondary, mt: 0.5 }}>
                                            vs {comparison.budgets[0].name}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>

                    {/* Tabs with descriptions */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.06)', pb: 2 }}>
                        {tabs.map(tab => (
                            <Tooltip key={tab.id} title={tab.desc}>
                                <button
                                    onClick={() => setActiveTab(tab.id)}
                                    data-testid={`tab-${tab.id}`}
                                    style={{
                                        padding: '10px 16px', borderRadius: '8px', border: 'none',
                                        background: activeTab === tab.id ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                                        color: activeTab === tab.id ? '#2563eb' : '#94a3b8',
                                        fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    <span className="material-icons-round" style={{ fontSize: '16px' }}>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            </Tooltip>
                        ))}
                    </Box>

                    {/* Legend */}
                    <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }}>NOVO</span>
                            <Typography sx={{ fontSize: '11px', color: textSecondary }}>Nova atividade/fornecedor</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', fontWeight: 600 }}>REMOVIDO</span>
                            <Typography sx={{ fontSize: '11px', color: textSecondary }}>Descontinuado</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                <span className="material-icons-round" style={{ fontSize: '12px' }}>arrow_upward</span>25%
                            </span>
                            <Typography sx={{ fontSize: '11px', color: textSecondary }}>Aumento de despesa</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                <span className="material-icons-round" style={{ fontSize: '12px' }}>arrow_downward</span>15%
                            </span>
                            <Typography sx={{ fontSize: '11px', color: textSecondary }}>Redução de despesa</Typography>
                        </Box>
                    </Box>

                    {/* Tab Content */}
                    <Box sx={cardStyle}>
                        {/* Accounts Table */}
                        {activeTab === 'accounts' && (
                            <Box sx={{ overflowX: 'auto' }}>
                                <Box sx={{ mb: 3, p: 2, background: 'rgba(37, 99, 235, 0.05)', borderRadius: '8px', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
                                    <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>
                                        <strong style={{ color: '#2563eb' }}>💡 O que analisar:</strong> Contas com valores zerados indicam atividades descontinuadas ou novas iniciativas. Grandes variações podem sinalizar mudanças de estratégia ou inflação de custos.
                                    </Typography>
                                </Box>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: comparison.budgets.length * 150 + 350 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ background: tableHeaderBg, padding: '12px', textAlign: 'left', fontSize: '11px', color: textSecondary, fontWeight: 600, borderBottom: `1px solid ${borderColor}` }}>
                                                CONTA CONTÁBIL
                                            </th>
                                            {comparison.budgets.map((b, i) => (
                                                <th key={b.id} style={{ background: tableHeaderBg, padding: '12px', textAlign: 'right', fontSize: '11px', color: budgetColors[i], fontWeight: 600, borderBottom: `1px solid ${borderColor}` }}>
                                                    {b.name}
                                                    {i > 0 && <span style={{ display: 'block', fontSize: '9px', color: textMuted, fontWeight: 400 }}>vs anterior</span>}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparison.byAccount.map((row, idx) => (
                                            <tr key={idx} style={{ transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '12px', borderBottom: `1px solid ${borderColor}`, color: textPrimary, fontSize: '13px' }}>
                                                    <strong>{row.accountCode}</strong> - {row.accountName}
                                                    <br /><span style={{ fontSize: '11px', color: textSecondary }}>{row.accountType}</span>
                                                </td>
                                                {row.values.map((val, i) => (
                                                    <td key={i} style={{ padding: '12px', textAlign: 'right', borderBottom: `1px solid ${borderColor}`, color: val > 0 ? textPrimary : textMuted, fontSize: '13px', fontWeight: 500 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                                            {val > 0 ? formatCurrency(val) : '-'}
                                                            {i > 0 && <VariationBadge current={val} previous={row.values[i - 1]} />}
                                                        </Box>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        <tr style={{ background: tableHeaderBg }}>
                                            <td style={{ padding: '14px 12px', fontWeight: 700, color: textPrimary, fontSize: '14px' }}>TOTAL</td>
                                            {comparison.budgets.map((b, i) => (
                                                <td key={b.id} style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 700, color: budgetColors[i], fontSize: '14px' }}>
                                                    {formatCurrency(b.total)}
                                                    {i > 0 && <VariationBadge current={b.total} previous={comparison.budgets[i - 1].total} />}
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </Box>
                        )}

                        {/* Suppliers Table */}
                        {activeTab === 'suppliers' && (
                            <Box sx={{ overflowX: 'auto' }}>
                                <Box sx={{ mb: 3, p: 2, background: 'rgba(6, 182, 212, 0.05)', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
                                    <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>
                                        <strong style={{ color: '#06b6d4' }}>💡 O que analisar:</strong> Identifique concentração de despesas e dependência de fornecedores. Novos fornecedores indicam diversificação, removidos podem significar renegociação ou término.
                                    </Typography>
                                </Box>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: comparison.budgets.length * 150 + 300 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ background: tableHeaderBg, padding: '12px', textAlign: 'left', fontSize: '11px', color: textSecondary, fontWeight: 600, borderBottom: `1px solid ${borderColor}` }}>
                                                FORNECEDOR
                                            </th>
                                            {comparison.budgets.map((b, i) => (
                                                <th key={b.id} style={{ background: tableHeaderBg, padding: '12px', textAlign: 'right', fontSize: '11px', color: budgetColors[i], fontWeight: 600, borderBottom: `1px solid ${borderColor}` }}>
                                                    {b.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparison.bySupplier.map((row, idx) => (
                                            <tr key={idx} style={{ transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '12px', borderBottom: `1px solid ${borderColor}`, color: textPrimary, fontSize: '13px' }}>
                                                    {row.supplierName}
                                                </td>
                                                {row.values.map((val, i) => (
                                                    <td key={i} style={{ padding: '12px', textAlign: 'right', borderBottom: `1px solid ${borderColor}`, color: val > 0 ? textPrimary : textMuted, fontSize: '13px', fontWeight: 500 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                                            {val > 0 ? formatCurrency(val) : '-'}
                                                            {i > 0 && <VariationBadge current={val} previous={row.values[i - 1]} />}
                                                        </Box>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        <tr style={{ background: tableHeaderBg }}>
                                            <td style={{ padding: '14px 12px', fontWeight: 700, color: textPrimary, fontSize: '14px' }}>TOTAL</td>
                                            {comparison.budgets.map((b, i) => (
                                                <td key={b.id} style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 700, color: budgetColors[i], fontSize: '14px' }}>
                                                    {formatCurrency(b.total)}
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </Box>
                        )}

                        {/* Priority Table (OBZ) */}
                        {activeTab === 'priority' && comparison.byPriority && (
                            <Box sx={{ overflowX: 'auto' }}>
                                <Box sx={{ mb: 3, p: 2, background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                    <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>
                                        <strong style={{ color: '#ef4444' }}>💡 O que analisar:</strong>
                                        <span style={{ color: '#ef4444' }}> 🔴 Essencial</span> = crítico, cortar = risco operacional |
                                        <span style={{ color: '#f59e0b' }}> 🟡 Importante</span> = relevante, impacto moderado |
                                        <span style={{ color: '#10b981' }}> 🟢 Desejável</span> = pode ser adiado
                                    </Typography>
                                </Box>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: comparison.budgets.length * 150 + 250 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ background: tableHeaderBg, padding: '12px', textAlign: 'left', fontSize: '11px', color: textSecondary, fontWeight: 600, borderBottom: `1px solid ${borderColor}` }}>
                                                PRIORIDADE
                                            </th>
                                            {comparison.budgets.map((b, i) => (
                                                <th key={b.id} style={{ background: tableHeaderBg, padding: '12px', textAlign: 'right', fontSize: '11px', color: budgetColors[i], fontWeight: 600, borderBottom: `1px solid ${borderColor}` }}>
                                                    {b.name}
                                                    <span style={{ display: 'block', fontSize: '9px', color: textMuted, fontWeight: 400 }}>% do total</span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparison.byPriority.map((row, idx) => {
                                            const info = priorityLabels[row.priority] || priorityLabels.SEM_PRIORIDADE;
                                            return (
                                                <tr key={idx} style={{ transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                        <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: `${info.color}20`, color: info.color }}>
                                                            {info.icon} {info.label}
                                                        </span>
                                                    </td>
                                                    {row.values.map((val, i) => {
                                                        const percent = comparison.budgets[i].total > 0 ? (val / comparison.budgets[i].total * 100) : 0;
                                                        return (
                                                            <td key={i} style={{ padding: '12px', textAlign: 'right', borderBottom: `1px solid ${borderColor}` }}>
                                                                <Typography sx={{ color: val > 0 ? textPrimary : textMuted, fontSize: '14px', fontWeight: 600 }}>
                                                                    {val > 0 ? formatCurrency(val) : '-'}
                                                                </Typography>
                                                                {val > 0 && (
                                                                    <Typography sx={{ fontSize: '11px', color: info.color }}>
                                                                        {percent.toFixed(1)}%
                                                                    </Typography>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                        <tr style={{ background: tableHeaderBg }}>
                                            <td style={{ padding: '14px 12px', fontWeight: 700, color: textPrimary, fontSize: '14px' }}>TOTAL</td>
                                            {comparison.budgets.map((b, i) => (
                                                <td key={b.id} style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 700, color: budgetColors[i], fontSize: '14px' }}>
                                                    {formatCurrency(b.total)}
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </Box>
                        )}
                    </Box>
                </>
            )}

            {/* Empty State */}
            {!comparison && !loading && (
                <Box sx={{ ...cardStyle, textAlign: 'center', py: 8 }}>
                    <span className="material-icons-round" style={{ fontSize: '64px', color: textMuted, opacity: 0.4, marginBottom: '16px' }}>compare</span>
                    <Typography sx={{ fontSize: '18px', fontWeight: 600, color: textPrimary, mb: 1 }}>Selecione os orçamentos</Typography>
                    <Typography sx={{ fontSize: '14px', color: textSecondary }}>
                        Adicione 2 ou mais orçamentos para visualizar a comparação com indicadores de variação
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default BudgetComparisonPage;
