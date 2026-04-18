import { useContext, useState } from 'react';
import { Box, Typography, IconButton, Slide, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../../contexts/ThemeContext';
import { useTaskTimerContext } from '../../contexts/TaskTimerContext';
import { useSnackbar } from 'notistack';

const FloatingTimer = () => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { activeTimer, isRunning, elapsed, stop, formatElapsed } = useTaskTimerContext();
    const [stopping, setStopping] = useState(false);

    if (!activeTimer || !isRunning) return null;

    const handleStop = async (e) => {
        e.stopPropagation();
        setStopping(true);
        try {
            await stop();
            enqueueSnackbar('Timer parado com sucesso!', { variant: 'success' });
        } catch (err) {
            enqueueSnackbar('Erro ao parar timer.', { variant: 'error' });
        } finally {
            setStopping(false);
        }
    };

    const handleNavigate = () => {
        navigate(`/tasks/${activeTimer.taskId}`);
    };

    // Dynamic color based on elapsed time
    const hours = Math.floor(elapsed / 3600);
    const timerColor = hours >= 4 ? '#ef4444' : hours >= 2 ? '#f59e0b' : '#10b981';
    const bgColor = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)';
    const borderColor = isDark ? `${timerColor}40` : `${timerColor}30`;

    return (
        <Slide direction="up" in={isRunning} mountOnEnter unmountOnExit>
            <Box
                onClick={handleNavigate}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2,
                    py: 1.25,
                    borderRadius: '8px',
                    bgcolor: bgColor,
                    border: `1.5px solid ${borderColor}`,
                    boxShadow: `0 8px 32px rgba(0,0,0,${isDark ? 0.4 : 0.15}), 0 0 0 1px ${timerColor}15`,
                    cursor: 'pointer',
                    backdropFilter: 'blur(12px)',
                    transition: 'all 0.2s ease',
                    animation: 'floatPulse 2s ease-in-out infinite',
                    '@keyframes floatPulse': {
                        '0%, 100%': { boxShadow: `0 8px 32px rgba(0,0,0,${isDark ? 0.4 : 0.15}), 0 0 0 1px ${timerColor}15` },
                        '50%': { boxShadow: `0 8px 32px rgba(0,0,0,${isDark ? 0.4 : 0.15}), 0 0 8px ${timerColor}30` },
                    },
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 12px 40px rgba(0,0,0,${isDark ? 0.5 : 0.2}), 0 0 12px ${timerColor}30`,
                    },
                    maxWidth: 320,
                }}
            >
                {/* Pulsing dot */}
                <Box sx={{
                    width: 10, height: 10, borderRadius: '8px',
                    bgcolor: timerColor, flexShrink: 0,
                    animation: 'pulse 1.5s ease-in-out infinite',
                    '@keyframes pulse': {
                        '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                        '50%': { opacity: 0.5, transform: 'scale(0.8)' },
                    },
                }} />

                {/* Task info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{
                        fontSize: '11px', fontWeight: 600,
                        color: isDark ? '#94a3b8' : '#64748b',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        lineHeight: 1.2,
                    }}>
                        {activeTimer.taskTitle}
                    </Typography>
                    <Typography sx={{
                        fontSize: '18px', fontWeight: 800,
                        fontFamily: 'monospace',
                        color: timerColor,
                        lineHeight: 1.2,
                        letterSpacing: '0.5px',
                    }}>
                        {formatElapsed()}
                    </Typography>
                </Box>

                {/* Stop button */}
                <Tooltip title="Parar timer" arrow>
                    <IconButton
                        onClick={handleStop}
                        disabled={stopping}
                        size="small"
                        sx={{
                            bgcolor: `${timerColor}15`,
                            color: timerColor,
                            border: `1px solid ${timerColor}30`,
                            width: 32, height: 32,
                            '&:hover': {
                                bgcolor: `${timerColor}25`,
                                transform: 'scale(1.1)',
                            },
                            transition: 'all 0.15s',
                        }}
                    >
                        <span className="material-icons-round" style={{ fontSize: '16px' }}>stop</span>
                    </IconButton>
                </Tooltip>
            </Box>
        </Slide>
    );
};

export default FloatingTimer;
