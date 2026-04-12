import { useState, useEffect, useMemo, useContext } from 'react';
import { useSnackbar } from 'notistack';
import { useTheme } from '@mui/material/styles';
import {
    Add, Search, FilterAlt, Refresh, Warning, CheckCircle,
    Loop, DoneAll, ErrorOutline, AccessTime, FormatListBulleted, ViewKanban
} from '@mui/icons-material';
import {
    Box, Typography, Button, TextField, MenuItem, InputAdornment,
    IconButton, Collapse, Tooltip, Paper
} from '@mui/material';

import { getIncidents, getIncidentKPIs, getIncidentCategories, createIncident, updateIncident, deleteIncident } from '../../services/incident.service';
import { getUsers } from '../../services/user.service';
import IncidentModal from '../../components/modals/IncidentModal';
import IncidentViewModal from '../../components/modals/IncidentViewModal';
import IncidentList from '../../components/incidents/IncidentList';
import IncidentKanban from '../../components/incidents/IncidentKanban';
import EmptyState from '../../components/common/EmptyState';
import TableSkeleton from '../../components/common/TableSkeleton';
import ExportButton from '../../components/common/ExportButton';
import { EXPORT_COLUMNS } from '../../utils/exportUtils';
import { getErrorMessage } from '../../utils/errorUtils';
import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';
import usePersistedFilters from '../../hooks/usePersistedFilters';
import { useUndoToast } from '../../hooks/useUndoToast';
import BulkActionsBar from '../../components/common/BulkActionsBar';
import { Delete as DeleteIcon, Done as DoneIcon, Close as CloseIcon } from '@mui/icons-material';

const IncidentsPage = () => {
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();
    const isDark = mode === 'dark';
    const { hasPermission } = useContext(AuthContext);
    const canWrite = hasPermission('INCIDENT', 'WRITE');

    // Theme-aware styles
    const cardBg = isDark ? 'rgba(22, 29, 38, 0.5)' : '#FFFFFF';
    const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)';
    const cardShadow = isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#64748b' : '#475569';
    const textMuted = isDark ? '#94a3b8' : '#64748b';
    const borderSubtle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    const [incidents, setIncidents] = useState([]);
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [kpis, setKpis] = useState({ open: 0, inProgress: 0, resolved: 0, slaBreached: 0, resolvedToday: 0 });
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(true);
    const [page, setPage] = useState(1);
    const [rowsPerPage] = useState(20);
    const [viewMode, setViewMode] = useState('LIST');
    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [saving, setSaving] = useState(false);

    const { enqueueSnackbar } = useSnackbar();
    const { deleteWithUndo } = useUndoToast();
    const [selectedIds, setSelectedIds] = useState([]);

    const [filters, setFilters, clearFilters] = usePersistedFilters('incidents', {
        search: '',
        status: '',
        priority: '',
        categoryId: '',
        assigneeId: '',
        slaBreached: ''
    });

    const filteredIncidents = useMemo(() => {
        return incidents.filter(inc => {
            const matchesSearch = filters.search === '' ||
                (inc.code?.toLowerCase().includes(filters.search.toLowerCase()) ||
                    inc.title?.toLowerCase().includes(filters.search.toLowerCase()));
            const matchesStatus = filters.status === '' || inc.status === filters.status;
            const matchesPriority = filters.priority === '' || inc.priority === filters.priority;
            const matchesCategory = filters.categoryId === '' || inc.categoryId === filters.categoryId;
            const matchesAssignee = filters.assigneeId === '' || inc.assigneeId === filters.assigneeId;
            const matchesSLA = filters.slaBreached === '' || (filters.slaBreached === 'true' ? inc.slaBreached : !inc.slaBreached);
            return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAssignee && matchesSLA;
        });
    }, [incidents, filters]);

    const paginatedIncidents = useMemo(() => {
        const startIndex = (page - 1) * rowsPerPage;
        return filteredIncidents.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredIncidents, page, rowsPerPage]);

    const totalPages = Math.ceil(filteredIncidents.length / rowsPerPage);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [incData, kpiData, catData, usersData] = await Promise.all([
                getIncidents(),
                getIncidentKPIs(),
                getIncidentCategories(),
                getUsers()
            ]);
            setIncidents(incData);
            setKpis(kpiData);
            setCategories(catData);
            setUsers(usersData);
        } catch (error) {
            console.error(error);
            enqueueSnackbar(getErrorMessage(error, 'Erro ao carregar incidentes.'), { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Deep link handling
        const params = new URLSearchParams(window.location.search);
        const deepLinkId = params.get('id');
        if (deepLinkId) {
            getIncidents().then(data => {
                const target = data.find(i => i.id === deepLinkId);
                if (target) {
                    handleOpenView(target);
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            });
        }
    }, []);

    useEffect(() => { setPage(1); }, [filters]);

    const handleOpenCreate = () => {
        setSelectedIncident(null);
        setIsViewMode(false);
        setModalOpen(true);
    };

    const handleOpenEdit = (incident) => {
        setSelectedIncident(incident);
        setIsViewMode(false);
        setModalOpen(true);
    };

    const handleOpenView = (incident) => {
        setSelectedIncident(incident);
        setViewModalOpen(true);
    };

    const handleViewToEdit = (incident) => {
        setViewModalOpen(false);
        setSelectedIncident(incident);
        setIsViewMode(false);
        setModalOpen(true);
    };

    const handleSave = async (data) => {
        setSaving(true);
        try {
            if (selectedIncident) {
                await updateIncident(selectedIncident.id, data);
                enqueueSnackbar('Incidente atualizado com sucesso!', { variant: 'success' });
            } else {
                await createIncident(data);
                enqueueSnackbar('Incidente criado com sucesso!', { variant: 'success' });
            }
            setModalOpen(false);
            fetchData();
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error, 'Erro ao salvar incidente.'), { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (incidentId) => {
        setIncidents(prev => prev.filter(i => i.id !== incidentId));
        setSelectedIds(prev => prev.filter(id => id !== incidentId));
        setModalOpen(false);
        deleteWithUndo({
            message: 'Incidente excluído',
            onConfirm: () => deleteIncident(incidentId),
            onRefresh: fetchData,
        });
    };

    const handleStatusChange = async (incidentId, newStatus) => {
        setIncidents(prev => prev.map(i => i.id === incidentId ? { ...i, status: newStatus } : i));
        try {
            await updateIncident(incidentId, { status: newStatus });
        } catch (e) {
            enqueueSnackbar('Erro ao atualizar status', { variant: 'error' });
            fetchData();
        }
    };

    const handleBulkClose = async () => {
        const ids = [...selectedIds];
        setIncidents(prev => prev.map(i => ids.includes(i.id) ? { ...i, status: 'CLOSED' } : i));
        setSelectedIds([]);
        await Promise.allSettled(ids.map(id => updateIncident(id, { status: 'CLOSED' })));
        enqueueSnackbar(`${ids.length} incidentes fechados`, { variant: 'success' });
        fetchData();
    };

    const handleBulkDelete = () => {
        const ids = [...selectedIds];
        setIncidents(prev => prev.filter(i => !ids.includes(i.id)));
        setSelectedIds([]);
        deleteWithUndo({
            message: `${ids.length} incidentes excluídos`,
            onConfirm: () => Promise.allSettled(ids.map(id => deleteIncident(id))),
            onRefresh: fetchData,
        });
    };


    const statCards = [
        { key: 'open', label: 'Abertos', value: kpis.open, icon: <Warning />, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
        { key: 'inProgress', label: 'Em Andamento', value: kpis.inProgress, icon: <Loop />, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
        { key: 'resolved', label: 'Resolvidos', value: kpis.resolved, icon: <CheckCircle />, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)' },
        { key: 'resolvedToday', label: 'Resolvidos Hoje', value: kpis.resolvedToday, icon: <DoneAll />, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
        { key: 'slaBreached', label: 'SLA Estourado', value: kpis.slaBreached, icon: <ErrorOutline />, color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' }
    ];

    const inputSx = {
        '& .MuiOutlinedInput-root': {
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
            borderRadius: 2,
            color: textPrimary,
            '& fieldset': { borderColor: borderSubtle },
            '&:hover fieldset': { borderColor: 'rgba(102, 126, 234, 0.5)' },
            '&.Mui-focused fieldset': { borderColor: '#667eea' }
        },
        '& .MuiInputLabel-root': { color: textMuted },
        '& .MuiSelect-icon': { color: textMuted }
    };

    return (
        <Box>
            {/* Page Header */}
            <Box sx={{
                mb: 3, p: 3, borderRadius: '16px',
                background: cardBg,
                backdropFilter: isDark ? 'blur(10px)' : 'none',
                border: cardBorder,
                boxShadow: cardShadow,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span className="material-icons-round" style={{ fontSize: '36px', color: '#f59e0b' }}>warning</span>
                    <Box>
                        <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>
                            Gestão de Incidentes
                        </Typography>
                    </Box>
                </Box>
                {canWrite && (
                    <Button
                        onClick={handleOpenCreate}
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 1,
                            padding: '12px 20px', borderRadius: '12px',
                            fontSize: '14px', fontWeight: 600, textTransform: 'none',
                            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
                        }}
                        startIcon={<Add />}
                    >
                        Novo Incidente
                    </Button>
                )}
            </Box>

            {/* Filters */}
            <Box sx={{ mb: 3, borderRadius: '16px', background: cardBg, backdropFilter: isDark ? 'blur(10px)' : 'none', border: cardBorder, boxShadow: cardShadow, overflow: 'hidden' }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: showFilters ? `1px solid ${borderSubtle}` : 'none' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: textPrimary }}>
                        <FilterAlt fontSize="small" />
                        <Typography fontWeight={600}>Filtros</Typography>
                        {(() => {
                            const activeCount = [filters.status, filters.priority, filters.categoryId, filters.assigneeId, filters.slaBreached].filter(Boolean).length;
                            return activeCount > 0 ? (
                                <Box sx={{ px: 1, py: 0.25, borderRadius: '10px', fontSize: '10px', fontWeight: 700, bgcolor: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' }}>{activeCount}</Box>
                            ) : null;
                        })()}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" startIcon={<Refresh />} onClick={clearFilters} sx={{ color: textMuted, textTransform: 'none', '&:hover': { bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' } }}>Limpar</Button>
                        <IconButton size="small" onClick={() => setShowFilters(!showFilters)} sx={{ color: textMuted }}>{showFilters ? '▲' : '▼'}</IconButton>
                    </Box>
                </Box>
                <Collapse in={showFilters}>
                    <Box sx={{ p: 3, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
                        <TextField select label="Status" size="small" value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))} sx={inputSx}>
                            <MenuItem value="">Todos</MenuItem>
                            <MenuItem value="OPEN">Aberto</MenuItem>
                            <MenuItem value="IN_PROGRESS">Em Andamento</MenuItem>
                            <MenuItem value="PENDING">Pendente</MenuItem>
                            <MenuItem value="RESOLVED">Resolvido</MenuItem>
                            <MenuItem value="CLOSED">Fechado</MenuItem>
                        </TextField>
                        <TextField select label="Prioridade" size="small" value={filters.priority} onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))} sx={inputSx}>
                            <MenuItem value="">Todas</MenuItem>
                            <MenuItem value="P1">P1 - Crítica</MenuItem>
                            <MenuItem value="P2">P2 - Alta</MenuItem>
                            <MenuItem value="P3">P3 - Média</MenuItem>
                            <MenuItem value="P4">P4 - Baixa</MenuItem>
                        </TextField>
                        <TextField select label="Categoria" size="small" value={filters.categoryId} onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value }))} sx={inputSx}>
                            <MenuItem value="">Todas</MenuItem>
                            {categories.map(cat => (<MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>))}
                        </TextField>
                        <TextField select label="Responsável" size="small" value={filters.assigneeId} onChange={(e) => setFilters(prev => ({ ...prev, assigneeId: e.target.value }))} sx={inputSx}>
                            <MenuItem value="">Todos</MenuItem>
                            {users.map(user => (<MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>))}
                        </TextField>
                        <TextField select label="SLA" size="small" value={filters.slaBreached} onChange={(e) => setFilters(prev => ({ ...prev, slaBreached: e.target.value }))} sx={inputSx}>
                            <MenuItem value="">Todos</MenuItem>
                            <MenuItem value="true">Estourado</MenuItem>
                            <MenuItem value="false">No Prazo</MenuItem>
                        </TextField>
                    </Box>
                </Collapse>
            </Box>

            {/* KPI Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, mb: 3 }}>
                {statCards.map((card, idx) => (
                    <Box
                        key={card.key}
                        sx={{
                            p: 2.5, borderRadius: '16px',
                            background: cardBg,
                            backdropFilter: isDark ? 'blur(10px)' : 'none',
                            border: cardBorder,
                            boxShadow: cardShadow,
                            position: 'relative', overflow: 'hidden',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer',
                            animation: `kpiSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${idx * 0.08}s both`,
                            '@keyframes kpiSlideIn': {
                                '0%': { opacity: 0, transform: 'translateY(20px) scale(0.98)' },
                                '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
                            },
                            '&:hover': { transform: 'translateY(-4px)', borderColor: 'rgba(37, 99, 235, 0.3)', boxShadow: isDark ? '0 12px 28px rgba(0, 0, 0, 0.4)' : '0 12px 28px rgba(0, 0, 0, 0.1)' },
                            '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: '16px 16px 0 0', background: card.color }
                        }}
                        onClick={() => {
                            if (card.key === 'slaBreached') setFilters(prev => ({ ...prev, slaBreached: 'true', status: '' }));
                            else if (card.key === 'resolvedToday') setFilters(prev => ({ ...prev, status: 'RESOLVED', slaBreached: '' }));
                            else setFilters(prev => ({ ...prev, status: card.key === 'open' ? 'OPEN' : card.key === 'inProgress' ? 'IN_PROGRESS' : card.key === 'resolved' ? 'RESOLVED' : '', slaBreached: '' }));
                        }}
                    >
                        <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: card.bgColor, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>{card.icon}</Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 500, color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>{card.label}</Typography>
                        <Typography sx={{ fontSize: 32, fontWeight: 700, color: textPrimary, lineHeight: 1 }}>{card.value}</Typography>
                    </Box>
                ))}
            </Box>

            {/* Table Section */}
            <Box sx={{ borderRadius: '16px', background: cardBg, backdropFilter: isDark ? 'blur(10px)' : 'none', border: cardBorder, boxShadow: cardShadow, overflow: 'hidden' }}>
                <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${borderSubtle}` }}>
                    <Typography fontWeight={600} color={textPrimary}>Lista de Incidentes</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <ExportButton data={filteredIncidents} columns={EXPORT_COLUMNS.incidents} filename="incidentes" compact />
                        <TextField
                            placeholder="Buscar incidente..."
                            size="small"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><Search sx={{ color: textMuted }} /></InputAdornment>) }}
                            sx={{ width: 250, ...inputSx }}
                        />
                        <Paper elevation={0} sx={{ display: 'flex', p: 0.5, borderRadius: 2, background: 'transparent', backgroundImage: 'none', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <Tooltip title="Lista">
                                <IconButton size="small" onClick={() => setViewMode('LIST')} sx={{ borderRadius: 1.5, color: viewMode === 'LIST' ? '#667eea' : '#9ca3af', bgcolor: viewMode === 'LIST' ? 'rgba(102, 126, 234, 0.15)' : 'transparent' }}>
                                    <FormatListBulleted fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Kanban">
                                <IconButton size="small" onClick={() => setViewMode('KANBAN')} sx={{ borderRadius: 1.5, color: viewMode === 'KANBAN' ? '#667eea' : '#9ca3af', bgcolor: viewMode === 'KANBAN' ? 'rgba(102, 126, 234, 0.15)' : 'transparent' }}>
                                    <ViewKanban fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Paper>
                    </Box>
                </Box>

                {loading ? (
                    <Box sx={{ p: 2 }}><TableSkeleton rows={5} columns={8} /></Box>
                ) : filteredIncidents.length === 0 ? (
                    <EmptyState
                        title="Nenhum incidente encontrado"
                        description="Não encontramos incidentes com os filtros atuais."
                        action={<Button variant="outlined" size="small" onClick={handleOpenCreate} sx={{ borderColor: 'rgba(245, 158, 11, 0.5)', color: '#f59e0b', '&:hover': { borderColor: '#f59e0b', bgcolor: 'rgba(245, 158, 11, 0.1)' } }}>Registrar Incidente</Button>}
                    />
                ) : viewMode === 'KANBAN' ? (
                    <Box sx={{ p: 2 }}>
                        <IncidentKanban
                            incidents={filteredIncidents}
                            onView={handleOpenView}
                            onEdit={handleOpenEdit}
                        />
                    </Box>
                ) : (
                    <>
                        <BulkActionsBar
                            selectedCount={selectedIds.length}
                            totalCount={paginatedIncidents.length}
                            onSelectAll={() => setSelectedIds(selectedIds.length === paginatedIncidents.length ? [] : paginatedIncidents.map(i => i.id))}
                            onClear={() => setSelectedIds([])}
                            actions={[
                                { label: 'Fechar', icon: <CloseIcon sx={{ fontSize: 16 }} />, onClick: handleBulkClose, color: '#64748b' },
                                { label: 'Excluir', icon: <DeleteIcon sx={{ fontSize: 16 }} />, onClick: handleBulkDelete, color: '#ef4444' },
                            ]}
                        />
                        <IncidentList
                            incidents={paginatedIncidents}
                            onView={handleOpenView}
                            onEdit={handleOpenEdit}
                            onRefresh={fetchData}
                            onStatusChange={handleStatusChange}
                            selectedIds={selectedIds}
                            onSelectionChange={setSelectedIds}
                            canWrite={canWrite}
                        />
                    </>
                )}

                {/* Pagination */}
                {filteredIncidents.length > 0 && viewMode === 'LIST' && (
                    <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <Typography sx={{ fontSize: 14, color: '#9ca3af' }}>
                            Exibindo {((page - 1) * rowsPerPage) + 1}-{Math.min(page * rowsPerPage, filteredIncidents.length)} de {filteredIncidents.length} registros
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton size="small" disabled={page === 1} onClick={() => setPage(p => p - 1)} sx={{ width: 36, height: 36, borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.1)', bgcolor: 'rgba(255, 255, 255, 0.03)', color: '#e0e0e0', '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.2)', borderColor: '#667eea' }, '&.Mui-disabled': { color: '#4a5568', borderColor: 'rgba(255, 255, 255, 0.05)' } }}>‹</IconButton>
                            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.1)', bgcolor: 'rgba(255, 255, 255, 0.03)', color: '#e0e0e0', fontSize: 14 }}>{page} / {totalPages || 1}</Box>
                            <IconButton size="small" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} sx={{ width: 36, height: 36, borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.1)', bgcolor: 'rgba(255, 255, 255, 0.03)', color: '#e0e0e0', '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.2)', borderColor: '#667eea' }, '&.Mui-disabled': { color: '#4a5568', borderColor: 'rgba(255, 255, 255, 0.05)' } }}>›</IconButton>
                        </Box>
                    </Box>
                )}
            </Box>

            <IncidentModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                onUpdate={fetchData}
                onDelete={handleDelete}
                incident={selectedIncident}
                isViewMode={isViewMode}
                loading={saving}
                categories={categories}
                users={users}
            />

            <IncidentViewModal
                open={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                incident={selectedIncident}
                onEdit={canWrite ? handleViewToEdit : undefined}
            />
        </Box >
    );
};

export default IncidentsPage;
