import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarMonth, Circle } from '@mui/icons-material';

const ProjectTimeline = ({ project, tasks = [] }) => {
    // Calcular intervalo de datas do projeto
    const projectStart = project?.startDate ? new Date(project.startDate) : new Date();
    const projectEnd = project?.endDate ? new Date(project.endDate) : addDays(projectStart, 90);

    const totalDays = differenceInDays(projectEnd, projectStart) || 1;
    const today = new Date();
    const daysElapsed = Math.max(0, Math.min(differenceInDays(today, projectStart), totalDays));
    const progressPercent = (daysElapsed / totalDays) * 100;

    // Filtrar tasks com datas
    const tasksWithDates = tasks.filter(t => t.startDate && t.endDate);

    const getStatusColor = (status) => {
        const colors = {
            'TODO': '#94a3b8',
            'IN_PROGRESS': '#3b82f6',
            'REVIEW': '#f59e0b',
            'DONE': '#10b981'
        };
        return colors[status] || '#64748b';
    };

    const getTaskPosition = (taskStart, taskEnd) => {
        const start = new Date(taskStart);
        const end = new Date(taskEnd);

        const startOffset = Math.max(0, differenceInDays(start, projectStart));
        const duration = differenceInDays(end, start) || 1;

        const leftPercent = (startOffset / totalDays) * 100;
        const widthPercent = (duration / totalDays) * 100;

        return { left: `${leftPercent}%`, width: `${Math.max(widthPercent, 2)}%` };
    };

    return (
        <Box>
            {/* Project Timeline Header */}
            <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 4 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CalendarMonth sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="700">Cronograma do Projeto</Typography>
                </Box>

                <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight="600">
                            Início: {format(projectStart, "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight="600">
                            Término: {format(projectEnd, "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </Typography>
                    </Box>

                    {/* Progress Bar */}
                    <Box sx={{ position: 'relative', height: 32, bgcolor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                        {/* Elapsed Time */}
                        <Box
                            sx={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: `${Math.min(progressPercent, 100)}%`,
                                bgcolor: 'primary.main',
                                opacity: 0.2,
                                transition: 'width 0.3s'
                            }}
                        />

                        {/* Today Marker */}
                        {progressPercent <= 100 && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: `${progressPercent}%`,
                                    top: 0,
                                    bottom: 0,
                                    width: 2,
                                    bgcolor: 'error.main',
                                    zIndex: 2
                                }}
                            >
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        bgcolor: 'error.main',
                                        color: 'white',
                                        px: 1,
                                        py: 0.5,
                                        borderRadius: 1,
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    HOJE
                                </Box>
                            </Box>
                        )}

                        {/* Duration Text */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                color: '#475569',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                zIndex: 1
                            }}
                        >
                            {totalDays} dias ({Math.round(totalDays / 7)} semanas)
                        </Box>
                    </Box>

                    <Box display="flex" justifyContent="space-between" mt={1}>
                        <Typography variant="caption" color="text.secondary">
                            Decorrido: {daysElapsed} dias ({progressPercent.toFixed(0)}%)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Restante: {Math.max(0, totalDays - daysElapsed)} dias
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            {/* Tasks Timeline */}
            {tasksWithDates.length > 0 && (
                <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
                    <Typography variant="subtitle1" fontWeight="700" mb={2}>
                        Tarefas ({tasksWithDates.length})
                    </Typography>

                    <Box sx={{ position: 'relative', minHeight: tasksWithDates.length * 48 + 20 }}>
                        {/* Timeline Grid */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(10, 1fr)',
                                gap: 0,
                                opacity: 0.1
                            }}
                        >
                            {[...Array(10)].map((_, i) => (
                                <Box key={i} sx={{ borderRight: '1px solid #cbd5e1' }} />
                            ))}
                        </Box>

                        {/* Tasks */}
                        {tasksWithDates.map((task, index) => {
                            const position = getTaskPosition(task.startDate, task.endDate);

                            return (
                                <Box
                                    key={task.id}
                                    sx={{
                                        position: 'absolute',
                                        top: index * 48,
                                        left: position.left,
                                        width: position.width,
                                        height: 40,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            zIndex: 10
                                        }
                                    }}
                                >
                                    <Box
                                        sx={{
                                            height: '100%',
                                            bgcolor: getStatusColor(task.status),
                                            borderRadius: 2,
                                            p: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            overflow: 'hidden',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        <Circle sx={{ fontSize: 8, color: 'white' }} />
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: 'white',
                                                fontWeight: 600,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                flex: 1
                                            }}
                                        >
                                            {task.title}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>

                    {/* Legend */}
                    <Box display="flex" gap={2} mt={3} flexWrap="wrap">
                        <Chip label="A Fazer" size="small" sx={{ bgcolor: '#94a3b8', color: 'white' }} />
                        <Chip label="Em Progresso" size="small" sx={{ bgcolor: '#3b82f6', color: 'white' }} />
                        <Chip label="Em Revisão" size="small" sx={{ bgcolor: '#f59e0b', color: 'white' }} />
                        <Chip label="Concluída" size="small" sx={{ bgcolor: '#10b981', color: 'white' }} />
                    </Box>
                </Paper>
            )}

            {tasksWithDates.length === 0 && (
                <Box textAlign="center" py={5} color="text.secondary">
                    <CalendarMonth sx={{ fontSize: 48, color: '#e2e8f0', mb: 2 }} />
                    <Typography>Nenhuma tarefa com datas definidas</Typography>
                    <Typography variant="caption">Adicione datas de início e término às tarefas para visualizá-las no cronograma</Typography>
                </Box>
            )}
        </Box>
    );
};

export default ProjectTimeline;
