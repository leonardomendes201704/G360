import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Skeleton, useTheme } from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../services/api';

const RecentActivities = ({ projectId, userId }) => {
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const entityRouteMap = {
        'expense': '/finance',
        'project': '/projects',
        'task': '/tasks',
        'incident': '/incidents',
        'contract': '/contracts',
        'asset': '/assets',
        'risk': '/risks',
        'change': '/changes',
        'gmud': '/changes',
        'budget': '/finance',
        'supplier': '/suppliers',
        'knowledge': '/knowledge',
        'approval': '/approvals',
        'proposal': '/projects',
        'minute': '/projects',
    };

    const handleActivityClick = (log) => {
        const entityType = log.entityType?.toLowerCase() || '';
        const route = entityRouteMap[entityType];
        if (route) navigate(route);
    };

    // Theme-aware styles
    const cardBg = mode === 'dark' ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#FFFFFF';
    const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const cardShadow = mode === 'dark' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.07)';
    const textPrimary = mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary;
    const textSecondary = mode === 'dark' ? '#94a3b8' : theme.palette.text.secondary;
    const itemHoverBg = mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';

    useEffect(() => {
        const fetchActivities = async () => {
            if (!projectId && !userId) return;
            try {
                const params = { limit: 50 };
                if (projectId) params.entityId = projectId;
                if (userId) params.userId = userId;

                const response = await api.get('/audit-logs', { params });
                setActivities(response.data.data || []);
            } catch (error) {
                console.error("Error loading activities:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivities();
    }, [projectId, userId]);

    const getActionIcon = (action) => {
        if (action?.includes('CREATE')) return { icon: 'add_circle', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
        if (action?.includes('UPDATE')) return { icon: 'edit', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
        if (action?.includes('DELETE')) return { icon: 'delete', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' };
        if (action?.includes('APPROVE')) return { icon: 'check_circle', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
        return { icon: 'history', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.15)' };
    };

    const entityTranslation = {
        'expense': 'despesa',
        'project': 'projeto',
        'task': 'tarefa',
        'incident': 'incidente',
        'contract': 'contrato',
        'asset': 'ativo',
        'risk': 'risco',
        'change': 'mudança',
        'gmud': 'GMUD',
        'budget': 'orçamento',
        'supplier': 'fornecedor',
        'knowledge': 'artigo',
        'approval': 'aprovação',
        'user': 'usuário',
        'proposal': 'proposta',
        'minute': 'ata',
        'comment': 'comentário',
    };

    const getActionText = (log) => {
        const action = log.action || '';
        const rawEntity = log.entityType?.toLowerCase() || 'item';
        const entity = entityTranslation[rawEntity] || rawEntity;

        if (action.includes('CREATE')) return `Criou ${entity}`;
        if (action.includes('UPDATE')) return `Atualizou ${entity}`;
        if (action.includes('DELETE')) return `Excluiu ${entity}`;
        if (action.includes('APPROVE')) return `Aprovou ${entity}`;
        return `Ação em ${entity}`;
    };

    const isEmpty = !loading && activities.length === 0;

    return (
        <Box
            sx={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                p: '28px',
                boxShadow: cardShadow,
                height: isEmpty ? 'auto' : '100%',
                minHeight: isEmpty ? 300 : undefined,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <Box display="flex" alignItems="center" gap={1.5} mb={3} flexShrink={0}>
                <span className="material-icons-round" style={{ color: '#f59e0b', fontSize: 24 }}>
                    history
                </span>
                <Box sx={{ fontSize: '18px', fontWeight: 600, color: textPrimary }}>
                    Atividades Recentes
                </Box>
            </Box>

            {/* Content List */}
            <Box sx={{
                flex: 1,
                overflowY: 'auto',
                pr: 1,
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': {
                    background: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.1)',
                    borderRadius: '8px'
                }
            }}>
                {loading ? (
                    <Box display="flex" flexDirection="column" gap={2}>
                        {[1, 2, 3].map(i => (
                            <Box key={i} display="flex" gap={2}>
                                <Skeleton variant="circular" width={40} height={40} />
                                <Box flex={1}>
                                    <Skeleton variant="text" width="60%" />
                                    <Skeleton variant="text" width="40%" />
                                </Box>
                            </Box>
                        ))}
                    </Box>
                ) : activities.length === 0 ? (
                    <Box
                        sx={{
                            minHeight: 220,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: 1.5,
                            py: 4,
                            px: 2,
                            borderRadius: '8px',
                            border: `1px dashed ${mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                            bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15, 23, 42, 0.03)',
                        }}
                    >
                        <span className="material-icons-round" style={{ fontSize: 44, color: textSecondary, opacity: 0.85 }}>
                            history_toggle_off
                        </span>
                        <Typography sx={{ color: textPrimary, fontSize: '15px', fontWeight: 600, textAlign: 'center' }}>
                            Nenhuma atividade recente
                        </Typography>
                        <Typography sx={{ color: textSecondary, fontSize: '13px', textAlign: 'center', maxWidth: 280, lineHeight: 1.45 }}>
                            As alterações neste projeto aparecerão aqui quando houver registros no histórico.
                        </Typography>
                    </Box>
                ) : (
                    <Box display="flex" flexDirection="column" gap={0.5}>
                        {activities.map((log) => {
                            const style = getActionIcon(log.action);
                            return (
                                <Box
                                    key={log.id}
                                    onClick={() => handleActivityClick(log)}
                                    sx={{
                                        display: 'flex',
                                        gap: 2,
                                        p: 1.5,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            background: itemHoverBg,
                                            transform: 'translateX(4px)'
                                        }
                                    }}
                                >
                                    {/* Icon */}
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '8px',
                                        background: style.bg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <span className="material-icons-round" style={{ color: style.color, fontSize: 18 }}>
                                            {style.icon}
                                        </span>
                                    </Box>

                                    {/* Text */}
                                    <Box flex={1} minWidth={0}>
                                        <Typography sx={{ fontSize: '14px', fontWeight: 500, color: textPrimary, lineHeight: 1.4 }}>
                                            {getActionText(log)}
                                        </Typography>
                                        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                            <Typography sx={{ fontSize: '12px', color: textSecondary }}>
                                                {log.user?.name || 'Sistema'}
                                            </Typography>
                                            <Box sx={{ width: 3, height: 3, borderRadius: '8px', bgcolor: textSecondary, opacity: 0.5 }} />
                                            <Typography sx={{ fontSize: '12px', color: textSecondary }}>
                                                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ptBR })}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default RecentActivities;
