import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Chip, LinearProgress, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    FolderOpen,
    TrendingUp,
    Warning,
    CheckCircle,
    Schedule,
    AttachMoney,
    Assessment
} from '@mui/icons-material';
import { getAllProjects } from '../../services/project.service';

const PortfolioDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await getAllProjects();
            setProjects(data);
        } catch (error) {
            console.error('Erro ao carregar projetos:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calcular KPIs
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => ['PLANNING', 'IN_PROGRESS'].includes(p.status)).length;
    const completedProjects = projects.filter(p => p.status === 'COMPLETED').length;
    const delayedProjects = projects.filter(p => {
        if (!p.endDate) return false;
        return new Date(p.endDate) < new Date() && p.status !== 'COMPLETED';
    }).length;

    const totalBudget = projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0);
    const totalSpent = projects.reduce((sum, p) => sum + (parseFloat(p.actualCost) || 0), 0);
    const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const getStatusColor = (status) => {
        const colors = {
            'PLANNING': 'info',
            'IN_PROGRESS': 'primary',
            'ON_HOLD': 'warning',
            'COMPLETED': 'success',
            'CANCELLED': 'error'
        };
        return colors[status] || 'default';
    };

    const getStatusLabel = (status) => {
        const labels = {
            'PLANNING': 'Planejamento',
            'IN_PROGRESS': 'Em Andamento',
            'ON_HOLD': 'Pausado',
            'COMPLETED': 'Concluído',
            'CANCELLED': 'Cancelado'
        };
        return labels[status] || status;
    };

    const getPriorityColor = (priority) => {
        const colors = {
            'HIGH': '#ef4444',
            'MEDIUM': '#f59e0b',
            'LOW': '#10b981'
        };
        return colors[priority] || '#64748b';
    };

    if (loading) {
        return <Box p={4} textAlign="center">Carregando portfólio...</Box>;
    }

    return (
        <Box sx={{ p: 4, bgcolor: '#f8fafc', minHeight: '100vh' }}>
            <Typography variant="h4" fontWeight="700" mb={3}>
                Dashboard de Portfólio
            </Typography>

            {/* KPIs */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={3}>
                    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2}>
                                <Box sx={{ p: 1.5, bgcolor: '#e0e7ff', borderRadius: 2 }}>
                                    <FolderOpen sx={{ color: '#3b82f6' }} />
                                </Box>
                                <Box flex={1}>
                                    <Typography variant="h4" fontWeight="700">{totalProjects}</Typography>
                                    <Typography variant="caption" color="text.secondary">Total de Projetos</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2}>
                                <Box sx={{ p: 1.5, bgcolor: '#dbeafe', borderRadius: 2 }}>
                                    <TrendingUp sx={{ color: '#0ea5e9' }} />
                                </Box>
                                <Box flex={1}>
                                    <Typography variant="h4" fontWeight="700">{activeProjects}</Typography>
                                    <Typography variant="caption" color="text.secondary">Em Andamento</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2}>
                                <Box sx={{ p: 1.5, bgcolor: '#dcfce7', borderRadius: 2 }}>
                                    <CheckCircle sx={{ color: '#10b981' }} />
                                </Box>
                                <Box flex={1}>
                                    <Typography variant="h4" fontWeight="700">{completedProjects}</Typography>
                                    <Typography variant="caption" color="text.secondary">Concluídos</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2}>
                                <Box sx={{ p: 1.5, bgcolor: '#fee2e2', borderRadius: 2 }}>
                                    <Warning sx={{ color: '#ef4444' }} />
                                </Box>
                                <Box flex={1}>
                                    <Typography variant="h4" fontWeight="700">{delayedProjects}</Typography>
                                    <Typography variant="caption" color="text.secondary">Atrasados</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Budget Summary */}
            <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 4 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <AttachMoney sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="700">Visão Geral Financeira</Typography>
                </Box>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Typography variant="caption" color="text.secondary" fontWeight="600">ORÇAMENTO TOTAL</Typography>
                        <Typography variant="h5" fontWeight="700" color="primary.main">
                            {totalBudget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Typography variant="caption" color="text.secondary" fontWeight="600">GASTO TOTAL</Typography>
                        <Typography variant="h5" fontWeight="700">
                            {totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Typography variant="caption" color="text.secondary" fontWeight="600">UTILIZAÇÃO</Typography>
                        <Box mt={0.5}>
                            <LinearProgress
                                variant="determinate"
                                value={Math.min(budgetUtilization, 100)}
                                color={budgetUtilization > 90 ? 'error' : budgetUtilization > 75 ? 'warning' : 'success'}
                                sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                            />
                            <Typography variant="body2" fontWeight="600">{budgetUtilization.toFixed(1)}%</Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Projects Table */}
            <Paper elevation={0} variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
                <Box sx={{ p: 3, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Assessment sx={{ color: 'primary.main' }} />
                        <Typography variant="h6" fontWeight="700">Projetos Ativos</Typography>
                    </Box>
                </Box>

                <Box sx={{ overflowX: 'auto' }}>
                    {projects.filter(p => p.status !== 'COMPLETED' && p.status !== 'CANCELLED').map((project) => {
                        const budget = parseFloat(project.budget) || 0;
                        const spent = parseFloat(project.actualCost) || 0;
                        const consumption = budget > 0 ? (spent / budget) * 100 : 0;

                        return (
                            <Box
                                key={project.id}
                                sx={{
                                    p: 3,
                                    borderBottom: '1px solid #e2e8f0',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        bgcolor: '#f8fafc'
                                    }
                                }}
                                onClick={() => navigate(`/projects/${project.id}`)}
                            >
                                <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={12} md={4}>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Box
                                                sx={{
                                                    width: 4,
                                                    height: 40,
                                                    bgcolor: getPriorityColor(project.priority),
                                                    borderRadius: 1
                                                }}
                                            />
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight="700">{project.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{project.code}</Typography>
                                            </Box>
                                        </Box>
                                    </Grid>

                                    <Grid item xs={6} md={2}>
                                        <Typography variant="caption" color="text.secondary">STATUS</Typography>
                                        <Box mt={0.5}>
                                            <Chip
                                                label={getStatusLabel(project.status)}
                                                size="small"
                                                color={getStatusColor(project.status)}
                                                sx={{ fontWeight: 600 }}
                                            />
                                        </Box>
                                    </Grid>

                                    <Grid item xs={6} md={2}>
                                        <Typography variant="caption" color="text.secondary">PROGRESSO</Typography>
                                        <Box mt={0.5}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={project.progress || 0}
                                                sx={{ height: 6, borderRadius: 3 }}
                                            />
                                            <Typography variant="caption" fontWeight="600">{project.progress || 0}%</Typography>
                                        </Box>
                                    </Grid>

                                    <Grid item xs={6} md={2}>
                                        <Typography variant="caption" color="text.secondary">ORÇAMENTO</Typography>
                                        <Box mt={0.5}>
                                            <Typography variant="body2" fontWeight="600">
                                                {budget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </Typography>
                                            <Typography variant="caption" color={consumption > 90 ? 'error.main' : 'text.secondary'}>
                                                {consumption.toFixed(0)}% consumido
                                            </Typography>
                                        </Box>
                                    </Grid>

                                    <Grid item xs={6} md={2}>
                                        <Typography variant="caption" color="text.secondary">GERENTE</Typography>
                                        <Typography variant="body2" fontWeight="600">
                                            {project.manager?.name || 'Não atribuído'}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                        );
                    })}
                </Box>
            </Paper>
        </Box>
    );
};

export default PortfolioDashboard;
