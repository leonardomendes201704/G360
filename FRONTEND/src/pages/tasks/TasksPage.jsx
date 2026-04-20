import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import FilterDrawer from '../../components/common/FilterDrawer';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { Box, Typography, Button, TextField, MenuItem, CircularProgress, useTheme, Chip, Checkbox, ListItemText, InputAdornment } from '@mui/material';
import { FilterAlt, Refresh, Add, Search } from '@mui/icons-material';

import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';
import { useTaskTimerContext } from '../../contexts/TaskTimerContext';
import { getGeneralTasks, createGeneralTask, updateGeneralTask, deleteGeneralTask } from '../../services/task.service';
import { getReferenceUsers } from '../../services/reference.service';
import { getErrorMessage } from '../../utils/errorUtils';

// Components
import DataListTable from '../../components/common/DataListTable';
import KanbanComponent from '../../components/tasks/TaskKanban';
import TaskPlanningGrid from '../../components/tasks/TaskPlanningGrid';
import TaskModal from '../../components/modals/TaskModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import BulkActionsBar from '../../components/common/BulkActionsBar';
import { getGeneralTaskListColumns } from './taskListColumns';
import { sortGeneralTaskRows, isTaskOverdueForList } from './taskListSort';
import StatsCard from '../../components/common/StatsCard';
import KpiGrid from '../../components/common/KpiGrid';
import PageTitleCard from '../../components/common/PageTitleCard';

import './TasksPage.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoImg from '../../assets/liotecnica_logo_official.png';

const TASK_DRAWER_DEFAULTS = {
    status: [],
    priority: 'ALL',
    assignee: 'ALL',
};

const TasksPage = () => {
    const { id: urlTaskId } = useParams(); // Get ID from URL
    const navigate = useNavigate();
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();
    const isDark = mode === 'dark';
    const { enqueueSnackbar } = useSnackbar();
    const { user, hasPermission } = useContext(AuthContext);
    const canWrite = hasPermission('TASKS', 'WRITE');
    const { activeTimer, isRunning, start: startTimer, stop: stopTimer } = useTaskTimerContext();

    // Theme Variables
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#64748b' : '#475569';
    const textMuted = isDark ? '#94a3b8' : '#64748b';
    const cardBg = isDark ? 'rgba(22, 29, 38, 0.5)' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const cardShadow = isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)';
    const filterBg = isDark ? 'rgba(22, 29, 38, 0.5)' : '#FFFFFF';
    const filterBorder = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const filterHeaderBorder = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const filterHoverBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.04)';
    const tabBg = isDark ? 'rgba(255, 255, 255, 0.02)' : '#f1f5f9';
    const tabBorder = isDark ? 'rgba(255, 255, 255, 0.06)' : 'transparent';
    const tabText = isDark ? '#94a3b8' : '#64748b';
    const tabHoverText = isDark ? '#f1f5f9' : '#0f172a';

    const inputSx = {
        '& .MuiOutlinedInput-root': {
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
            color: textPrimary,
            '& fieldset': { borderColor: borderColor },
            '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.3)' },
            '&.Mui-focused fieldset': { borderColor: '#2563eb' }
        },
        '& .MuiInputLabel-root': { color: textMuted },
        '& .MuiSelect-icon': { color: textMuted },
        '& .MuiInputBase-input': { color: textPrimary }
    };

    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [viewMode, setViewMode] = useState('KANBAN');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [saving, setSaving] = useState(false);

    // Filter State
    const [statusFilter, setStatusFilter] = useState([]);
    const [priorityFilter, setPriorityFilter] = useState('ALL');
    const [assigneeFilter, setAssigneeFilter] = useState('ALL');
    const [selectedIds, setSelectedIds] = useState([]);
    const [search, setSearch] = useState('');
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [draftFilters, setDraftFilters] = useState(TASK_DRAWER_DEFAULTS);

    // Fetch data (existing logic)
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [tasksData, usersData] = await Promise.all([
                getGeneralTasks({}),
                getReferenceUsers()
            ]);
            setTasks(tasksData);
            setUsers(usersData);
        } catch (error) {
            console.error(error);
            enqueueSnackbar(getErrorMessage(error, 'Erro ao carregar dados.'), { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [enqueueSnackbar]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // [NEW] Deep Linking Effect
    useEffect(() => {
        if (urlTaskId && tasks.length > 0) {
            const taskToOpen = tasks.find(t => t.id === urlTaskId);
            if (taskToOpen) {
                setSelectedTask(taskToOpen);
                setModalOpen(true);
            }
        }
    }, [urlTaskId, tasks]);

    const handleCloseModal = () => {
        setModalOpen(false);
        // Remove ID from URL when closing, revert to /tasks
        if (urlTaskId) {
            navigate('/tasks', { replace: true });
        }
    };

    const clearFilters = () => {
        setDraftFilters({ ...TASK_DRAWER_DEFAULTS });
        setStatusFilter([]);
        setPriorityFilter('ALL');
        setAssigneeFilter('ALL');
        setSearch('');
    };

    const activeDrawerFilterCount = useMemo(
        () => (statusFilter.length > 0 ? 1 : 0) + (priorityFilter !== 'ALL' ? 1 : 0) + (assigneeFilter !== 'ALL' ? 1 : 0),
        [statusFilter, priorityFilter, assigneeFilter]
    );

    const openFilterDrawer = () => {
        setDraftFilters({
            status: [...statusFilter],
            priority: priorityFilter,
            assignee: assigneeFilter,
        });
        setFilterDrawerOpen(true);
    };

    const handleApplyDrawerFilters = () => {
        setStatusFilter([...draftFilters.status]);
        setPriorityFilter(draftFilters.priority);
        setAssigneeFilter(draftFilters.assignee);
    };

    const handleClearDrawerOnly = () => {
        setDraftFilters({ ...TASK_DRAWER_DEFAULTS });
        setStatusFilter([]);
        setPriorityFilter('ALL');
        setAssigneeFilter('ALL');
    };

    // --- CRUD Handlers ---
    const handleOpenCreate = () => { setSelectedTask(null); setModalOpen(true); };
    const handleTaskClick = (task) => { setSelectedTask(task); setModalOpen(true); };

    const handleTaskMove = async (taskId, newStatus) => {
        try {
            await updateGeneralTask(taskId, { status: newStatus });
            fetchData();
        } catch (e) {
            enqueueSnackbar(getErrorMessage(e, 'Erro ao mover tarefa.'), { variant: 'error' });
        }
    };

    const handleTaskToggle = async (taskId, currentStatus) => {
        const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
        try {
            await updateGeneralTask(taskId, { status: newStatus });
            fetchData();
        } catch (e) {
            enqueueSnackbar(getErrorMessage(e, 'Erro ao atualizar status.'), { variant: 'error' });
        }
    };

    const handleSaveTask = async (data) => {
        setSaving(true);
        try {
            if (selectedTask) {
                await updateGeneralTask(selectedTask.id, data);
                enqueueSnackbar('Tarefa atualizada com sucesso!', { variant: 'success' });
            } else {
                await createGeneralTask(data);
                enqueueSnackbar('Tarefa criada com sucesso!', { variant: 'success' });
            }
            setModalOpen(false);
            fetchData();
        } catch (e) {
            enqueueSnackbar(getErrorMessage(e, 'Erro ao salvar tarefa.'), { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = (taskId) => {
        setTaskToDelete(taskId);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!taskToDelete) return;
        try {
            await deleteGeneralTask(taskToDelete);
            setTasks(prev => prev.filter(t => t.id !== taskToDelete));
            setSelectedIds(prev => prev.filter(id => id !== taskToDelete));
            setConfirmOpen(false);
            setTaskToDelete(null);
            if (selectedTask && selectedTask.id === taskToDelete) setModalOpen(false);
            fetchData();
            enqueueSnackbar('Tarefa excluída com sucesso.', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(getErrorMessage(e, 'Erro ao excluir tarefa.'), { variant: 'error' });
        }
    };

    const handleTaskStatusChange = async (taskId, newStatus) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        try { await updateGeneralTask(taskId, { status: newStatus }); }
        catch (e) { enqueueSnackbar('Erro ao atualizar status', { variant: 'error' }); fetchData(); }
    };

    const handleBulkDone = async () => {
        const ids = [...selectedIds];
        setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, status: 'DONE' } : t));
        setSelectedIds([]);
        await Promise.allSettled(ids.map(id => updateGeneralTask(id, { status: 'DONE' })));
        enqueueSnackbar(`${ids.length} tarefas marcadas como concluídas`, { variant: 'success' });
        fetchData();
    };

    const handleBulkDeleteTasks = async () => {
        const ids = [...selectedIds];
        setTasks(prev => prev.filter(t => !ids.includes(t.id)));
        setSelectedIds([]);
        await Promise.allSettled(ids.map(id => deleteGeneralTask(id)));
        enqueueSnackbar(`${ids.length} tarefas excluídas`, { variant: 'success' });
        fetchData();
    };


    // --- PDF Export ---
    const handleExportPDF = () => {
        try {
            if (filteredTasks.length === 0) {
                enqueueSnackbar('Nenhuma tarefa para exportar.', { variant: 'warning' });
                return;
            }

            const doc = new jsPDF('l', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 14;

            // Brand Colors
            const brand = {
                primary: [99, 102, 241],
                secondary: [30, 41, 59],
                accent: [139, 92, 246],
                text: { primary: [15, 23, 42], secondary: [71, 85, 105], light: [148, 163, 184] },
                bg: { header: [248, 250, 252], rowOdd: [255, 255, 255], rowEven: [248, 250, 252] },
                border: [226, 232, 240]
            };

            const generateHeader = () => {
                doc.setFillColor(...brand.primary);
                doc.rect(0, 0, pageWidth, 4, 'F');

                const logoWidth = 40;
                const logoHeight = 12;

                try {
                    doc.addImage(logoImg, 'PNG', margin, 12, logoWidth, logoHeight);
                } catch (e) {
                    doc.setFillColor(...brand.primary);
                    doc.roundedRect(margin, 12, 12, 12, 2, 2, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(8);
                    doc.text('G360', margin + 1, 20);
                }
                const titleX = margin + logoWidth + 12;
                doc.setTextColor(...brand.secondary);
                doc.setFontSize(22);
                doc.setFont('helvetica', 'bold');
                doc.text('Relatório de Tarefas', titleX, 22);
                doc.setTextColor(...brand.text.secondary);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text('G360 Enterprise • Visão Geral', titleX, 28);
                const dateStr = format(new Date(), "dd 'de' MMMM, yyyy", { locale: ptBR });
                doc.setFontSize(9);
                doc.setTextColor(...brand.text.secondary);
                doc.text(dateStr, pageWidth - margin, 20, { align: 'right' });
                doc.setDrawColor(...brand.border);
                doc.setLineWidth(0.1);
                doc.line(margin, 38, pageWidth - margin, 38);
            };

            const generateSummary = (startY) => {
                const kpiData = {
                    total: stats.total,
                    delayed: stats.delayed,
                    todo: stats.todo,
                    on_hold: stats.onHold,
                    in_progress: stats.inProgress,
                    done: stats.done
                };
                const cardWidth = 38;
                const cardHeight = 18;
                const gap = 6;
                const kpiColors = {
                    total: [99, 102, 241],
                    delayed: [239, 68, 68],
                    todo: [14, 165, 233],
                    on_hold: [245, 158, 11],
                    in_progress: [59, 130, 246],
                    done: [16, 185, 129]
                };
                const cards = [
                    { label: 'Tarefas', value: kpiData.total, color: kpiColors.total },
                    { label: 'Em Atraso', value: kpiData.delayed, color: kpiColors.delayed },
                    { label: 'A Fazer', value: kpiData.todo, color: kpiColors.todo },
                    { label: 'Em Pausa', value: kpiData.on_hold, color: kpiColors.on_hold },
                    { label: 'Em Progresso', value: kpiData.in_progress, color: kpiColors.in_progress },
                    { label: 'Concluídas', value: kpiData.done, color: kpiColors.done },
                    { label: 'Canceladas', value: stats.cancelled, color: [148, 163, 184] }
                ];
                const startX = margin;
                const y = startY;
                cards.forEach((card, i) => {
                    const x = startX + i * (cardWidth + gap);
                    doc.setDrawColor(...brand.border);
                    doc.setFillColor(255, 255, 255);
                    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');
                    doc.setFillColor(...card.color);
                    doc.roundedRect(x, y, 3, cardHeight, 2, 2, 'F');
                    doc.rect(x + 2, y, 1, cardHeight, 'F');
                    doc.setTextColor(...brand.secondary);
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text(String(card.value), x + 8, y + 8);
                    doc.setTextColor(...brand.text.secondary);
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    doc.text(card.label.toUpperCase(), x + 8, y + 14);
                });
                return startY + cardHeight + 12;
            };

            const generateTable = (startY) => {
                const tableBody = filteredTasks.map(task => {
                    // Status Config
                    let statusLabel = task.status;
                    let statusColor = [100, 116, 139]; // Default grey
                    if (task.status === 'TODO') { statusLabel = 'A Fazer'; statusColor = [14, 165, 233]; }
                    else if (task.status === 'ON_HOLD') { statusLabel = 'Em Pausa'; statusColor = [245, 158, 11]; }
                    else if (task.status === 'IN_PROGRESS') { statusLabel = 'Em Progresso'; statusColor = [59, 130, 246]; }
                    else if (task.status === 'DONE') { statusLabel = 'Concluído'; statusColor = [16, 185, 129]; }
                    else if (task.status === 'CANCELLED') { statusLabel = 'Cancelada'; statusColor = [148, 163, 184]; }

                    // Priority Config
                    let priorityLabel = task.priority || 'MEDIUM';
                    let priorityColor = [245, 158, 11]; // Medium default
                    if (priorityLabel === 'HIGH') { priorityLabel = 'Alta'; priorityColor = [244, 63, 94]; }
                    else if (priorityLabel === 'CRITICAL') { priorityLabel = 'Crítica'; priorityColor = [185, 28, 28]; }
                    else if (priorityLabel === 'LOW') { priorityLabel = 'Baixa'; priorityColor = [16, 185, 129]; }
                    else { priorityLabel = 'Média'; }

                    const assigneeName = task.assignee?.name || '-';
                    const deadline = task.dueDate ? format(new Date(task.dueDate), 'dd/MM/yyyy') : '-';

                    // Check Overdue
                    const isOverdue = task.status !== 'DONE' && task.status !== 'CANCELLED' && task.dueDate && startOfDay(new Date(task.dueDate)) < startOfDay(new Date());
                    const deadlineText = isOverdue ? `${deadline} (Atrasado)` : deadline;

                    return [
                        { content: task.title, styles: { fontStyle: 'bold' } },
                        assigneeName,
                        deadlineText,
                        { content: priorityLabel, styles: { textColor: priorityColor }, _raw: priorityLabel, _color: priorityColor },
                        { content: statusLabel, styles: { textColor: statusColor }, _raw: statusLabel, _color: statusColor }
                    ];
                });

                autoTable(doc, {
                    startY: startY,
                    head: [['TAREFA', 'RESPONSÁVEL', 'PRAZO', 'PRIORIDADE', 'STATUS']],
                    body: tableBody,
                    theme: 'plain',
                    rowPageBreak: 'avoid',
                    margin: { top: 20, bottom: 20, left: margin, right: margin },
                    styles: { fontSize: 8, cellPadding: 6, minCellHeight: 14, valign: 'middle', lineColor: brand.border, lineWidth: 0, textColor: brand.text.primary, font: 'helvetica' },
                    headStyles: { fillColor: [241, 245, 249], textColor: brand.text.secondary, fontSize: 7, fontStyle: 'bold', halign: 'left', cellPadding: 6 },
                    alternateRowStyles: { fillColor: [250, 252, 254] },
                    columnStyles: {
                        0: { cellWidth: 80 },
                        1: { cellWidth: 50 },
                        2: { cellWidth: 40, halign: 'center' },
                        3: { cellWidth: 40, halign: 'center' },
                        4: { cellWidth: 40, halign: 'center' }
                    },
                    didDrawCell: (data) => {
                        if (data.section === 'body') {
                            doc.setDrawColor(...brand.border);
                            doc.setLineWidth(0.1);
                            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                        }
                        // Badge Drawing logic could be added here if we want pills, currently using colored text for simplicity in first pass
                        // Updating to use Badges for consistency with Project Report
                        if (data.section === 'body' && (data.column.index === 3 || data.column.index === 4)) {
                            // Custom drawing for badges if we wanted to replicate exact project style
                            // For now we used colored text in the data mapping, but let's override content with a badge if we want
                        }
                    },
                    didDrawPage: (data) => {
                        doc.setFontSize(8);
                        doc.setTextColor(...brand.text.light);
                        doc.text('G360 Enterprise • Liotecnica', margin, pageHeight - 10);
                        doc.text(`Pág ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
                    }
                });
            };

            generateHeader();
            const summaryHeight = generateSummary(45);
            generateTable(summaryHeight + 8);
            doc.save(`Tarefas_G360_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
            enqueueSnackbar('PDF exportado com sucesso!', { variant: 'success' });
        } catch (error) {
            console.error('Export Error:', error);
            enqueueSnackbar('Erro ao exportar PDF.', { variant: 'error' });
        }
    };

    // --- Stats Calculation ---
    const stats = useMemo(() => {
        const todayStart = startOfDay(new Date());
        return {
            total: tasks.length,
            delayed: tasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.dueDate && startOfDay(new Date(t.dueDate)) < todayStart).length,
            todo: tasks.filter(t => t.status === 'TODO').length,
            onHold: tasks.filter(t => t.status === 'ON_HOLD').length,
            inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
            done: tasks.filter(t => t.status === 'DONE').length,
            cancelled: tasks.filter(t => t.status === 'CANCELLED').length,
        };
    }, [tasks]);

    // Lista unica de responsaveis
    const assignees = useMemo(() => {
        const uniqueAssignees = new Map();
        tasks.forEach(task => {
            const assignee = task.assignee;
            if (assignee && assignee.id) {
                uniqueAssignees.set(assignee.id, assignee);
            }
        });
        return Array.from(uniqueAssignees.values());
    }, [tasks]);

    // Filtrar tarefas
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // Status filter (multiple selection)
            if (statusFilter.length > 0) {
                const hasOverdue = statusFilter.includes('OVERDUE');
                const otherStatuses = statusFilter.filter(s => s !== 'OVERDUE');

                // Check if task matches OVERDUE condition
                const isOverdue = task.status !== 'DONE' && task.status !== 'CANCELLED' && task.dueDate && startOfDay(new Date(task.dueDate)) < startOfDay(new Date());

                // Task passes if it matches OVERDUE (when selected) OR matches one of the other selected statuses
                const matchesOverdue = hasOverdue && isOverdue;
                const matchesOtherStatus = otherStatuses.length > 0 && otherStatuses.includes(task.status);

                if (!matchesOverdue && !matchesOtherStatus) return false;
            }
            if (priorityFilter !== 'ALL' && task.priority?.toUpperCase() !== priorityFilter) return false;
            if (assigneeFilter !== 'ALL') {
                const assignee = task.assignee;
                if (!assignee || assignee.id?.toString() !== assigneeFilter) return false;
            }
            if (search) {
                const query = search.toLowerCase();
                const title = (task.title || task.name || '').toLowerCase();
                const description = (task.description || '').toLowerCase();
                if (!title.includes(query) && !description.includes(query)) return false;
            }
            return true;
        });
    }, [tasks, statusFilter, priorityFilter, assigneeFilter, search]);

    const resetPaginationKey = useMemo(
        () =>
            `${search}|${statusFilter.join(',')}|${priorityFilter}|${assigneeFilter}|${viewMode}`,
        [search, statusFilter, priorityFilter, assigneeFilter, viewMode]
    );

    // KPI config igual as tarefas de projeto
    const kpiConfig = [
        { key: 'total', label: 'Total de Tarefas', value: stats.total, icon: 'assignment', color: '#2563eb' },
        { key: 'delayed', label: 'Em Atraso', value: stats.delayed, icon: 'event_busy', color: '#ef4444' },
        { key: 'todo', label: 'A Fazer', value: stats.todo, icon: 'pending_actions', color: '#0ea5e9' },
        { key: 'onHold', label: 'Em Pausa', value: stats.onHold, icon: 'pause_circle', color: '#f59e0b' },
        { key: 'inProgress', label: 'Em Progresso', value: stats.inProgress, icon: 'autorenew', color: '#3b82f6' },
        { key: 'done', label: 'Concluídas', value: stats.done, icon: 'check_circle', color: '#10b981' },
        { key: 'cancelled', label: 'Canceladas', value: stats.cancelled, icon: 'block', color: '#94a3b8' },
    ];

    const adaptedMembers = users.map(u => ({ user: u }));

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                <Typography sx={{ color: '#64748b' }}>Carregando...</Typography>
            </Box>
        );
    }

    return (
        <Box className="tasks-page">
            <PageTitleCard
                iconName="assignment"
                title="Tarefas Gerais"
                subtitle="Tarefas avulsas e acompanhamento"
                pushActionsToEnd
                mb={3}
                actions={
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            onClick={handleExportPDF}
                            variant="outlined"
                            sx={{
                                background: 'transparent',
                                color: isDark ? '#94a3b8' : '#64748b',
                                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'}`,
                                borderRadius: '8px',
                                padding: '12px 20px',
                                fontSize: '14px',
                                fontWeight: 600,
                                textTransform: 'none',
                                '&:hover': {
                                    borderColor: '#2563eb',
                                    color: '#2563eb',
                                    background: 'rgba(37, 99, 235, 0.05)',
                                },
                            }}
                            startIcon={<span className="material-icons-round">picture_as_pdf</span>}
                        >
                            Exportar PDF
                        </Button>
                        {canWrite && (
                            <Button
                                data-testid="btn-nova-tarefa"
                                onClick={handleOpenCreate}
                                sx={{
                                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                    color: 'white',
                                    borderRadius: '8px',
                                    padding: '12px 20px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
                                    },
                                }}
                                startIcon={<span className="material-icons-round">add</span>}
                            >
                                Nova Tarefa
                            </Button>
                        )}
                    </Box>
                }
            />

            <KpiGrid maxColumns={7} mb={4}>
                {kpiConfig.map((item) => (
                    <StatsCard
                        key={item.key}
                        title={item.label}
                        value={item.value}
                        iconName={item.icon}
                        hexColor={item.color}
                    />
                ))}
            </KpiGrid>

            {/* View Tabs */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                {[
                    { id: 'LIST', label: 'Lista', icon: 'list' },
                    { id: 'KANBAN', label: 'Kanban', icon: 'view_kanban' },
                    { id: 'PLANNING', label: 'Planejamento', icon: 'calendar_view_week' },
                ].map((tab) => (
                    <Button
                        key={tab.id}
                        onClick={() => setViewMode(tab.id)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            padding: '10px 18px',
                            background: viewMode === tab.id ? 'rgba(37, 99, 235, 0.15)' : tabBg,
                            border: `1px solid ${viewMode === tab.id ? 'rgba(37, 99, 235, 0.3)' : tabBorder}`,
                            borderRadius: '8px',
                            color: viewMode === tab.id ? '#2563eb' : tabText,
                            fontSize: '13px',
                            fontWeight: 500,
                            textTransform: 'none',
                            '&:hover': {
                                color: viewMode === tab.id ? '#2563eb' : tabHoverText,
                                borderColor: 'rgba(37, 99, 235, 0.3)',
                            },
                        }}
                        startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>{tab.icon}</span>}
                    >
                        {tab.label}
                    </Button>
                ))}
            </Box>

            {/* Filtros — barra compacta + drawer (padrão incidentes) */}
            <Box
                sx={{
                    background: filterBg,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${filterBorder}`,
                    borderRadius: '8px',
                    mb: 3,
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 2,
                    }}
                >
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, justifyContent: 'flex-end', minWidth: '240px' }}>
                        <TextField
                            placeholder="Buscar tarefas..."
                            size="small"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: textMuted, fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ ...inputSx, minWidth: 200, maxWidth: 360, flex: '1 1 200px' }}
                        />
                        <Button
                            size="small"
                            startIcon={<Refresh />}
                            onClick={clearFilters}
                            sx={{
                                color: textMuted,
                                textTransform: 'none',
                                flexShrink: 0,
                                '&:hover': { bgcolor: filterHoverBg },
                            }}
                        >
                            Limpar tudo
                        </Button>
                    </Box>
                </Box>
            </Box>

            <FilterDrawer
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                onApply={handleApplyDrawerFilters}
                onClear={handleClearDrawerOnly}
                title="Filtros de tarefas"
            >
                <TextField
                    select
                    fullWidth
                    label="Status"
                    size="small"
                    value={draftFilters.status}
                    onChange={(e) => setDraftFilters((prev) => ({
                        ...prev,
                        status: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value,
                    }))}
                    SelectProps={{
                        multiple: true,
                        renderValue: (selected) => {
                            if (selected.length === 0) return 'Todos';
                            const labels = { OVERDUE: 'Em Atraso', TODO: 'A Fazer', ON_HOLD: 'Em Pausa', IN_PROGRESS: 'Em Progresso', DONE: 'Concluído', CANCELLED: 'Cancelada' };
                            return selected.map((s) => labels[s] || s).join(', ');
                        },
                    }}
                    sx={{ ...inputSx, minWidth: 200 }}
                >
                    <MenuItem value="OVERDUE">
                        <Checkbox checked={draftFilters.status.includes('OVERDUE')} size="small" />
                        <ListItemText primary="Em Atraso" />
                    </MenuItem>
                    <MenuItem value="TODO">
                        <Checkbox checked={draftFilters.status.includes('TODO')} size="small" />
                        <ListItemText primary="A Fazer" />
                    </MenuItem>
                    <MenuItem value="ON_HOLD">
                        <Checkbox checked={draftFilters.status.includes('ON_HOLD')} size="small" />
                        <ListItemText primary="Em Pausa" />
                    </MenuItem>
                    <MenuItem value="IN_PROGRESS">
                        <Checkbox checked={draftFilters.status.includes('IN_PROGRESS')} size="small" />
                        <ListItemText primary="Em Progresso" />
                    </MenuItem>
                    <MenuItem value="DONE">
                        <Checkbox checked={draftFilters.status.includes('DONE')} size="small" />
                        <ListItemText primary="Concluído" />
                    </MenuItem>
                    <MenuItem value="CANCELLED">
                        <Checkbox checked={draftFilters.status.includes('CANCELLED')} size="small" />
                        <ListItemText primary="Cancelada" />
                    </MenuItem>
                </TextField>

                <TextField
                    select
                    fullWidth
                    label="Prioridade"
                    size="small"
                    value={draftFilters.priority}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, priority: e.target.value }))}
                    sx={inputSx}
                >
                    <MenuItem value="ALL">Todas</MenuItem>
                    <MenuItem value="CRITICAL">Crítica</MenuItem>
                    <MenuItem value="HIGH">Alta</MenuItem>
                    <MenuItem value="MEDIUM">Média</MenuItem>
                    <MenuItem value="LOW">Baixa</MenuItem>
                </TextField>

                <TextField
                    select
                    fullWidth
                    label="Responsável"
                    size="small"
                    value={draftFilters.assignee}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, assignee: e.target.value }))}
                    sx={inputSx}
                >
                    <MenuItem value="ALL">Todos</MenuItem>
                    {assignees.map((assignee) => (
                        <MenuItem key={assignee.id} value={assignee.id.toString()}>
                            {assignee.name || assignee.email}
                        </MenuItem>
                    ))}
                </TextField>
            </FilterDrawer>

            {/* Content based on viewMode */}
            {viewMode === 'LIST' ? (
                <DataListTable
                    density="compact"
                    shell={{
                        title: 'Lista de Tarefas',
                        titleIcon: 'assignment',
                        accentColor: '#2563eb',
                        count: filteredTasks.length,
                        sx: {
                            borderRadius: '8px',
                            background: cardBg,
                            border: `1px solid ${borderColor}`,
                            boxShadow: cardShadow,
                            overflow: 'hidden',
                        },
                        tableContainerSx: {
                            '& .MuiTable-root': {
                                width: '100%',
                                minWidth: 960,
                            },
                        },
                    }}
                    dataTestidTable="tabela-tarefas-gerais"
                    columns={getGeneralTaskListColumns({
                        canWrite,
                        selectedIds,
                        setSelectedIds,
                        onTaskClick: handleTaskClick,
                        onDeleteTask: handleDeleteClick,
                        onStatusChange: handleTaskStatusChange,
                        currentUserId: user?.id,
                        activeTimerTaskId: isRunning ? activeTimer?.taskId : null,
                        onTimerToggle: async (task) => {
                            try {
                                if (isRunning && activeTimer?.taskId === task.id) {
                                    await stopTimer();
                                    enqueueSnackbar('Timer parado!', { variant: 'success' });
                                } else {
                                    await startTimer(task);
                                    enqueueSnackbar('Timer iniciado!', { variant: 'success' });
                                }
                            } catch (err) {
                                enqueueSnackbar(err?.response?.data?.message || 'Erro no timer.', { variant: 'error' });
                            }
                        },
                    })}
                    rows={filteredTasks}
                    sortRows={sortGeneralTaskRows}
                    defaultOrderBy="title"
                    defaultOrder="asc"
                    getDefaultOrderForColumn={(id) => (id === 'due' ? 'desc' : 'asc')}
                    resetPaginationKey={resetPaginationKey}
                    emptyMessage="Nenhuma tarefa encontrada."
                    onRowClick={handleTaskClick}
                    isRowSelected={(row) => selectedIds.includes(row.id)}
                    getRowSx={(task) => ({
                        bgcolor: selectedIds.includes(task.id)
                            ? 'rgba(102, 126, 234, 0.06)'
                            : isTaskOverdueForList(task)
                              ? '#fef2f2'
                              : 'transparent',
                        borderLeft: selectedIds.includes(task.id)
                            ? '3px solid #667eea'
                            : isTaskOverdueForList(task)
                              ? '3px solid #ef4444'
                              : '3px solid transparent',
                        '&:hover': {
                            bgcolor: selectedIds.includes(task.id)
                                ? 'rgba(102, 126, 234, 0.1)'
                                : isTaskOverdueForList(task)
                                  ? '#fee2e2'
                                  : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'),
                        },
                    })}
                    renderBeforeTable={({ paginatedRows }) => (
                        <BulkActionsBar
                            selectedCount={selectedIds.length}
                            totalCount={paginatedRows.length}
                            onSelectAll={() => {
                                const pageIds = paginatedRows.map((t) => t.id);
                                const allOnPage = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
                                if (allOnPage) {
                                    setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                                } else {
                                    setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
                                }
                            }}
                            onClearAll={() => setSelectedIds([])}
                            allSelected={paginatedRows.length > 0 && paginatedRows.every((r) => selectedIds.includes(r.id))}
                            actions={[
                                { label: 'Concluir', icon: 'task_alt', onClick: handleBulkDone, color: '#10b981' },
                                { label: 'Excluir', icon: 'delete', onClick: handleBulkDeleteTasks, color: '#ef4444' },
                            ]}
                        />
                    )}
                />
            ) : viewMode === 'PLANNING' ? (
                <TaskPlanningGrid
                    tasks={filteredTasks}
                    onTaskClick={handleTaskClick}
                />
            ) : (
                <KanbanComponent
                    tasks={filteredTasks}
                    onTaskClick={handleTaskClick}
                    onTaskMove={handleTaskMove}
                    onOpenCreateTask={handleOpenCreate}
                    activeTimerTaskId={isRunning ? activeTimer?.taskId : null}
                    currentUserId={user?.id}
                    onTimerToggle={async (task) => {
                        try {
                            if (isRunning && activeTimer?.taskId === task.id) {
                                await stopTimer();
                                enqueueSnackbar('Timer parado!', { variant: 'success' });
                            } else {
                                await startTimer(task);
                                enqueueSnackbar('Timer iniciado!', { variant: 'success' });
                            }
                        } catch (err) {
                            enqueueSnackbar(err?.response?.data?.message || 'Erro no timer.', { variant: 'error' });
                        }
                    }}
                />
            )}

            {/* Modals */}
            <TaskModal
                open={modalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveTask}
                onDelete={handleDeleteClick}
                task={selectedTask}
                isGeneralTask={true}
                loading={saving}
                members={adaptedMembers}
            />

            <ConfirmDialog
                open={confirmOpen}
                title="Excluir Tarefa"
                content="Tem certeza que deseja excluir esta tarefa? Esta acao nao pode ser desfeita."
                confirmText="Sim, Excluir"
                onConfirm={handleConfirmDelete}
                onClose={() => setConfirmOpen(false)}
            />
        </Box>
    );
};

export default TasksPage;
