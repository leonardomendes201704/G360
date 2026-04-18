import { useState, useEffect, useMemo, useContext } from 'react';
import { useSnackbar } from 'notistack';
import {
    Search, CalendarToday, FormatListBulleted, FilterAlt,
    Refresh
} from '@mui/icons-material';
import {
    Box, Paper, Typography, Button, TextField, MenuItem,
    InputAdornment, IconButton, Tooltip, useTheme
} from '@mui/material';
import FilterDrawer from '../../components/common/FilterDrawer';
import StatsCard from '../../components/common/StatsCard';
import KpiGrid from '../../components/common/KpiGrid';
import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';

import ChangeCalendar from '../../components/changes/ChangeCalendar';
import DataListTable from '../../components/common/DataListTable';
import { getChangeRequestColumns } from './changeRequestListColumns';
import { sortChangeRequestRows } from './changeRequestListSort';
import ChangeRequestDashboard from '../../components/changes/ChangeRequestDashboard';
import { getChanges, createChange, updateChange, deleteChange, getMetrics } from '../../services/change-request.service';
import { getReferenceUsers } from '../../services/reference.service';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getErrorMessage } from '../../utils/errorUtils';
import EmptyState from '../../components/common/EmptyState';
import DataListShell from '../../components/common/DataListShell';
import TableSkeleton from '../../components/common/TableSkeleton';
import ExportButton from '../../components/common/ExportButton';
import { EXPORT_COLUMNS } from '../../utils/exportUtils';
import ChangeModal from '../../components/modals/ChangeModal';
import ChangeViewModal from '../../components/modals/ChangeViewModal';

const GMUD_DRAWER_FILTER_DEFAULTS = {
    status: '',
    risk: '',
    type: '',
    impact: '',
    responsibleId: '',
    dateFrom: '',
    dateTo: '',
};

const ChangeRequestsPage = () => {
    const [changes, setChanges] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [draftFilters, setDraftFilters] = useState(GMUD_DRAWER_FILTER_DEFAULTS);

    // Theme context
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();
    const isDark = mode === 'dark';
    const { hasPermission } = useContext(AuthContext);
    const canWrite = hasPermission('GMUD', 'CREATE');
    const canEdit = hasPermission('GMUD', 'EDIT_CHANGE');

    // Theme-aware styles
    const textPrimary = isDark ? '#f1f5f9' : theme.palette.text.primary;
    const textSecondary = isDark ? '#64748b' : theme.palette.text.secondary;
    const textMuted = isDark ? '#9ca3af' : theme.palette.text.disabled;
    const cardBg = isDark ? 'rgba(22, 29, 38, 0.5)' : '#ffffff';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const cardShadow = isDark ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.07)';
    const headerBg = cardBg;
    const headerBorder = borderColor;
    const toggleGroupBg = isDark ? 'rgba(0, 0, 0, 0.2)' : '#f1f5f9';
    const toggleActiveBg = isDark ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.15)';
    const toggleActiveText = isDark ? '#a5b4fc' : '#2563eb';
    const toggleText = isDark ? '#64748b' : '#64748b';
    const filterBg = cardBg;
    const filterBorder = borderColor;
    const filterHeaderBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    const filterHoverBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9';

    // Backend Metrics State
    const [backendMetrics, setBackendMetrics] = useState(null);
    const [metricsLoading, setMetricsLoading] = useState(false);

    // Extended filters
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        risk: '',
        type: '',
        impact: '',
        responsibleId: '',
        dateFrom: '',
        dateTo: ''
    });

    const activeDrawerFilterCount = useMemo(
        () => [filters.status, filters.risk, filters.type, filters.impact, filters.responsibleId, filters.dateFrom, filters.dateTo].filter(Boolean).length,
        [filters.status, filters.risk, filters.type, filters.impact, filters.responsibleId, filters.dateFrom, filters.dateTo]
    );

    const filteredChanges = useMemo(() => {
        return changes.filter(c => {
            const matchesSearch = filters.search === '' ||
                (c.code?.toLowerCase().includes(filters.search.toLowerCase()) ||
                    c.title?.toLowerCase().includes(filters.search.toLowerCase()));
            const matchesStatus = filters.status === '' ||
                (filters.status === 'GROUP_PENDING' ? (c.status === 'PENDING_APPROVAL' || c.status === 'DRAFT') :
                    filters.status === 'GROUP_APPROVED' ? (c.status === 'APPROVED' || c.status === 'APPROVED_WAITING_EXECUTION') :
                        filters.status === 'GROUP_COMPLETED' ? (c.status === 'COMPLETED' || c.status === 'CLOSED') :
                            filters.status === 'GROUP_REJECTED' ? (c.status === 'REJECTED' || c.status === 'FAILED' || c.status === 'CANCELLED') :
                                c.status === filters.status);
            const matchesRisk = filters.risk === '' || c.riskLevel === filters.risk;
            const matchesType = filters.type === '' || c.type === filters.type;
            const matchesImpact = filters.impact === '' || c.impact === filters.impact;
            const matchesResponsible = filters.responsibleId === '' || String(c.requesterId) === String(filters.responsibleId);

            // Date filter
            let matchesDate = true;
            if (filters.dateFrom) {
                const changeDate = new Date(c.scheduledStart);
                const filterDate = new Date(filters.dateFrom);
                // Compare only dates (ignoring time)
                changeDate.setHours(0, 0, 0, 0);
                filterDate.setHours(0, 0, 0, 0);
                matchesDate = matchesDate && changeDate >= filterDate;
            }
            if (filters.dateTo) {
                const changeDate = new Date(c.scheduledStart);
                const filterDate = new Date(filters.dateTo);
                // Compare only dates (ignoring time)
                changeDate.setHours(0, 0, 0, 0);
                filterDate.setHours(0, 0, 0, 0);
                matchesDate = matchesDate && changeDate <= filterDate;
            }

            return matchesSearch && matchesStatus && matchesRisk && matchesType && matchesImpact && matchesResponsible && matchesDate;
        });
    }, [changes, filters]);

    // Estados do Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedChange, setSelectedChange] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Estado da View (Dashboard vs Lista vs Calendario)
    const [viewMode, setViewMode] = useState('DASHBOARD'); // 'DASHBOARD', 'LIST', 'CALENDAR'
    const [modalTab, setModalTab] = useState('geral');

    const resetPaginationKey = useMemo(
        () =>
            `${filters.search}|${filters.status}|${filters.risk}|${filters.type}|${filters.impact}|${filters.responsibleId}|${filters.dateFrom}|${filters.dateTo}|${viewMode}`,
        [
            filters.search,
            filters.status,
            filters.risk,
            filters.type,
            filters.impact,
            filters.responsibleId,
            filters.dateFrom,
            filters.dateTo,
            viewMode,
        ]
    );

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [sendConfirm, setSendConfirm] = useState({ open: false, gmud: null });

    const { enqueueSnackbar } = useSnackbar();

    // Status counts for KPI cards with real trend calculations
    const kpiCounts = useMemo(() => {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const thisMonthChanges = changes.filter(c => new Date(c.createdAt) >= thisMonth);
        const lastMonthChanges = changes.filter(c => {
            const d = new Date(c.createdAt);
            return d >= lastMonth && d <= lastMonthEnd;
        });

        const calcTrend = (current, previous) => {
            if (previous === 0) return current > 0 ? '+100%' : '0%';
            const pct = Math.round(((current - previous) / previous) * 100);
            return pct >= 0 ? `+${pct}%` : `${pct}%`;
        };

        const pending = changes.filter(c => c.status === 'PENDING_APPROVAL' || c.status === 'DRAFT').length;
        const approved = changes.filter(c => c.status === 'APPROVED' || c.status === 'APPROVED_WAITING_EXECUTION').length;
        const inProgress = changes.filter(c => c.status === 'EXECUTED').length;
        const completed = changes.filter(c => c.status === 'COMPLETED' || c.status === 'CLOSED').length;
        const rejected = changes.filter(c => c.status === 'REJECTED' || c.status === 'FAILED' || c.status === 'CANCELLED').length;

        const pendingLM = lastMonthChanges.filter(c => c.status === 'PENDING_APPROVAL' || c.status === 'DRAFT').length;
        const approvedLM = lastMonthChanges.filter(c => c.status === 'APPROVED' || c.status === 'APPROVED_WAITING_EXECUTION').length;
        const inProgressLM = lastMonthChanges.filter(c => c.status === 'EXECUTED').length;
        const completedLM = lastMonthChanges.filter(c => c.status === 'COMPLETED' || c.status === 'CLOSED').length;
        const rejectedLM = lastMonthChanges.filter(c => c.status === 'REJECTED' || c.status === 'FAILED' || c.status === 'CANCELLED').length;

        return {
            pending, approved, inProgress, completed, rejected,
            pendingTrend: calcTrend(pending, pendingLM),
            approvedTrend: calcTrend(approved, approvedLM),
            inProgressTrend: calcTrend(inProgress, inProgressLM),
            completedTrend: calcTrend(completed, completedLM),
            rejectedTrend: calcTrend(rejected, rejectedLM)
        };
    }, [changes]);

    const fetchChanges = async () => {
        setLoading(true);
        try {
            const data = await getChanges();
            setChanges(data);
            setSelectedChange(prev => {
                if (!prev) return null;
                return data.find(c => c.id === prev.id) || prev;
            });
            return data;
        } catch (error) {
            console.error(error);
            enqueueSnackbar(getErrorMessage(error, 'Erro ao carregar GMUDs.'), { variant: 'error' });
            return [];
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await getReferenceUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchMetrics = async () => {
        setMetricsLoading(true);
        try {
            const data = await getMetrics();
            setBackendMetrics(data);
        } catch (error) {
            console.error('Error fetching metrics:', error);
        } finally {
            setMetricsLoading(false);
        }
    };

    useEffect(() => {
        const handleDeepLink = async () => {
            const data = await fetchChanges();
            await fetchUsers();
            await fetchMetrics(); // Load backend metrics

            const params = new URLSearchParams(window.location.search);
            const deepLinkId = params.get('id');
            const deepLinkAction = params.get('action');

            if (deepLinkId && data.length > 0) {
                const targetGmud = data.find(c => c.id === deepLinkId);
                if (targetGmud) {
                    if (deepLinkAction === 'approve') {
                        setModalTab('aprovacao');
                        handleOpenView(targetGmud);
                        window.history.replaceState({}, document.title, window.location.pathname);
                    } else {
                        handleOpenView(targetGmud);
                    }
                }
            }
        };

        handleDeepLink();
    }, []);

    // --- Handlers ---
    const handleOpenCreate = () => {
        setSelectedChange(null);
        setIsViewMode(false);
        setModalTab('geral');
        setModalOpen(true);
    };

    const handleOpenEdit = (gmud) => {
        setSelectedChange(gmud);
        setIsViewMode(false);
        if (!new URLSearchParams(window.location.search).get('action')) {
            setModalTab('geral');
        }
        setModalOpen(true);
    };

    const handleOpenView = (gmud) => {
        setSelectedChange(gmud);
        setViewModalOpen(true);
    };

    const handleViewToEdit = (gmud) => {
        setViewModalOpen(false);
        setSelectedChange(gmud);
        setIsViewMode(false);
        setModalTab('geral');
        setModalOpen(true);
    };

    const handleSave = async (data) => {
        setSaving(true);
        try {
            if (selectedChange) {
                await updateChange(selectedChange.id, data);
                enqueueSnackbar('GMUD atualizada com sucesso!', { variant: 'success' });
            } else {
                await createChange(data);
                enqueueSnackbar('GMUD criada com sucesso!', { variant: 'success' });
            }
            setModalOpen(false);
            fetchChanges();
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error, 'Erro ao salvar GMUD.'), { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteChange(deleteId);
            fetchChanges();
            enqueueSnackbar('GMUD excluida com sucesso.', { variant: 'success' });
            setConfirmOpen(false);
            setDeleteId(null);
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error, 'Erro ao excluir. Apenas rascunhos podem ser excluidos.'), { variant: 'error' });
        }
    };
    const handleSend = async (gmud) => {
        setLoading(true);
        try {
            await updateChange(gmud.id, { status: 'PENDING_APPROVAL' });
            enqueueSnackbar('GMUD enviada para aprovacao com sucesso!', { variant: 'success' });
            fetchChanges();
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error, 'Erro ao enviar para aprovacao.'), { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = (gmud) => {
        setSendConfirm({ open: true, gmud });
    };

    const handleConfirmSend = async () => {
        const gmud = sendConfirm.gmud;
        if (!gmud) return;
        setSendConfirm({ open: false, gmud: null });
        await handleSend(gmud);
    };

    const clearFilters = () => {
        setDraftFilters({ ...GMUD_DRAWER_FILTER_DEFAULTS });
        setFilters({
            search: '',
            ...GMUD_DRAWER_FILTER_DEFAULTS,
        });
    };

    const openFilterDrawer = () => {
        setDraftFilters({
            status: filters.status,
            risk: filters.risk,
            type: filters.type,
            impact: filters.impact,
            responsibleId: filters.responsibleId,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
        });
        setFilterDrawerOpen(true);
    };

    const handleApplyDrawerFilters = () => {
        setFilters((prev) => ({ ...prev, ...draftFilters }));
    };

    const handleClearDrawerOnly = () => {
        setDraftFilters({ ...GMUD_DRAWER_FILTER_DEFAULTS });
        setFilters((prev) => ({ ...prev, ...GMUD_DRAWER_FILTER_DEFAULTS }));
    };

    const statCards = [
        { key: 'pending', label: 'Pendentes Aprovação', value: kpiCounts.pending, iconName: 'schedule', hexColor: '#f59e0b', trend: kpiCounts.pendingTrend },
        { key: 'approved', label: 'Aprovadas', value: kpiCounts.approved, iconName: 'check_circle', hexColor: '#10b981', trend: kpiCounts.approvedTrend },
        { key: 'inProgress', label: 'Em Execução', value: kpiCounts.inProgress, iconName: 'loop', hexColor: '#3b82f6', trend: kpiCounts.inProgressTrend },
        { key: 'completed', label: 'Concluídas', value: kpiCounts.completed, iconName: 'done_all', hexColor: '#8b5cf6', trend: kpiCounts.completedTrend },
        { key: 'rejected', label: 'Rejeitadas', value: kpiCounts.rejected, iconName: 'cancel', hexColor: '#ef4444', trend: kpiCounts.rejectedTrend }
    ];

    const handleKpiClick = (cardKey) => {
        setFilters((prev) => ({
            ...prev,
            status: cardKey === 'pending' ? 'GROUP_PENDING' :
                cardKey === 'approved' ? 'GROUP_APPROVED' :
                    cardKey === 'inProgress' ? 'EXECUTED' :
                        cardKey === 'completed' ? 'GROUP_COMPLETED' :
                            cardKey === 'rejected' ? 'GROUP_REJECTED' : ''
        }));
    };

    // Theme-aware input styles
    const inputSx = {
        '& .MuiOutlinedInput-root': {
            bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
            borderRadius: '8px',
            color: textPrimary,
            '& fieldset': { borderColor: borderColor },
            '&:hover fieldset': { borderColor: 'rgba(102, 126, 234, 0.5)' },
            '&.Mui-focused fieldset': { borderColor: '#667eea' }
        },
        '& .MuiInputLabel-root': { color: textMuted },
        '& .MuiSelect-icon': { color: textMuted }
    };

    const gmudListShellSx = {
        borderRadius: '8px',
        background: cardBg,
        backdropFilter: isDark ? 'blur(10px)' : 'none',
        border: `1px solid ${borderColor}`,
        overflow: 'hidden',
    };

    const gmudListToolbar = (
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <ExportButton data={filteredChanges} columns={EXPORT_COLUMNS.changes} filename="gmuds" compact />
            <TextField
                placeholder="Buscar GMUD..."
                size="small"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <Search sx={{ color: textMuted }} />
                        </InputAdornment>
                    ),
                }}
                sx={{
                    width: 250,
                    ...inputSx,
                }}
            />
            <Paper
                elevation={0}
                sx={{
                    display: 'flex',
                    p: 0.5,
                    borderRadius: '8px',
                    background: 'transparent',
                    backgroundImage: 'none',
                    border: `1px solid ${filterHeaderBorder}`,
                }}
            >
                <Tooltip title="Lista">
                    <IconButton
                        size="small"
                        onClick={() => setViewMode('LIST')}
                        sx={{
                            borderRadius: '8px',
                            color: viewMode === 'LIST' ? '#667eea' : textMuted,
                            bgcolor: viewMode === 'LIST' ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
                            '&:hover': { bgcolor: viewMode === 'LIST' ? 'rgba(102, 126, 234, 0.2)' : filterHoverBg },
                        }}
                    >
                        <FormatListBulleted fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Calendario">
                    <IconButton
                        size="small"
                        onClick={() => setViewMode('CALENDAR')}
                        sx={{
                            borderRadius: '8px',
                            color: viewMode === 'CALENDAR' ? '#667eea' : textMuted,
                            bgcolor: viewMode === 'CALENDAR' ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
                            '&:hover': { bgcolor: viewMode === 'CALENDAR' ? 'rgba(102, 126, 234, 0.2)' : filterHoverBg },
                        }}
                    >
                        <CalendarToday fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Paper>
        </Box>
    );

    return (
        <Box>
            {/* Page Header */}
            <Box
                sx={{
                    mb: 3,
                    p: 3,
                    borderRadius: '8px',
                    background: headerBg,
                    backdropFilter: isDark ? 'blur(10px)' : 'none',
                    border: `1px solid ${headerBorder}`,
                    boxShadow: cardShadow,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span className="material-icons-round" style={{ fontSize: '36px', color: '#2563eb' }}>sync_alt</span>
                    <Box>
                        <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>
                            Gestão de Mudança (GMUD)
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {/* View Toggle Buttons */}
                    <Box sx={{ display: 'flex', gap: 1, bgcolor: toggleGroupBg, borderRadius: '8px', p: 0.5 }}>
                        <Tooltip title="Dashboard">
                            <IconButton
                                onClick={() => setViewMode('DASHBOARD')}
                                sx={{
                                    borderRadius: '8px',
                                    bgcolor: viewMode === 'DASHBOARD' ? toggleActiveBg : 'transparent',
                                    color: viewMode === 'DASHBOARD' ? toggleActiveText : toggleText,
                                    '&:hover': { bgcolor: toggleActiveBg }
                                }}
                            >
                                <span className="material-icons-round" style={{ fontSize: 20 }}>dashboard</span>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Lista">
                            <IconButton
                                onClick={() => setViewMode('LIST')}
                                sx={{
                                    borderRadius: '8px',
                                    bgcolor: viewMode === 'LIST' ? toggleActiveBg : 'transparent',
                                    color: viewMode === 'LIST' ? toggleActiveText : toggleText,
                                    '&:hover': { bgcolor: toggleActiveBg }
                                }}
                            >
                                <span className="material-icons-round" style={{ fontSize: 20 }}>list</span>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Calendário">
                            <IconButton
                                onClick={() => setViewMode('CALENDAR')}
                                sx={{
                                    borderRadius: '8px',
                                    bgcolor: viewMode === 'CALENDAR' ? toggleActiveBg : 'transparent',
                                    color: viewMode === 'CALENDAR' ? toggleActiveText : toggleText,
                                    '&:hover': { bgcolor: toggleActiveBg }
                                }}
                            >
                                <span className="material-icons-round" style={{ fontSize: 20 }}>calendar_today</span>
                            </IconButton>
                        </Tooltip>
                    </Box>
                    {canWrite && (
                        <Button
                            onClick={handleOpenCreate}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                padding: '12px 20px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 600,
                                textTransform: 'none',
                                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                color: 'white',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
                                },
                            }}
                            startIcon={<span className="material-icons-round">add</span>}
                        >
                            Nova GMUD
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Filtros — barra compacta + drawer (padrão incidentes) */}
            <Box
                sx={{
                    mb: 3,
                    borderRadius: '8px',
                    background: filterBg,
                    backdropFilter: isDark ? 'blur(10px)' : 'none',
                    border: `1px solid ${filterBorder}`,
                    overflow: 'hidden'
                }}
            >
                <Box sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: textPrimary }}>
                        <Button
                            size="medium"
                            startIcon={<FilterAlt />}
                            onClick={openFilterDrawer}
                            sx={{
                                color: textPrimary,
                                textTransform: 'none',
                                fontWeight: 600,
                                '&:hover': { bgcolor: filterHoverBg },
                            }}
                        >
                            Filtros
                        </Button>
                        {activeDrawerFilterCount > 0 ? (
                            <Box sx={{ px: 1, py: 0.25, borderRadius: '8px', fontSize: '10px', fontWeight: 700, bgcolor: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' }}>
                                {activeDrawerFilterCount}
                            </Box>
                        ) : null}
                    </Box>
                    <Button
                        size="small"
                        startIcon={<Refresh />}
                        onClick={clearFilters}
                        sx={{
                            color: textMuted,
                            textTransform: 'none',
                            '&:hover': { bgcolor: filterHoverBg }
                        }}
                    >
                        Limpar tudo
                    </Button>
                </Box>
            </Box>

            <FilterDrawer
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                onApply={handleApplyDrawerFilters}
                onClear={handleClearDrawerOnly}
                title="Filtros de GMUD"
            >
                <TextField
                    select
                    fullWidth
                    label="Status"
                    size="small"
                    value={draftFilters.status}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value }))}
                    sx={inputSx}
                >
                    <MenuItem value="">Todos os Status</MenuItem>
                    <MenuItem value="GROUP_PENDING">Todas Pendentes (Rascunho + Pendente)</MenuItem>
                    <MenuItem value="GROUP_APPROVED">Todas Aprovadas (Aguardando + Aprovadas)</MenuItem>
                    <MenuItem value="GROUP_COMPLETED">Todas Concluidas (Completas + Fechadas)</MenuItem>
                    <MenuItem value="GROUP_REJECTED">Todas Rejeitadas (Rejeitadas + Falhas)</MenuItem>
                    <MenuItem value="DRAFT">Rascunho</MenuItem>
                    <MenuItem value="PENDING_APPROVAL">Pendente Aprovação</MenuItem>
                    <MenuItem value="APPROVED">Aprovada</MenuItem>
                    <MenuItem value="APPROVED_WAITING_EXECUTION">Aguardando Execução</MenuItem>
                    <MenuItem value="EXECUTED">Em Execução</MenuItem>
                    <MenuItem value="COMPLETED">Concluída</MenuItem>
                    <MenuItem value="REJECTED">Rejeitada</MenuItem>
                    <MenuItem value="FAILED">Falha</MenuItem>
                </TextField>

                <TextField
                    select
                    fullWidth
                    label="Prioridade/Risco"
                    size="small"
                    value={draftFilters.risk}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, risk: e.target.value }))}
                    sx={inputSx}
                >
                    <MenuItem value="">Todas as Prioridades</MenuItem>
                    <MenuItem value="CRITICO">Crítica</MenuItem>
                    <MenuItem value="ALTO">Alta</MenuItem>
                    <MenuItem value="MEDIO">Média</MenuItem>
                    <MenuItem value="BAIXO">Baixa</MenuItem>
                </TextField>

                <TextField
                    select
                    fullWidth
                    label="Tipo de Mudança"
                    size="small"
                    value={draftFilters.type}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, type: e.target.value }))}
                    sx={inputSx}
                >
                    <MenuItem value="">Todos os Tipos</MenuItem>
                    <MenuItem value="EMERGENCIAL">Emergencial</MenuItem>
                    <MenuItem value="PADRAO">Padrão</MenuItem>
                    <MenuItem value="NORMAL">Planejada</MenuItem>
                </TextField>

                <TextField
                    type="date"
                    fullWidth
                    label="Data agendada — início"
                    size="small"
                    value={draftFilters.dateFrom}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                        ...inputSx,
                        '& .MuiOutlinedInput-root': {
                            ...inputSx['& .MuiOutlinedInput-root'],
                            height: '40px'
                        }
                    }}
                />

                <TextField
                    type="date"
                    fullWidth
                    label="Data agendada — fim"
                    size="small"
                    value={draftFilters.dateTo}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                        ...inputSx,
                        '& .MuiOutlinedInput-root': {
                            ...inputSx['& .MuiOutlinedInput-root'],
                            height: '40px'
                        }
                    }}
                />

                <TextField
                    select
                    fullWidth
                    label="Responsável"
                    size="small"
                    value={draftFilters.responsibleId}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, responsibleId: e.target.value }))}
                    sx={inputSx}
                >
                    <MenuItem value="">Todos os Responsáveis</MenuItem>
                    {users.map(user => (
                        <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    fullWidth
                    label="Impacto"
                    size="small"
                    value={draftFilters.impact}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, impact: e.target.value }))}
                    sx={inputSx}
                >
                    <MenuItem value="">Todos os Impactos</MenuItem>
                    <MenuItem value="MAIOR">Alto</MenuItem>
                    <MenuItem value="SIGNIFICATIVO">Médio</MenuItem>
                    <MenuItem value="MENOR">Baixo</MenuItem>
                </TextField>
            </FilterDrawer>

            {/* DASHBOARD VIEW */}
            {viewMode === 'DASHBOARD' && (
                <ChangeRequestDashboard
                    changes={changes}
                    loading={loading}
                    onRefresh={fetchChanges}
                    onSelectChange={(change) => {
                        setSelectedChange(change);
                        setIsViewMode(true);
                        setModalOpen(true);
                    }}
                />
            )}

            {/* LIST/CALENDAR VIEW - Stat Cards */}
            {viewMode !== 'DASHBOARD' && (
                <>
                    <KpiGrid maxColumns={8}>
                        {statCards.map((card) => (
                            <StatsCard
                                key={card.key}
                                title={card.label}
                                value={card.value}
                                iconName={card.iconName}
                                hexColor={card.hexColor}
                                subtitle={`${(card.trend || '0%').startsWith('+') ? '↑' : '↓'} ${card.trend || '0%'} vs. mês anterior`}
                                onClick={() => handleKpiClick(card.key)}
                            />
                        ))}
                        {backendMetrics?.summary && (
                            <>
                                <StatsCard
                                    title="Taxa de Sucesso"
                                    value={`${backendMetrics.summary.successRate}%`}
                                    iconName="verified"
                                    hexColor="#10b981"
                                    subtitle="GMUDs executadas com sucesso"
                                />
                                <StatsCard
                                    title="MTTR (Tempo Medio)"
                                    value={`${backendMetrics.summary.mttrHours}h`}
                                    iconName="timer"
                                    hexColor="#2563eb"
                                    subtitle="Duracao media de execucao"
                                />
                                <StatsCard
                                    title="Entrega no Prazo"
                                    value={`${backendMetrics.summary.onTimeRate}%`}
                                    iconName="event_available"
                                    hexColor="#3b82f6"
                                    subtitle="Dentro da janela planejada"
                                />
                            </>
                        )}
                    </KpiGrid>

                    {/* Table Section — lista: DataListTable; calendário: shell + calendário */}
                    {loading ? (
                        <DataListShell
                            title="Lista de GMUDs"
                            titleIcon="sync_alt"
                            accentColor="#667eea"
                            count={filteredChanges.length}
                            sx={gmudListShellSx}
                            toolbar={gmudListToolbar}
                        >
                            <Box sx={{ p: 2 }}>
                                <TableSkeleton rows={5} columns={9} />
                            </Box>
                        </DataListShell>
                    ) : filteredChanges.length === 0 ? (
                        <DataListShell
                            title="Lista de GMUDs"
                            titleIcon="sync_alt"
                            accentColor="#667eea"
                            count={0}
                            sx={gmudListShellSx}
                            toolbar={gmudListToolbar}
                        >
                            <EmptyState
                                title="Nenhuma GMUD encontrada"
                                description="Nao encontramos solicitacoes com os filtros atuais."
                                action={
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={handleOpenCreate}
                                        sx={{
                                            borderColor: 'rgba(102, 126, 234, 0.5)',
                                            color: '#667eea',
                                            '&:hover': { borderColor: '#667eea', bgcolor: 'rgba(102, 126, 234, 0.1)' },
                                        }}
                                    >
                                        Criar Nova GMUD
                                    </Button>
                                }
                            />
                        </DataListShell>
                    ) : viewMode === 'CALENDAR' ? (
                        <DataListShell
                            title="Lista de GMUDs"
                            titleIcon="sync_alt"
                            accentColor="#667eea"
                            count={filteredChanges.length}
                            sx={gmudListShellSx}
                            toolbar={gmudListToolbar}
                        >
                            <ChangeCalendar changes={changes} onViewChange={handleOpenView} />
                        </DataListShell>
                    ) : (
                        <DataListTable
                            shell={{
                                title: 'Lista de GMUDs',
                                titleIcon: 'sync_alt',
                                accentColor: '#667eea',
                                count: filteredChanges.length,
                                toolbar: gmudListToolbar,
                                sx: gmudListShellSx,
                            }}
                            columns={getChangeRequestColumns({
                                isDark,
                                onEdit: handleOpenEdit,
                                onDelete: handleDeleteClick,
                                onView: handleOpenView,
                                onSend: handleSendRequest,
                            })}
                            rows={filteredChanges}
                            sortRows={sortChangeRequestRows}
                            defaultOrderBy="scheduledStart"
                            defaultOrder="desc"
                            getDefaultOrderForColumn={(id) =>
                                id === 'scheduledStart' || id === 'code' ? 'desc' : 'asc'
                            }
                            rowsPerPageDefault={10}
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            resetPaginationKey={resetPaginationKey}
                            emptyMessage="Nenhuma GMUD encontrada."
                            onRowClick={handleOpenView}
                        />
                    )}
                </>
            )}

            {/* MODAL CONECTADO */}
            <ChangeModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                change={selectedChange}
                isViewMode={isViewMode}
                loading={saving}
                onUpdate={fetchChanges}
                initialTab={modalTab}
            />

            {/* VIEW MODAL — Read-only */}
            <ChangeViewModal
                open={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                change={selectedChange}
                onEdit={canEdit ? handleViewToEdit : undefined}
            />

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Excluir GMUD"
                content="Tem certeza que deseja excluir esta GMUD? Esta acao nao pode ser desfeita. Apenas rascunhos podem ser excluidos."
            />

            <ConfirmDialog
                open={sendConfirm.open}
                onClose={() => setSendConfirm({ open: false, gmud: null })}
                onConfirm={handleConfirmSend}
                title="Enviar para aprovacao"
                content="Confirma o envio para aprovacao? O gestor responsavel sera notificado."
                confirmText="Enviar"
                confirmColor="primary"
            />
        </Box>
    );
};

export default ChangeRequestsPage;
