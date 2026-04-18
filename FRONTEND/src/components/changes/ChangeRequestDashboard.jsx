import React, { useMemo, useContext } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { Refresh, Timeline } from '@mui/icons-material';
import { ThemeContext } from '../../contexts/ThemeContext';
import StatsCard from '../common/StatsCard';
import KpiGrid from '../common/KpiGrid';
import DataListTable from '../common/DataListTable';
import { getChangeRequestColumns } from '../../pages/changes/changeRequestListColumns';
import { sortChangeRequestRows } from '../../pages/changes/changeRequestListSort';

/**
 * Dashboard de acompanhamento de GMUDs — KPIs + lista com DataListTable (ordenação, paginação).
 */
const ChangeRequestDashboard = ({
    changes = [],
    loading = false,
    onRefresh,
    onView,
    onEdit,
    onDelete,
    onSend,
}) => {
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
            finalizedFail,
        };
    }, [changes]);

    const dashboardListKey = useMemo(
        () => (changes.length ? changes.map((c) => c.id).join() : '0'),
        [changes]
    );

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
                        <IconButton onClick={onRefresh} sx={{ color: textSecondary }} aria-label="Atualizar lista de GMUDs">
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

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

            <DataListTable
                shell={{
                    title: 'Lista de GMUDs',
                    titleIcon: 'sync_alt',
                    accentColor: '#667eea',
                    count: changes.length,
                    sx: {
                        background: panelBg,
                        border: panelBorder,
                        borderRadius: '8px',
                        backdropFilter: 'blur(10px)',
                        overflow: 'hidden',
                    },
                }}
                columns={getChangeRequestColumns({
                    isDark,
                    onView,
                    onEdit,
                    onDelete,
                    onSend,
                })}
                rows={changes}
                sortRows={sortChangeRequestRows}
                defaultOrderBy="scheduledStart"
                defaultOrder="desc"
                getDefaultOrderForColumn={(id) => (id === 'scheduledStart' || id === 'code' ? 'desc' : 'asc')}
                loading={loading}
                emptyMessage="Nenhuma GMUD encontrada"
                rowsPerPageDefault={10}
                rowsPerPageOptions={[5, 10, 25, 50]}
                resetPaginationKey={dashboardListKey}
                onRowClick={onView}
            />
        </Box>
    );
};

export default ChangeRequestDashboard;
