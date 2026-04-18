import { useState, useMemo, useCallback, useRef, useEffect, useContext } from 'react';
import { Box, Typography, Tooltip, IconButton, FormControl, Select, MenuItem } from '@mui/material';
import { ZoomIn, ZoomOut, Today, ExpandMore, ExpandLess } from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, differenceInDays, addDays, startOfMonth, endOfMonth, eachMonthOfInterval, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ThemeContext } from '../../contexts/ThemeContext';

// Cores por status
const STATUS_COLORS = {
    BACKLOG: { bar: '#64748b', progress: '#475569', glow: 'rgba(100, 116, 139, 0.3)' },
    TODO: { bar: '#0ea5e9', progress: '#0284c7', glow: 'rgba(14, 165, 233, 0.3)' },
    IN_PROGRESS: { bar: '#f59e0b', progress: '#d97706', glow: 'rgba(245, 158, 11, 0.3)' },
    DONE: { bar: '#10b981', progress: '#059669', glow: 'rgba(16, 185, 129, 0.3)' },
};

// View modes
const VIEW_MODES = {
    DAY: { days: 1, label: 'Dia' },
    WEEK: { days: 7, label: 'Semana' },
    MONTH: { days: 30, label: 'M\u00eas' },
    QUARTER: { days: 90, label: 'Trimestre' },
};

/**
 * Custom SVG Gantt Chart with Dark Premium Theme
 */
const DarkGanttChart = ({
    tasks = [],
    onTaskClick,
    onTaskDateChange,
    onProgressChange
}) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';

    // Theme-aware color variables
    const containerBg = isDark ? 'rgba(22, 29, 38, 0.5)' : '#FFFFFF';
    const containerBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)';
    const toolbarBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)';
    const selectBg = isDark ? '#1c2632' : '#f1f5f9';
    const selectBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)';
    const selectColor = isDark ? '#f1f5f9' : '#0f172a';
    const iconColor = isDark ? '#94a3b8' : '#64748b';
    const iconHover = isDark ? '#f1f5f9' : '#0f172a';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#64748b' : '#475569';
    const textMuted = isDark ? '#94a3b8' : '#64748b';
    const taskListBg = isDark ? '#161d26' : '#f8fafc';
    const headerBg = isDark ? '#1c2632' : '#e2e8f0';
    const svgBg = isDark ? '#161d26' : '#f8fafc';
    const gridLine = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
    const gridLineStrong = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    const rowBorder = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.04)';
    const scrollbarTrack = isDark ? 'rgba(255, 255, 255, 0.02)' : '#f1f5f9';
    const scrollbarThumb = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)';
    const containerRef = useRef(null);
    const [viewMode, setViewMode] = useState('WEEK');
    const [isExpanded, setIsExpanded] = useState(true);
    const [columnWidth, setColumnWidth] = useState(50);
    const [hoveredTask, setHoveredTask] = useState(null);
    const [dragging, setDragging] = useState(null);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Configurações
    const ROW_HEIGHT = 44;
    const HEADER_HEIGHT = 60;
    const BAR_HEIGHT = 28;
    const BAR_MARGIN = (ROW_HEIGHT - BAR_HEIGHT) / 2;
    const TASK_LIST_WIDTH = 200;

    // Calcular range de datas
    const dateRange = useMemo(() => {
        if (!tasks.length) return { start: new Date(), end: addDays(new Date(), 30) };

        let minDate = new Date();
        let maxDate = new Date();

        tasks.forEach(task => {
            if (task.startDate) {
                const start = new Date(task.startDate);
                if (start < minDate) minDate = start;
            }
            if (task.endDate) {
                const end = new Date(task.endDate);
                if (end > maxDate) maxDate = end;
            }
        });

        // Adicionar margem
        minDate = addDays(startOfWeek(minDate, { locale: ptBR }), -7);
        maxDate = addDays(endOfWeek(maxDate, { locale: ptBR }), 14);

        return { start: minDate, end: maxDate };
    }, [tasks]);

    // Gerar colunas de tempo
    const timeColumns = useMemo(() => {
        const { start, end } = dateRange;
        const days = eachDayOfInterval({ start, end });
        const weeks = eachWeekOfInterval({ start, end }, { locale: ptBR });
        const months = eachMonthOfInterval({ start, end });

        return { days, weeks, months };
    }, [dateRange]);

    // Tarefas com datas
    const validTasks = useMemo(() => {
        return tasks.filter(task => task.startDate || task.endDate);
    }, [tasks]);

    // Tarefas sem datas
    const tasksWithoutDates = useMemo(() => {
        return tasks.filter(task => !task.startDate && !task.endDate);
    }, [tasks]);

    // Calcular posição X de uma data
    const getXPosition = useCallback((date) => {
        const daysDiff = differenceInDays(new Date(date), dateRange.start);
        return daysDiff * columnWidth;
    }, [dateRange.start, columnWidth]);

    // Calcular largura de uma barra
    const getBarWidth = useCallback((startDate, endDate) => {
        const days = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
        return Math.max(days * columnWidth, columnWidth);
    }, [columnWidth]);

    // Zoom controls
    const handleZoomIn = () => setColumnWidth(prev => Math.min(prev + 10, 100));
    const handleZoomOut = () => setColumnWidth(prev => Math.max(prev - 10, 20));
    const handleToday = () => {
        const todayX = getXPosition(new Date());
        if (containerRef.current) {
            containerRef.current.scrollLeft = todayX - 200;
        }
    };

    // Drag handlers
    const handleDragStart = (e, task, type) => {
        e.preventDefault();
        setDragging({ task, type, startX: e.clientX, originalStart: task.startDate, originalEnd: task.endDate });
    };

    const handleDrag = useCallback((e) => {
        if (!dragging) return;

        const deltaX = e.clientX - dragging.startX;
        const deltaDays = Math.round(deltaX / columnWidth);

        if (deltaDays === 0) return;

        const newStart = addDays(new Date(dragging.originalStart), deltaDays);
        const newEnd = addDays(new Date(dragging.originalEnd), deltaDays);

        if (dragging.type === 'move' && onTaskDateChange) {
            onTaskDateChange(dragging.task.id, {
                startDate: newStart.toISOString(),
                endDate: newEnd.toISOString(),
            });
        }
    }, [dragging, columnWidth, onTaskDateChange]);

    const handleDragEnd = useCallback(() => {
        setDragging(null);
    }, []);

    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', handleDrag);
            window.addEventListener('mouseup', handleDragEnd);
            return () => {
                window.removeEventListener('mousemove', handleDrag);
                window.removeEventListener('mouseup', handleDragEnd);
            };
        }
    }, [dragging, handleDrag, handleDragEnd]);

    // Largura total do SVG
    const totalWidth = timeColumns.days.length * columnWidth;
    const totalHeight = validTasks.length * ROW_HEIGHT + HEADER_HEIGHT;

    // Se não há tarefas com datas
    if (!validTasks.length) {
        return (
            <Box sx={{
                background: containerBg,
                backdropFilter: isDark ? 'blur(10px)' : 'none',
                border: containerBorder,
                borderRadius: '8px',
                p: 4,
                textAlign: 'center',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)',
            }}>
                <span className="material-icons-round" style={{ fontSize: '48px', color: textMuted }}>
                    event_busy
                </span>
                <Typography sx={{ color: textSecondary, fontSize: '15px', mt: 2 }}>
                    Nenhuma tarefa com datas definidas.
                </Typography>
                <Typography sx={{ color: textMuted, fontSize: '13px', mt: 1 }}>
                    Defina datas de início e fim nas tarefas para visualizá-las no Gantt.
                </Typography>
                {tasksWithoutDates.length > 0 && (
                    <Typography sx={{ color: '#2563eb', fontSize: '13px', mt: 2 }}>
                        {tasksWithoutDates.length} {tasksWithoutDates.length === 1 ? 'tarefa' : 'tarefas'} sem datas definidas
                    </Typography>
                )}
            </Box>
        );
    }

    return (
        <Box sx={{
            background: containerBg,
            backdropFilter: isDark ? 'blur(10px)' : 'none',
            border: containerBorder,
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)',
        }}>
            {/* Toolbar */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderBottom: toolbarBorder,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* View Mode Selector */}
                    <FormControl size="small">
                        <Select
                            value={viewMode}
                            onChange={(e) => {
                                setViewMode(e.target.value);
                                // Ajustar largura da coluna baseado no modo
                                const widths = { DAY: 80, WEEK: 50, MONTH: 30, QUARTER: 15 };
                                setColumnWidth(widths[e.target.value] || 50);
                            }}
                            sx={{
                                bgcolor: selectBg,
                                border: selectBorder,
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: selectColor,
                                minWidth: '100px',
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                '&:hover': { borderColor: 'rgba(37, 99, 235, 0.3)' },
                                '& .MuiSelect-icon': { color: iconColor },
                            }}
                        >
                            {Object.entries(VIEW_MODES).map(([key, value]) => (
                                <MenuItem key={key} value={key}>{value.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Zoom Controls */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title="Diminuir zoom">
                            <IconButton onClick={handleZoomOut} size="small" sx={{ color: iconColor, '&:hover': { color: iconHover } }}>
                                <ZoomOut fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Aumentar zoom">
                            <IconButton onClick={handleZoomIn} size="small" sx={{ color: iconColor, '&:hover': { color: iconHover } }}>
                                <ZoomIn fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Ir para hoje">
                            <IconButton onClick={handleToday} size="small" sx={{ color: iconColor, '&:hover': { color: iconHover } }}>
                                <Today fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '13px', color: textMuted }}>
                        {validTasks.length} {validTasks.length === 1 ? 'tarefa' : 'tarefas'}
                    </Typography>
                    {tasksWithoutDates.length > 0 && (
                        <Tooltip title={`${tasksWithoutDates.length} tarefas sem datas`}>
                            <Box sx={{
                                px: 1,
                                py: 0.25,
                                borderRadius: '8px',
                                bgcolor: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                fontSize: '11px',
                            }}>
                                +{tasksWithoutDates.length}
                            </Box>
                        </Tooltip>
                    )}
                    <IconButton
                        onClick={() => setIsExpanded(!isExpanded)}
                        size="small"
                        sx={{ color: iconColor, '&:hover': { color: iconHover } }}
                    >
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </Box>
            </Box>

            {/* Gantt Chart */}
            {isExpanded && (
                <Box sx={{ display: 'flex', overflow: 'hidden' }}>
                    {/* Task List (Fixed) */}
                    <Box sx={{
                        width: TASK_LIST_WIDTH,
                        flexShrink: 0,
                        borderRight: toolbarBorder,
                        background: taskListBg,
                    }}>
                        {/* Header */}
                        <Box sx={{
                            height: HEADER_HEIGHT,
                            display: 'flex',
                            alignItems: 'center',
                            px: 2,
                            borderBottom: toolbarBorder,
                            background: headerBg,
                        }}>
                            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Tarefa
                            </Typography>
                        </Box>
                        {/* Task Names */}
                        {validTasks.map((task, index) => {
                            const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS.TODO;
                            return (
                                <Box
                                    key={task.id}
                                    onClick={() => onTaskClick?.(task)}
                                    sx={{
                                        height: ROW_HEIGHT,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        px: 2,
                                        cursor: 'pointer',
                                        borderBottom: `1px solid ${rowBorder}`,
                                        transition: 'background 0.2s',
                                        '&:hover': {
                                            background: 'rgba(37, 99, 235, 0.05)',
                                        },
                                    }}
                                >
                                    <Box sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '8px',
                                        bgcolor: statusColor.bar,
                                        boxShadow: `0 0 6px ${statusColor.glow}`,
                                    }} />
                                    <Typography sx={{
                                        fontSize: '13px',
                                        color: textPrimary,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                    }}>
                                        {task.title}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>

                    {/* Chart Area (Scrollable) */}
                    <Box
                        ref={containerRef}
                        onScroll={(e) => setScrollLeft(e.target.scrollLeft)}
                        sx={{
                            flex: 1,
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            '&::-webkit-scrollbar': { height: '8px' },
                            '&::-webkit-scrollbar-track': { background: scrollbarTrack },
                            '&::-webkit-scrollbar-thumb': { background: scrollbarThumb, borderRadius: '8px' },
                        }}
                    >
                        <svg width={totalWidth} height={totalHeight} style={{ display: 'block' }}>
                            <defs>
                                {/* Gradients for bars */}
                                {Object.entries(STATUS_COLORS).map(([status, colors]) => (
                                    <linearGradient key={status} id={`gradient-${status}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor={colors.bar} stopOpacity="1" />
                                        <stop offset="100%" stopColor={colors.progress} stopOpacity="1" />
                                    </linearGradient>
                                ))}
                                {/* Drop shadow */}
                                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                                </filter>
                            </defs>

                            {/* Background */}
                            <rect width={totalWidth} height={totalHeight} fill={svgBg} />

                            {/* Header Background */}
                            <rect width={totalWidth} height={HEADER_HEIGHT} fill={headerBg} />

                            {/* Month Headers */}
                            {timeColumns.months.map((month, index) => {
                                const x = getXPosition(month);
                                const nextMonth = timeColumns.months[index + 1] || dateRange.end;
                                const width = getXPosition(nextMonth) - x;
                                return (
                                    <g key={month.toISOString()}>
                                        <text
                                            x={x + 10}
                                            y={20}
                                            fill="#f1f5f9"
                                            fontSize="12"
                                            fontWeight="600"
                                            fontFamily="Inter, system-ui, sans-serif"
                                        >
                                            {format(month, 'MMMM yyyy', { locale: ptBR })}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Week Headers */}
                            {timeColumns.weeks.map((week, index) => {
                                const x = getXPosition(week);
                                const weekNum = Math.ceil((week.getDate() + 6 - week.getDay()) / 7);
                                return (
                                    <g key={week.toISOString()}>
                                        <text
                                            x={x + 5}
                                            y={45}
                                            fill="#64748b"
                                            fontSize="11"
                                            fontFamily="Inter, system-ui, sans-serif"
                                        >
                                            S{weekNum.toString().padStart(2, '0')}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Header border */}
                            <line x1={0} y1={HEADER_HEIGHT} x2={totalWidth} y2={HEADER_HEIGHT} stroke={gridLineStrong} />

                            {/* Grid - Vertical lines for each day */}
                            {timeColumns.days.map((day, index) => {
                                const x = index * columnWidth;
                                const isWeekStart = day.getDay() === 0;
                                const isTodayLine = isToday(day);
                                return (
                                    <g key={day.toISOString()}>
                                        <line
                                            x1={x}
                                            y1={HEADER_HEIGHT}
                                            x2={x}
                                            y2={totalHeight}
                                            stroke={isTodayLine ? '#2563eb' : isWeekStart ? gridLineStrong : gridLine}
                                            strokeWidth={isTodayLine ? 2 : 1}
                                        />
                                        {/* Today highlight */}
                                        {isTodayLine && (
                                            <rect
                                                x={x}
                                                y={HEADER_HEIGHT}
                                                width={columnWidth}
                                                height={totalHeight - HEADER_HEIGHT}
                                                fill="rgba(37, 99, 235, 0.05)"
                                            />
                                        )}
                                    </g>
                                );
                            })}

                            {/* Grid - Horizontal lines for each row */}
                            {validTasks.map((_, index) => {
                                const y = HEADER_HEIGHT + (index + 1) * ROW_HEIGHT;
                                return (
                                    <line
                                        key={index}
                                        x1={0}
                                        y1={y}
                                        x2={totalWidth}
                                        y2={y}
                                        stroke={gridLine}
                                    />
                                );
                            })}

                            {/* Task Bars */}
                            {validTasks.map((task, index) => {
                                if (!task.startDate || !task.endDate) return null;

                                const x = getXPosition(task.startDate);
                                const y = HEADER_HEIGHT + index * ROW_HEIGHT + BAR_MARGIN;
                                const width = getBarWidth(task.startDate, task.endDate);
                                const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS.TODO;
                                const progress = task.progress || 0;
                                const isHovered = hoveredTask === task.id;

                                return (
                                    <g
                                        key={task.id}
                                        style={{ cursor: 'pointer' }}
                                        onMouseEnter={() => setHoveredTask(task.id)}
                                        onMouseLeave={() => setHoveredTask(null)}
                                        onClick={() => onTaskClick?.(task)}
                                    >
                                        {/* Bar background */}
                                        <rect
                                            x={x}
                                            y={y}
                                            width={width}
                                            height={BAR_HEIGHT}
                                            rx={6}
                                            ry={6}
                                            fill={`url(#gradient-${task.status || 'TODO'})`}
                                            filter={isHovered ? 'url(#shadow)' : undefined}
                                            style={{
                                                transition: 'all 0.2s',
                                                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                                                transformOrigin: `${x + width / 2}px ${y + BAR_HEIGHT / 2}px`,
                                            }}
                                        />

                                        {/* Progress bar */}
                                        {progress > 0 && (
                                            <rect
                                                x={x + 2}
                                                y={y + BAR_HEIGHT - 6}
                                                width={Math.max((width - 4) * (progress / 100), 0)}
                                                height={4}
                                                rx={2}
                                                ry={2}
                                                fill="rgba(255, 255, 255, 0.3)"
                                            />
                                        )}

                                        {/* Task title */}
                                        <text
                                            x={x + 8}
                                            y={y + BAR_HEIGHT / 2 + 1}
                                            fill="white"
                                            fontSize="11"
                                            fontWeight="500"
                                            fontFamily="Inter, system-ui, sans-serif"
                                            dominantBaseline="middle"
                                            style={{ pointerEvents: 'none' }}
                                        >
                                            {width > 60 ? task.title?.substring(0, Math.floor(width / 7)) + (task.title?.length > Math.floor(width / 7) ? '...' : '') : ''}
                                        </text>

                                        {/* Drag handle - left */}
                                        <rect
                                            x={x}
                                            y={y}
                                            width={8}
                                            height={BAR_HEIGHT}
                                            fill="transparent"
                                            style={{ cursor: 'ew-resize' }}
                                        />

                                        {/* Drag handle - right */}
                                        <rect
                                            x={x + width - 8}
                                            y={y}
                                            width={8}
                                            height={BAR_HEIGHT}
                                            fill="transparent"
                                            style={{ cursor: 'ew-resize' }}
                                        />

                                        {/* Move handle (center) */}
                                        <rect
                                            x={x + 8}
                                            y={y}
                                            width={width - 16}
                                            height={BAR_HEIGHT}
                                            fill="transparent"
                                            style={{ cursor: 'move' }}
                                            onMouseDown={(e) => handleDragStart(e, task, 'move')}
                                        />
                                    </g>
                                );
                            })}
                        </svg>
                    </Box>
                </Box>
            )}

            {/* Legend */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                p: 2,
                borderTop: toolbarBorder,
            }}>
                <Typography sx={{ fontSize: '11px', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Legenda:
                </Typography>
                {Object.entries(STATUS_COLORS).map(([status, colors]) => (
                    <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '8px',
                            bgcolor: colors.bar,
                            boxShadow: `0 0 4px ${colors.glow}`,
                        }} />
                        <Typography sx={{ fontSize: '11px', color: textSecondary }}>
                            {status === 'BACKLOG' ? 'Backlog' :
                                status === 'TODO' ? 'A Fazer' :
                                    status === 'IN_PROGRESS' ? 'Em Progresso' :
                                        status === 'DONE' ? 'Concluído' : status}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default DarkGanttChart;
