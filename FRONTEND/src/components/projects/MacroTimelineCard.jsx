import { useContext } from 'react';
import { Box, useTheme } from '@mui/material';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ThemeContext } from '../../contexts/ThemeContext';

// Helper para parsear data sem problema de timezone
const parseLocalDate = (dateString) => {
    if (!dateString) return null;
    // Remove a parte de hora/timezone e cria data local
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day); // month é 0-indexed
};

const MacroTimelineCard = ({ project }) => {
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();

    // Theme-aware styles
    const textPrimary = mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary;
    const textSecondary = mode === 'dark' ? '#64748b' : theme.palette.text.secondary;
    const cardBg = mode === 'dark' ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#FFFFFF';
    const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const cardShadow = mode === 'dark' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.07)';
    const progressBarBg = mode === 'dark' ? '#1c2632' : '#e2e8f0';

    if (!project || !project.startDate || !project.endDate) {
        return null;
    }

    const startDate = parseLocalDate(project.startDate);
    const endDate = parseLocalDate(project.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normaliza para meia-noite local

    const totalDays = differenceInDays(endDate, startDate);
    const daysElapsed = Math.max(0, Math.min(differenceInDays(today, startDate), totalDays));
    const daysRemaining = Math.max(0, totalDays - daysElapsed);
    const progressPercent = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

    return (
        <Box
            sx={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                p: '28px',
                mb: 4,
                boxShadow: cardShadow,
            }}
        >
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <span className="material-icons-round" style={{ color: '#2563eb', fontSize: 24 }}>
                        analytics
                    </span>
                    <Box sx={{ fontSize: '18px', fontWeight: 600, color: textPrimary }}>
                        Macro Cronograma
                    </Box>
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1,
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '8px',
                        color: '#10b981',
                        fontWeight: 600,
                        fontSize: '14px',
                    }}
                >
                    <span className="material-icons-round" style={{ fontSize: 20 }}>
                        hourglass_empty
                    </span>
                    {daysRemaining} dias restantes
                </Box>
            </Box>

            {/* Timeline Content */}
            <Box>
                {/* Dates */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                        <Box
                            sx={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                color: textSecondary,
                                mb: 0.5,
                            }}
                        >
                            INÍCIO
                        </Box>
                        <Box sx={{ fontSize: '15px', fontWeight: 600, color: textPrimary }}>
                            {format(startDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </Box>
                    </Box>

                    <Box textAlign="right">
                        <Box
                            sx={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                color: textSecondary,
                                mb: 0.5,
                            }}
                        >
                            TÉRMINO
                        </Box>
                        <Box sx={{ fontSize: '15px', fontWeight: 600, color: textPrimary }}>
                            {format(endDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </Box>
                    </Box>
                </Box>

                {/* Progress Bar */}
                <Box
                    sx={{
                        position: 'relative',
                        height: 12,
                        background: progressBarBg,
                        borderRadius: '8px',
                        overflow: 'visible',
                        mb: 2,
                    }}
                >
                    {/* Bar */}
                    <Box
                        sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${progressPercent}%`,
                            background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
                            borderRadius: '8px',
                            transition: 'width 1s ease',
                        }}
                    />

                    {/* Marker */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: `${progressPercent}%`,
                            transform: 'translate(-50%, -50%)',
                            width: 20,
                            height: 20,
                            background: mode === 'dark' ? '#f1f5f9' : '#ffffff',
                            border: '3px solid #2563eb',
                            borderRadius: '8px',
                            boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.2)',
                        }}
                    />
                </Box>

                {/* Info */}
                <Box textAlign="center" sx={{ color: textSecondary, fontSize: '13px' }}>
                    Você está no <strong style={{ color: textPrimary }}>dia {daysElapsed}</strong> de{' '}
                    <strong style={{ color: textPrimary }}>{totalDays}</strong> do projeto
                </Box>
            </Box>
        </Box>
    );
};

export default MacroTimelineCard;
