import { useState, useEffect, useMemo, useContext } from 'react';
import { useSnackbar } from 'notistack';
import {
    Add, Search, CalendarToday, FormatListBulleted, FilterAlt,
    Refresh, Download, AccessTime, CheckCircle, Loop, DoneAll, Cancel
} from '@mui/icons-material';
import {
    Box, Paper, Typography, Button, TextField, MenuItem,
    InputAdornment, IconButton, Collapse, Tooltip, useTheme
} from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';

import ChangeRequestList from '../../components/changes/ChangeRequestList';
import ChangeCalendar from '../../components/changes/ChangeCalendar';
import ChangeRequestDashboard from '../../components/changes/ChangeRequestDashboard';
import { getChanges, createChange, updateChange, deleteChange, getMetrics } from '../../services/change-request.service';
import { getReferenceUsers } from '../../services/reference.service';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getErrorMessage } from '../../utils/errorUtils';
import EmptyState from '../../components/common/EmptyState';
import TableSkeleton from '../../components/common/TableSkeleton';
import ExportButton from '../../components/common/ExportButton';
import { EXPORT_COLUMNS } from '../../utils/exportUtils';
import ChangeModal from '../../components/modals/ChangeModal';
import ChangeViewModal from '../../components/modals/ChangeViewModal';

const ChangeRequestsPage = () => {
    const [changes, setChanges] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(true);

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
    const tableHeaderBg = isDark ? '#1c2632' : '#f8fafc';
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

    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage] = useState(10);

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

    const paginatedChanges = useMemo(() => {
        const startIndex = (page - 1) * rowsPerPage;
        return filteredChanges.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredChanges, page, rowsPerPage]);

    const totalPages = Math.ceil(filteredChanges.length / rowsPerPage);

    // Estados do Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedChange, setSelectedChange] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Estado da View (Dashboard vs Lista vs Calendario)
    const [viewMode, setViewMode] = useState('DASHBOARD'); // 'DASHBOARD', 'LIST', 'CALENDAR'
    const [modalTab, setModalTab] = useState('geral');

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

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [filters]);

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
        setFilters({
            search: '',
            status: '',
            risk: '',
            type: '',
            impact: '',
            responsibleId: '',
            dateFrom: '',
            dateTo: ''
        });
    };

    // Stat Cards Configuration
    const statCards = [
        {
            key: 'pending',
            label: 'Pendentes Aprovação',
            value: kpiCounts.pending,
            icon: <AccessTime />,
            gradient: ['#f59e0b', '#fbbf24'],
            bgColor: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            trend: kpiCounts.pendingTrend
        },
        {
            key: 'approved',
            label: 'Aprovadas',
            value: kpiCounts.approved,
            icon: <CheckCircle />,
            gradient: ['#10b981', '#34d399'],
            bgColor: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            trend: kpiCounts.approvedTrend
        },
        {
            key: 'inProgress',
            label: 'Em Execução',
            value: kpiCounts.inProgress,
            icon: <Loop />,
            gradient: ['#3b82f6', '#60a5fa'],
            bgColor: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            trend: kpiCounts.inProgressTrend
        },
        {
            key: 'completed',
            label: 'Concluídas',
            value: kpiCounts.completed,
            icon: <DoneAll />,
            gradient: ['#3b82f6', '#a78bfa'],
            bgColor: 'rgba(59, 130, 246, 0.15)',
            color: '#a78bfa',
            trend: kpiCounts.completedTrend
        },
        {
            key: 'rejected',
            label: 'Rejeitadas',
            value: kpiCounts.rejected,
            icon: <Cancel />,
            gradient: ['#ef4444', '#f87171'],
            bgColor: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            trend: kpiCounts.rejectedTrend
        }
    ];

    // Theme-aware input styles
    const inputSx = {
        '& .MuiOutlinedInput-root': {
            bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
            borderRadius: 2,
            color: textPrimary,
            '& fieldset': { borderColor: borderColor },
            '&:hover fieldset': { borderColor: 'rgba(102, 126, 234, 0.5)' },
            '&.Mui-focused fieldset': { borderColor: '#667eea' }
        },
        '& .MuiInputLabel-root': { color: textMuted },
        '& .MuiSelect-icon': { color: textMuted }
    };

    return (
        <Box>
            {/* Page Header */}
            <Box
                sx={{
                    mb: 3,
                    p: 3,
                    borderRadius: '16px',
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
                    <Box sx={{ display: 'flex', gap: 1, bgcolor: toggleGroupBg, borderRadius: 2, p: 0.5 }}>
                        <Tooltip title="Dashboard">
                            <IconButton
                                onClick={() => setViewMode('DASHBOARD')}
                                sx={{
                                    borderRadius: 1.5,
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
                                    borderRadius: 1.5,
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
                                    borderRadius: 1.5,
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
                                borderRadius: '12px',
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

            {/* Filters Section */}
            <Box
                sx={{
                    mb: 3,
                    borderRadius: '16px',
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: textPrimary }}>
                        <FilterAlt fontSize="small" />
                        <Typography fontWeight={600}>Filtros</Typography>
                        {(() => {
                            const activeCount = [filters.status, filters.risk, filters.type, filters.impact, filters.responsibleId, filters.dateFrom, filters.dateTo].filter(Boolean).length;
                            return activeCount > 0 ? (
                                <Box sx={{ px: 1, py: 0.25, borderRadius: '10px', fontSize: '10px', fontWeight: 700, bgcolor: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' }}>{activeCount}</Box>
                            ) : null;
                        })()}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
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
                            Limpar
                        </Button>
                        <IconButton
                            size="small"
                            onClick={() => setShowFilters(!showFilters)}
                            sx={{ color: textMuted }}
                        >
                            <span className="material-icons-round">{showFilters ? 'expand_less' : 'expand_more'}</span>
                        </IconButton>
                    </Box>
                </Box>

                <Collapse in={showFilters}>
                    <Box sx={{ p: 3, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                        <TextField
                            select
                            label="Status"
                            size="small"
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
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
                            label="Prioridade/Risco"
                            size="small"
                            value={filters.risk}
                            onChange={(e) => setFilters(prev => ({ ...prev, risk: e.target.value }))}
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
                            label="Tipo de Mudança"
                            size="small"
                            value={filters.type}
                            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                            sx={inputSx}
                        >
                            <MenuItem value="">Todos os Tipos</MenuItem>
                            <MenuItem value="EMERGENCIAL">Emergencial</MenuItem>
                            <MenuItem value="PADRAO">Padrão</MenuItem>
                            <MenuItem value="NORMAL">Planejada</MenuItem>
                        </TextField>

                        <TextField
                            type="date"
                            label="Data Início"
                            size="small"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                                ...inputSx,
                                minWidth: 200,
                                '& .MuiOutlinedInput-root': {
                                    ...inputSx['& .MuiOutlinedInput-root'],
                                    height: '40px'
                                }
                            }}
                        />

                        <TextField
                            select
                            label="Responsável"
                            size="small"
                            value={filters.responsibleId}
                            onChange={(e) => setFilters(prev => ({ ...prev, responsibleId: e.target.value }))}
                            sx={inputSx}
                        >
                            <MenuItem value="">Todos os Responsáveis</MenuItem>
                            {users.map(user => (
                                <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Impacto"
                            size="small"
                            value={filters.impact}
                            onChange={(e) => setFilters(prev => ({ ...prev, impact: e.target.value }))}
                            sx={inputSx}
                        >
                            <MenuItem value="">Todos os Impactos</MenuItem>
                            <MenuItem value="MAIOR">Alto</MenuItem>
                            <MenuItem value="SIGNIFICATIVO">Médio</MenuItem>
                            <MenuItem value="MENOR">Baixo</MenuItem>
                        </TextField>
                    </Box>
                </Collapse>
            </Box>

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
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: 2,
                        mb: 3
                    }}>
                        {statCards.map((card, idx) => (
                            <Box
                                key={card.key}
                                sx={{
                                    p: 2.5,
                                    borderRadius: '16px',
                                    background: cardBg,
                                    backdropFilter: isDark ? 'blur(10px)' : 'none',
                                    border: `1px solid ${borderColor}`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: 'pointer',
                                    animation: `kpiSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${idx * 0.08}s both`,
                                    '@keyframes kpiSlideIn': {
                                        '0%': { opacity: 0, transform: 'translateY(20px) scale(0.98)' },
                                        '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
                                    },
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        borderColor: 'rgba(37, 99, 235, 0.3)',
                                        boxShadow: isDark ? '0 12px 28px rgba(0, 0, 0, 0.4)' : '0 12px 28px rgba(0, 0, 0, 0.1)'
                                    },
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 3,
                                        borderRadius: '16px 16px 0 0',
                                        background: card.color
                                    }
                                }}
                                onClick={() => setFilters(prev => ({
                                    ...prev,
                                    status: card.key === 'pending' ? 'GROUP_PENDING' :
                                        card.key === 'approved' ? 'GROUP_APPROVED' :
                                            card.key === 'inProgress' ? 'EXECUTED' :
                                                card.key === 'completed' ? 'GROUP_COMPLETED' :
                                                    card.key === 'rejected' ? 'GROUP_REJECTED' : ''
                                }))}
                            >
                                <Box sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 2.5,
                                    bgcolor: card.bgColor,
                                    color: card.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mb: 1.5
                                }}>
                                    {card.icon}
                                </Box>
                                <Typography
                                    sx={{
                                        fontSize: 11,
                                        fontWeight: 500,
                                        color: textMuted,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        mb: 0.5
                                    }}
                                >
                                    {card.label}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 32,
                                        fontWeight: 700,
                                        color: textPrimary,
                                        lineHeight: 1,
                                        mb: 0.5
                                    }}
                                >
                                    {card.value}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 12,
                                        color: (card.trend || '0%').startsWith('+') ? '#34d399' : '#f87171',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5
                                    }}
                                >
                                    {(card.trend || '0%').startsWith('+') ? '^' : 'v'} {card.trend || '0%'} vs. mes anterior
                                </Typography>
                            </Box>
                        ))}
                    </Box>

                    {/* Advanced Metrics from Backend */}
                    {backendMetrics && backendMetrics.summary && (
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 2,
                            mb: 3
                        }}>
                            {/* Success Rate */}
                            <Box sx={{
                                p: 2.5,
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                            }}>
                                <Typography sx={{ fontSize: 11, fontWeight: 500, color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                                    Taxa de Sucesso
                                </Typography>
                                <Typography sx={{ fontSize: 28, fontWeight: 700, color: '#10b981', lineHeight: 1 }}>
                                    {backendMetrics.summary.successRate}%
                                </Typography>
                                <Typography sx={{ fontSize: 11, color: textSecondary, mt: 0.5 }}>
                                    GMUDs executadas com sucesso
                                </Typography>
                            </Box>

                            {/* MTTR */}
                            <Box sx={{
                                p: 2.5,
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(37, 99, 235, 0.2)',
                            }}>
                                <Typography sx={{ fontSize: 11, fontWeight: 500, color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                                    MTTR (Tempo Medio)
                                </Typography>
                                <Typography sx={{ fontSize: 28, fontWeight: 700, color: '#818cf8', lineHeight: 1 }}>
                                    {backendMetrics.summary.mttrHours}h
                                </Typography>
                                <Typography sx={{ fontSize: 11, color: textSecondary, mt: 0.5 }}>
                                    Duracao media de execucao
                                </Typography>
                            </Box>

                            {/* On-Time Delivery */}
                            <Box sx={{
                                p: 2.5,
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                            }}>
                                <Typography sx={{ fontSize: 11, fontWeight: 500, color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                                    Entrega no Prazo
                                </Typography>
                                <Typography sx={{ fontSize: 28, fontWeight: 700, color: '#60a5fa', lineHeight: 1 }}>
                                    {backendMetrics.summary.onTimeRate}%
                                </Typography>
                                <Typography sx={{ fontSize: 11, color: textSecondary, mt: 0.5 }}>
                                    Dentro da janela planejada
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {/* Table Section */}
                    <Box
                        sx={{
                            borderRadius: '16px',
                            background: cardBg,
                            backdropFilter: isDark ? 'blur(10px)' : 'none',
                            border: `1px solid ${borderColor}`,
                            overflow: 'hidden'
                        }}
                    >
                        {/* Table Header with Search */}
                        <Box sx={{
                            p: 2.5,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: `1px solid ${filterHeaderBorder}`
                        }}>
                            <Typography fontWeight={600} color={textPrimary}>
                                Lista de GMUDs
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                <ExportButton data={filteredChanges} columns={EXPORT_COLUMNS.changes} filename="gmuds" compact />
                                <TextField
                                    placeholder="Buscar GMUD..."
                                    size="small"
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Search sx={{ color: textMuted }} />
                                            </InputAdornment>
                                        )
                                    }}
                                    sx={{
                                        width: 250,
                                        ...inputSx
                                    }}
                                />
                                {/* View Toggle */}
                                <Paper
                                    elevation={0}
                                    sx={{
                                        display: 'flex',
                                        p: 0.5,
                                        borderRadius: 2,
                                        background: 'transparent',
                                        backgroundImage: 'none',
                                        border: `1px solid ${filterHeaderBorder}`
                                    }}
                                >
                                    <Tooltip title="Lista">
                                        <IconButton
                                            size="small"
                                            onClick={() => setViewMode('LIST')}
                                            sx={{
                                                borderRadius: 1.5,
                                                color: viewMode === 'LIST' ? '#667eea' : textMuted,
                                                bgcolor: viewMode === 'LIST' ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
                                                '&:hover': { bgcolor: viewMode === 'LIST' ? 'rgba(102, 126, 234, 0.2)' : filterHoverBg }
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
                                                borderRadius: 1.5,
                                                color: viewMode === 'CALENDAR' ? '#667eea' : textMuted,
                                                bgcolor: viewMode === 'CALENDAR' ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
                                                '&:hover': { bgcolor: viewMode === 'CALENDAR' ? 'rgba(102, 126, 234, 0.2)' : filterHoverBg }
                                            }}
                                        >
                                            <CalendarToday fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Paper>
                            </Box>
                        </Box>

                        {/* CONTENT AREA */}
                        {loading ? (
                            <Box sx={{ p: 2 }}>
                                <TableSkeleton rows={5} columns={9} />
                            </Box>
                        ) : filteredChanges.length === 0 ? (
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
                                            '&:hover': { borderColor: '#667eea', bgcolor: 'rgba(102, 126, 234, 0.1)' }
                                        }}
                                    >
                                        Criar Nova GMUD
                                    </Button>
                                }
                            />
                        ) : (
                            <>
                                {viewMode === 'LIST' ? (
                                    <ChangeRequestList
                                        changes={paginatedChanges}
                                        onEdit={handleOpenEdit}
                                        onDelete={handleDeleteClick}
                                        onView={handleOpenView}
                                        onSend={handleSendRequest}
                                        darkMode={isDark}
                                    />
                                ) : (
                                    <ChangeCalendar
                                        changes={changes}
                                        onViewChange={handleOpenView}
                                    />
                                )}
                            </>
                        )}

                        {/* Pagination */}
                        {viewMode === 'LIST' && filteredChanges.length > 0 && (
                            <Box sx={{
                                p: 2.5,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderTop: `1px solid ${filterHeaderBorder}`
                            }}>
                                <Typography sx={{ fontSize: 14, color: textMuted }}>
                                    Exibindo {((page - 1) * rowsPerPage) + 1}-{Math.min(page * rowsPerPage, filteredChanges.length)} de {filteredChanges.length} registros
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <IconButton
                                        size="small"
                                        disabled={page === 1}
                                        onClick={() => setPage(p => p - 1)}
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 2,
                                            border: `1px solid ${borderColor}`,
                                            bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
                                            color: textPrimary,
                                            '&:hover': { bgcolor: filterHoverBg, borderColor: '#667eea' },
                                            '&.Mui-disabled': { color: textMuted, borderColor: borderColor }
                                        }}
                                    >
                                        <span className="material-icons-round">chevron_left</span>
                                    </IconButton>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        let pageNum = i + 1;
                                        if (totalPages > 5) {
                                            if (page > 3) pageNum = page - 2 + i;
                                            if (page > totalPages - 3) pageNum = totalPages - 4 + i;
                                        }
                                        return (
                                            <IconButton
                                                key={pageNum}
                                                size="small"
                                                onClick={() => setPage(pageNum)}
                                                sx={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: 2,
                                                    border: `1px solid ${borderColor}`,
                                                    bgcolor: page === pageNum
                                                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                                        : (isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'),
                                                    background: page === pageNum
                                                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                                        : (isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'),
                                                    color: textPrimary,
                                                    fontWeight: page === pageNum ? 700 : 400,
                                                    borderColor: page === pageNum ? 'transparent' : borderColor,
                                                    '&:hover': { bgcolor: filterHoverBg, borderColor: '#667eea' }
                                                }}
                                            >
                                                {pageNum}
                                            </IconButton>
                                        );
                                    })}
                                    <IconButton
                                        size="small"
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 2,
                                            border: `1px solid ${borderColor}`,
                                            bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
                                            color: textPrimary,
                                            '&:hover': { bgcolor: filterHoverBg, borderColor: '#667eea' },
                                            '&.Mui-disabled': { color: textMuted, borderColor: borderColor }
                                        }}
                                    >
                                        <span className="material-icons-round">chevron_right</span>
                                    </IconButton>
                                </Box>
                            </Box>
                        )}
                    </Box>
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
