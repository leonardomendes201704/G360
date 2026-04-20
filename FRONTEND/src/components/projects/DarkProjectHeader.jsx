import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Tooltip, useTheme } from '@mui/material';
import { Send, Edit, Delete } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import PageTitleCard from '../common/PageTitleCard';

const DarkProjectHeader = ({ project, onEdit, onDelete, onSubmit }) => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();

    const textSecondary = mode === 'dark' ? '#94a3b8' : theme.palette.text.secondary;
    const btnBg = mode === 'dark' ? '#1c2632' : '#f8fafc';
    const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const codeBg = mode === 'dark' ? '#1c2632' : '#f1f5f9';
    const textPrimary = mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary;

    const getStatusColor = (status) => {
        const statusMap = {
            PLANNING: { bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', border: 'rgba(6, 182, 212, 0.2)' },
            IN_PROGRESS: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
            COMPLETED: { bg: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', border: 'rgba(37, 99, 235, 0.2)' },
            CANCELLED: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
        };
        return statusMap[status] || statusMap.PLANNING;
    };

    const getApprovalColor = (status) => {
        const map = {
            DRAFT: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.2)', label: 'Rascunho' },
            PENDING_APPROVAL: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)', label: 'Aprovação Pendente' },
            APPROVED: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.2)', label: 'Aprovado' },
            REJECTED: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.2)', label: 'Rejeitado' },
        };
        return map[status] || map.DRAFT;
    };

    const statusColors = getStatusColor(project.status);
    const statusLabel = {
        PLANNING: 'Planejamento',
        IN_PROGRESS: 'Em Andamento',
        COMPLETED: 'Concluído',
        CANCELLED: 'Cancelado',
    }[project.status] || 'Planejamento';

    const approvalInfo = getApprovalColor(project.approvalStatus || 'DRAFT');

    const badgeRow = (
        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
            <Box
                component="span"
                sx={{
                    fontSize: '13px',
                    color: textSecondary,
                    fontFamily: 'monospace',
                    background: codeBg,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: '8px',
                }}
            >
                {project.code}
            </Box>
            <Box
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.75,
                    py: 0.75,
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: statusColors.bg,
                    color: statusColors.color,
                    border: `1px solid ${statusColors.border}`,
                }}
            >
                <span className="material-icons-round" style={{ fontSize: 14 }}>
                    schedule
                </span>
                {statusLabel}
            </Box>
            <Box
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.75,
                    py: 0.75,
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: approvalInfo.bg,
                    color: approvalInfo.color,
                    border: `1px solid ${approvalInfo.border}`,
                }}
            >
                <span className="material-icons-round" style={{ fontSize: 14 }}>
                    verified_user
                </span>
                {approvalInfo.label}
            </Box>
        </Box>
    );

    const actions = (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            {project.approvalStatus === 'DRAFT' && (
                <Box
                    onClick={onSubmit}
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2.5,
                        py: 1.5,
                        borderRadius: '8px',
                        background: 'rgba(37, 99, 235, 0.15)',
                        color: '#2563eb',
                        border: '1px solid rgba(37, 99, 235, 0.3)',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { background: 'rgba(37, 99, 235, 0.25)', borderColor: '#2563eb' },
                    }}
                >
                    <Send sx={{ fontSize: 20 }} /> Submeter
                </Box>
            )}

            {hasPermission('PROJECTS', 'READ') && (
                <Tooltip title="Abrir Gantt em nova aba">
                    <IconButton
                        component="a"
                        href={`/projects/${project.id}/gantt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="header-abrir-gantt"
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '8px',
                            background: btnBg,
                            border: `1px solid ${borderColor}`,
                            color: '#2563eb',
                            transition: 'all 0.2s',
                            flexShrink: 0,
                            '&:hover': {
                                background: 'rgba(37, 99, 235, 0.12)',
                                borderColor: 'rgba(37, 99, 235, 0.35)',
                            },
                        }}
                        aria-label="Abrir Gantt em nova aba"
                    >
                        <span className="material-icons-round" style={{ fontSize: 22 }}>
                            view_timeline
                        </span>
                    </IconButton>
                </Tooltip>
            )}

            <Tooltip title="Voltar à lista de projetos">
                <IconButton
                    onClick={() => navigate('/projects')}
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '8px',
                        background: btnBg,
                        border: `1px solid ${borderColor}`,
                        color: textSecondary,
                        transition: 'all 0.2s',
                        flexShrink: 0,
                        '&:hover': {
                            background: mode === 'dark' ? 'linear-gradient(145deg, #1e2835 0%, #19212b 100%)' : '#e2e8f0',
                            color: textPrimary,
                            transform: 'translateX(-2px)',
                        },
                    }}
                    aria-label="Voltar à lista de projetos"
                >
                    <span className="material-icons-round">arrow_back</span>
                </IconButton>
            </Tooltip>

            {hasPermission('PROJECTS', 'CREATE') && (
                <Tooltip title="Editar Projeto">
                    <Box
                        onClick={onEdit}
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 44,
                            height: 44,
                            borderRadius: '8px',
                            background: btnBg,
                            color: textPrimary,
                            border: `1px solid ${borderColor}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                                background: mode === 'dark' ? '#1e2835' : '#e2e8f0',
                                borderColor: 'rgba(37, 99, 235, 0.3)',
                            },
                        }}
                    >
                        <Edit sx={{ fontSize: 20 }} />
                    </Box>
                </Tooltip>
            )}

            {hasPermission('PROJECTS', 'DELETE_PROJECT') && (
                <Tooltip title="Excluir Projeto">
                    <Box
                        onClick={onDelete}
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 44,
                            height: 44,
                            borderRadius: '8px',
                            background: 'rgba(244, 63, 94, 0.15)',
                            color: '#f43f5e',
                            border: '1px solid rgba(244, 63, 94, 0.2)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': { background: 'rgba(244, 63, 94, 0.25)' },
                        }}
                    >
                        <Delete sx={{ fontSize: 20 }} />
                    </Box>
                </Tooltip>
            )}
        </Box>
    );

    return (
        <Box sx={{ mb: 4 }} className="fade-in-up">
            <PageTitleCard
                iconName="folder_copy"
                iconColor="#2563eb"
                title={project.name}
                subtitle={badgeRow}
                pushActionsToEnd
                stackAlign="flex-start"
                actions={actions}
                mb={0}
            />
        </Box>
    );
};

export default DarkProjectHeader;
