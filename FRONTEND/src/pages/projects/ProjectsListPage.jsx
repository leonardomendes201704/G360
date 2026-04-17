import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import {
    Box, Button, TextField, MenuItem, FormGroup, FormControlLabel, Checkbox, Typography,
} from '@mui/material';
import FilterAlt from '@mui/icons-material/FilterAlt';
import Refresh from '@mui/icons-material/Refresh';
import FilterDrawer from '../../components/common/FilterDrawer';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import debounce from 'lodash/debounce';

import ProjectModal from '../../components/modals/ProjectModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';

import { getProjects, createProject, updateProject, deleteProject, submitForApproval } from '../../services/project.service';
import { getReferenceUsers } from '../../services/reference.service';
import { getErrorMessage } from '../../utils/errorUtils';

import logoImg from '../../assets/liotecnica_logo_official.png'; // New Official Logo

// ... existing imports

import './ProjectsListPage.css'; // Restored CSS import
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ... existing imports

// Helpers
const getStatusConfig = (status) => {
    const configs = {
        'PLANNING': { label: 'Planejamento', className: 'pl-status-planning', icon: 'edit_note' },
        'IN_PROGRESS': { label: 'Em Execução', className: 'pl-status-execution', icon: 'play_circle' },
        'COMPLETED': { label: 'Concluído', className: 'pl-status-completed', icon: 'check_circle' },
        'PAUSED': { label: 'Pausado', className: 'pl-status-paused', icon: 'pause_circle' },
        'ON_HOLD': { label: 'Pausado', className: 'pl-status-paused', icon: 'pause_circle' },
        'CANCELLED': { label: 'Cancelado', className: 'pl-status-paused', icon: 'cancel' }
    };
    return configs[status] || { label: status, className: 'pl-status-planning', icon: 'help' };
};

const getApprovalStatusConfig = (approvalStatus, requiresAdjustment = false) => {
    // Special case: DRAFT with requiresAdjustment means returned for adjustments
    if (approvalStatus === 'DRAFT' && requiresAdjustment) {
        return { label: 'Devolvido p/ Ajustes', className: 'pl-status-returned', icon: 'assignment_return', color: '#f59e0b' };
    }
    const configs = {
        'PENDING_APPROVAL': { label: 'Aguardando Aprovação', className: 'pl-status-pending-approval', icon: 'hourglass_empty', color: '#f59e0b' },
        'APPROVED': { label: 'Aprovado', className: 'pl-status-approved', icon: 'verified', color: '#10b981' },
        'REJECTED': { label: 'Rejeitado', className: 'pl-status-rejected', icon: 'cancel', color: '#ef4444' },
        'DRAFT': { label: 'Rascunho', className: 'pl-status-draft', icon: 'edit', color: '#64748b' }
    };
    return configs[approvalStatus] || configs['DRAFT'];
};

const getPriorityConfig = (priority) => {
    const configs = {
        'LOW': { label: 'Baixa', className: 'pl-priority-low', icon: 'keyboard_arrow_down' },
        'MEDIUM': { label: 'Média', className: 'pl-priority-medium', icon: 'remove' },
        'HIGH': { label: 'Alta', className: 'pl-priority-high', icon: 'keyboard_arrow_up' },
        'CRITICAL': { label: 'Crítica', className: 'pl-priority-critical', icon: 'priority_high' }
    };
    return configs[priority] || configs['MEDIUM'];
};

const getProgressClass = (progress) => {
    if (progress >= 100) return 'complete';
    if (progress >= 60) return 'high';
    if (progress >= 30) return 'medium';
    return 'low';
};

const getAvatarGradient = (name) => {
    if (!name) return 'indigo';
    const gradients = ['indigo', 'emerald', 'amber', 'cyan', 'rose'];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
};

const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const getDaysRemaining = (endDate, status) => {
    if (!endDate) return { text: '-', className: '' };

    if (status === 'COMPLETED') {
        return { text: 'Projeto concluído', className: '' };
    }

    if (status === 'PAUSED' || status === 'ON_HOLD') {
        return { text: 'Projeto pausado', className: 'danger' };
    }

    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { text: `${Math.abs(diffDays)} dias atrasado`, className: 'danger' };
    }
    if (diffDays <= 30) {
        return { text: `${diffDays} dias restantes`, className: 'warning' };
    }
    return { text: `${diffDays} dias restantes`, className: '' };
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
};

const PROJECT_DRAWER_DEFAULTS = {
    status: [],
    managerId: 'ALL',
    techLeadId: 'ALL',
};

const PROJECT_STATUS_OPTIONS = [
    { value: 'PLANNING', label: 'Planejamento' },
    { value: 'IN_PROGRESS', label: 'Em Execução' },
    { value: 'COMPLETED', label: 'Concluído' },
    { value: 'PAUSED', label: 'Pausado' },
    { value: 'CANCELLED', label: 'Cancelado' },
];

const ProjectsListPage = () => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const { hasPermission } = useContext(AuthContext);
    const canWrite = hasPermission('PROJECTS', 'CREATE');
    const canDeletePerm = hasPermission('PROJECTS', 'DELETE_PROJECT');
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);

    const [selectedProject, setSelectedProject] = useState(null);

    const [filters, setFilters] = useState({
        search: '',
        status: [],
        managerId: 'ALL',
        techLeadId: 'ALL'
    });

    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [draftFilters, setDraftFilters] = useState(PROJECT_DRAWER_DEFAULTS);

    const activeDrawerFilterCount = useMemo(
        () => filters.status.length + (filters.managerId !== 'ALL' ? 1 : 0) + (filters.techLeadId !== 'ALL' ? 1 : 0),
        [filters.status, filters.managerId, filters.techLeadId]
    );

    const drawerInputSx = useMemo(() => ({
        '& .MuiOutlinedInput-root': {
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
            borderRadius: 2,
            '& fieldset': { borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)' },
            '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.35)' },
            '&.Mui-focused fieldset': { borderColor: '#2563eb' },
        },
        '& .MuiInputLabel-root': { color: isDark ? '#94a3b8' : '#64748b' },
        '& .MuiSelect-icon': { color: isDark ? '#94a3b8' : '#64748b' },
    }), [isDark]);

    const [orderBy, setOrderBy] = useState('name');
    const [orderDirection, setOrderDirection] = useState('asc');

    const [loading, setLoading] = useState(true);

    const handleExportPDF = () => {
        try {
            if (projects.length === 0) {
                enqueueSnackbar('Nenhum projeto para exportar.', { variant: 'warning' });
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
                const logoHeight = 12; // Standard rectangular size

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
                doc.text('Relatório de Projetos', titleX, 22);
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
                    total: projects.length,
                    planning: projects.filter(p => p.status === 'PLANNING').length,
                    active: projects.filter(p => p.status === 'IN_PROGRESS').length,
                    completed: projects.filter(p => p.status === 'COMPLETED').length
                };
                const cardWidth = 45;
                const cardHeight = 18;
                const gap = 12;
                const kpiColors = {
                    total: [99, 102, 241],
                    planning: [245, 158, 11],
                    active: [16, 185, 129],
                    completed: [139, 92, 246]
                };
                const cards = [
                    { label: 'Projetos', value: kpiData.total, color: kpiColors.total },
                    { label: 'Planejamento', value: kpiData.planning, color: kpiColors.planning },
                    { label: 'Em Execução', value: kpiData.active, color: kpiColors.active },
                    { label: 'Concluídos', value: kpiData.completed, color: kpiColors.completed }
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
                const tableBody = projects.map(project => {
                    const statusConfig = getStatusConfig(project.status);
                    const priorityConfig = getPriorityConfig(project.priority);
                    const daysInfo = getDaysRemaining(project.endDate, project.status);
                    return [
                        { content: project.name + `\n${project.code}`, styles: { fontStyle: 'bold' } },
                        statusConfig,
                        priorityConfig,
                        project.manager?.name || '-',
                        project.techLead?.name || '-',
                        { value: project.progress || 0 },
                        `${formatDate(project.endDate)}\n${daysInfo.text}`
                    ];
                });

                autoTable(doc, {
                    startY: startY,
                    head: [['PROJETO', 'STATUS', 'PRIORIDADE', 'GERENTE', 'TECH LEAD', '%', 'CRONOGRAMA']],
                    body: tableBody,
                    theme: 'plain',
                    rowPageBreak: 'avoid',
                    margin: { top: 20, bottom: 20, left: margin, right: margin },
                    styles: { fontSize: 8, cellPadding: 6, minCellHeight: 14, valign: 'middle', lineColor: brand.border, lineWidth: 0, textColor: brand.text.primary, font: 'helvetica' },
                    headStyles: { fillColor: [241, 245, 249], textColor: brand.text.secondary, fontSize: 7, fontStyle: 'bold', halign: 'left', cellPadding: 6 },
                    alternateRowStyles: { fillColor: [250, 252, 254] },
                    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 32, halign: 'center' }, 2: { cellWidth: 28, halign: 'center' }, 3: { cellWidth: 35 }, 4: { cellWidth: 35 }, 5: { cellWidth: 25, halign: 'center' }, 6: { cellWidth: 40, halign: 'right' } },
                    didParseCell: (data) => {
                        if (data.section === 'body' && [1, 2, 5].includes(data.column.index)) data.cell.text = '';
                    },
                    didDrawCell: (data) => {
                        if (data.section === 'body') {
                            doc.setDrawColor(...brand.border);
                            doc.setLineWidth(0.1);
                            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                        }
                        if (data.section === 'body' && data.column.index === 1) drawBadge(doc, data, data.cell.raw);
                        if (data.section === 'body' && data.column.index === 2) drawPriority(doc, data, data.cell.raw);
                        if (data.section === 'body' && data.column.index === 5) drawProgressBar(doc, data, data.cell.raw.value);
                    },
                    didDrawPage: (data) => {
                        doc.setFontSize(8);
                        doc.setTextColor(...brand.text.light);
                        doc.text('G360 Enterprise • Liotecnica', margin, pageHeight - 10);
                        doc.text(`Pág ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
                    }
                });
            };

            const drawBadge = (doc, data, config) => {
                const cell = data.cell;
                const badgeWidth = 26, badgeHeight = 6;
                const x = cell.x + (cell.width - badgeWidth) / 2, y = cell.y + (cell.height - badgeHeight) / 2;
                let rgb = [100, 116, 139];
                if (config.className.includes('planning')) rgb = [245, 158, 11];
                else if (config.className.includes('execution') || config.className.includes('approved')) rgb = [16, 185, 129];
                else if (config.className.includes('paused')) rgb = [244, 63, 94];
                else if (config.className.includes('completed')) rgb = [139, 92, 246];
                doc.setDrawColor(...rgb);
                doc.setFillColor(rgb[0], rgb[1], rgb[2]);
                doc.roundedRect(x, y, badgeWidth, badgeHeight, 3, 3, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(6);
                doc.setFont('helvetica', 'bold');
                doc.text(config.label.toUpperCase(), x + badgeWidth / 2, y + badgeHeight - 1.8, { align: 'center' });
            };

            const drawPriority = (doc, data, config) => {
                const cell = data.cell;
                const badgeWidth = 20, badgeHeight = 5;
                const x = cell.x + (cell.width - badgeWidth) / 2, y = cell.y + (cell.height - badgeHeight) / 2;
                let rgb = [100, 116, 139];
                if (config.className.includes('low')) rgb = [16, 185, 129];
                else if (config.className.includes('medium')) rgb = [245, 158, 11];
                else if (config.className.includes('high')) rgb = [244, 63, 94];
                else if (config.className.includes('critical')) rgb = [185, 28, 28];
                doc.setDrawColor(...rgb);
                doc.setLineWidth(0.2);
                doc.roundedRect(x, y, badgeWidth, badgeHeight, 2, 2, 'D');
                doc.setTextColor(...rgb);
                doc.setFontSize(6);
                doc.setFont('helvetica', 'bold');
                doc.text(config.label.toUpperCase(), x + badgeWidth / 2, y + badgeHeight - 1.5, { align: 'center' });
            };

            const drawProgressBar = (doc, data, progress) => {
                const cell = data.cell;
                const barWidth = 20, barHeight = 4;
                const x = cell.x + (cell.width - barWidth) / 2, y = cell.y + (cell.height - barHeight) / 2;
                doc.setFillColor(226, 232, 240);
                doc.roundedRect(x, y, barWidth, barHeight, 2, 2, 'F');
                if (progress > 0) {
                    const fillWidth = (barWidth * progress) / 100;
                    let rgb = [99, 102, 241];
                    if (progress === 100) rgb = [16, 185, 129];
                    doc.setFillColor(...rgb);
                    doc.roundedRect(x, y, fillWidth, barHeight, 2, 2, 'F');
                }
                doc.setTextColor(100, 116, 139);
                doc.setFontSize(6);
                doc.text(`${progress}%`, cell.x + cell.width / 2, y + barHeight + 3.5, { align: 'center' });
            };

            generateHeader();
            const summaryHeight = generateSummary(45);
            generateTable(summaryHeight + 8);
            doc.save(`Projetos_G360_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
            enqueueSnackbar('PDF exportado com sucesso!', { variant: 'success' });
        } catch (error) {
            console.error('Export Error:', error);
            enqueueSnackbar('Erro ao exportar PDF.', { variant: 'error' });
        }
    };
    const [page, setPage] = useState(1);
    const [totalProjects, setTotalProjects] = useState(0);
    const pageSize = 10;

    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();

    const fetchData = async (currentFilters, currentPage = page, currentOrderBy = orderBy, currentOrderDirection = orderDirection) => {
        setLoading(true);
        try {
            const apiFilters = {};
            if (currentFilters.search) apiFilters.search = currentFilters.search;
            if (currentFilters.status.length > 0) apiFilters.status = currentFilters.status.join(',');
            if (currentFilters.managerId !== 'ALL') apiFilters.managerId = currentFilters.managerId;
            if (currentFilters.techLeadId !== 'ALL') apiFilters.techLeadId = currentFilters.techLeadId;
            
            apiFilters.page = currentPage;
            apiFilters.limit = pageSize;
            apiFilters.sortBy = currentOrderBy;
            apiFilters.sortDirection = currentOrderDirection;

            const [projResponse, userData] = await Promise.all([
                getProjects(apiFilters),
                getReferenceUsers()
            ]);

            const pData = Array.isArray(projResponse) ? projResponse : projResponse.data;
            const pMeta = projResponse.meta || {};

            setProjects(pData || []);
            setTotalProjects(pMeta.total || (Array.isArray(projResponse) ? projResponse.length : 0));
            setUsers(userData);
            
            setPage(currentPage);
        } catch (error) {
            console.error(error);
            enqueueSnackbar(getErrorMessage(error, 'Erro ao carregar projetos'), { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const debouncedFetch = useCallback(
        debounce((nextFilters) => fetchData(nextFilters), 500),
        []
    );

    useEffect(() => {
        fetchData(filters);
    }, []);

    const handleFilterChange = (field, value) => {
        const newFilters = { ...filters, [field]: value };
        setFilters(newFilters);
        debouncedFetch(newFilters, 1, orderBy, orderDirection); // fetch page 1 on filter
    };

    const openFilterDrawer = () => {
        setDraftFilters({
            status: [...filters.status],
            managerId: filters.managerId,
            techLeadId: filters.techLeadId,
        });
        setFilterDrawerOpen(true);
    };

    const handleApplyDrawerFilters = () => {
        const next = {
            ...filters,
            status: [...draftFilters.status],
            managerId: draftFilters.managerId,
            techLeadId: draftFilters.techLeadId,
        };
        setFilters(next);
        fetchData(next, 1, orderBy, orderDirection);
    };

    const handleClearDrawerOnly = () => {
        const next = { ...filters, ...PROJECT_DRAWER_DEFAULTS };
        setDraftFilters({ ...PROJECT_DRAWER_DEFAULTS });
        setFilters(next);
        fetchData(next, 1, orderBy, orderDirection);
    };

    const clearAllFilters = () => {
        const next = { search: '', ...PROJECT_DRAWER_DEFAULTS };
        setDraftFilters({ ...PROJECT_DRAWER_DEFAULTS });
        setFilters(next);
        fetchData(next, 1, orderBy, orderDirection);
    };

    const handleSave = async (data) => {
        try {
            if (selectedProject) {
                await updateProject(selectedProject.id, data);
                enqueueSnackbar('Projeto atualizado com sucesso!', { variant: 'success' });
            } else {
                await createProject(data);
                enqueueSnackbar('Projeto criado com sucesso!', { variant: 'success' });
            }
            setModalOpen(false);
            fetchData(filters);
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error, 'Erro ao salvar projeto'), { variant: 'error' });
        }
    };

    const handleDeleteClick = (e, id) => {
        e.stopPropagation();
        setProjectToDelete(id);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!projectToDelete) return;
        try {
            await deleteProject(projectToDelete);
            enqueueSnackbar('Projeto excluído com sucesso.', { variant: 'success' });
            setConfirmOpen(false);
            setProjectToDelete(null);
            fetchData(filters);
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error, 'Erro ao excluir projeto'), { variant: 'error' });
        }
    };

    const handleOpenNew = () => { setSelectedProject(null); setModalOpen(true); };
    const handleOpenEdit = (e, project) => {
        e.stopPropagation();
        setSelectedProject(project);
        setModalOpen(true);
    };

    const handleResubmit = async (e, projectId) => {
        e.stopPropagation();
        try {
            await submitForApproval(projectId);
            enqueueSnackbar('Projeto reenviado para aprovação!', { variant: 'success' });
            fetchData(filters);
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error, 'Erro ao reenviar projeto'), { variant: 'error' });
        }
    };



    // KPIs
    const kpis = {
        total: projects.length,
        planning: projects.filter(p => p.status === 'PLANNING').length,
        active: projects.filter(p => p.status === 'IN_PROGRESS').length,
        completed: projects.filter(p => p.status === 'COMPLETED').length
    };

    const handleSort = (property) => {
        const isAsc = orderBy === property && orderDirection === 'asc';
        const newDir = isAsc ? 'desc' : 'asc';
        setOrderDirection(newDir);
        setOrderBy(property);
        fetchData(filters, page, property, newDir);
    };

    // Since we now paginate on the server, we just use the loaded projects array directly
    const paginatedProjects = projects;
    const totalPages = Math.ceil(totalProjects / pageSize);
    const startItem = totalProjects === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalProjects);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            fetchData(filters, newPage, orderBy, orderDirection);
        }
    };

    const renderPageButtons = () => {
        const buttons = [];
        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            buttons.push(
                <button
                    key={i}
                    className={`pl-pagination-btn ${i === page ? 'active' : ''}`}
                    onClick={() => handlePageChange(i)}
                >
                    {i}
                </button>
            );
        }
        return buttons;
    };

    return (
        <div className="projects-list-page" >
            <div className="projects-list-content">
                {/* Page Header */}
                <div className="pl-page-header-card">
                    <div className="pl-page-title-section">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span className="material-icons-round" style={{ fontSize: '36px', color: '#2563eb' }}>folder_copy</span>
                            <div>
                                <h1 className="pl-page-title">Projetos</h1>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            className="pl-btn"
                            style={{
                                background: 'transparent',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                border: '1px solid #e2e8f0',
                                transition: 'all 0.2s ease'
                            }}
                            onClick={handleExportPDF}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb'; e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <span className="material-icons-round" style={{ color: 'inherit' }}>picture_as_pdf</span>
                            Exportar PDF
                        </button>
                        {canWrite && (
                            <button data-testid="btn-novo-projeto" className="pl-btn pl-btn-primary" onClick={handleOpenNew}>
                                <span className="material-icons-round">add</span>
                                Novo Projeto
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="pl-stats-grid">
                    <div className="pl-stat-card total">
                        <div className="pl-stat-icon total">
                            <span className="material-icons-round">folder_copy</span>
                        </div>
                        <div className="pl-stat-content">
                            <div className="pl-stat-value">{kpis.total}</div>
                            <div className="pl-stat-label">Total de Projetos</div>
                        </div>
                    </div>

                    <div className="pl-stat-card planning">
                        <div className="pl-stat-icon planning">
                            <span className="material-icons-round">edit_note</span>
                        </div>
                        <div className="pl-stat-content">
                            <div className="pl-stat-value">{kpis.planning}</div>
                            <div className="pl-stat-label">Em Planejamento</div>
                        </div>
                    </div>

                    <div className="pl-stat-card execution">
                        <div className="pl-stat-icon execution">
                            <span className="material-icons-round">play_circle</span>
                        </div>
                        <div className="pl-stat-content">
                            <div className="pl-stat-value">{kpis.active}</div>
                            <div className="pl-stat-label">Em Execução</div>
                        </div>
                    </div>

                    <div className="pl-stat-card completed">
                        <div className="pl-stat-icon completed">
                            <span className="material-icons-round">check_circle</span>
                        </div>
                        <div className="pl-stat-content">
                            <div className="pl-stat-value">{kpis.completed}</div>
                            <div className="pl-stat-label">Concluídos</div>
                        </div>
                    </div>
                </div>

                {/* Filtros — barra compacta + drawer (padrão incidentes) */}
                <Box
                    sx={{
                        mb: 3,
                        borderRadius: '16px',
                        bgcolor: isDark ? 'rgba(22, 29, 38, 0.5)' : '#fff',
                        border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Button
                            size="medium"
                            startIcon={<FilterAlt />}
                            onClick={openFilterDrawer}
                            sx={{
                                color: isDark ? '#f1f5f9' : '#0f172a',
                                textTransform: 'none',
                                fontWeight: 600,
                                '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                            }}
                        >
                            Filtros
                        </Button>
                        {activeDrawerFilterCount > 0 ? (
                            <Box sx={{ px: 1, py: 0.25, borderRadius: '10px', fontSize: '10px', fontWeight: 700, bgcolor: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' }}>
                                {activeDrawerFilterCount}
                            </Box>
                        ) : null}
                    </Box>
                    <Button
                        size="small"
                        startIcon={<Refresh />}
                        onClick={clearAllFilters}
                        sx={{
                            color: isDark ? '#94a3b8' : '#64748b',
                            textTransform: 'none',
                            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
                        }}
                    >
                        Limpar tudo
                    </Button>
                </Box>

                <FilterDrawer
                    open={filterDrawerOpen}
                    onClose={() => setFilterDrawerOpen(false)}
                    onApply={handleApplyDrawerFilters}
                    onClear={handleClearDrawerOnly}
                    title="Filtros de projetos"
                >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: isDark ? '#e2e8f0' : '#334155' }}>
                        Status
                    </Typography>
                    <FormGroup sx={{ gap: 0.5 }}>
                        {PROJECT_STATUS_OPTIONS.map((option) => (
                            <FormControlLabel
                                key={option.value}
                                control={(
                                    <Checkbox
                                        size="small"
                                        checked={draftFilters.status.includes(option.value)}
                                        onChange={() => {
                                            setDraftFilters((prev) => {
                                                const nextStatus = prev.status.includes(option.value)
                                                    ? prev.status.filter((s) => s !== option.value)
                                                    : [...prev.status, option.value];
                                                return { ...prev, status: nextStatus };
                                            });
                                        }}
                                    />
                                )}
                                label={option.label}
                                sx={{ '& .MuiFormControlLabel-label': { fontSize: 14 } }}
                            />
                        ))}
                    </FormGroup>
                    <TextField
                        select
                        fullWidth
                        label="Gerente de projeto"
                        size="small"
                        value={draftFilters.managerId}
                        onChange={(e) => setDraftFilters((prev) => ({ ...prev, managerId: e.target.value }))}
                        sx={drawerInputSx}
                    >
                        <MenuItem value="ALL">Todos</MenuItem>
                        {users.map((u) => (
                            <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        fullWidth
                        label="Tech Lead"
                        size="small"
                        value={draftFilters.techLeadId}
                        onChange={(e) => setDraftFilters((prev) => ({ ...prev, techLeadId: e.target.value }))}
                        sx={drawerInputSx}
                    >
                        <MenuItem value="ALL">Todos</MenuItem>
                        {users.map((u) => (
                            <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                        ))}
                    </TextField>
                </FilterDrawer>

                {/* Projects Table */}
                <div className="pl-projects-table-card">
                    <div className="pl-table-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                        <div className="pl-table-title">
                            <span className="material-icons-round">list_alt</span>
                            Lista de Projetos
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end', minWidth: '260px' }}>
                            <div className="pl-search-input-container" style={{ flex: '1 1 220px', maxWidth: '360px' }}>
                                <span className="material-icons-round">search</span>
                                <input
                                    data-testid="input-busca-projeto"
                                    type="text"
                                    className="pl-search-input"
                                    placeholder="Buscar por nome ou código..."
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                />
                            </div>
                            <span className="pl-table-count">{totalProjects} projetos</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="pl-loading">
                            <div className="pl-loading-spinner"></div>
                        </div>
                    ) : projects.length === 0 ? (
                        <EmptyState
                            icon={<span className="material-icons-round" style={{ fontSize: 'inherit' }}>folder_off</span>}
                            title="Nenhum projeto encontrado"
                            description="Não encontramos projetos com os filtros selecionados. Crie um novo projeto para começar a gerenciar seu portfólio."
                            actionLabel="Criar Novo Projeto"
                            actionIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
                            onAction={handleOpenNew}
                        />
                    ) : (
                        <>
                            <table data-testid="tabela-projetos" className="pl-projects-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Projeto
                                                {orderBy === 'name' && (
                                                    <span className="material-icons-round" style={{ fontSize: '16px' }}>
                                                        {orderDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Status
                                                {orderBy === 'status' && (
                                                    <span className="material-icons-round" style={{ fontSize: '16px' }}>
                                                        {orderDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('priority')} style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Prioridade
                                                {orderBy === 'priority' && (
                                                    <span className="material-icons-round" style={{ fontSize: '16px' }}>
                                                        {orderDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('manager')} style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Gerente
                                                {orderBy === 'manager' && (
                                                    <span className="material-icons-round" style={{ fontSize: '16px' }}>
                                                        {orderDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('techLead')} style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Tech Lead
                                                {orderBy === 'techLead' && (
                                                    <span className="material-icons-round" style={{ fontSize: '16px' }}>
                                                        {orderDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('progress')} style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Progresso
                                                {orderBy === 'progress' && (
                                                    <span className="material-icons-round" style={{ fontSize: '16px' }}>
                                                        {orderDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('endDate')} style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Cronograma
                                                {orderBy === 'endDate' && (
                                                    <span className="material-icons-round" style={{ fontSize: '16px' }}>
                                                        {orderDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedProjects.map((project) => {
                                        const statusConfig = getStatusConfig(project.status);
                                        const progressClass = getProgressClass(project.progress || 0);
                                        const daysInfo = getDaysRemaining(project.endDate, project.status);
                                        const managerName = project.manager?.name || '';
                                        const avatarGradient = getAvatarGradient(managerName);

                                        const isApproved = project.approvalStatus === 'APPROVED';
                                        const isReturnedForAdjustment = project.approvalStatus === 'DRAFT' && project.requiresAdjustment;
                                        const approvalConfig = getApprovalStatusConfig(project.approvalStatus, project.requiresAdjustment);

                                        const handleRowClick = () => {
                                            // Validate access is now handled in ProjectDetailsPage (DRAFTS must be accessible to submit)
                                            navigate(`/projects/${project.id}`);
                                        };

                                        return (
                                            <tr
                                                key={project.id}
                                                onClick={handleRowClick}
                                                style={{ cursor: isApproved ? 'pointer' : 'not-allowed', opacity: isApproved ? 1 : 0.7 }}
                                            >
                                                <td>
                                                    <div className="pl-project-info">
                                                        <span className="pl-project-name">{project.name}</span>
                                                        <span className="pl-project-code">{project.code}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {!isApproved ? (
                                                        <span className="pl-status-badge" style={{ background: `${approvalConfig.color}20`, color: approvalConfig.color, border: `1px solid ${approvalConfig.color}40` }}>
                                                            <span className="material-icons-round">{approvalConfig.icon}</span>
                                                            {approvalConfig.label}
                                                        </span>
                                                    ) : (
                                                        <span className={`pl-status-badge ${statusConfig.className}`}>
                                                            <span className="material-icons-round">{statusConfig.icon}</span>
                                                            {statusConfig.label}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>

                                                    <span className={`pl-priority-badge ${getPriorityConfig(project.priority).className}`}>
                                                        <span className="material-icons-round" style={{ fontSize: '14px' }}>
                                                            {getPriorityConfig(project.priority).icon}
                                                        </span>
                                                        {getPriorityConfig(project.priority).label}
                                                    </span>
                                                </td>
                                                <td>
                                                    {
                                                        project.manager ? (
                                                            <div className="pl-manager-cell">
                                                                <div className={`pl-manager-avatar ${avatarGradient}`}>
                                                                    {getInitials(managerName)}
                                                                </div>
                                                                <span className="pl-manager-name">{managerName}</span>
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: 'var(--pl-text-muted)' }}>-</span>
                                                        )
                                                    }
                                                </td>
                                                <td>
                                                    {project.techLead ? (
                                                        <div className="pl-manager-cell">
                                                            <div className={`pl-manager-avatar ${getAvatarGradient(project.techLead.name)}`}>
                                                                {getInitials(project.techLead.name)}
                                                            </div>
                                                            <span className="pl-manager-name">{project.techLead.name}</span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--pl-text-muted)' }}>-</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="pl-progress-cell">
                                                        <div className="pl-progress-bar-container">
                                                            <div
                                                                className={`pl-progress-bar ${progressClass}`}
                                                                style={{ width: `${project.progress || 0}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="pl-progress-value">{project.progress || 0}%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="pl-timeline-cell">
                                                        <div className="pl-timeline-dates">
                                                            <span className="material-icons-round">calendar_today</span>
                                                            {formatDate(project.startDate)} → {formatDate(project.endDate)}
                                                        </div>
                                                        <span className={`pl-timeline-remaining ${daysInfo.className}`}>
                                                            {daysInfo.text}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="pl-actions-cell">
                                                        <button
                                                            className="pl-action-btn view"
                                                            title="Visualizar"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/projects/${project.id}`);
                                                            }}
                                                        >
                                                            <span className="material-icons-round">visibility</span>
                                                        </button>

                                                        {/* Resubmit button - only for returned projects */}
                                                        {isReturnedForAdjustment && (
                                                            <button
                                                                className="pl-action-btn"
                                                                title="Reenviar para Aprovação"
                                                                onClick={(e) => handleResubmit(e, project.id)}
                                                                style={{
                                                                    background: 'rgba(16, 185, 129, 0.15)',
                                                                    color: '#10b981',
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                <span className="material-icons-round" style={{ fontSize: '18px' }}>send</span>
                                                            </button>
                                                        )}

                                                        {/* Edit button - disabled for permanently rejected projects */}
                                                        {canWrite && (() => {
                                                            const isPermanentlyRejected = project.approvalStatus === 'REJECTED' && !project.requiresAdjustment;
                                                            const canEditProject = !isPermanentlyRejected;
                                                            return (
                                                                <button
                                                                    className="pl-action-btn edit"
                                                                    title={isPermanentlyRejected ? 'Projeto rejeitado (somente leitura)' : 'Editar'}
                                                                    disabled={!canEditProject}
                                                                    onClick={(e) => canEditProject && handleOpenEdit(e, project)}
                                                                    style={{ opacity: canEditProject ? 1 : 0.4 }}
                                                                >
                                                                    <span className="material-icons-round">edit</span>
                                                                </button>
                                                            );
                                                        })()}

                                                        {/* Delete button - disabled for permanently rejected projects */}
                                                        {canDeletePerm && (() => {
                                                            const isPermanentlyRejected = project.approvalStatus === 'REJECTED' && !project.requiresAdjustment;
                                                            const canDeleteProject = !isPermanentlyRejected;
                                                            return (
                                                                <button
                                                                    className="pl-action-btn delete"
                                                                    title={isPermanentlyRejected ? 'Projeto rejeitado (somente leitura)' : 'Excluir'}
                                                                    disabled={!canDeleteProject}
                                                                    onClick={(e) => canDeleteProject && handleDeleteClick(e, project.id)}
                                                                    style={{ opacity: canDeleteProject ? 1 : 0.4 }}
                                                                >
                                                                    <span className="material-icons-round">delete</span>
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {totalPages > 1 && (
                                <div className="pl-table-footer">
                                    <div className="pl-pagination-info">
                                        Mostrando {startItem}-{endItem} de {projects.length} projetos
                                    </div>
                                    <div className="pl-pagination-controls">
                                        <button
                                            className="pl-pagination-btn"
                                            disabled={page === 1}
                                            onClick={() => handlePageChange(page - 1)}
                                        >
                                            <span className="material-icons-round">chevron_left</span>
                                        </button>
                                        {renderPageButtons()}
                                        <button
                                            className="pl-pagination-btn"
                                            disabled={page === totalPages}
                                            onClick={() => handlePageChange(page + 1)}
                                        >
                                            <span className="material-icons-round">chevron_right</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )
                    }
                </div >
            </div >

            <ProjectModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                project={selectedProject}
            />

            <ConfirmDialog
                open={confirmOpen}
                title="Excluir Projeto"
                content="Tem certeza que deseja excluir este projeto? Esta ação apagará todas as tarefas e dados vinculados."
                confirmText="Sim, Excluir"
                onConfirm={handleConfirmDelete}
                onClose={() => setConfirmOpen(false)}
            />
        </div >
    );
};

export default ProjectsListPage;