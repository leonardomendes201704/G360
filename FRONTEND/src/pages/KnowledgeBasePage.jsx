import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    IconButton,
    Menu,
    MenuItem,
    CircularProgress,
} from '@mui/material';
import FilterAlt from '@mui/icons-material/FilterAlt';
import Refresh from '@mui/icons-material/Refresh';
import FilterDrawer from '../components/common/FilterDrawer';
import EmptyState from '../components/common/EmptyState';
import {
    Search as SearchIcon,
    Add as AddIcon,
    Description as ArticleIcon,
    Visibility as VisibilityIcon,
    Folder as FolderIcon,
    TrendingUp as TrendingUpIcon,
    ViewModule as GridViewIcon,
    ViewList as ListViewIcon,
    MoreVert as MoreVertIcon,
    CalendarToday as CalendarIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import ConfirmDialog from '../components/common/ConfirmDialog';

import KnowledgeBaseService from '../services/knowledge-base.service';
import KnowledgeBaseModal from '../components/modals/KnowledgeBaseModal.jsx';
import DocumentViewer from '../components/knowledge-base/DocumentViewer.jsx';
import { useSnackbar } from 'notistack';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';

const KB_FILTER_DEFAULTS = { search: '', categoryId: '' };

// Stat Card Component - Premium Design
const StatCard = ({ title, value, icon, colorScheme, theme }) => {
    const colors = {
        indigo: { bg: 'rgba(37, 99, 235, 0.2)', icon: '#818cf8', border: '#2563eb' },
        purple: { bg: 'rgba(168, 85, 247, 0.2)', icon: '#c084fc', border: '#a855f7' },
        emerald: { bg: 'rgba(16, 185, 129, 0.2)', icon: '#34d399', border: '#10b981' },
        amber: { bg: 'rgba(245, 158, 11, 0.2)', icon: '#fbbf24', border: '#f59e0b' }
    };
    const color = colors[colorScheme] || colors.indigo;

    return (
        <Box
            sx={{
                bgcolor: theme.cardBg,
                border: theme.cardBorder,
                borderRadius: '12px',
                padding: '24px',
                transition: 'all 0.3s',
                cursor: 'pointer',
                '&:hover': {
                    borderColor: color.border,
                    transform: 'translateY(-2px)'
                }
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box
                    sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: color.bg,
                        color: color.icon,
                        transition: 'all 0.3s'
                    }}
                >
                    {icon}
                </Box>
                <Typography sx={{ fontSize: '28px', fontWeight: 700, color: theme.textPrimary }}>
                    {value}
                </Typography>
            </Box>
            <Typography sx={{ fontSize: '14px', color: theme.textSecondary }}>
                {title}
            </Typography>
        </Box>
    );
};

// Article Card Component - Premium Design  
const ArticleCard = ({ article, onView, onMenuClick, theme }) => (
    <Box
        sx={{
            bgcolor: theme.cardBg,
            border: theme.cardBorder,
            borderRadius: '12px',
            padding: '24px',
            transition: 'all 0.3s',
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            '&:hover': {
                borderColor: '#2563eb',
                transform: 'translateY(-4px)',
                '& .article-icon': {
                    bgcolor: 'rgba(37, 99, 235, 0.3)'
                },
                '& .article-title': {
                    color: '#818cf8'
                }
            }
        }}
        onClick={() => onView(article)}
    >
        {/* Header: Icon + Category */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box
                className="article-icon"
                sx={{
                    width: 48,
                    height: 48,
                    bgcolor: 'rgba(37, 99, 235, 0.2)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#818cf8',
                    transition: 'all 0.3s'
                }}
            >
                <ArticleIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                    sx={{
                        padding: '4px 12px',
                        bgcolor: article.category?.color || (theme.isDark ? '#374151' : '#e2e8f0'),
                        color: theme.isDark ? 'white' : '#1f2937',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 500
                    }}
                >
                    {article.category?.name || 'Sem categoria'}
                </Box>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        onMenuClick(e, article);
                    }}
                    sx={{ color: theme.textSecondary, '&:hover': { color: theme.textPrimary } }}
                >
                    <MoreVertIcon fontSize="small" />
                </IconButton>
            </Box>
        </Box>

        {/* Title */}
        <Typography
            className="article-title"
            sx={{
                fontSize: '16px',
                fontWeight: 600,
                color: theme.textPrimary,
                mb: 1,
                transition: 'color 0.2s'
            }}
        >
            {article.title}
        </Typography>

        {/* Description - Added per user request */}
        <Typography
            sx={{
                fontSize: '14px',
                color: theme.textSecondary,
                mb: 2,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1
            }}
        >
            {article.content?.replace(/<[^>]*>?/gm, '') || 'Sem descrição.'}
        </Typography>

        {/* Meta: Views + Date */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: theme.textSecondary, fontSize: '13px' }}>
                <VisibilityIcon sx={{ fontSize: 14 }} />
                <span>{article.views || 0}</span>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: theme.textSecondary, fontSize: '13px' }}>
                <CalendarIcon sx={{ fontSize: 14 }} />
                <span>{new Date(article.createdAt).toLocaleDateString('pt-BR')}</span>
            </Box>
        </Box>

        {/* Tags */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {article.tags?.slice(0, 3).map(tag => (
                <Box
                    key={tag}
                    sx={{
                        padding: '4px 8px',
                        bgcolor: theme.tagBg,
                        color: theme.tagText,
                        borderRadius: '4px',
                        fontSize: '11px'
                    }}
                >
                    #{tag}
                </Box>
            ))}
        </Box>
    </Box>
);

// View Toggle Button
const ViewToggleBtn = ({ active, icon, onClick, theme }) => (
    <Box
        component="button"
        onClick={onClick}
        sx={{
            padding: '8px',
            bgcolor: active ? '#2563eb' : 'transparent',
            border: 'none',
            color: active ? 'white' : theme.textSecondary,
            cursor: 'pointer',
            borderRadius: '4px',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
                color: active ? 'white' : theme.textPrimary
            }
        }}
    >
        {icon}
    </Box>
);

// Article Table Component - New Requirement
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';

const ArticleTable = ({ articles, onView, onEdit, onDelete, canUpdate, canDelete, theme }) => (
    <TableContainer component={Paper} sx={{ bgcolor: theme.cardBg, border: theme.cardBorder, borderRadius: '12px', boxShadow: 'none' }}>
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell sx={{ color: theme.textSecondary, borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)' }}>Titulo</TableCell>
                    <TableCell sx={{ color: theme.textSecondary, borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)' }}>Categoria</TableCell>
                    <TableCell sx={{ color: theme.textSecondary, borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)' }}>Autor</TableCell>
                    <TableCell sx={{ color: theme.textSecondary, borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)' }}>Visualizacoes</TableCell>
                    <TableCell sx={{ color: theme.textSecondary, borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)' }}>Criado em</TableCell>
                    <TableCell align="right" sx={{ color: theme.textSecondary, borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)' }}>Acoes</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {articles.map((article) => (
                    <TableRow
                        key={article.id}
                        hover
                        onClick={() => onView(article)}
                        sx={{
                            cursor: 'pointer',
                            '&:hover': { bgcolor: theme.surfaceBg },
                            '& td': { borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' }
                        }}
                    >
                        <TableCell sx={{ color: theme.textPrimary, fontWeight: 500 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <ArticleIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                                {article.title}
                            </Box>
                        </TableCell>
                        <TableCell>
                            <Box
                                sx={{
                                    display: 'inline-block',
                                    padding: '4px 12px',
                                    bgcolor: article.category?.color || (theme.isDark ? '#374151' : '#e2e8f0'),
                                    color: theme.isDark ? 'white' : '#1f2937',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: 500
                                }}
                            >
                                {article.category?.name || 'Sem categoria'}
                            </Box>
                        </TableCell>
                        <TableCell sx={{ color: theme.textSecondary }}>{article.author?.name || 'Desconhecido'}</TableCell>
                        <TableCell sx={{ color: theme.textSecondary }}>{article.views || 0}</TableCell>
                        <TableCell sx={{ color: theme.textSecondary }}>{new Date(article.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell align="right">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onView(article);
                                    }}
                                    sx={{ color: '#2563eb' }}
                                    title="Visualizar"
                                >
                                    <VisibilityIcon fontSize="small" />
                                </IconButton>
                                {canUpdate && (
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(article);
                                        }}
                                        sx={{ color: theme.textSecondary, '&:hover': { color: '#fbbf24' } }}
                                        title="Editar"
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                )}
                                {canDelete && (
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(article);
                                        }}
                                        sx={{ color: theme.textSecondary, '&:hover': { color: '#ef4444' } }}
                                        title="Excluir"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                )}
                            </Box>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
);

export default function KnowledgeBasePage() {
    const { enqueueSnackbar } = useSnackbar();
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#475569';
    const textMuted = isDark ? '#64748b' : '#64748b';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff';
    const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)';
    const panelBg = isDark ? 'rgba(22, 29, 38, 0.5)' : '#ffffff';
    const surfaceBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9';
    const tagBg = isDark ? 'rgba(55, 65, 81, 0.5)' : '#eef2f6';
    const tagText = isDark ? '#9ca3af' : '#64748b';
    const menuBg = isDark ? '#1f2937' : '#ffffff';
    const menuBorder = isDark ? '1px solid #374151' : '1px solid rgba(15, 23, 42, 0.12)';
    const themeTokens = { isDark, textPrimary, textSecondary, textMuted, cardBg, cardBorder, surfaceBg, tagBg, tagText };

    // RBAC Permission Helpers
    const { user, hasPermission } = useContext(AuthContext);
    const canCreate = hasPermission('KB', 'CREATE');
    const canUpdate = hasPermission('KB', 'EDIT_ARTICLE');
    const canDelete = hasPermission('KB', 'DELETE');

    // State
    const [stats, setStats] = useState(null);
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ ...KB_FILTER_DEFAULTS });
    const [viewMode, setViewMode] = useState('list'); // DEFAULT TO LIST VIEW
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [draftFilters, setDraftFilters] = useState({ categoryId: '' });

    const drawerInputSx = useMemo(
        () => ({
            '& .MuiOutlinedInput-root': {
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                borderRadius: 2,
                '& fieldset': { borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)' },
                '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.35)' },
                '&.Mui-focused fieldset': { borderColor: '#2563eb' },
            },
            '& .MuiInputLabel-root': { color: textSecondary },
            '& .MuiSelect-icon': { color: textSecondary },
        }),
        [isDark, textSecondary]
    );

    const activeDrawerFilterCount = useMemo(
        () => (filters.categoryId ? 1 : 0),
        [filters.categoryId]
    );

    const openFilterDrawer = () => {
        setDraftFilters({ categoryId: filters.categoryId || '' });
        setFilterDrawerOpen(true);
    };

    const handleApplyDrawerFilters = () => {
        setFilters((prev) => ({ ...prev, categoryId: draftFilters.categoryId }));
    };

    const handleClearDrawerOnly = () => {
        setDraftFilters({ categoryId: '' });
        setFilters((prev) => ({ ...prev, categoryId: '' }));
    };

    const clearAllFilters = () => {
        setFilters({ ...KB_FILTER_DEFAULTS });
        setDraftFilters({ categoryId: '' });
    };

    const inputSx = {
        '& .MuiOutlinedInput-root': {
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
            borderRadius: 2,
            color: textPrimary,
            height: '40px',
            '& fieldset': { borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.12)' },
            '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.5)' },
            '&.Mui-focused fieldset': { borderColor: '#2563eb' }
        },
        '& .MuiInputLabel-root': { color: textSecondary },
        '& .MuiSelect-icon': { color: textSecondary }
    };

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);

    // Viewer State
    const [viewerOpen, setViewerOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);

    // Menu State
    const [anchorEl, setAnchorEl] = useState(null);
    const [menuTargetArticle, setMenuTargetArticle] = useState(null);

    // Confirm Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [articleToDelete, setArticleToDelete] = useState(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const [statsData, articlesData] = await Promise.all([
                KnowledgeBaseService.getDashboardStats(),
                KnowledgeBaseService.findAll(filters)
            ]);
            setStats(statsData);
            setArticles(articlesData);
        } catch (error) {
            console.error('Failed to load KB data', error);
            enqueueSnackbar('Erro ao carregar dados.', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filters]);

    // ... (Handlers handleCreate, handleUpdate, handleDelete same as before)
    const handleCreate = async (formData, file) => {
        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('categoryId', formData.categoryId);
            data.append('tags', formData.tags);
            data.append('content', formData.content);
            if (file) {
                data.append('file', file);
            }

            await KnowledgeBaseService.create(data);
            enqueueSnackbar('Artigo criado com sucesso!', { variant: 'success' });
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            enqueueSnackbar('Erro ao criar artigo.', { variant: 'error' });
        }
    };

    const handleUpdate = async (formData, file) => {
        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('categoryId', formData.categoryId);
            data.append('tags', formData.tags);
            data.append('content', formData.content);
            if (file) {
                data.append('file', file);
            }
            await KnowledgeBaseService.update(editData.id, data);
            enqueueSnackbar('Artigo atualizado com sucesso!', { variant: 'success' });
            setIsModalOpen(false);
            setEditData(null);
            loadData();
        } catch (error) {
            console.error(error);
            enqueueSnackbar('Erro ao atualizar artigo.', { variant: 'error' });
        }
    };

    const handleDeleteClick = (article) => {
        setArticleToDelete(article);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!articleToDelete) return;

        try {
            await KnowledgeBaseService.delete(articleToDelete.id);
            enqueueSnackbar('Artigo removido.', { variant: 'success' });
            loadData();
            handleCloseMenu(); // In case it was from card view menu
        } catch (error) {
            enqueueSnackbar('Falha ao remover.', { variant: 'error' });
        } finally {
            setConfirmOpen(false);
            setArticleToDelete(null);
        }
    };

    // Kept for backward compatibility if any, or used by Card view menu
    const handleDelete = (id) => {
        const article = articles.find(a => a.id === id);
        if (article) handleDeleteClick(article);
    };

    const handleOpenViewer = async (article) => {
        // Fix: Ensure description/content is passed correctly even if HTML
        const cleanContent = article.content ? article.content.replace(/<[^>]*>?/gm, '') : '';
        setSelectedDoc({
            title: article.title,
            fileUrl: article.attachments?.[0]?.fileUrl || null,
            content: article.content || '', // Pass full HTML content for viewer if it supports it
            description: cleanContent // Add explicit description field
        });
        setViewerOpen(true);

        try {
            // Increment view count via backend
            await KnowledgeBaseService.findById(article.id);
        } catch (error) {
            console.error('Failed to increment view count', error);
        }
    };

    const handleMenuClick = (event, article) => {
        if (viewMode === 'grid') {
            setAnchorEl(event.currentTarget);
            setMenuTargetArticle(article);
        }
    };

    const handleEditClick = (article) => {
        setEditData(article);
        setIsModalOpen(true);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setMenuTargetArticle(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditData(null);
    };

    // Calculate total articles and categories for display
    const totalArticles = stats?.totalArticles || articles.length;
    const totalViews = stats?.totalViews || '0';
    const topCategory = stats?.categories?.sort((a, b) => b.value - a.value)[0]?.name || '-';

    return (
        <Box sx={{
            minHeight: '100%',
            color: textPrimary
        }}>
            {/* ... Header and Stats Grid (Keep same logic) ... */}
            <Box
                sx={{
                    mb: 3,
                    p: 3,
                    borderRadius: '16px',
                    background: panelBg,
                    backdropFilter: 'blur(10px)',
                    border: cardBorder,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span className="material-icons-round" style={{ fontSize: '36px', color: '#2563eb' }}>menu_book</span>
                    <Box>
                        <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>
                            Base de Conhecimento
                        </Typography>
                        <Typography sx={{ color: textMuted, fontSize: '15px' }}>
                            Central de Documentos, Manuais e Procedimentos
                        </Typography>
                    </Box>
                </Box>
                {canCreate && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => { setEditData(null); setIsModalOpen(true); }}
                        sx={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                            color: 'white',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 600,
                            textTransform: 'none',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)'
                            }
                        }}
                    >
                        Novo Artigo
                    </Button>
                )}
            </Box>

            {/* STATS GRID */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '24px',
                    mb: 3
                }}
            >
                <StatCard
                    title="Total de Artigos"
                    value={totalArticles}
                    icon={<ArticleIcon sx={{ fontSize: 20 }} />}
                    colorScheme="indigo"
                    theme={themeTokens}
                />
                <StatCard
                    title="Visualizacoes"
                    value={stats?.totalViews || 0}
                    icon={<VisibilityIcon sx={{ fontSize: 20 }} />}
                    colorScheme="purple"
                    theme={themeTokens}
                />
                <StatCard
                    title="Top Categoria"
                    value={topCategory}
                    icon={<FolderIcon sx={{ fontSize: 20 }} />}
                    colorScheme="emerald"
                    theme={themeTokens}
                />
                <StatCard
                    title="Crescimento (Mês)"
                    value={`${stats?.growth > 0 ? '+' : ''}${stats?.growth || 0}%`}
                    icon={<TrendingUpIcon sx={{ fontSize: 20 }} />}
                    colorScheme={stats?.growth >= 0 ? "amber" : "indigo"}
                    theme={themeTokens}
                />
            </Box>

            {/* Filtros — barra compacta numa linha (sem wrap); busca encolhe entre Filtros e Limpar */}
            <Box
                sx={{
                    mb: 3,
                    p: 2,
                    borderRadius: '16px',
                    bgcolor: isDark ? 'rgba(22, 29, 38, 0.5)' : '#fff',
                    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
                    display: 'flex',
                    flexWrap: 'nowrap',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                    minWidth: 0,
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        flexWrap: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    <Button
                        size="medium"
                        startIcon={<FilterAlt />}
                        onClick={openFilterDrawer}
                        sx={{
                            flexShrink: 0,
                            color: isDark ? '#f1f5f9' : '#0f172a',
                            textTransform: 'none',
                            fontWeight: 600,
                            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                        }}
                    >
                        Filtros
                    </Button>
                    {activeDrawerFilterCount > 0 ? (
                        <Box
                            sx={{
                                flexShrink: 0,
                                px: 1,
                                py: 0.25,
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: 700,
                                bgcolor: 'rgba(37, 99, 235, 0.15)',
                                color: '#2563eb',
                            }}
                        >
                            {activeDrawerFilterCount}
                        </Box>
                    ) : null}
                    <TextField
                        label="Buscar"
                        placeholder="Título, conteúdo ou tags..."
                        size="small"
                        value={filters.search}
                        onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                        sx={{
                            ...inputSx,
                            flex: '1 1 0',
                            minWidth: 0,
                            maxWidth: '100%',
                            '& .MuiOutlinedInput-root': { height: '40px' },
                        }}
                    />
                    <Button
                        size="small"
                        startIcon={<Refresh />}
                        onClick={clearAllFilters}
                        sx={{
                            flexShrink: 0,
                            color: isDark ? '#94a3b8' : '#64748b',
                            textTransform: 'none',
                            whiteSpace: 'nowrap',
                            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
                        }}
                    >
                        Limpar tudo
                    </Button>
                </Box>
                <Box
                    sx={{
                        flexShrink: 0,
                        display: 'flex',
                        bgcolor: surfaceBg,
                        border: cardBorder,
                        borderRadius: '8px',
                        padding: '4px',
                    }}
                >
                    <ViewToggleBtn
                        active={viewMode === 'list'}
                        icon={<ListViewIcon sx={{ fontSize: 18 }} />}
                        onClick={() => setViewMode('list')}
                        theme={themeTokens}
                    />
                    <ViewToggleBtn
                        active={viewMode === 'grid'}
                        icon={<GridViewIcon sx={{ fontSize: 18 }} />}
                        onClick={() => setViewMode('grid')}
                        theme={themeTokens}
                    />
                </Box>
            </Box>

            <FilterDrawer
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                onApply={handleApplyDrawerFilters}
                onClear={handleClearDrawerOnly}
                title="Filtros da base de conhecimento"
            >
                <TextField
                    select
                    fullWidth
                    label="Categoria"
                    size="small"
                    value={draftFilters.categoryId}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, categoryId: e.target.value }))}
                    sx={drawerInputSx}
                >
                    <MenuItem value="">Todas as categorias</MenuItem>
                    {stats?.categories?.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>
                            {cat.name} {cat.value != null ? `(${cat.value})` : ''}
                        </MenuItem>
                    ))}
                </TextField>
            </FilterDrawer>

            {/* ARTICLES SECTION */}
            <Box
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    '&::-webkit-scrollbar': { width: '8px' },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.12)', borderRadius: '4px' },
                    '&::-webkit-scrollbar-thumb:hover': { background: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.2)' }
                }}
            >
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                        <CircularProgress sx={{ color: '#2563eb' }} />
                    </Box>
                ) : (
                    <>
                        {/* CONDITIONAL RENDER: LIST OR GRID */}
                        {viewMode === 'list' ? (
                            <ArticleTable
                                articles={articles}
                                onView={handleOpenViewer}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                canUpdate={canUpdate}
                                canDelete={canDelete}
                                theme={themeTokens}
                            />
                        ) : (
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', // Auto-fill for responsiveness
                                    gap: '24px'
                                }}
                            >
                                {articles.map((article) => (
                                    <ArticleCard
                                        key={article.id}
                                        article={article}
                                        onView={handleOpenViewer}
                                        onMenuClick={handleMenuClick}
                                        theme={themeTokens}
                                    />
                                ))}
                            </Box>
                        )}

                        {articles.length === 0 && (
                            <EmptyState
                                icon={<ArticleIcon sx={{ fontSize: 'inherit' }} />}
                                title="Nenhum artigo encontrado"
                                description="Comece criando um artigo para compartilhar conhecimento com a equipe."
                                actionLabel={canCreate ? 'Novo Artigo' : undefined}
                                actionIcon={canCreate ? <AddIcon /> : undefined}
                                onAction={canCreate ? () => { setEditData(null); setIsModalOpen(true); } : undefined}
                            />
                        )}
                    </>
                )}
            </Box>

            {/* MENUS & MODALS ... (Same) */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                PaperProps={{
                    sx: {
                        bgcolor: menuBg,
                        border: menuBorder,
                        '& .MuiMenuItem-root': {
                            color: textSecondary,
                            fontSize: '14px',
                            '&:hover': { bgcolor: surfaceBg }
                        }
                    }
                }}
            >
                {canUpdate && (
                    <MenuItem onClick={() => {
                        setEditData(menuTargetArticle);
                        setIsModalOpen(true);
                        handleCloseMenu();
                    }}>
                        Editar
                    </MenuItem>
                )}
                {canDelete && (
                    <MenuItem onClick={() => { handleDelete(menuTargetArticle?.id); }}>Excluir</MenuItem>
                )}
            </Menu>

            <ConfirmDialog
                open={confirmOpen}
                title="Excluir Artigo"
                content="Tem certeza que deseja excluir este artigo? Esta ação não pode ser desfeita."
                onConfirm={handleConfirmDelete}
                onClose={() => setConfirmOpen(false)}
            />

            <KnowledgeBaseModal
                open={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={editData ? handleUpdate : handleCreate}
                initialData={editData}
            />

            <DocumentViewer
                open={viewerOpen}
                onClose={() => setViewerOpen(false)}
                fileUrl={selectedDoc?.fileUrl}
                title={selectedDoc?.title}
                description={selectedDoc?.description} // Use processed description
            />
        </Box>
    );
}










