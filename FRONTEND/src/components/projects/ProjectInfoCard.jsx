import { useContext } from 'react';
import { Box, Avatar, useTheme } from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';

const ProjectInfoCard = ({ project }) => {
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();

    // Theme-aware styles
    const textPrimary = mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary;
    const textSecondary = mode === 'dark' ? '#64748b' : theme.palette.text.secondary;
    const cardBg = mode === 'dark' ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#FFFFFF';
    const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const cardShadow = mode === 'dark' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.07)';

    if (!project) return null;

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <Box
            sx={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '16px',
                p: '24px 28px',
                mb: 4,
                boxShadow: cardShadow,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4,
                }}
            >
                {/* Manager */}
                <Box display="flex" alignItems="center" gap={2} flex={1}>
                    <Avatar
                        sx={{
                            width: 52,
                            height: 52,
                            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                            fontSize: '18px',
                            fontWeight: 700,
                            flexShrink: 0,
                        }}
                    >
                        {getInitials(project.manager?.name)}
                    </Avatar>
                    <Box>
                        <Box
                            sx={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                color: textSecondary,
                                mb: 0.5,
                                fontWeight: 600,
                            }}
                        >
                            GERENTE
                        </Box>
                        <Box sx={{ fontSize: '15px', fontWeight: 600, color: textPrimary }}>
                            {project.manager?.name || 'Não atribuído'}
                        </Box>
                    </Box>
                </Box>

                {/* Tech Lead */}
                <Box display="flex" alignItems="center" gap={2} flex={1}>
                    <Avatar
                        sx={{
                            width: 52,
                            height: 52,
                            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                            fontSize: '18px',
                            fontWeight: 700,
                            flexShrink: 0,
                        }}
                    >
                        {getInitials(project.techLead?.name)}
                    </Avatar>
                    <Box>
                        <Box
                            sx={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                color: textSecondary,
                                mb: 0.5,
                                fontWeight: 600,
                            }}
                        >
                            RESP. TÉCNICO
                        </Box>
                        <Box sx={{ fontSize: '15px', fontWeight: 600, color: textPrimary }}>
                            {project.techLead?.name || 'Não atribuído'}
                        </Box>
                    </Box>
                </Box>

                {/* Priority */}
                <Box display="flex" alignItems="center" gap={2} flex={1}>
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: '12px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <span className="material-icons-round">flag</span>
                    </Box>
                    <Box>
                        <Box
                            sx={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                color: textSecondary,
                                mb: 0.5,
                                fontWeight: 600,
                            }}
                        >
                            PRIORIDADE
                        </Box>
                        <Box
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.75,
                                px: 1.5,
                                py: 0.5,
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                            }}
                        >
                            <span className="material-icons-round" style={{ fontSize: 14 }}>warning</span>
                            {{
                                'LOW': 'Baixa',
                                'MEDIUM': 'Média',
                                'HIGH': 'Alta',
                                'CRITICAL': 'Crítica'
                            }[project.priority] || 'Média'}
                        </Box>
                    </Box>
                </Box>

                {/* Period */}
                <Box display="flex" alignItems="center" gap={2} flex={1}>
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: '12px',
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <span className="material-icons-round">date_range</span>
                    </Box>
                    <Box>
                        <Box
                            sx={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                color: textSecondary,
                                mb: 0.5,
                                fontWeight: 600,
                            }}
                        >
                            PERÍODO
                        </Box>
                        <Box sx={{ fontSize: '15px', fontWeight: 600, color: textPrimary }}>
                            {project.startDate && project.endDate
                                ? `${new Date(project.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} – ${new Date(project.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                                : 'Não definido'}
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default ProjectInfoCard;
