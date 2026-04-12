import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useSnackbar } from 'notistack';
import {
    Box, Typography, Paper, Button, TextField, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, useTheme, Chip
} from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';
// removed usePermission
import { getTimeReport, exportTimeReport } from '../../services/task-time.service';
import { getUsers } from '../../services/user.service';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatDuration = (seconds) => {
    if (!seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const formatHoursDecimal = (seconds) => {
    if (!seconds) return '0.0';
    return (seconds / 3600).toFixed(1);
};

const TimeReportPage = () => {
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();
    const isDark = mode === 'dark';
    const { enqueueSnackbar } = useSnackbar();

    // Theme tokens
    const cardBg = isDark ? 'rgba(22, 29, 38, 0.5)' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#64748b' : '#475569';
    const textMuted = isDark ? '#94a3b8' : '#64748b';

    const inputSx = {
        '& .MuiOutlinedInput-root': {
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
            color: textPrimary,
            '& fieldset': { borderColor },
            '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.3)' },
            '&.Mui-focused fieldset': { borderColor: '#2563eb' }
        },
        '& .MuiInputLabel-root': { color: textMuted },
        '& .MuiInputBase-input': { color: textPrimary }
    };

    // State
    const [report, setReport] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Filters
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(thirtyDaysAgo);
    const [endDate, setEndDate] = useState(today);
    const [selectedUser, setSelectedUser] = useState('ALL');

    // Load users
    useEffect(() => {
        getUsers().then(setUsers).catch(() => { });
    }, []);

    // Fetch report
    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const filters = {};
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            if (selectedUser !== 'ALL') filters.userId = selectedUser;
            const data = await getTimeReport(filters);
            setReport(data);
        } catch (err) {
            enqueueSnackbar('Erro ao carregar relatório.', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, selectedUser, enqueueSnackbar]);

    useEffect(() => { fetchReport(); }, [fetchReport]);

    // Export handler
    const handleExport = async (fmt) => {
        setExporting(true);
        try {
            const filters = {};
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            if (selectedUser !== 'ALL') filters.userId = selectedUser;
            await exportTimeReport(filters, fmt);
            enqueueSnackbar(`Exportado como ${fmt.toUpperCase()} com sucesso!`, { variant: 'success' });
        } catch (err) {
            enqueueSnackbar('Erro ao exportar.', { variant: 'error' });
        } finally {
            setExporting(false);
        }
    };

    // KPIs
    const kpis = useMemo(() => {
        if (!report) return { totalHours: 0, totalSessions: 0, avgPerDay: 0, topTask: null };
        const totalHours = (report.totalSeconds / 3600).toFixed(1);
        const totalSessions = report.totalSessions || 0;

        // Calculate unique days
        const days = new Set(report.logs?.map(l => l.startedAt?.split('T')[0]) || []);
        const avgPerDay = days.size > 0 ? (report.totalSeconds / 3600 / days.size).toFixed(1) : '0.0';

        const topTask = report.byTask?.sort((a, b) => b.totalSeconds - a.totalSeconds)?.[0] || null;

        return { totalHours, totalSessions, avgPerDay, topTask };
    }, [report]);

    const kpiConfig = [
        { label: 'Total de Horas', value: `${kpis.totalHours}h`, icon: 'schedule', color: '#2563eb' },
        { label: 'Sessões', value: kpis.totalSessions, icon: 'play_circle', color: '#10b981' },
        { label: 'Média/Dia', value: `${kpis.avgPerDay}h`, icon: 'trending_up', color: '#f59e0b' },
        { label: 'Top Tarefa', value: kpis.topTask?.task?.title || '-', icon: 'star', color: '#ec4899', small: true },
    ];

    return (
        <Box>
            {/* Header */}
            <Paper sx={{
                mb: 3, p: 3, borderRadius: '16px', bgcolor: cardBg,
                border: `1px solid ${borderColor}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <span className="material-icons-round" style={{ fontSize: '28px', color: '#2563eb' }}>timer</span>
                    <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary, fontFamily: theme.typography.fontFamily }}>
                        Relatório de Horas
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        onClick={() => handleExport('csv')}
                        disabled={exporting || !report?.logs?.length}
                        variant="outlined"
                        startIcon={<span className="material-icons-round">download</span>}
                        sx={{
                            color: textSecondary, borderColor: borderColor, borderRadius: '12px',
                            textTransform: 'none', fontWeight: 600, fontSize: '13px',
                            '&:hover': { borderColor: '#2563eb', color: '#2563eb' }
                        }}
                    >
                        CSV
                    </Button>
                    <Button
                        onClick={() => handleExport('xlsx')}
                        disabled={exporting || !report?.logs?.length}
                        variant="outlined"
                        startIcon={<span className="material-icons-round">table_chart</span>}
                        sx={{
                            color: textSecondary, borderColor: borderColor, borderRadius: '12px',
                            textTransform: 'none', fontWeight: 600, fontSize: '13px',
                            '&:hover': { borderColor: '#10b981', color: '#10b981' }
                        }}
                    >
                        Excel
                    </Button>
                </Box>
            </Paper>

            {/* KPI Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
                {kpiConfig.map((item, idx) => (
                    <Paper key={idx} sx={{
                        bgcolor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px',
                        padding: '20px', display: 'flex', alignItems: 'center', gap: 2,
                        position: 'relative', overflow: 'hidden',
                        '&::before': {
                            content: '""', position: 'absolute', top: 0, left: 0, right: 0,
                            height: '3px', borderRadius: '16px 16px 0 0', background: item.color,
                        }
                    }}>
                        <Box sx={{
                            width: 40, height: 40, borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: `${item.color}12`, color: item.color
                        }}>
                            <span className="material-icons-round" style={{ fontSize: 20 }}>{item.icon}</span>
                        </Box>
                        <Box>
                            <Typography sx={{
                                fontSize: item.small ? '13px' : '22px', fontWeight: 700, color: textPrimary,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150
                            }}>
                                {item.value}
                            </Typography>
                            <Typography sx={{ fontSize: '11px', color: textMuted, fontWeight: 500 }}>
                                {item.label}
                            </Typography>
                        </Box>
                    </Paper>
                ))}
            </Box>

            {/* Filters */}
            <Paper sx={{
                mb: 3, p: 3, borderRadius: '16px', bgcolor: cardBg,
                border: `1px solid ${borderColor}`,
            }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                    <TextField
                        label="Data Início" type="date" size="small"
                        value={startDate} onChange={(e) => setStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }} sx={inputSx}
                    />
                    <TextField
                        label="Data Fim" type="date" size="small"
                        value={endDate} onChange={(e) => setEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }} sx={inputSx}
                    />
                    <TextField
                        select label="Colaborador" size="small"
                        value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}
                        sx={inputSx}
                    >
                        <MenuItem value="ALL">Todos</MenuItem>
                        {users.map(u => (
                            <MenuItem key={u.id} value={u.id}>{u.name || u.email}</MenuItem>
                        ))}
                    </TextField>
                </Box>
            </Paper>

            {/* Results Table */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress size={40} />
                </Box>
            ) : !report?.logs?.length ? (
                <Paper sx={{
                    p: 6, textAlign: 'center', borderRadius: '16px',
                    bgcolor: cardBg, border: `1px solid ${borderColor}`
                }}>
                    <span className="material-icons-round" style={{ fontSize: 48, color: textMuted, opacity: 0.5 }}>timer_off</span>
                    <Typography sx={{ color: textMuted, mt: 1, fontSize: '14px' }}>
                        Nenhum registro de tempo encontrado no período selecionado.
                    </Typography>
                </Paper>
            ) : (
                <>
                    {/* Resumo por Colaborador */}
                    {report.byUser?.length > 1 && (
                        <Paper sx={{
                            mb: 3, borderRadius: '16px', bgcolor: cardBg,
                            border: `1px solid ${borderColor}`, overflow: 'hidden'
                        }}>
                            <Box sx={{ p: 2, borderBottom: `1px solid ${borderColor}` }}>
                                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary }}>
                                    Resumo por Colaborador
                                </Typography>
                            </Box>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ '& th': { color: textMuted, fontSize: '11px', fontWeight: 700, borderColor } }}>
                                            <TableCell>Colaborador</TableCell>
                                            <TableCell align="center">Sessões</TableCell>
                                            <TableCell align="right">Total (HH:MM:SS)</TableCell>
                                            <TableCell align="right">Total (horas)</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {report.byUser.map((row, i) => (
                                            <TableRow key={i} sx={{
                                                '& td': { color: textPrimary, fontSize: '13px', borderColor },
                                                '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }
                                            }}>
                                                <TableCell sx={{ fontWeight: 600 }}>{row.user?.name || row.user?.email}</TableCell>
                                                <TableCell align="center">{row.sessions}</TableCell>
                                                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{formatDuration(row.totalSeconds)}</TableCell>
                                                <TableCell align="right">{formatHoursDecimal(row.totalSeconds)}h</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}

                    {/* Detalhamento */}
                    <Paper sx={{
                        borderRadius: '16px', bgcolor: cardBg,
                        border: `1px solid ${borderColor}`, overflow: 'hidden'
                    }}>
                        <Box sx={{ p: 2, borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary }}>
                                Detalhamento ({report.logs.length} registros)
                            </Typography>
                        </Box>
                        <TableContainer sx={{ maxHeight: 500 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow sx={{
                                        '& th': {
                                            color: textMuted, fontSize: '11px', fontWeight: 700,
                                            bgcolor: isDark ? 'rgba(15,20,25,0.95)' : '#f8fafc',
                                            borderColor
                                        }
                                    }}>
                                        <TableCell>Tarefa</TableCell>
                                        <TableCell>Colaborador</TableCell>
                                        <TableCell>Início</TableCell>
                                        <TableCell>Fim</TableCell>
                                        <TableCell align="right">Duração</TableCell>
                                        <TableCell>Notas</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {report.logs.map((log, i) => (
                                        <TableRow key={log.id || i} sx={{
                                            '& td': { color: textPrimary, fontSize: '13px', borderColor },
                                            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }
                                        }}>
                                            <TableCell>
                                                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: textPrimary }}>
                                                    {log.task?.title || '-'}
                                                </Typography>
                                                {log.task?.status && (
                                                    <Chip
                                                        label={log.task.status}
                                                        size="small"
                                                        sx={{
                                                            mt: 0.5, height: 18, fontSize: '10px', fontWeight: 600,
                                                            bgcolor: `${log.task.status === 'DONE' ? '#10b981' : '#2563eb'}15`,
                                                            color: log.task.status === 'DONE' ? '#10b981' : '#2563eb',
                                                        }}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell>{log.user?.name || log.user?.email || '-'}</TableCell>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                {format(new Date(log.startedAt), 'dd/MM/yy HH:mm', { locale: ptBR })}
                                            </TableCell>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                {log.endedAt ? format(new Date(log.endedAt), 'dd/MM/yy HH:mm', { locale: ptBR }) : '-'}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                                {formatDuration(log.duration)}
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {log.notes || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}
        </Box>
    );
};

export default TimeReportPage;
