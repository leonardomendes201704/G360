import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useSnackbar } from 'notistack';
import { Box, Typography, Button, TextField, MenuItem, IconButton, Collapse, Paper, Chip, Tooltip, Avatar } from '@mui/material';
import { Add, FilterAlt, Search, Dashboard, List as ListIcon, Shield } from '@mui/icons-material';
import BulkActionsBar from '../components/common/BulkActionsBar';
import { ThemeContext } from '../contexts/ThemeContext';

import RiskHeatmap from '../components/risks/RiskHeatmap';
import RiskDonutChart from '../components/risks/RiskDonutChart';
import GlobalRiskModal from '../components/modals/GlobalRiskModal';
import TaskModal from '../components/modals/TaskModal';
import { getRisks, deleteRisk, updateRisk, getHeatmapMetrics } from '../services/corporate-risk.service';
import { getReferenceUsers } from '../services/reference.service';
import { createGeneralTask } from '../services/task.service';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import DataListTable from '../components/common/DataListTable';
import { getRiskListColumns } from './risks/riskListColumns';
import { sortRiskRows } from './risks/riskListSort';
import PageTitleCard from '../components/common/PageTitleCard';
import usePersistedFilters from '../hooks/usePersistedFilters';
import { useUndoToast } from '../hooks/useUndoToast';
import { AuthContext } from '../contexts/AuthContext';

const RisksPage = () => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const { enqueueSnackbar } = useSnackbar();
    const { hasPermission } = useContext(AuthContext);
    const canWrite = hasPermission('RISKS', 'CREATE');
    const canEdit = hasPermission('RISKS', 'EDIT_RISK');
    const canDeletePerm = hasPermission('RISKS', 'DELETE');
    const { deleteWithUndo } = useUndoToast();
    const [selectedIds, setSelectedIds] = useState([]);

    const [risks, setRisks] = useState([]);
    const [heatmapData, setHeatmapData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('DASHBOARD');
    const [showFilters, setShowFilters] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [riskToEdit, setRiskToEdit] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);

    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [selectedRiskId, setSelectedRiskId] = useState(null);
    const [users, setUsers] = useState([]);

    const [filters, setFilters] = usePersistedFilters('risks', {
        search: '',
        status: '',
        category: '',
        impact: '',
        probability: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [risksData, metricsData, usersData] = await Promise.all([
                getRisks(filters),
                getHeatmapMetrics(),
                getReferenceUsers()
            ]);
            setRisks(risksData);
            setHeatmapData(metricsData);
            setUsers(usersData);
        } catch (error) {
            console.error(error);
            enqueueSnackbar('Erro ao carregar dados', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timer);
    }, [filters]);

    // Styles
    const cardBg = isDark ? 'rgba(22, 29, 38, 0.5)' : '#ffffff';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';

    const handleDelete = (riskId) => {
        setRisks(prev => prev.filter(r => r.id !== riskId));
        setSelectedIds(prev => prev.filter(id => id !== riskId));
        deleteWithUndo({
            message: 'Risco removido',
            onConfirm: () => deleteRisk(riskId),
            onRefresh: fetchData,
        });
    };

    const handleBulkDeleteRisks = () => {
        const ids = [...selectedIds];
        setRisks(prev => prev.filter(r => !ids.includes(r.id)));
        setSelectedIds([]);
        deleteWithUndo({
            message: `${ids.length} riscos removidos`,
            onConfirm: () => Promise.allSettled(ids.map(id => deleteRisk(id))),
            onRefresh: fetchData,
        });
    };

    const handleRiskStatusChange = async (riskId, newStatus) => {
        setRisks(prev => prev.map(r => r.id === riskId ? { ...r, status: newStatus } : r));
        try { await updateRisk(riskId, { status: newStatus }); }
        catch (e) { enqueueSnackbar('Erro ao atualizar status', { variant: 'error' }); fetchData(); }
    };

    const listResetKey = useMemo(
        () => [filters.search, filters.status, filters.category, filters.impact, filters.probability, risks.length].join('|'),
        [filters.search, filters.status, filters.category, filters.impact, filters.probability, risks.length]
    );

    return (
        <Box>
            <PageTitleCard
                iconName="shield"
                iconColor="#2563eb"
                title="Gestão de Riscos Corporativos"
                subtitle="Matriz de riscos, heatmap e controles"
                pushActionsToEnd
                mb={3}
                actions={
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', gap: 1, bgcolor: isDark ? 'rgba(0,0,0,0.2)' : '#f1f5f9', p: 0.5, borderRadius: '8px' }}>
                            <IconButton size="small" onClick={() => setViewMode('DASHBOARD')} sx={{ borderRadius: '8px', bgcolor: viewMode === 'DASHBOARD' ? (isDark ? 'rgba(255,255,255,0.1)' : '#fff') : 'transparent', boxShadow: viewMode === 'DASHBOARD' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>
                                <Dashboard fontSize="small" />
                            </IconButton>
                            <IconButton data-testid="risks-view-list" size="small" onClick={() => setViewMode('LIST')} sx={{ borderRadius: '8px', bgcolor: viewMode === 'LIST' ? (isDark ? 'rgba(255,255,255,0.1)' : '#fff') : 'transparent', boxShadow: viewMode === 'LIST' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>
                                <ListIcon fontSize="small" />
                            </IconButton>
                        </Box>
                        {canWrite && (
                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                onClick={() => { setRiskToEdit(null); setModalOpen(true); }}
                                sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', borderRadius: '8px', textTransform: 'none', fontWeight: 600, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', '&:hover': { boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)' } }}
                            >
                                Novo Risco
                            </Button>
                        )}
                    </Box>
                }
            />

            {/* Filters */}
            <Box sx={{ mb: 3, p: 2, borderRadius: '8px', background: cardBg, border: `1px solid ${borderColor}` }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: showFilters ? 2 : 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FilterAlt sx={{ color: textSecondary }} />
                        <Typography sx={{ fontWeight: 600, color: textPrimary }}>Filtros</Typography>
                        {(() => {
                            const activeCount = [filters.status, filters.category, filters.impact, filters.probability].filter(Boolean).length;
                            return activeCount > 0 ? (
                                <Box sx={{ px: 1, py: 0.25, borderRadius: '8px', fontSize: '10px', fontWeight: 700, bgcolor: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' }}>{activeCount}</Box>
                            ) : null;
                        })()}
                    </Box>
                    <IconButton size="small" onClick={() => setShowFilters(!showFilters)}>
                        <span className="material-icons-round">{showFilters ? 'expand_less' : 'expand_more'}</span>
                    </IconButton>
                </Box>
                <Collapse in={showFilters}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                        <TextField
                            placeholder="Buscar por título ou código..."
                            size="small"
                            InputProps={{ startAdornment: <Search sx={{ mr: 1, color: textSecondary }} /> }}
                            value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', height: '40px' } }}
                        />
                        <TextField select label="Categoria" size="small" value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' } }}>
                            <MenuItem value="">Todos</MenuItem>
                            <MenuItem value="TI">TI</MenuItem>
                            <MenuItem value="SEGURANCA">Segurança</MenuItem>
                            <MenuItem value="COMPLIANCE">Compliance</MenuItem>
                            <MenuItem value="OPERACIONAL">Operacional</MenuItem>
                            <MenuItem value="FINANCEIRO">Financeiro</MenuItem>
                        </TextField>
                        <TextField select label="Status" size="small" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' } }}>
                            <MenuItem value="">Todos</MenuItem>
                            <MenuItem value="IDENTIFICADO">Identificado</MenuItem>
                            <MenuItem value="TRATAMENTO">Em Tratamento</MenuItem>
                            <MenuItem value="MONITORAMENTO">Monitoramento</MenuItem>
                            <MenuItem value="ACEITO">Aceito</MenuItem>
                            <MenuItem value="FECHADO">Fechado</MenuItem>
                        </TextField>
                    </Box>
                </Collapse>
            </Box>

            {/* Content */}
            {viewMode === 'DASHBOARD' && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1.4fr 1fr 1fr' }, gap: 3 }}>
                    {/* Main Heatmap Area */}
                    <Box>
                        <RiskHeatmap data={heatmapData} />
                    </Box>

                    {/* Donut Chart */}
                    <Box>
                        <RiskDonutChart risks={risks} />
                    </Box>

                    {/* Quick Stats / Top Risks */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Paper sx={{ p: 2, borderRadius: '8px', background: cardBg, border: `1px solid ${borderColor}` }}>
                            <Typography sx={{ fontWeight: 600, mb: 2, color: textPrimary }}>Top Riscos Críticos</Typography>
                            {risks.filter(r => r.severity >= 16).slice(0, 5).map(risk => (
                                <Box key={risk.id} sx={{ p: 1.5, mb: 1, borderRadius: '8px', bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', cursor: 'pointer', '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } }} onClick={() => { setRiskToEdit(risk); setIsViewMode(true); setModalOpen(true); }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: textPrimary }}>{risk.code}</Typography>
                                        <Chip label="CRÍTICO" size="small" sx={{ height: 20, fontSize: '10px', bgcolor: '#dc2626', color: '#fff' }} />
                                    </Box>
                                    <Typography sx={{ fontSize: '12px', color: textSecondary, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{risk.title}</Typography>
                                </Box>
                            ))}
                            {risks.filter(r => r.severity >= 16).length === 0 && <Typography sx={{ fontSize: '13px', color: textSecondary, fontStyle: 'italic' }}>Nenhum risco crítico identificado.</Typography>}
                        </Paper>
                    </Box>
                </Box>
            )}

            {viewMode === 'LIST' && (
                <DataListTable
                    dataTestidTable="tabela-riscos"
                    shell={{
                        title: 'Registro de riscos',
                        titleIcon: 'shield',
                        accentColor: '#2563eb',
                        count: risks.length,
                        sx: { borderRadius: '8px', background: cardBg, border: `1px solid ${borderColor}`, overflow: 'hidden' },
                    }}
                    columns={getRiskListColumns({
                        allRows: risks,
                        selectedIds,
                        setSelectedIds,
                        borderColor,
                        textPrimary,
                        textSecondary,
                        onStatusChange: handleRiskStatusChange,
                        onAddPlan: (riskId) => { setSelectedRiskId(riskId); setTaskModalOpen(true); },
                        onEdit: (risk) => { setRiskToEdit(risk); setIsViewMode(false); setModalOpen(true); },
                        onView: (risk) => { setRiskToEdit(risk); setIsViewMode(true); setModalOpen(true); },
                        onDelete: handleDelete,
                        canEdit,
                        canDeletePerm,
                    })}
                    rows={risks}
                    sortRows={sortRiskRows}
                    defaultOrderBy="severity"
                    defaultOrder="desc"
                    getDefaultOrderForColumn={(id) => (id === 'severity' || id === 'plans' ? 'desc' : 'asc')}
                    resetPaginationKey={listResetKey}
                    loading={loading}
                    isRowSelected={(r) => selectedIds.includes(r.id)}
                    getRowSx={(r) => ({
                        bgcolor: selectedIds.includes(r.id) ? 'rgba(102, 126, 234, 0.08)' : 'transparent',
                    })}
                    renderBeforeTable={() => (
                        <BulkActionsBar
                            selectedCount={selectedIds.length}
                            totalCount={risks.length}
                            allSelected={risks.length > 0 && risks.every((r) => selectedIds.includes(r.id))}
                            onSelectAll={() => setSelectedIds(
                                risks.length > 0 && risks.every((r) => selectedIds.includes(r.id)) ? [] : risks.map((r) => r.id)
                            )}
                            onClearAll={() => setSelectedIds([])}
                            actions={[{ label: 'Excluir', icon: 'delete', onClick: handleBulkDeleteRisks, color: '#ef4444' }]}
                        />
                    )}
                    emptyMessage="Nenhum risco encontrado. Ajuste os filtros."
                    emptyContent={canWrite ? (
                        <EmptyState
                            icon={<Shield sx={{ fontSize: 'inherit' }} />}
                            title="Nenhum risco encontrado"
                            description="Ajuste os filtros ou registre um novo risco para iniciar a gestão de riscos corporativos."
                            actionLabel="Novo Risco"
                            actionIcon={<Add />}
                            onAction={() => { setRiskToEdit(null); setModalOpen(true); }}
                            compact
                        />
                    ) : undefined}
                />
            )}

            <GlobalRiskModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setIsViewMode(false); }}
                onSave={fetchData}
                riskToEdit={riskToEdit}
                viewMode={isViewMode}
            />

            {/* Task Modal for Action Plans */}
            {taskModalOpen && (
                <TaskModal
                    open={taskModalOpen}
                    onClose={() => setTaskModalOpen(false)}
                    onSave={async (taskData) => {
                        try {
                            setLoading(true);
                            await createGeneralTask(taskData);
                            setTaskModalOpen(false);
                            fetchData(); // Refresh to update count
                            enqueueSnackbar('Plano de Ação criado com sucesso', { variant: 'success' });
                        } catch (error) {
                            console.error('Erro ao criar plano:', error);
                            enqueueSnackbar('Erro ao criar Plano de Ação', { variant: 'error' });
                        } finally {
                            setLoading(false);
                        }
                    }}
                    isGeneralTask={true}
                    riskId={selectedRiskId}
                    members={users.map(u => ({ user: u }))}
                />
            )}
        </Box>
    );
};

export default RisksPage;
