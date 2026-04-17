import React, { useMemo, useContext } from 'react';
import {
    Box,
    Chip,
    Divider,
    IconButton,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography
} from '@mui/material';
import { Refresh, Timeline } from '@mui/icons-material';
import { ThemeContext } from '../../contexts/ThemeContext';
import StatsCard from '../common/StatsCard';
import KpiGrid from '../common/KpiGrid';

/**
 * ChangeRequestDashboard - Dashboard de Acompanhamento de GMUDs
 * Exibe total de GMUDs e tabela com status
 */
const ChangeRequestDashboard = ({ changes = [], loading = false, onRefresh, onSelectChange }) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#475569';
    const panelBg = isDark ? 'rgba(22, 29, 38, 0.5)' : '#ffffff';
    const panelBorder = isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)';

    const stats = useMemo(() => {
        const pending = changes.filter((c) => ['PENDING_APPROVAL', 'DRAFT'].includes(c.status)).length;
        const approved = changes.filter((c) => ['APPROVED', 'APPROVED_WAITING_EXECUTION'].includes(c.status)).length;
        const executing = changes.filter((c) => c.actualStart && !c.actualEnd).length;
        const finalizedSuccess = changes.filter((c) => ['EXECUTED', 'COMPLETED', 'CLOSED'].includes(c.status)).length;
        const finalizedFail = changes.filter((c) => ['FAILED', 'REJECTED'].includes(c.status)).length;
        const finalizedTotal = finalizedSuccess + finalizedFail;

        return {
            pending,
            approved,
            executing,
            finalizedTotal,
            finalizedSuccess,
            finalizedFail
        };
    }, [changes]);

    const sortedChanges = useMemo(() => {
        return [...changes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [changes]);

    const getRiskColor = (risk) => {
        const map = {
            BAIXO: ['#10b981', '#34d399'],
            MEDIO: ['#f59e0b', '#fbbf24'],
            ALTO: ['#ef4444', '#f87171'],
            CRITICO: ['#ef4444', '#f87171']
        };
        return map[risk] || ['#6b7280', '#9ca3af'];
    };

    const getRiskBgColor = (risk) => {
        const map = {
            BAIXO: 'rgba(16, 185, 129, 0.15)',
            MEDIO: 'rgba(245, 158, 11, 0.15)',
            ALTO: 'rgba(239, 68, 68, 0.15)',
            CRITICO: 'rgba(239, 68, 68, 0.15)'
        };
        return map[risk] || 'rgba(107, 114, 128, 0.15)';
    };

    const getImpactConfig = (impact) => {
        const config = {
            MENOR: { width: '30%', gradient: 'linear-gradient(90deg, #10b981, #34d399)', label: 'Baixo' },
            SIGNIFICATIVO: { width: '60%', gradient: 'linear-gradient(90deg, #f59e0b, #fbbf24)', label: 'Medio' },
            MAIOR: { width: '90%', gradient: 'linear-gradient(90deg, #ef4444, #f87171)', label: 'Alto' }
        };
        return config[impact] || { width: '50%', gradient: 'linear-gradient(90deg, #6b7280, #9ca3af)', label: impact };
    };

    const getTypeLabel = (type) => {
        const labels = {
            NORMAL: 'Planejada',
            PADRAO: 'Padrao',
            EMERGENCIAL: 'Emergencial'
        };
        return labels[type] || type;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            DRAFT: '#64748b',
            PENDING_APPROVAL: '#f59e0b',
            APPROVED: '#10b981',
            APPROVED_WAITING_EXECUTION: '#10b981',
            EXECUTED: '#2563eb',
            FAILED: '#ef4444',
            REJECTED: '#ef4444',
            COMPLETED: '#10b981',
            CLOSED: '#10b981'
        };
        return colors[status] || '#64748b';
    };

    const getStatusLabel = (status) => {
        const labels = {
            DRAFT: 'Rascunho',
            PENDING_APPROVAL: 'Aguardando aprovacao',
            APPROVED: 'Aprovada',
            APPROVED_WAITING_EXECUTION: 'Aprovada (aguardando execucao)',
            EXECUTED: 'Executada',
            FAILED: 'Falha na execucao',
            REJECTED: 'Rejeitada',
            COMPLETED: 'Concluida',
            CLOSED: 'Concluida'
        };
        return labels[status] || status?.replace(/_/g, ' ') || 'N/A';
    };

    return (
        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Timeline sx={{ fontSize: 28, color: isDark ? '#a5b4fc' : '#2563eb' }} />
                    <Typography variant="h6" sx={{ color: textPrimary, fontWeight: 600 }}>
                        Acompanhamento de GMUDs
                    </Typography>
                </Box>
                {onRefresh && (
                    <Tooltip title="Atualizar">
                        <IconButton onClick={onRefresh} sx={{ color: textSecondary }}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <KpiGrid maxColumns={5} mb={3}>
                <StatsCard
                    title="Total de GMUDs"
                    value={changes.length}
                    iconName="sync_alt"
                    hexColor="#2563eb"
                />
                <StatsCard
                    title="Pendentes"
                    value={stats.pending}
                    iconName="hourglass_top"
                    hexColor="#f59e0b"
                />
                <StatsCard
                    title="Aprovadas"
                    value={stats.approved}
                    iconName="check_circle"
                    hexColor="#10b981"
                />
                <StatsCard
                    title="Em execucao"
                    value={stats.executing}
                    iconName="play_arrow"
                    hexColor="#3b82f6"
                />
                <StatsCard
                    title="Finalizadas"
                    value={stats.finalizedTotal}
                    iconName="done_all"
                    hexColor="#6366f1"
                    subtitle={`Sucesso ${stats.finalizedSuccess} · Falha ${stats.finalizedFail}`}
                />
            </KpiGrid>

            <Box
                sx={{
                    background: panelBg,
                    border: panelBorder,
                    borderRadius: '16px',
                    backdropFilter: 'blur(10px)',
                    overflow: 'hidden'
                }}
            >
                <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>
                        Lista de GMUDs
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: textSecondary }}>
                        {changes.length} registros
                    </Typography>
                </Box>
                <Divider sx={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }} />

                {sortedChanges.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4, color: textSecondary }}>
                        <Typography>Nenhuma GMUD encontrada</Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc' }}>
                                    <TableCell sx={{ color: textSecondary, borderBottom: panelBorder }}>
                                        ID GMUD
                                    </TableCell>
                                    <TableCell sx={{ color: textSecondary, borderBottom: panelBorder }} width="24%">
                                        Titulo
                                    </TableCell>
                                    <TableCell sx={{ color: textSecondary, borderBottom: panelBorder }}>
                                        Tipo
                                    </TableCell>
                                    <TableCell sx={{ color: textSecondary, borderBottom: panelBorder }}>
                                        Prioridade
                                    </TableCell>
                                    <TableCell sx={{ color: textSecondary, borderBottom: panelBorder }}>
                                        Status
                                    </TableCell>
                                    <TableCell sx={{ color: textSecondary, borderBottom: panelBorder }}>
                                        Responsavel
                                    </TableCell>
                                    <TableCell sx={{ color: textSecondary, borderBottom: panelBorder }}>
                                        Data execucao
                                    </TableCell>
                                    <TableCell sx={{ color: textSecondary, borderBottom: panelBorder }}>
                                        Impacto
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedChanges.map((change) => (
                                    <TableRow
                                        key={change.id}
                                        hover
                                        onClick={() => onSelectChange && onSelectChange(change)}
                                        sx={{
                                            cursor: onSelectChange ? 'pointer' : 'default',
                                            '&:hover': { bgcolor: isDark ? 'rgba(37, 99, 235, 0.06)' : 'rgba(37, 99, 235, 0.08)' }
                                        }}
                                    >
                                        <TableCell sx={{ color: textPrimary, borderBottom: panelBorder }}>
                                            {change.code || change.id}
                                        </TableCell>
                                        <TableCell sx={{ color: textPrimary, borderBottom: panelBorder }}>
                                            {change.title || '-'}
                                        </TableCell>
                                        <TableCell sx={{ color: textPrimary, borderBottom: panelBorder }}>
                                            {getTypeLabel(change.type)}
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: panelBorder }}>
                                            <Box
                                                sx={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 0.75,
                                                    px: 1.25,
                                                    py: 0.5,
                                                    borderRadius: 1.5,
                                                    bgcolor: getRiskBgColor(change.riskLevel),
                                                    color: getRiskColor(change.riskLevel)[1]
                                                }}
                                            >
                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: getRiskColor(change.riskLevel)[0] }} />
                                                <Typography sx={{ fontSize: 11, fontWeight: 600 }}>
                                                    {change.riskLevel || '-'}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: panelBorder }}>
                                            <Chip
                                                label={getStatusLabel(change.status)}
                                                size="small"
                                                sx={{
                                                    bgcolor: `${getStatusColor(change.status)}20`,
                                                    color: getStatusColor(change.status),
                                                    fontWeight: 600,
                                                    fontSize: 10
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ color: textPrimary, borderBottom: panelBorder }}>
                                            {change.requester?.name?.split(' ')[0] || 'N/A'}
                                        </TableCell>
                                        <TableCell sx={{ color: textPrimary, borderBottom: panelBorder }}>
                                            {formatDate(change.scheduledStart)}
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: panelBorder }}>
                                            {(() => {
                                                const impactConfig = getImpactConfig(change.impact);
                                                return (
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                        <Typography sx={{ fontSize: 11, color: textSecondary }}>
                                                            {impactConfig.label || '-'}
                                                        </Typography>
                                                        <Box
                                                            sx={{
                                                                width: 90,
                                                                height: 6,
                                                                bgcolor: isDark
                                                                    ? 'rgba(255, 255, 255, 0.1)'
                                                                    : 'rgba(0, 0, 0, 0.08)',
                                                                borderRadius: 0.75,
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    width: impactConfig.width,
                                                                    height: '100%',
                                                                    background: impactConfig.gradient,
                                                                    borderRadius: 0.75,
                                                                    transition: 'width 0.3s ease'
                                                                }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                );
                                            })()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        </Box>
    );
};

export default ChangeRequestDashboard;
