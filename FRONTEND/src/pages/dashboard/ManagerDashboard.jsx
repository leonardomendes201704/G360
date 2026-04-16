import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Paper, useTheme } from '@mui/material'; // Added Paper, useTheme
import api from '../../services/api';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSnackbar } from 'notistack';
import { useContext } from 'react'; // Added useContext
import { ThemeContext } from '../../contexts/ThemeContext'; // Added ThemeContext

// Modals
import ProjectModal from '../../components/modals/ProjectModal';
import TaskModal from '../../components/modals/TaskModal';
import ChangeModal from '../../components/modals/ChangeModal';
import ExpenseModal from '../../components/modals/ExpenseModal';
import ContractModal from '../../components/modals/ContractModal';
import SupplierModal from '../../components/modals/SupplierModal';

// Services
import { createProject } from '../../services/project.service';
import { createGeneralTask } from '../../services/task.service';
import { createChange } from '../../services/change-request.service';
import { createExpense } from '../../services/expense.service';
import { createContract } from '../../services/contract.service';
import { createSupplier } from '../../services/supplier.service';
import { clearReferenceCache } from '../../services/reference.service';
import { getReferenceUsers } from '../../services/reference.service';
import RecentActivities from '../../components/projects/RecentActivities';

// Styles
const commonPaperStyle = {
    borderRadius: '16px',
    overflow: 'hidden',
    transition: 'all 0.3s',
};

const ManagerDashboard = ({ user }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const [alertDismissed, setAlertDismissed] = useState(false);
    const theme = useTheme(); // Hook para acessar cores
    const { mode } = useContext(ThemeContext);

    // Modal States
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isGmudModalOpen, setIsGmudModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [allUsers, setAllUsers] = useState([]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/dashboard/manager');
            setStats(response.data);
            const userBox = await getReferenceUsers();
            setAllUsers(userBox.map(u => ({ user: u })));
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    const handleQuickAction = (action) => {
        switch (action) {
            case 'project': setIsProjectModalOpen(true); break;
            case 'task': setIsTaskModalOpen(true); break;
            case 'gmud': setIsGmudModalOpen(true); break;
            case 'expense': setIsExpenseModalOpen(true); break;
            case 'contract': setIsContractModalOpen(true); break;
            case 'supplier': setIsSupplierModalOpen(true); break;
            case 'status-report': navigate('/projects/team-status-report'); break;
            default: break;
        }
    };

    // Approve/Reject handlers - navigate to module page
    const handleApprovePending = (item, e) => {
        e.stopPropagation();
        if (item.type === 'GMUD') navigate('/changes');
        else if (item.type === 'EXPENSE') navigate('/finance');
        else if (item.type === 'MINUTE' && item.projectId) navigate(`/projects/${item.projectId}?tab=3`);
        enqueueSnackbar('Abrindo para aprovação...', { variant: 'info' });
    };

    const handleRejectPending = (item, e) => {
        e.stopPropagation();
        if (item.type === 'GMUD') navigate('/changes');
        else if (item.type === 'EXPENSE') navigate('/finance');
        else if (item.type === 'MINUTE' && item.projectId) navigate(`/projects/${item.projectId}?tab=3`);
        enqueueSnackbar('Abrindo para rejeição...', { variant: 'info' });
    };

    // Save Handlers
    const handleSaveProject = async (data) => { setModalLoading(true); try { await createProject(data); enqueueSnackbar('Projeto criado!', { variant: 'success' }); setIsProjectModalOpen(false); fetchStats(); } catch { enqueueSnackbar('Erro.', { variant: 'error' }); } finally { setModalLoading(false); } };
    const handleSaveTask = async (data) => { setModalLoading(true); try { await createGeneralTask(data); enqueueSnackbar('Tarefa criada!', { variant: 'success' }); setIsTaskModalOpen(false); fetchStats(); } catch { enqueueSnackbar('Erro.', { variant: 'error' }); } finally { setModalLoading(false); } };
    const handleSaveGmud = async (data) => { setModalLoading(true); try { await createChange(data); enqueueSnackbar('GMUD criada!', { variant: 'success' }); setIsGmudModalOpen(false); fetchStats(); } catch { enqueueSnackbar('Erro.', { variant: 'error' }); } finally { setModalLoading(false); } };
    const handleSaveExpense = async (data) => { setModalLoading(true); try { await createExpense(data); enqueueSnackbar('Despesa lançada!', { variant: 'success' }); setIsExpenseModalOpen(false); fetchStats(); } catch { enqueueSnackbar('Erro.', { variant: 'error' }); } finally { setModalLoading(false); } };
    const handleSaveContract = async (data) => { setModalLoading(true); try { await createContract(data); enqueueSnackbar('Contrato criado!', { variant: 'success' }); setIsContractModalOpen(false); fetchStats(); } catch { enqueueSnackbar('Erro.', { variant: 'error' }); } finally { setModalLoading(false); } };
    const handleSaveSupplier = async (data) => {
        setModalLoading(true);
        try {
            await createSupplier(data);
            clearReferenceCache();
            enqueueSnackbar('Fornecedor criado!', { variant: 'success' });
            setIsSupplierModalOpen(false);
            fetchStats();
        } catch {
            enqueueSnackbar('Erro.', { variant: 'error' });
        } finally {
            setModalLoading(false);
        }
    };

    if (loading) return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: 2 }}>
            <CircularProgress sx={{ color: '#2563eb' }} />
            <Typography sx={{ color: 'text.secondary' }}>Carregando painel...</Typography>
        </Box>
    );

    if (!stats) return null;

    const criticalAlerts = (stats.expiringContracts?.length || 0) + (stats.kpis.gmuds || 0);
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 0 }).format(val || 0);
    const formatCurrencyFull = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    // Mini Sparkline Component (Pure SVG)
    const MiniSparkline = ({ data, color, width = 100, height = 28 }) => {
        if (!data || data.length < 2) return null;
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const padding = 2;
        const points = data.map((v, i) => {
            const x = padding + (i / (data.length - 1)) * (width - padding * 2);
            const y = height - padding - ((v - min) / range) * (height - padding * 2);
            return `${x},${y}`;
        }).join(' ');
        const gradientId = `spark-${color.replace('#', '')}`;
        const areaPath = `M${padding},${height} L${points.split(' ').map((p, i) => (i === 0 ? p : ` L${p}`)).join('')} L${width - padding},${height} Z`;
        return (
            <svg width={width} height={height} style={{ display: 'block' }}>
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill={`url(#${gradientId})`} />
                <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    };

    // Deterministic sparkline data per card (simulated 7-week trend)
    const sparklineData = {
        projects: [2, 3, 2, 4, 3, 3, stats.kpis.projects || 0],
        tasks: [8, 12, 10, 15, 11, 14, stats.kpis.tasks || 0],
        gmuds: [3, 1, 4, 2, 3, 1, stats.kpis.gmuds || 0],
        assets: [5, 6, 7, 6, 8, 7, stats.kpis.assets || 0],
        contracts: [4, 5, 4, 6, 5, 5, stats.kpis.contracts || 0],
    };

    // KPI Config - 5 cards
    const kpis = [
        { key: 'projects', value: stats.kpis.projects, label: 'Projetos Ativos', icon: 'rocket_launch', badgeLabel: `${stats.kpis.projectsAtRisk || 0} Risco`, badgeType: 'rose', color: '#f43f5e', footer: `${stats.kpis.projectsAtRisk || 0} projeto em risco`, footerType: 'warning', gradient: 'linear-gradient(90deg, #f43f5e, #f97316)' },
        { key: 'tasks', value: stats.kpis.tasks, label: 'Tarefas da Equipe', icon: 'check_circle', badgeLabel: 'Abertas', badgeType: 'emerald', color: '#10b981', footer: '+5 concluídas esta semana', footerType: 'success', gradient: 'linear-gradient(90deg, #10b981, #06b6d4)' },
        { key: 'gmuds', value: stats.kpis.gmuds, label: 'GMUDs Pendentes', icon: 'sync_alt', badgeLabel: 'Aguardando', badgeType: 'amber', color: '#f59e0b', footer: `${stats.kpis.gmuds} aguardando sua aprovação`, footerType: 'warning', gradient: 'linear-gradient(90deg, #f59e0b, #f97316)' },
        { key: 'assets', value: stats.kpis.assets, label: 'Ativos & Licenças', icon: 'devices', badgeLabel: `${stats.kpis.expiringLicenses || 0} Vencendo`, badgeType: 'orange', color: '#3b82f6', footer: `${stats.kpis.expiringLicenses || 0} licenças vencem em 30 dias`, footerType: 'warning', gradient: 'linear-gradient(90deg, #3b82f6, #ec4899)' },
        { key: 'contracts', value: stats.kpis.contracts, label: 'Contratos Ativos', icon: 'description', badgeLabel: `${stats.expiringContracts?.length || 0} Críticos`, badgeType: 'rose', color: '#ec4899', footer: `${stats.expiringContracts?.length || 0} expiram em 15 dias`, footerType: 'danger', gradient: 'linear-gradient(90deg, #ec4899, #f43f5e)' }
    ];

    const badgeStyles = {
        rose: { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' },
        emerald: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
        amber: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
        orange: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
        teal: { bg: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6' }
    };

    const footerStyles = { warning: '#f59e0b', success: '#10b981', danger: '#f43f5e' };

    const quickActions = [
        { key: 'project', icon: 'rocket_launch', title: 'Novo Projeto', desc: 'Criar projeto ágil', gradient: 'linear-gradient(135deg, #f43f5e, #f97316)' },
        { key: 'task', icon: 'add_task', title: 'Nova Tarefa', desc: 'Atribuir atividade', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)' },
        { key: 'gmud', icon: 'sync_alt', title: 'Nova GMUD', desc: 'Registrar mudança', gradient: 'linear-gradient(135deg, #f59e0b, #f97316)' },
        { key: 'expense', icon: 'receipt_long', title: 'Nova Despesa', desc: 'Lançar nota/recibo', gradient: 'linear-gradient(135deg, #14b8a6, #10b981)' },
        { key: 'contract', icon: 'description', title: 'Novo Contrato', desc: 'Cadastrar contrato', gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)' },
        { key: 'supplier', icon: 'storefront', title: 'Novo Fornecedor', desc: 'Cadastrar parceiro', gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)' },
        { key: 'status-report', icon: 'assessment', title: 'Status Report', desc: 'Acompanhar equipe', gradient: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }
    ];

    // Budget calculations
    const budgetTotal = stats.kpis.finance?.budget || 0;
    const budgetSpent = stats.kpis.finance?.spent || 0;
    const budgetRemaining = Math.max(budgetTotal - budgetSpent, 0);
    const budgetPercentUsed = budgetTotal > 0 ? Math.min(100, (budgetSpent / budgetTotal) * 100) : 0;




    // Estilo comum substituindo os hardcoded
    const commonPaperStyle = {
        p: 2.5,
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: mode === 'dark' ? 'background.paper' : '#FFFFFF',
        boxShadow: mode === 'dark'
            ? 'none'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    };

    const listItemHoverStyle = {
        transition: 'all 0.2s',
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
            borderColor: theme.palette.primary.main,
        }
    };

    return (
        <Box sx={{ width: '100%', maxWidth: '100%' }}>
            {/* Page Header */}
            <Box sx={{
                mb: 3.5,
                p: 3,
                borderRadius: '16px',
                background: mode === 'dark' ? 'rgba(22, 29, 38, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span className="material-icons-round" style={{ fontSize: '36px', color: '#2563eb' }}>dashboard</span>
                    <Box>
                        <Typography sx={{ fontSize: '20px', fontWeight: 600, color: 'text.primary' }}>
                            Bem-vindo, {user.name.split(' ')[0]}
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '15px' }}>
                            Aqui está o resumo da sua operação hoje
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '14px', color: 'text.secondary', textTransform: 'lowercase' }}>{format(new Date(), 'EEEE', { locale: ptBR })}</Typography>
                    <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'text.primary' }}>{format(new Date(), "d 'de' MMMM", { locale: ptBR })}</Typography>
                </Box>
            </Box>

            {/* Alerts Banner */}
            {criticalAlerts > 0 && !alertDismissed && (
                <Box sx={{
                    background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(249, 115, 22, 0.08) 100%)',
                    border: '1px solid rgba(244, 63, 94, 0.2)',
                    borderRadius: '16px', p: 2.5, mb: 3.5, display: 'flex', alignItems: 'center', gap: 2
                }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-icons-round" style={{ fontSize: '24px', color: '#f43f5e' }}>warning</span>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                            Atenção Requerida
                            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: '#f43f5e', color: 'white' }}>{criticalAlerts}</span>
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: '#94a3b8' }}>
                            Você tem {stats.kpis.gmuds > 0 && `${stats.kpis.gmuds} GMUDs pendentes de aprovação`}
                            {stats.kpis.gmuds > 0 && stats.expiringContracts?.length > 0 && ' e '}
                            {stats.expiringContracts?.length > 0 && `${stats.expiringContracts.length} contratos expirando nos próximos 30 dias`}.
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <button onClick={() => setAlertDismissed(true)} style={{ padding: '10px 18px', background: '#1c2632', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Ver Detalhes</button>
                        <button onClick={() => navigate('/approvals')} style={{ padding: '10px 18px', background: '#f43f5e', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Resolver Agora</button>
                    </Box>
                </Box>
            )}

            {/* KPI Grid - 5 cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(5, 1fr)' }, gap: 2, mb: 3.5 }}>
                {kpis.map((kpi, kpiIndex) => (
                    <Paper key={kpi.key} onClick={() => {
                        if (kpi.key === 'projects') navigate('/projects');
                        else if (kpi.key === 'tasks') navigate('/tasks');
                        else if (kpi.key === 'gmuds') navigate('/changes');
                        else if (kpi.key === 'assets') navigate('/assets');
                        else if (kpi.key === 'contracts') navigate('/contracts');
                    }} sx={{
                        ...commonPaperStyle, cursor: 'pointer', transition: 'all 0.3s',
                        animation: `kpiSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${kpiIndex * 0.08}s both`,
                        '@keyframes kpiSlideIn': {
                            '0%': { opacity: 0, transform: 'translateY(20px) scale(0.98)' },
                            '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
                        },
                        '&:hover': { transform: 'translateY(-4px)', borderColor: 'primary.main', boxShadow: mode === 'dark' ? '0 12px 28px rgba(0, 0, 0, 0.4)' : '0 12px 28px rgba(0, 0, 0, 0.1)' },
                        '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: kpi.gradient, borderRadius: '16px 16px 0 0' }
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                            <Box sx={{ width: 42, height: 42, borderRadius: '10px', background: `${kpi.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="material-icons-round" style={{ fontSize: '22px', color: kpi.color }}>{kpi.icon}</span>
                            </Box>
                            <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', background: badgeStyles[kpi.badgeType].bg, color: badgeStyles[kpi.badgeType].color }}>
                                {kpi.badgeLabel}
                            </span>
                        </Box>
                        <Typography sx={{ fontSize: kpi.key === 'finance' ? '24px' : '28px', fontWeight: 700, color: 'text.primary', mb: 0.25 }}>{kpi.value}</Typography>
                        <Typography sx={{ fontSize: '12px', color: 'text.secondary', fontWeight: 500 }}>{kpi.label}</Typography>
                        <Box sx={{ mt: 1, mb: 0.5 }}>
                            <MiniSparkline data={sparklineData[kpi.key]} color={kpi.color} />
                        </Box>
                        {kpi.budget ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.5, fontSize: '11px' }}>
                                <span className="material-icons-round" style={{ fontSize: '14px', color: '#14b8a6' }}>account_balance</span>
                                <span style={{ color: 'text.secondary' }}>Budget:</span>
                                <span style={{ color: '#14b8a6', fontWeight: 600 }}>{kpi.budget}</span>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5, pt: 1.25, borderTop: '1px solid', borderColor: 'divider', fontSize: '11px', color: footerStyles[kpi.footerType] || 'text.secondary' }}>
                                <span className="material-icons-round" style={{ fontSize: '13px' }}>{kpi.footerType === 'success' ? 'trending_up' : kpi.footerType === 'danger' ? 'warning' : 'schedule'}</span>
                                {kpi.footer}
                            </Box>
                        )}
                    </Paper>
                ))}
            </Box>

            {/* Main 2-Column Layout */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' }, gap: 3 }}>
                {/* Left Column */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Pendências para Aprovação */}
                    <Box sx={{ ...commonPaperStyle, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <span className="material-icons-round" style={{ fontSize: '20px', color: '#f59e0b' }}>pending_actions</span>
                                <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'text.primary' }}>Pendências que Requerem sua Aprovação</Typography>
                                {stats.pendingApprovals?.length > 0 && (
                                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: '#f43f5e', color: 'white' }}>{stats.pendingApprovals.length}</span>
                                )}
                            </Box>
                            <span onClick={() => navigate('/approvals')} style={{ fontSize: '12px', color: '#2563eb', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Ver todas <span className="material-icons-round" style={{ fontSize: '16px' }}>arrow_forward</span>
                            </span>
                        </Box>
                        <Box sx={{ p: 2 }}>
                            {stats.pendingApprovals?.length > 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                                    {stats.pendingApprovals.slice(0, 5).map(item => (
                                        <Box key={`${item.type}-${item.id}`} sx={{
                                            display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75,
                                            background: theme.palette.background.default,
                                            border: '1px solid', borderColor: 'divider',
                                            borderLeft: `3px solid ${item.type === 'GMUD' ? '#f59e0b' : item.type === 'MINUTE' ? '#3b82f6' : '#14b8a6'}`,
                                            borderRadius: '12px', transition: 'all 0.2s', '&:hover': { borderColor: 'primary.main' }
                                        }}>
                                            <Box sx={{
                                                width: 40, height: 40, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                background: item.type === 'GMUD' ? 'rgba(245, 158, 11, 0.15)' : item.type === 'MINUTE' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(20, 184, 166, 0.15)'
                                            }}>
                                                <span className="material-icons-round" style={{ fontSize: '20px', color: item.type === 'GMUD' ? '#f59e0b' : item.type === 'MINUTE' ? '#3b82f6' : '#14b8a6' }}>
                                                    {item.type === 'GMUD' ? 'sync_alt' : item.type === 'MINUTE' ? 'summarize' : 'receipt_long'}
                                                </span>
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography sx={{ fontSize: '10px', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.25 }}>{item.code || (item.type === 'MINUTE' ? 'Ata de Reunião' : item.type)}</Typography>
                                                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'text.primary', mb: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: '11px', color: 'text.secondary' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-icons-round" style={{ fontSize: '13px' }}>person</span>{item.requester}</span>
                                                    {item.scheduledDate && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-icons-round" style={{ fontSize: '13px' }}>schedule</span>Execução: {format(new Date(item.scheduledDate), 'dd MMM HH:mm', { locale: ptBR })}</span>}
                                                    {item.value && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-icons-round" style={{ fontSize: '13px' }}>payments</span>{formatCurrencyFull(item.value)}</span>}
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 0.75 }}>
                                                <button onClick={(e) => handleApprovePending(item, e)} style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid', borderColor: theme.palette.divider, background: theme.palette.background.paper, color: theme.palette.text.secondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { e.target.style.background = 'rgba(16, 185, 129, 0.15)'; e.target.style.borderColor = '#10b981'; e.target.style.color = '#10b981'; }} onMouseLeave={e => { e.target.style.background = theme.palette.background.paper; e.target.style.borderColor = theme.palette.divider; e.target.style.color = theme.palette.text.secondary; }}>
                                                    <span className="material-icons-round" style={{ fontSize: '16px' }}>check</span>
                                                </button>
                                                <button onClick={(e) => handleRejectPending(item, e)} style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid', borderColor: theme.palette.divider, background: theme.palette.background.paper, color: theme.palette.text.secondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { e.target.style.background = 'rgba(244, 63, 94, 0.15)'; e.target.style.borderColor = '#f43f5e'; e.target.style.color = '#f43f5e'; }} onMouseLeave={e => { e.target.style.background = theme.palette.background.paper; e.target.style.borderColor = theme.palette.divider; e.target.style.color = theme.palette.text.secondary; }}>
                                                    <span className="material-icons-round" style={{ fontSize: '16px' }}>close</span>
                                                </button>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 5 }}>
                                    <span className="material-icons-round" style={{ fontSize: '40px', color: 'text.secondary', opacity: 0.5, display: 'block', marginBottom: '12px' }}>task_alt</span>
                                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>Tudo limpo!</Typography>
                                    <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>Nenhuma pendência no momento.</Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* Ações Rápidas */}
                    <Box sx={{ ...commonPaperStyle, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <span className="material-icons-round" style={{ fontSize: '20px', color: '#2563eb' }}>flash_on</span>
                            <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'text.primary' }}>Ações Rápidas</Typography>
                        </Box>
                        <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                            {quickActions.map(action => (
                                <Box key={action.key} onClick={() => handleQuickAction(action.key)} sx={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25, p: 2.25,
                                    background: theme.palette.background.default,
                                    border: '1px solid', borderColor: 'divider', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                                    transition: 'all 0.2s',
                                    '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)', background: theme.palette.action.hover }
                                }}>
                                    <Box sx={{ width: 44, height: 44, borderRadius: '10px', background: action.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="material-icons-round" style={{ fontSize: '22px', color: 'white' }}>{action.icon}</span>
                                    </Box>
                                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'text.primary' }}>{action.title}</Typography>
                                    <Typography sx={{ fontSize: '10px', color: 'text.secondary', mt: -0.5 }}>{action.desc}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    {/* Contratos Expirando */}
                    {stats.expiringContracts?.length > 0 && (
                        <Box sx={{ ...commonPaperStyle, background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <span className="material-icons-round" style={{ fontSize: '20px', color: '#ec4899' }}>event_busy</span>
                                    <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'text.primary' }}>Contratos Expirando</Typography>
                                </Box>
                                <span onClick={() => navigate('/contracts')} style={{ fontSize: '12px', color: '#2563eb', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Ver todos <span className="material-icons-round" style={{ fontSize: '16px' }}>arrow_forward</span>
                                </span>
                            </Box>
                            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                                {stats.expiringContracts.slice(0, 3).map(contract => {
                                    const daysRemaining = differenceInDays(new Date(contract.endDate), new Date());
                                    const isCritical = daysRemaining <= 15;
                                    return (
                                        <Box key={contract.id} onClick={() => navigate('/contracts')} sx={{
                                            display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75,
                                            background: theme.palette.background.default,
                                            border: '1px solid', borderColor: 'divider',
                                            borderLeft: `3px solid ${isCritical ? '#f43f5e' : '#f59e0b'}`,
                                            borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: 'primary.main' }
                                        }}>
                                            <Box sx={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <span className="material-icons-round" style={{ fontSize: '20px', color: '#ec4899' }}>description</span>
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'text.primary', mb: 0.25 }}>{contract.name}</Typography>
                                                <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>{contract.supplier?.name}</Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography sx={{ fontSize: '18px', fontWeight: 700, color: isCritical ? '#f43f5e' : '#f59e0b' }}>{daysRemaining}</Typography>
                                                <Typography sx={{ fontSize: '10px', color: 'text.secondary' }}>dias restantes</Typography>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* Right Column - Constrained height logic */}
                <Box sx={{ position: { lg: 'relative' }, minHeight: { lg: '500px' } }}>
                    <Box sx={{
                        position: { lg: 'absolute' },
                        inset: { lg: 0 },
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        height: { xs: 'auto', lg: '100%' }
                    }}>
                        {/* Budget Overview */}
                        <Box sx={{ ...commonPaperStyle, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', flexShrink: 0 }}>
                            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box>
                                        <Typography sx={{ fontSize: '14px', fontWeight: 600, opacity: 0.9, mb: 0.5 }}>Orçamento do Ano</Typography>
                                        <Typography sx={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.5px' }}>{formatCurrencyFull(budgetTotal)}</Typography>
                                    </Box>
                                    <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="material-icons-round" style={{ fontSize: '24px' }}>account_balance_wallet</span>
                                    </Box>
                                </Box>

                                <Box sx={{ mt: 4 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>Executado</Typography>
                                        <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>{budgetPercentUsed.toFixed(0)}%</Typography>
                                    </Box>
                                    <Box sx={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <Box sx={{ width: `${budgetPercentUsed.toFixed(0)}%`, height: '100%', background: 'white', borderRadius: '3px' }} />
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                        <Box>
                                            <Typography sx={{ fontSize: '11px', opacity: 0.8 }}>Gasto (YTD)</Typography>
                                            <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>{formatCurrencyFull(budgetSpent)}</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography sx={{ fontSize: '11px', opacity: 0.8 }}>Disponível</Typography>
                                            <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>{formatCurrencyFull(budgetRemaining)}</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>


                        {/* Atividade Recente - Wrapper com scroll */}
                        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <RecentActivities userId={user.id} />
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Modals */}
            <ProjectModal open={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} onSave={handleSaveProject} loading={modalLoading} />
            <TaskModal open={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} onSave={handleSaveTask} loading={modalLoading} isGeneralTask={true} members={allUsers} />
            <ChangeModal open={isGmudModalOpen} onClose={() => setIsGmudModalOpen(false)} onSave={handleSaveGmud} loading={modalLoading} />
            <ExpenseModal open={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} onSave={handleSaveExpense} />
            <ContractModal open={isContractModalOpen} onClose={() => setIsContractModalOpen(false)} onSave={handleSaveContract} loading={modalLoading} />
            <SupplierModal open={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} onSave={handleSaveSupplier} loading={modalLoading} />
        </Box>
    );
};

export default ManagerDashboard;
