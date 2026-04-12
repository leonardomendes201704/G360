import { format } from 'date-fns';
import { Edit, Delete, Visibility, CalendarToday, CheckCircle, Cancel, Person, Send, FiberManualRecord } from '@mui/icons-material';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Chip, IconButton, Tooltip, Box, Typography, Avatar
} from '@mui/material';
import StatusChip from '../common/StatusChip';

const ChangeRequestList = ({ changes = [], onEdit, onDelete, onView, onSend, darkMode = false }) => {

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
            SIGNIFICATIVO: { width: '60%', gradient: 'linear-gradient(90deg, #f59e0b, #fbbf24)', label: 'Médio' },
            MAIOR: { width: '90%', gradient: 'linear-gradient(90deg, #ef4444, #f87171)', label: 'Alto' }
        };
        return config[impact] || { width: '50%', gradient: 'linear-gradient(90deg, #6b7280, #9ca3af)', label: impact };
    };

    const getStatusConfig = (status) => {
        const config = {
            DRAFT: { color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.15)', label: 'Rascunho' },
            PENDING_APPROVAL: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', label: 'Pendente' },
            APPROVED: { color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', label: 'Aprovada' },
            APPROVED_WAITING_EXECUTION: { color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', label: 'Aprovada' },
            EXECUTED: { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)', label: 'Executada' },
            COMPLETED: { color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)', label: 'Concluída' },
            REJECTED: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)', label: 'Rejeitada' },
            FAILED: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)', label: 'Falha' },
            CANCELLED: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)', label: 'Cancelada' }
        };
        return config[status] || { color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.15)', label: status };
    };

    const getTypeLabel = (type) => {
        const labels = {
            NORMAL: 'Planejada',
            PADRAO: 'Padrão',
            EMERGENCIAL: 'Emergencial'
        };
        return labels[type] || type;
    };

    // Dark mode styles
    const darkStyles = {
        headerCell: {
            bgcolor: 'rgba(255, 255, 255, 0.02)',
            fontWeight: 600,
            color: '#9ca3af',
            textTransform: 'uppercase',
            fontSize: '12px',
            letterSpacing: '0.5px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            py: 2,
            px: 3
        },
        bodyCell: {
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            color: '#e0e0e0',
            py: 2,
            px: 3
        },
        row: {
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.03)'
            }
        }
    };

    // Light mode styles (legacy)
    const lightStyles = {
        headerCell: {
            bgcolor: '#f8fafc',
            fontWeight: 700,
            color: '#64748b'
        },
        bodyCell: {},
        row: {
            cursor: 'pointer',
            transition: 'background-color 0.2s'
        }
    };

    const styles = darkMode ? darkStyles : lightStyles;

    return (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0, border: 'none', bgcolor: 'transparent' }}>
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell sx={styles.headerCell}>ID GMUD</TableCell>
                        <TableCell sx={styles.headerCell} width="20%">TÍTULO</TableCell>
                        <TableCell sx={styles.headerCell}>TIPO</TableCell>
                        <TableCell sx={styles.headerCell}>PRIORIDADE</TableCell>
                        <TableCell sx={styles.headerCell}>STATUS</TableCell>
                        <TableCell sx={styles.headerCell}>RESPONSÁVEL</TableCell>
                        <TableCell sx={styles.headerCell}>DATA EXECUÇÃO</TableCell>
                        <TableCell sx={styles.headerCell}>IMPACTO</TableCell>
                        <TableCell sx={styles.headerCell} align="right">AÇÕES</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {changes.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={9} align="center" sx={{ py: 6, ...styles.bodyCell }}>
                                <Typography color="text.secondary" fontStyle="italic">
                                    Nenhuma GMUD encontrada.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        changes.map((gmud) => {
                            const statusConfig = getStatusConfig(gmud.status);
                            const impactConfig = getImpactConfig(gmud.impact);
                            const riskColors = getRiskColor(gmud.riskLevel);

                            return (
                                <TableRow
                                    key={gmud.id}
                                    hover={!darkMode}
                                    onClick={() => onView(gmud)}
                                    sx={styles.row}
                                >
                                    {/* ID GMUD */}
                                    <TableCell sx={styles.bodyCell}>
                                        <Typography
                                            variant="body2"
                                            fontWeight="600"
                                            fontFamily="monospace"
                                            sx={{
                                                color: darkMode ? '#667eea' : 'text.secondary'
                                            }}
                                        >
                                            {gmud.code}
                                        </Typography>
                                    </TableCell>

                                    {/* TÍTULO */}
                                    <TableCell sx={styles.bodyCell}>
                                        <Typography
                                            variant="body2"
                                            fontWeight="600"
                                            sx={{
                                                color: darkMode ? '#e0e0e0' : '#1e293b',
                                                mb: 0.5
                                            }}
                                        >
                                            {gmud.title}
                                        </Typography>
                                    </TableCell>

                                    {/* TIPO */}
                                    <TableCell sx={styles.bodyCell}>
                                        <Typography
                                            variant="body2"
                                            fontSize="13px"
                                            fontWeight="500"
                                            color={darkMode ? '#e0e0e0' : '#475569'}
                                        >
                                            {getTypeLabel(gmud.type)}
                                        </Typography>
                                    </TableCell>

                                    {/* PRIORIDADE/RISCO */}
                                    <TableCell sx={styles.bodyCell}>
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 0.75,
                                                px: 1.5,
                                                py: 0.5,
                                                borderRadius: 1.5,
                                                bgcolor: getRiskBgColor(gmud.riskLevel),
                                                color: riskColors[1]
                                            }}
                                        >
                                            <FiberManualRecord sx={{ fontSize: 8 }} />
                                            <Typography fontSize="12px" fontWeight={500}>
                                                {gmud.riskLevel === 'CRITICO' ? 'Crítica' :
                                                    gmud.riskLevel === 'ALTO' ? 'Alta' :
                                                        gmud.riskLevel === 'MEDIO' ? 'Média' :
                                                            gmud.riskLevel === 'BAIXO' ? 'Baixa' : gmud.riskLevel}
                                            </Typography>
                                        </Box>
                                    </TableCell>

                                    {/* STATUS */}
                                    <TableCell sx={styles.bodyCell}>
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 0.75,
                                                px: 1.5,
                                                py: 0.5,
                                                borderRadius: 10,
                                                bgcolor: statusConfig.bg,
                                                color: statusConfig.color
                                            }}
                                        >
                                            <FiberManualRecord sx={{ fontSize: 8 }} />
                                            <Typography fontSize="12px" fontWeight={500}>
                                                {statusConfig.label}
                                            </Typography>
                                        </Box>
                                    </TableCell>

                                    {/* RESPONSÁVEL */}
                                    <TableCell sx={styles.bodyCell}>
                                        <Typography
                                            variant="body2"
                                            fontWeight="500"
                                            color={darkMode ? '#e0e0e0' : '#334155'}
                                        >
                                            {gmud.requester?.name?.split(' ')[0] || 'Desconhecido'}
                                        </Typography>
                                    </TableCell>

                                    {/* DATA EXECUÇÃO */}
                                    <TableCell sx={styles.bodyCell}>
                                        <Typography
                                            variant="body2"
                                            fontSize="13px"
                                            color={darkMode ? '#e0e0e0' : '#64748b'}
                                        >
                                            {gmud.scheduledStart
                                                ? format(new Date(gmud.scheduledStart), 'dd/MM/yyyy HH:mm')
                                                : '-'}
                                        </Typography>
                                    </TableCell>

                                    {/* IMPACTO - Bar visualization */}
                                    <TableCell sx={styles.bodyCell}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            <Typography
                                                sx={{
                                                    fontSize: 11,
                                                    color: darkMode ? '#9ca3af' : '#64748b'
                                                }}
                                            >
                                                {impactConfig.label}
                                            </Typography>
                                            <Box
                                                sx={{
                                                    width: 100,
                                                    height: 6,
                                                    bgcolor: darkMode
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
                                    </TableCell>

                                    {/* AÇÕES */}
                                    <TableCell align="right" sx={styles.bodyCell}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'flex-end',
                                                gap: 0.5
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Tooltip title="Visualizar">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onView(gmud)}
                                                    sx={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: 2,
                                                        bgcolor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                                                        color: '#9ca3af',
                                                        '&:hover': {
                                                            color: '#667eea',
                                                            bgcolor: darkMode
                                                                ? 'rgba(102, 126, 234, 0.2)'
                                                                : '#eff6ff'
                                                        }
                                                    }}
                                                >
                                                    <Visibility fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {(gmud.status === 'DRAFT' || gmud.status === 'REVISION_REQUESTED') && (
                                                <>
                                                    <Tooltip title="Editar">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => onEdit(gmud)}
                                                            sx={{
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: 2,
                                                                bgcolor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                                                                color: '#9ca3af',
                                                                '&:hover': {
                                                                    color: '#667eea',
                                                                    bgcolor: darkMode
                                                                        ? 'rgba(102, 126, 234, 0.2)'
                                                                        : '#eff6ff'
                                                                }
                                                            }}
                                                        >
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Enviar para Aprovacao">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onSend) onSend(gmud);
                                                            }}
                                                            sx={{
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: 2,
                                                                bgcolor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                                                                color: '#9ca3af',
                                                                '&:hover': {
                                                                    color: '#10b981',
                                                                    bgcolor: darkMode
                                                                        ? 'rgba(16, 185, 129, 0.2)'
                                                                        : '#ecfdf5'
                                                                }
                                                            }}
                                                        >
                                                            <Send fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Excluir">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => onDelete(gmud.id)}
                                                            sx={{
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: 2,
                                                                bgcolor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                                                                color: '#9ca3af',
                                                                '&:hover': {
                                                                    color: '#ef4444',
                                                                    bgcolor: darkMode
                                                                        ? 'rgba(239, 68, 68, 0.2)'
                                                                        : '#fef2f2'
                                                                }
                                                            }}
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default ChangeRequestList;
