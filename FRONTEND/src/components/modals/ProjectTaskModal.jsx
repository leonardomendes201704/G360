import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useSnackbar } from 'notistack';
import {
    Box, Typography, TextField, Select, MenuItem, Button, IconButton,
    FormControl, Chip, Autocomplete, Dialog
} from '@mui/material';
import { CheckCircle, Close, Add, Delete, CheckBox } from '@mui/icons-material';
import { getReferenceUsers } from '../../services/reference.service';

const schema = yup.object({
    title: yup.string().required('O Título é obrigatório'),
    description: yup.string(),
    status: yup.string().required('O Status é obrigatório'),
    priority: yup.string().required('A Prioridade é obrigatória'),
    storyPoints: yup.number().nullable().transform((value) => (isNaN(value) ? null : value)),
    assigneeId: yup.string().nullable(),
    startDate: yup.string().nullable(),
    endDate: yup.string().nullable(),
    progress: yup.number().min(0).max(100).default(0),
}).required();

/**
 * Modal para criar/editar tarefas de projeto
 * Inclui campos para Gantt (datas de início/fim, progresso, dependências)
 */
const ProjectTaskModal = ({
    open, onClose, onSave,
    task = null, projectId, allTasks = []
}) => {
    const { enqueueSnackbar } = useSnackbar();
    const [mounted, setMounted] = useState(false);
    const [viewMode, setViewMode] = useState(!!task);
    const [users, setUsers] = useState([]);
    const [checklistItems, setChecklistItems] = useState([]);
    const [newItemText, setNewItemText] = useState('');
    const [selectedDependencies, setSelectedDependencies] = useState([]);

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { priority: 'MEDIUM', status: 'TODO', storyPoints: null, progress: 0 }
    });

    const priority = watch('priority');
    const status = watch('status');
    const title = watch('title');
    const progress = watch('progress');

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Load users
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const data = await getReferenceUsers();
                setUsers(data);
            } catch (e) {
                console.error('Error loading users:', e);
            }
        };
        loadUsers();
    }, []);

    // Reset form when opening
    useEffect(() => {
        if (open) {
            setViewMode(!!task);
            if (task) {
                // ViewMode is synchronously accurate now
                reset({
                    ...task,
                    assigneeId: task.assigneeId || '',
                    startDate: task.startDate ? task.startDate.split('T')[0] : '',
                    endDate: task.endDate ? task.endDate.split('T')[0] : '',
                    progress: task.progress || 0,
                });
                setChecklistItems(task.checklist && Array.isArray(task.checklist) ? task.checklist : []);
                setSelectedDependencies(task.dependencies || []);
            } else {
                reset({
                    title: '', description: '', status: 'TODO', priority: 'MEDIUM',
                    storyPoints: null, assigneeId: '', startDate: '', endDate: '', progress: 0
                });
                setChecklistItems([]);
                setSelectedDependencies([]);
                // setViewMode(false); handled above
            }
        }
    }, [open, task, reset]);

    // Available tasks for dependencies (exclude current task)
    const availableDependencies = allTasks.filter(t => t.id !== task?.id);

    // Checklist handlers
    const addChecklistItem = () => {
        if (!newItemText.trim()) return;
        setChecklistItems([...checklistItems, { id: Date.now().toString(), text: newItemText, done: false }]);
        setNewItemText('');
    };

    const toggleChecklistItem = (id) => {
        setChecklistItems(checklistItems.map(item => item.id === id ? { ...item, done: !item.done } : item));
    };

    const removeChecklistItem = (id) => {
        setChecklistItems(checklistItems.filter(item => item.id !== id));
    };

    const onSubmit = (data) => {
        const payload = {
            ...data,
            assigneeId: data.assigneeId === "" ? null : data.assigneeId,
            startDate: data.startDate === "" ? null : data.startDate,
            endDate: data.endDate === "" ? null : data.endDate,
            storyPoints: data.storyPoints ? parseInt(data.storyPoints) : null,
            progress: parseInt(data.progress) || 0,
            checklist: checklistItems,
            dependencies: selectedDependencies,
        };
        onSave(payload);
    };

    if (!open || !mounted) return null;

    const inputStyle = {
        '& .MuiOutlinedInput-root': {
            background: 'var(--modal-surface-hover)',
            border: '1px solid var(--modal-border-strong)',
            borderRadius: '10px',
            color: 'var(--modal-text)',
            fontSize: '14px',
            '& fieldset': { border: 'none' },
            '&:hover': { borderColor: 'var(--modal-border-strong)' },
            '&.Mui-focused': {
                borderColor: '#2563eb',
                background: 'rgba(37, 99, 235, 0.05)',
                boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
            }
        },
        '& input::placeholder, & textarea::placeholder': { color: 'var(--modal-text-muted)' }
    };

    return (
        <Dialog
            open={true}
            onClose={onClose}
            maxWidth={false}
            PaperProps={{
                'data-testid': 'modal-project-task',
                sx: {
                    width: '100%',
                    maxWidth: '720px',
                    maxHeight: '90vh',
                    background: 'var(--modal-bg)',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--modal-surface-hover)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }
            }}
            BackdropProps={{
                sx: {
                    backdropFilter: 'blur(4px)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                }
            }}
        >
            {/* Header */}
            <Box sx={{
                padding: '24px',
                borderBottom: '1px solid var(--modal-border-strong)',
                background: 'var(--modal-header-gradient)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                        <Box sx={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                        }}>
                            <CheckCircle sx={{ color: 'var(--modal-text)', fontSize: '24px' }} />
                        </Box>
                        <Box>
                            <Typography sx={{ color: 'var(--modal-text)', fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                                {task ? (viewMode ? (title || task.title) : '✏️ Editando Tarefa') : 'Nova Tarefa'}
                            </Typography>
                            <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '13px', mt: 0.25 }}>
                                Gerencie os detalhes, prazos e dependências
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        onClick={onClose}
                        sx={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'var(--modal-surface-hover)',
                            color: 'var(--modal-text-muted)',
                            '&:hover': { background: 'var(--modal-border-strong)', color: 'var(--modal-text)' }
                        }}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                background: 'var(--modal-bg)',
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': { background: 'var(--modal-border-strong)', borderRadius: '3px' },
            }}>
                {/* View Mode: Read-only Detail View */}
                {viewMode && task && (
                    <Box>
                        {/* Status & Priority Badges */}
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
                            {(() => {
                                const statusMap = { BACKLOG: { label: 'Backlog', color: '#64748b' }, TODO: { label: 'A Fazer', color: '#0ea5e9' }, ON_HOLD: { label: 'Em Pausa', color: '#f59e0b' }, IN_PROGRESS: { label: 'Em Progresso', color: '#3b82f6' }, DONE: { label: 'Concluído', color: '#10b981' }, CANCELLED: { label: 'Cancelada', color: '#94a3b8' } };
                                const s = statusMap[task.status] || { label: task.status, color: '#64748b' };
                                return (
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, borderRadius: '8px', background: `${s.color}20`, border: `1px solid ${s.color}40` }}>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: s.color }}>{s.label}</Typography>
                                    </Box>
                                );
                            })()}
                            {(() => {
                                const prioMap = { LOW: { label: 'Baixa', color: '#10b981' }, MEDIUM: { label: 'Média', color: '#f59e0b' }, HIGH: { label: 'Alta', color: '#f97316' }, CRITICAL: { label: 'Crítica', color: '#ef4444' } };
                                const p = prioMap[task.priority] || { label: task.priority, color: '#64748b' };
                                return (
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, borderRadius: '8px', background: `${p.color}20`, border: `1px solid ${p.color}40` }}>
                                        <span className="material-icons-round" style={{ fontSize: '14px', color: p.color }}>flag</span>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: p.color }}>{p.label}</Typography>
                                    </Box>
                                );
                            })()}
                            {task.progress !== undefined && task.progress !== null && (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.25)' }}>
                                    <span className="material-icons-round" style={{ fontSize: '14px', color: '#2563eb' }}>trending_up</span>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>{task.progress}%</Typography>
                                </Box>
                            )}
                        </Box>

                        {/* Description */}
                        {task.description && (
                            <Box sx={{ mb: 3, p: 2, borderRadius: '12px', background: 'var(--modal-surface-hover)', border: '1px solid var(--modal-border-strong)' }}>
                                <Typography sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--modal-text-muted)', mb: 1 }}>Descrição</Typography>
                                <Typography sx={{ fontSize: '14px', color: 'var(--modal-text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{task.description}</Typography>
                            </Box>
                        )}

                        {/* Info Grid */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2, mb: 3 }}>
                            {/* Assignee */}
                            <Box sx={{ p: 2, borderRadius: '12px', background: 'var(--modal-surface-hover)', border: '1px solid var(--modal-border-strong)' }}>
                                <Typography sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--modal-text-muted)', mb: 1 }}>Responsável</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Typography sx={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>{(task.assignee?.name || '?')[0]?.toUpperCase()}</Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: '14px', color: 'var(--modal-text)', fontWeight: 500 }}>{task.assignee?.name || 'Não atribuído'}</Typography>
                                </Box>
                            </Box>

                            {/* Timeline */}
                            {(task.startDate || task.endDate) && (
                                <Box sx={{ p: 2, borderRadius: '12px', background: 'var(--modal-surface-hover)', border: '1px solid var(--modal-border-strong)' }}>
                                    <Typography sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--modal-text-muted)', mb: 1 }}>Período</Typography>
                                    <Typography sx={{ fontSize: '14px', color: 'var(--modal-text)', fontWeight: 500 }}>
                                        {task.startDate ? new Date(task.startDate).toLocaleDateString('pt-BR') : '-'} → {task.endDate ? new Date(task.endDate).toLocaleDateString('pt-BR') : '-'}
                                    </Typography>
                                </Box>
                            )}

                            {/* Story Points */}
                            {task.storyPoints && (
                                <Box sx={{ p: 2, borderRadius: '12px', background: 'var(--modal-surface-hover)', border: '1px solid var(--modal-border-strong)' }}>
                                    <Typography sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--modal-text-muted)', mb: 1 }}>Story Points</Typography>
                                    <Typography sx={{ fontSize: '14px', color: 'var(--modal-text)', fontWeight: 500 }}>{task.storyPoints}</Typography>
                                </Box>
                            )}
                        </Box>

                        {/* Checklist */}
                        {checklistItems.length > 0 && (
                            <Box sx={{ p: 2, borderRadius: '12px', background: 'var(--modal-surface-hover)', border: '1px solid var(--modal-border-strong)' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                    <Typography sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--modal-text-muted)' }}>Checklist</Typography>
                                    <Typography sx={{ fontSize: '12px', color: 'var(--modal-text-secondary)' }}>
                                        {checklistItems.filter(i => i.done).length}/{checklistItems.length}
                                    </Typography>
                                </Box>
                                <Box sx={{ width: '100%', height: 4, borderRadius: 2, background: 'var(--modal-border-strong)', mb: 1.5 }}>
                                    <Box sx={{ width: `${(checklistItems.filter(i => i.done).length / checklistItems.length) * 100}%`, height: '100%', borderRadius: 2, background: '#22c55e', transition: 'width 0.3s ease' }} />
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    {checklistItems.map(item => (
                                        <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 16, height: 16, borderRadius: '4px', border: `2px solid ${item.done ? '#22c55e' : 'var(--modal-text-muted)'}`, background: item.done ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                {item.done && <span style={{ color: '#fff', fontSize: '10px' }}>✓</span>}
                                            </Box>
                                            <Typography sx={{ fontSize: '13px', color: item.done ? 'var(--modal-text-muted)' : 'var(--modal-text)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {/* Dependencies */}
                        {selectedDependencies.length > 0 && (
                            <Box sx={{ mt: 2, p: 2, borderRadius: '12px', background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                                <Typography sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2563eb', mb: 1 }}>Dependências</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                    {selectedDependencies.map(depId => {
                                        const dep = allTasks.find(t => t.id === depId);
                                        return dep ? (
                                            <Chip key={depId} label={dep.title} size="small" sx={{ background: 'rgba(37, 99, 235, 0.15)', color: 'var(--modal-text)', fontSize: '12px' }} />
                                        ) : null;
                                    })}
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}

                <form id="projectTaskForm" onSubmit={handleSubmit(onSubmit)} style={{ display: viewMode ? 'none' : 'block' }}>
                    {/* Título e Status */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                Título <span style={{ color: '#ef4444' }}>*</span>
                            </Typography>
                            <TextField
                                {...register('title')}
                                placeholder="Ex: Implementar Login"
                                fullWidth
                                error={!!errors.title}
                                helperText={errors.title?.message}
                                sx={inputStyle}
                            />
                        </Box>
                        <Box sx={{ width: '180px' }}>
                            <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                Status <span style={{ color: '#ef4444' }}>*</span>
                            </Typography>
                            <Select
                                {...register('status')}
                                value={status}
                                onChange={(e) => setValue('status', e.target.value)}
                                fullWidth
                                sx={{
                                    ...inputStyle['& .MuiOutlinedInput-root'],
                                    '& .MuiSelect-icon': { color: 'var(--modal-text-muted)' }
                                }}
                            >
                                <MenuItem value="BACKLOG">Backlog</MenuItem>
                                <MenuItem value="TODO">A Fazer</MenuItem>
                                <MenuItem value="IN_PROGRESS">Em Progresso</MenuItem>
                                <MenuItem value="DONE">Concluído</MenuItem>
                            </Select>
                        </Box>
                    </Box>

                    {/* Descrição */}
                    <Box sx={{ mb: 2.5 }}>
                        <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                            Descrição
                        </Typography>
                        <TextField
                            {...register('description')}
                            placeholder="Descrição detalhada da tarefa"
                            multiline
                            rows={3}
                            fullWidth
                            sx={inputStyle}
                        />
                    </Box>

                    {/* Datas e Progresso - Importante para o Gantt */}
                    <Box sx={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(37, 99, 235, 0.2)',
                        background: 'rgba(37, 99, 235, 0.05)',
                        mb: 2.5
                    }}>
                        <Typography sx={{
                            color: '#2563eb',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            mb: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}>
                            <span className="material-icons-round" style={{ fontSize: '14px' }}>bar_chart</span>
                            CRONOGRAMA (GANTT)
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Box sx={{ flex: '1 1 140px' }}>
                                <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                    Data Início
                                </Typography>
                                <TextField {...register('startDate')} type="date" fullWidth sx={inputStyle} />
                            </Box>
                            <Box sx={{ flex: '1 1 140px' }}>
                                <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                    Data Fim
                                </Typography>
                                <TextField {...register('endDate')} type="date" fullWidth sx={inputStyle} />
                            </Box>
                            <Box sx={{ flex: '1 1 100px' }}>
                                <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                    Progresso (%)
                                </Typography>
                                <TextField
                                    {...register('progress')}
                                    type="number"
                                    inputProps={{ min: 0, max: 100 }}
                                    fullWidth
                                    sx={inputStyle}
                                />
                            </Box>
                        </Box>

                        {/* Dependências */}
                        {availableDependencies.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                    Depende de (tarefas predecessoras)
                                </Typography>
                                <Autocomplete
                                    multiple
                                    options={availableDependencies}
                                    getOptionLabel={(option) => option.title}
                                    value={availableDependencies.filter(t => selectedDependencies.includes(t.id))}
                                    onChange={(e, newValue) => setSelectedDependencies(newValue.map(t => t.id))}
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <Chip
                                                key={option.id}
                                                label={option.title}
                                                {...getTagProps({ index })}
                                                sx={{
                                                    background: 'rgba(37, 99, 235, 0.2)',
                                                    color: 'var(--modal-text)',
                                                    '& .MuiChip-deleteIcon': { color: 'var(--modal-text-secondary)' }
                                                }}
                                            />
                                        ))
                                    }
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            placeholder="Selecione tarefas..."
                                            sx={inputStyle}
                                        />
                                    )}
                                    sx={{
                                        '& .MuiAutocomplete-popupIndicator': { color: 'var(--modal-text-secondary)' },
                                        '& .MuiAutocomplete-clearIndicator': { color: 'var(--modal-text-secondary)' },
                                    }}
                                />
                            </Box>
                        )}
                    </Box>

                    {/* Configurações */}
                    <Box sx={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--modal-border-strong)',
                        background: 'var(--modal-surface-subtle)',
                        mb: 2.5
                    }}>
                        <Typography sx={{
                            color: 'var(--modal-text-muted)',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            mb: 1.5
                        }}>
                            CONFIGURAÇÕES
                        </Typography>

                        {/* Prioridade */}
                        <Box sx={{ mb: 2 }}>
                            <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                Prioridade
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {['LOW', 'MEDIUM', 'HIGH'].map(lvl => (
                                    <Button
                                        key={lvl}
                                        type="button"
                                        onClick={() => setValue('priority', lvl)}
                                        sx={{
                                            padding: '8px 16px',
                                            border: '1px solid var(--modal-border-strong)',
                                            background: priority === lvl ? '#2563eb' : 'var(--modal-surface-hover)',
                                            color: priority === lvl ? 'var(--modal-text-strong)' : 'var(--modal-text-muted)',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            textTransform: 'none',
                                            minWidth: 'auto',
                                            '&:hover': {
                                                borderColor: priority === lvl ? '#1d4ed8' : 'var(--modal-border-strong)',
                                                background: priority === lvl ? '#1d4ed8' : 'var(--modal-border-strong)'
                                            }
                                        }}
                                    >
                                        {lvl === 'LOW' ? 'Baixa' : lvl === 'MEDIUM' ? 'Média' : 'Alta'}
                                    </Button>
                                ))}
                            </Box>
                        </Box>

                        {/* Responsável */}
                        <Box>
                            <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                                Responsável
                            </Typography>
                            <Select
                                {...register('assigneeId')}
                                defaultValue=""
                                fullWidth
                                sx={{
                                    ...inputStyle['& .MuiOutlinedInput-root'],
                                    '& .MuiSelect-icon': { color: 'var(--modal-text-muted)' }
                                }}
                            >
                                <MenuItem value="">Sem responsável</MenuItem>
                                {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
                            </Select>
                        </Box>
                    </Box>

                    {/* Checklist */}
                    <Box sx={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--modal-border-strong)',
                        background: 'var(--modal-surface-subtle)'
                    }}>
                        <Typography sx={{
                            color: 'var(--modal-text-muted)',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            mb: 1.5
                        }}>
                            CHECKLIST
                        </Typography>

                        {checklistItems.length > 0 && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
                                {checklistItems.map((item) => (
                                    <Box
                                        key={item.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            background: 'var(--modal-surface-subtle)',
                                            '&:hover': { background: 'var(--modal-border)' }
                                        }}
                                    >
                                        <Box
                                            onClick={() => toggleChecklistItem(item.id)}
                                            sx={{
                                                width: '18px',
                                                height: '18px',
                                                border: `2px solid ${item.done ? '#22c55e' : 'var(--modal-text-muted)'}`,
                                                borderRadius: '4px',
                                                background: item.done ? '#22c55e' : 'transparent',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {item.done && <CheckBox sx={{ fontSize: '14px', color: 'var(--modal-text)' }} />}
                                        </Box>
                                        <Typography sx={{
                                            flex: 1,
                                            color: item.done ? 'var(--modal-text-muted)' : 'var(--modal-text)',
                                            fontSize: '14px',
                                            textDecoration: item.done ? 'line-through' : 'none',
                                        }}>
                                            {item.text}
                                        </Typography>
                                        <IconButton
                                            type="button"
                                            size="small"
                                            onClick={() => removeChecklistItem(item.id)}
                                            sx={{ color: 'var(--modal-text-muted)', '&:hover': { color: '#ef4444' } }}
                                        >
                                            <Delete sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Box>
                        )}

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                value={newItemText}
                                onChange={(e) => setNewItemText(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                                placeholder="Adicionar item..."
                                fullWidth
                                sx={inputStyle}
                            />
                            <IconButton
                                type="button"
                                onClick={addChecklistItem}
                                sx={{
                                    width: '44px',
                                    border: '1px solid var(--modal-border-strong)',
                                    background: 'var(--modal-surface-hover)',
                                    color: 'var(--modal-text-muted)',
                                    borderRadius: '10px',
                                    '&:hover': { background: 'var(--modal-border-strong)', color: '#2563eb' }
                                }}
                            >
                                <Add />
                            </IconButton>
                        </Box>
                    </Box>
                </form>
            </Box>

            {/* Footer */}
            <Box sx={{
                padding: '16px 24px',
                borderTop: '1px solid var(--modal-border-strong)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
                background: 'var(--modal-surface-subtle)'
            }}>
                {viewMode ? (
                    /* View Mode Footer */
                    <>
                        <Box />
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Button
                                type="button"
                                onClick={onClose}
                                sx={{
                                    background: 'transparent',
                                    border: '1px solid var(--modal-border)',
                                    color: 'var(--modal-text-secondary)',
                                    borderRadius: '8px',
                                    padding: '10px 20px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    textTransform: 'none',
                                    '&:hover': {
                                        borderColor: 'var(--modal-text-muted)',
                                        background: 'var(--modal-surface-hover)',
                                        color: 'var(--modal-text)'
                                    }
                                }}
                            >
                                Fechar
                            </Button>
                            <Button
                                type="button"
                                onClick={() => setViewMode(false)}
                                sx={{
                                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                    color: '#fff',
                                    borderRadius: '10px',
                                    padding: '10px 24px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                                    '&:hover': { boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
                                }}
                            >
                                ✏️ Editar
                            </Button>
                        </Box>
                    </>
                ) : (
                    /* Edit/Create Mode Footer */
                    <>
                        <Box />
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Button
                                type="button"
                                onClick={task ? () => setViewMode(true) : onClose}
                                sx={{
                                    color: 'var(--modal-text-secondary)',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    textTransform: 'none',
                                    '&:hover': { background: 'var(--modal-surface-hover)' }
                                }}
                            >
                                {task ? 'Voltar' : 'Cancelar'}
                            </Button>
                            <Button
                                type="submit"
                                form="projectTaskForm"
                                sx={{
                                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                    color: 'var(--modal-text)',
                                    borderRadius: '10px',
                                    padding: '10px 24px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                                    '&:hover': {
                                        transform: 'translateY(-1px)',
                                        boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)'
                                    }
                                }}
                            >
                                {task ? 'Salvar Alterações' : 'Criar Tarefa'}
                            </Button>
                        </Box>
                    </>
                )}
            </Box>
        </Dialog>
    );
};

export default ProjectTaskModal;
