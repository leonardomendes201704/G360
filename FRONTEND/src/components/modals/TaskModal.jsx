import { useEffect, useState, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import { AuthContext } from '../../contexts/AuthContext';
import {
  Box, Typography, TextField, Select, MenuItem, Button, IconButton,
  FormControl, InputLabel,
} from '@mui/material';
import { CheckCircle, Add, Delete, CheckBox, CheckBoxOutlineBlank, Assignment, Shield, Bolt } from '@mui/icons-material';
import StandardModal from '../common/StandardModal';
import {
  getTaskComments, addTaskComment, deleteTaskComment,
  getTaskAttachments, addTaskAttachment, deleteTaskAttachment,
  getGeneralTaskComments, addGeneralTaskComment, deleteGeneralTaskComment,
  getGeneralTaskAttachments, addGeneralTaskAttachment, deleteGeneralTaskAttachment
} from '../../services/task.service';
import { getFileURL } from '../../utils/urlUtils';

/** Raio dos campos (TextField, Select, etc.) — alinhado a `--g360-radius-input` / login */
const G360_INPUT_RADIUS = 'var(--g360-radius-input, 8px)';
const G360_MODAL_SURFACE_RADIUS = 'var(--g360-radius-modal, 8px)';

const getSchema = (isGeneralTask) => yup.object({
  title: yup.string().required('O Título é obrigatório'),
  description: yup.string(),
  status: yup.string().required('O Status é obrigatório'),
  priority: yup.string().required('A Prioridade é obrigatória'),
  storyPoints: yup.number().nullable().transform((value) => (isNaN(value) ? null : value)),
  assigneeId: yup.string().required('Atribuído a é obrigatório'),
  dueDate: isGeneralTask ? yup.string().required('Data de vencimento é obrigatória') : yup.string().nullable(),
  startDate: !isGeneralTask ? yup.string().required('Data de início é obrigatória') : yup.string().nullable(),
  endDate: !isGeneralTask ? yup.string().required('Data de fim é obrigatória') : yup.string().nullable(),
}).required();

const DarkTaskModal = ({
  open, onClose, onSave, onDelete,
  task = null, members = [], loading = false,
  projectName = '', isGeneralTask = false, riskId = null
}) => {
  const { user } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  const [activeTab, setActiveTab] = useState('detalhes');
  const [viewMode, setViewMode] = useState(!!task);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [checklistItems, setChecklistItems] = useState([]);
  const [newItemText, setNewItemText] = useState('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: yupResolver(getSchema(isGeneralTask)),
    defaultValues: { priority: 'MEDIUM', status: 'TODO', storyPoints: null }
  });

  const priority = watch('priority');
  const status = watch('status');
  const title = watch('title');
  const assigneeId = watch('assigneeId');

  const apiMethods = {
    getComments: isGeneralTask ? getGeneralTaskComments : getTaskComments,
    addComment: isGeneralTask ? addGeneralTaskComment : addTaskComment,
    delComment: isGeneralTask ? deleteGeneralTaskComment : deleteTaskComment,
    getAttachments: isGeneralTask ? getGeneralTaskAttachments : getTaskAttachments,
    addAttachment: isGeneralTask ? addGeneralTaskAttachment : addTaskAttachment,
    delAttachment: isGeneralTask ? deleteGeneralTaskAttachment : deleteTaskAttachment
  };

  useEffect(() => {
    if (open) {
      setActiveTab('detalhes');
      setViewMode(!!task);
      if (task) {
        // Set view mode is now handled above synchronously for future opens too
        reset({
          ...task,
          assigneeId: task.assigneeId ? String(task.assigneeId) : '',
          startDate: task.startDate ? task.startDate.split('T')[0] : '',
          endDate: task.endDate ? task.endDate.split('T')[0] : '',
          dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
          riskId: task.riskId || riskId || null // Maintain existing or use prop
        });
        setChecklistItems(task.checklist && Array.isArray(task.checklist) ? task.checklist : []);
        loadComments(task.id);
        loadAttachments(task.id);
      } else {
        reset({
          title: '',
          description: '',
          status: 'TODO',
          priority: 'MEDIUM',
          storyPoints: null,
          assigneeId: '',
          startDate: '',
          endDate: '',
          dueDate: '',
          riskId: riskId || null // Initialize with riskId
        });
        setComments([]);
        setAttachments([]);
        setChecklistItems([]);
        // setViewMode(false) is handled by setViewMode(!!task) above, but being explicit is fine
      }
    }
  }, [open, task, isGeneralTask, riskId]);

  const loadComments = async (id) => { try { const data = await apiMethods.getComments(id); setComments(data); } catch (e) { } };
  const loadAttachments = async (id) => { try { const data = await apiMethods.getAttachments(id); setAttachments(data); } catch (e) { } };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    try {
      const saved = await apiMethods.addComment(task.id, newComment);
      setComments([saved, ...comments]);
      setNewComment('');
    } catch (e) { enqueueSnackbar('Erro ao comentar', { variant: 'error' }); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const att = await apiMethods.addAttachment(task.id, file, projectName);
      setAttachments([att, ...attachments]);
      enqueueSnackbar('Anexo enviado', { variant: 'success' });
    } catch (e) { enqueueSnackbar('Erro ao enviar', { variant: 'error' }); }
    finally { e.target.value = null; }
  };

  const handleDeleteAttachment = async (id) => {
    if (!window.confirm('Excluir anexo?')) return;
    await apiMethods.delAttachment(id);
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const handleDeleteComment = async (id) => {
    if (!window.confirm('Excluir comentário?')) return;
    await apiMethods.delComment(id);
    setComments(comments.filter(c => c.id !== id));
  };

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
      sprintId: data.sprintId === "" ? null : data.sprintId,
      startDate: data.startDate === "" ? null : data.startDate,
      endDate: data.endDate === "" ? null : data.endDate,
      dueDate: data.dueDate === "" ? null : data.dueDate,
      storyPoints: data.storyPoints ? parseInt(data.storyPoints) : null,
      checklist: checklistItems,
      riskId: riskId || data.riskId
    };
    onSave(payload);
  };

  if (!open) return null;

  const modalTitle = riskId
    ? (task ? 'Editar Plano de Ação' : 'Novo Plano de Ação')
    : (task
        ? (viewMode ? (title || task.title || 'Tarefa') : 'Editando Tarefa')
        : 'Nova Tarefa');
  const modalSubtitle = riskId
    ? 'Defina as ações para mitigar ou tratar o risco'
    : (projectName
        ? `${projectName} · Prazos e responsáveis`
        : 'Gerencie os detalhes, prazos e responsáveis');

  const footerActions = (
    <Box sx={{
      display: 'flex',
      width: '100%',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 1,
    }}>
        {viewMode ? (
          <>
            {task && onDelete ? (
              <Button
                type="button"
                onClick={() => onDelete(task.id)}
                sx={{
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'none',
                  '&:hover': { background: 'rgba(239, 68, 68, 0.1)' }
                }}
              >
                Excluir
              </Button>
            ) : <Box />}
            <Box sx={{ display: 'flex', gap: 1.5, ml: 'auto' }}>
              <Button
                type="button"
                onClick={onClose}
                variant="outlined"
                sx={{ textTransform: 'none' }}
              >
                Fechar
              </Button>
              <Button
                type="button"
                variant="contained"
                color="primary"
                onClick={() => setViewMode(false)}
                sx={{ textTransform: 'none' }}
              >
                Editar
              </Button>
            </Box>
          </>
        ) : (
          <>
            {task && onDelete ? (
              <Button
                type="button"
                onClick={() => onDelete(task.id)}
                sx={{
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'none',
                  '&:hover': { background: 'rgba(239, 68, 68, 0.1)' }
                }}
              >
                Excluir
              </Button>
            ) : <Box />}
            <Box sx={{ display: 'flex', gap: 1.5, ml: 'auto' }}>
              <Button
                type="button"
                variant="outlined"
                onClick={task ? () => setViewMode(true) : onClose}
                sx={{ textTransform: 'none' }}
              >
                {task ? 'Voltar' : 'Cancelar'}
              </Button>
              <Button
                type="button"
                variant="contained"
                onClick={handleSubmit(onSubmit, (errors) => {
                  console.error('Form Validation Errors:', errors);
                  enqueueSnackbar('Verifique os campos obrigatórios na aba Detalhes.', { variant: 'error' });
                  setActiveTab('detalhes');
                })}
                disabled={loading}
                sx={{ textTransform: 'none' }}
              >
                {task ? 'Salvar Alterações' : 'Criar Tarefa'}
              </Button>
            </Box>
          </>
        )}
    </Box>
  );

  return (
    <StandardModal
      open={open}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={riskId ? 'shield' : 'assignment'}
      size="wide"
      loading={loading}
      footer={footerActions}
      contentSx={{
        p: 0,
        pt: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, maxHeight: 'min(85dvh, 800px)' }}>
        <Box sx={{ flexShrink: 0, px: { xs: 2, md: 2.5 }, pt: 1, borderBottom: '1px solid var(--modal-border-strong)' }}>
          <Box sx={{ display: 'flex', gap: 0 }}>
            {['detalhes', 'comentarios', 'anexos'].filter((tab, idx) => idx === 0 || task).map(tab => (
              <Button
                key={tab}
                onClick={() => setActiveTab(tab)}
                sx={{
                  padding: '12px 0',
                  marginRight: '24px',
                  background: 'none',
                  border: 'none',
                  color: activeTab === tab ? '#3b82f6' : 'var(--modal-text-muted)',
                  fontSize: '14px',
                  fontWeight: 500,
                  position: 'relative',
                  textTransform: 'none',
                  minWidth: 'auto',
                  '&:hover': { color: 'var(--modal-text)', background: 'none' },
                  '&::after': activeTab === tab ? {
                    content: '""',
                    position: 'absolute',
                    bottom: '-1px',
                    left: 0,
                    width: '100%',
                    height: '2px',
                    background: '#3b82f6',
                    borderRadius: '8px'
                  } : {}
                }}
              >
                {tab === 'detalhes' ? 'Detalhes' : tab === 'comentarios' ? `Comentários ${comments.length > 0 ? `(${comments.length})` : ''}` : `Anexos ${attachments.length > 0 ? `(${attachments.length})` : ''}`}
              </Button>
            ))}
          </Box>
        </Box>

      <Box sx={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: { xs: '16px', md: '24px' },
        background: 'transparent',
        '&::-webkit-scrollbar': { width: '6px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: 'var(--modal-border-strong)', borderRadius: '8px' },
        '&::-webkit-scrollbar-thumb:hover': { background: 'var(--modal-border-strong)' }
      }}>
        {/* View Mode: Read-only Detail View */}
        {viewMode && task && activeTab === 'detalhes' && (
          <Box>
            {/* Status & Priority Badges */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
              {(() => {
                const statusMap = { BACKLOG: { label: 'Backlog', color: '#64748b' }, TODO: { label: 'A Fazer', color: '#0ea5e9' }, ON_HOLD: { label: 'Em Pausa', color: '#f59e0b' }, IN_PROGRESS: { label: 'Em Progresso', color: '#3b82f6' }, DONE: { label: 'Concluído', color: '#10b981' }, CANCELLED: { label: 'Cancelada', color: '#94a3b8' } };
                const s = statusMap[task.status] || { label: task.status, color: '#64748b' };
                return (
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.5, borderRadius: '8px', background: `${s.color}20`, border: `1px solid ${s.color}40` }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '8px', bgcolor: s.color }} />
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
            </Box>

            {/* Description */}
            {task.description && (
              <Box sx={{ mb: 3, p: 2, borderRadius: G360_INPUT_RADIUS, background: 'var(--modal-surface-hover)', border: '1px solid var(--modal-border-strong)' }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--modal-text-muted)', mb: 1 }}>Descrição</Typography>
                <Typography sx={{ fontSize: '14px', color: 'var(--modal-text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{task.description}</Typography>
              </Box>
            )}

            {/* Info Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2, mb: 3 }}>
              {/* Assignee */}
              <Box sx={{ p: 2, borderRadius: G360_INPUT_RADIUS, background: 'var(--modal-surface-hover)', border: '1px solid var(--modal-border-strong)' }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--modal-text-muted)', mb: 1 }}>Responsável</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>{(task.assignee?.name || '?')[0]?.toUpperCase()}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '14px', color: 'var(--modal-text)', fontWeight: 500 }}>{task.assignee?.name || 'Não atribuído'}</Typography>
                </Box>
              </Box>

              {/* Due Date */}
              {(task.dueDate || task.startDate) && (
                <Box sx={{ p: 2, borderRadius: G360_INPUT_RADIUS, background: 'var(--modal-surface-hover)', border: '1px solid var(--modal-border-strong)' }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--modal-text-muted)', mb: 1 }}>
                    {isGeneralTask ? 'Vencimento' : 'Período'}
                  </Typography>
                  <Typography sx={{ fontSize: '14px', color: 'var(--modal-text)', fontWeight: 500 }}>
                    {isGeneralTask
                      ? (task.dueDate ? format(new Date(task.dueDate), 'dd/MM/yyyy') : '-')
                      : `${task.startDate ? format(new Date(task.startDate), 'dd/MM/yyyy') : '-'} → ${task.endDate ? format(new Date(task.endDate), 'dd/MM/yyyy') : '-'}`
                    }
                  </Typography>
                </Box>
              )}

              {/* Story Points */}
              {task.storyPoints && (
                <Box sx={{ p: 2, borderRadius: G360_INPUT_RADIUS, background: 'var(--modal-surface-hover)', border: '1px solid var(--modal-border-strong)' }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--modal-text-muted)', mb: 1 }}>Story Points</Typography>
                  <Typography sx={{ fontSize: '14px', color: 'var(--modal-text)', fontWeight: 500 }}>{task.storyPoints}</Typography>
                </Box>
              )}
            </Box>

            {/* Checklist */}
            {checklistItems.length > 0 && (
              <Box sx={{ p: 2, borderRadius: G360_INPUT_RADIUS, background: 'var(--modal-surface-hover)', border: '1px solid var(--modal-border-strong)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--modal-text-muted)' }}>Checklist</Typography>
                  <Typography sx={{ fontSize: '12px', color: 'var(--modal-text-secondary)' }}>
                    {checklistItems.filter(i => i.done).length}/{checklistItems.length}
                  </Typography>
                </Box>
                {/* Progress bar */}
                <Box sx={{ width: '100%', height: 4, borderRadius: '8px', background: 'var(--modal-border-strong)', mb: 1.5 }}>
                  <Box sx={{ width: `${(checklistItems.filter(i => i.done).length / checklistItems.length) * 100}%`, height: '100%', borderRadius: '8px', background: '#22c55e', transition: 'width 0.3s ease' }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {checklistItems.map(item => (
                    <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 16, height: 16, borderRadius: '8px', border: `2px solid ${item.done ? '#22c55e' : 'var(--modal-text-muted)'}`, background: item.done ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {item.done && <span style={{ color: '#fff', fontSize: '10px' }}>✓</span>}
                      </Box>
                      <Typography sx={{ fontSize: '13px', color: item.done ? 'var(--modal-text-muted)' : 'var(--modal-text)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Tab: Detalhes - Form only rendered in edit mode */}
        {activeTab === 'detalhes' && !viewMode && (
          <form
            id="darkTaskForm"
            onSubmit={(e) => e.preventDefault()}>
            {/* Título e Status */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
                <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                  Título <span style={{ color: '#ef4444' }}>*</span>
                </Typography>
                <TextField
                  {...register('title')}
                  placeholder="Ex: Implementar Login"
                  fullWidth
                  error={!!errors.title}
                  helperText={errors.title?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: '46px', // Standardized height
                      background: 'var(--modal-surface-hover)',
                      border: '1px solid var(--modal-border-strong)',
                      borderRadius: G360_INPUT_RADIUS,
                      color: 'var(--modal-text)',
                      fontSize: '14px',
                      paddingRight: '12px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '& fieldset': { border: 'none' },
                      '&:hover': {
                        background: 'var(--modal-surface-active)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      },
                      '&.Mui-focused': {
                        background: 'var(--modal-surface-active)',
                        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.25)',
                        border: '1px solid #3b82f6'
                      }
                    },
                    '& input::placeholder': { color: 'var(--modal-text-muted)', opacity: 0.8 }
                  }}
                />
              </Box>
              <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
                <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 600, mb: 1, letterSpacing: '0.02em' }}>
                  Status <span style={{ color: '#ef4444' }}>*</span>
                </Typography>
                <Select
                  {...register('status')}
                  value={status}
                  onChange={(e) => setValue('status', e.target.value)}
                  fullWidth
                  displayEmpty
                  sx={{
                    height: '46px', // Standardized height
                    background: 'var(--modal-surface-hover)',
                    border: '1px solid var(--modal-border-strong)',
                    borderRadius: G360_INPUT_RADIUS,
                    color: 'var(--modal-text)',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    '& fieldset': { border: 'none' },
                    '&:hover': {
                      background: 'var(--modal-surface-active)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    },
                    '&.Mui-focused': {
                      background: 'var(--modal-surface-active)',
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.25)',
                      border: '1px solid #3b82f6'
                    },
                    '& .MuiSelect-icon': { color: 'var(--modal-text-muted)' }
                  }}
                >
                  <MenuItem value="BACKLOG">Backlog</MenuItem>
                  <MenuItem value="TODO">A Fazer</MenuItem>
                  <MenuItem value="ON_HOLD">Em Pausa</MenuItem>
                  <MenuItem value="IN_PROGRESS">Em Progresso</MenuItem>
                  <MenuItem value="DONE">Concluído</MenuItem>
                  <MenuItem value="CANCELLED">Cancelada</MenuItem>
                </Select>
                {errors.status && (
                  <Typography sx={{ color: '#ef4444', fontSize: '12px', mt: 0.5 }}>
                    {errors.status.message}
                  </Typography>
                )}
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
                rows={4}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: 'var(--modal-surface-hover)',
                    border: '1px solid var(--modal-border-strong)',
                    borderRadius: G360_INPUT_RADIUS,
                    color: 'var(--modal-text)',
                    fontSize: '14px',
                    padding: '12px',
                    transition: 'all 0.2s',
                    '& fieldset': { border: 'none' },
                    '&:hover': {
                      background: 'var(--modal-surface-active)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    },
                    '&.Mui-focused': {
                      background: 'var(--modal-surface-active)',
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.25)',
                      border: '1px solid #3b82f6'
                    }
                  },
                  '& textarea::placeholder': { color: 'var(--modal-text-muted)', fontStyle: 'italic', opacity: 0.8 }
                }}
              />
            </Box>

            {/* Checklist Section */}
            <Box sx={{
              padding: '16px',
              borderRadius: G360_INPUT_RADIUS,
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
                        transition: 'background 0.2s',
                        '&:hover': { background: 'var(--modal-border)' }
                      }}
                    >
                      <Box
                        onClick={() => toggleChecklistItem(item.id)}
                        sx={{
                          width: '18px',
                          height: '18px',
                          border: `2px solid ${item.done ? '#22c55e' : 'var(--modal-text-muted)'}`,
                          borderRadius: '8px',
                          background: item.done ? '#22c55e' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: '#22c55e' }
                        }}
                      >
                        {item.done && <CheckBox sx={{ fontSize: '14px', color: 'var(--modal-text)' }} />}
                      </Box>
                      <Typography sx={{
                        flex: 1,
                        color: item.done ? 'var(--modal-text-muted)' : 'var(--modal-text)',
                        fontSize: '14px',
                        textDecoration: item.done ? 'line-through' : 'none',
                        transition: 'all 0.2s'
                      }}>
                        {item.text}
                      </Typography>
                      <IconButton
                        type="button"
                        size="small"
                        onClick={() => removeChecklistItem(item.id)}
                        sx={{
                          width: '28px',
                          height: '28px',
                          color: 'var(--modal-text-muted)',
                          '&:hover': {
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444'
                          }
                        }}
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
                  placeholder="Adicionar item ao checklist..."
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      background: 'var(--modal-surface-hover)',
                      border: '1px solid var(--modal-border-strong)',
                      borderRadius: G360_INPUT_RADIUS,
                      color: 'var(--modal-text)',
                      fontSize: '13px',
                      transition: 'all 0.2s',
                      '& fieldset': { border: 'none' },
                      '&:hover': {
                        background: 'var(--modal-surface-active)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      },
                      '&.Mui-focused': {
                        background: 'var(--modal-surface-active)',
                        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.25)',
                        border: '1px solid #3b82f6'
                      }
                    },
                    '& input::placeholder': { color: 'var(--modal-text-muted)', fontStyle: 'italic' }
                  }}
                />
                <IconButton
                  type="button"
                  onClick={addChecklistItem}
                  sx={{
                    width: '44px',
                    height: '44px',
                    border: '1px solid var(--modal-border-strong)',
                    background: 'var(--modal-surface-hover)',
                    color: 'var(--modal-text-muted)',
                    borderRadius: G360_INPUT_RADIUS,
                    '&:hover': {
                      background: 'var(--modal-border-strong)',
                      color: '#3b82f6',
                      borderColor: '#3b82f6'
                    }
                  }}
                >
                  <Add />
                </IconButton>
              </Box>
            </Box>

            {/* Configurações Section */}
            <Box sx={{
              padding: '16px',
              borderRadius: G360_INPUT_RADIUS,
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
                CONFIGURAÇÕES
              </Typography>

              {/* Prioridade */}
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                  Prioridade <span style={{ color: '#ef4444' }}>*</span>
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(lvl => {
                    const getPriorityColor = (level) => {
                      switch (level) {
                        case 'LOW': return { bg: '#10b981', hover: '#059669', soft: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' };
                        case 'MEDIUM': return { bg: '#f59e0b', hover: '#d97706', soft: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' };
                        case 'HIGH': return { bg: '#f97316', hover: '#ea580c', soft: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)' };
                        case 'CRITICAL': return { bg: '#ef4444', hover: '#dc2626', soft: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' };
                        default: return { bg: '#3b82f6', hover: '#2563eb', soft: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' };
                      }
                    };
                    const colors = getPriorityColor(lvl);
                    const isSelected = priority === lvl;

                    return (
                      <Button
                        key={lvl}
                        type="button"
                        onClick={() => setValue('priority', lvl)}
                        sx={{
                          padding: '8px 16px',
                          border: `1px solid ${isSelected ? colors.bg : 'var(--modal-border-strong)'}`,
                          background: isSelected ? colors.bg : 'var(--modal-surface-hover)',
                          color: isSelected ? '#fff' : 'var(--modal-text-muted)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: isSelected ? 700 : 500,
                          textTransform: 'none',
                          minWidth: 'auto',
                          transition: 'all 0.2s',
                          boxShadow: isSelected ? `0 4px 12px ${colors.soft}` : 'none',
                          '&:hover': {
                            borderColor: colors.bg,
                            background: isSelected ? colors.hover : colors.soft,
                            color: isSelected ? '#fff' : colors.bg
                          }
                        }}
                      >
                        <Box component="span" sx={{
                          width: 6, height: 6, borderRadius: '8px',
                          bgcolor: isSelected ? '#fff' : colors.bg,
                          mr: 1,
                          display: 'inline-block'
                        }} />
                        {lvl === 'LOW' ? 'Baixa' : lvl === 'MEDIUM' ? 'Média' : lvl === 'HIGH' ? 'Alta' : 'Crítica'}
                      </Button>
                    );
                  })}
                </Box>
                {errors.priority && (
                  <Typography sx={{ color: '#ef4444', fontSize: '12px', mt: 0.5 }}>
                    {errors.priority.message}
                  </Typography>
                )}
              </Box>

              {/* Datas e Responsável */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {!isGeneralTask && (
                  <>
                    <Box sx={{ flex: '1 1 130px', minWidth: '130px' }}>
                      <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                        Início <span style={{ color: '#ef4444' }}>*</span>
                      </Typography>
                      <TextField
                        {...register('startDate')}
                        type="date"
                        fullWidth
                        error={!!errors.startDate}
                        helperText={errors.startDate?.message}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            background: 'var(--modal-surface-hover)',
                            border: '1px solid var(--modal-border-strong)',
                            borderRadius: G360_INPUT_RADIUS,
                            color: 'var(--modal-text)',
                            fontSize: '13px',
                            transition: 'all 0.2s',
                            '& fieldset': { border: 'none' },
                            '&:hover': {
                              background: 'var(--modal-surface-active)',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            },
                            '&.Mui-focused': {
                              background: 'var(--modal-surface-active)',
                              boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.25)',
                              border: '1px solid #3b82f6'
                            }
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 130px', minWidth: '130px' }}>
                      <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                        Fim <span style={{ color: '#ef4444' }}>*</span>
                      </Typography>
                      <TextField
                        {...register('endDate')}
                        type="date"
                        fullWidth
                        error={!!errors.endDate}
                        helperText={errors.endDate?.message}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            background: 'var(--modal-surface-hover)',
                            border: '1px solid var(--modal-border-strong)',
                            borderRadius: G360_INPUT_RADIUS,
                            color: 'var(--modal-text)',
                            fontSize: '13px',
                            transition: 'all 0.2s',
                            '& fieldset': { border: 'none' },
                            '&:hover': {
                              background: 'var(--modal-surface-active)',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            },
                            '&.Mui-focused': {
                              background: 'var(--modal-surface-active)',
                              boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.25)',
                              border: '1px solid #3b82f6'
                            }
                          }
                        }}
                      />
                    </Box>
                  </>
                )}
                {isGeneralTask && (
                  <Box sx={{ flex: '1 1 130px', minWidth: '130px' }}>
                    <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                      Vencimento <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <TextField
                      {...register('dueDate')}
                      type="date"
                      fullWidth
                      error={!!errors.dueDate}
                      helperText={errors.dueDate?.message}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          background: 'var(--modal-surface-hover)',
                          border: '1px solid var(--modal-border-strong)',
                          borderRadius: G360_INPUT_RADIUS,
                          color: 'var(--modal-text)',
                          fontSize: '13px',
                          transition: 'all 0.2s',
                          '& fieldset': { border: 'none' },
                          '&:hover': {
                            background: 'var(--modal-surface-active)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                          },
                          '&.Mui-focused': {
                            background: 'var(--modal-surface-active)',
                            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.25)',
                            border: '1px solid #3b82f6'
                          }
                        }
                      }}
                    />
                  </Box>
                )}
              </Box>

              {/* Atribuir a */}
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                  Atribuir a <span style={{ color: '#ef4444' }}>*</span>
                </Typography>
                <Select
                  {...register('assigneeId')}
                  value={assigneeId || ''}
                  onChange={(e) => setValue('assigneeId', e.target.value)}
                  fullWidth
                  displayEmpty
                  sx={{
                    background: 'var(--modal-surface-hover)',
                    border: '1px solid var(--modal-border-strong)',
                    borderRadius: G360_INPUT_RADIUS,
                    color: 'var(--modal-text)',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    '& fieldset': { border: 'none' },
                    '&:hover': {
                      background: 'var(--modal-surface-active)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    },
                    '&.Mui-focused': {
                      background: 'var(--modal-surface-active)',
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.25)',
                      border: '1px solid #3b82f6'
                    },
                    '& .MuiSelect-icon': { color: 'var(--modal-text-muted)' }
                  }}
                >
                  <MenuItem value="">Selecione...</MenuItem>
                  {members.map(m => <MenuItem key={m.user.id} value={String(m.user.id)}>{m.user.name}</MenuItem>)}
                </Select>
                {errors.assigneeId && (
                  <Typography sx={{ color: '#ef4444', fontSize: '12px', mt: 0.5 }}>
                    {errors.assigneeId.message}
                  </Typography>
                )}
              </Box>
            </Box>
          </form>
        )}


        {/* Tab: Comentários */}
        {activeTab === 'comentarios' && task && (
          <Box>
            <Box sx={{ mb: 2 }}>
              <TextField
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..."
                multiline
                rows={3}
                fullWidth
                sx={{
                  mb: 1,
                  '& .MuiOutlinedInput-root': {
                    background: 'var(--modal-surface-hover)',
                    border: '1px solid var(--modal-border-strong)',
                    borderRadius: G360_INPUT_RADIUS,
                    color: 'var(--modal-text)',
                    fontSize: '14px',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--modal-border-strong)' },
                    '&:hover': { borderColor: 'var(--modal-border-strong)' },
                    '&.Mui-focused': {
                      borderColor: '#3b82f6',
                      background: 'rgba(59, 130, 246, 0.05)',
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
                    }
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleSendComment}
                sx={{
                  background: 'var(--modal-surface-alt)',
                  color: 'var(--modal-text)',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'none',
                  '&:hover': { background: '#334155' }
                }}
              >
                Enviar Comentário
              </Button>
            </Box>
            {comments.length === 0 ? (
              <Typography sx={{ textAlign: 'center', color: 'var(--modal-text-secondary)', fontSize: '13px' }}>Nenhum comentário ainda.</Typography>
            ) : (
              comments.map(c => (
                <Box key={c.id} sx={{ mb: 2, p: 2, background: 'var(--modal-surface-subtle)', borderRadius: G360_INPUT_RADIUS }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ color: 'var(--modal-text)', fontSize: '14px', fontWeight: 600 }}>{c.user?.name}</Typography>
                    <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '12px' }}>{format(new Date(c.createdAt), "dd/MM HH:mm")}</Typography>
                  </Box>
                  <Typography sx={{ color: 'var(--modal-text-soft)', fontSize: '14px' }}>{c.content}</Typography>
                  {user?.id === c.userId && (
                    <Button type="button" onClick={() => handleDeleteComment(c.id)} sx={{ mt: 1, color: '#ef4444', fontSize: '12px' }}>Excluir</Button>
                  )}
                </Box>
              ))
            )}
          </Box>
        )}

        {/* Tab: Anexos */}
        {activeTab === 'anexos' && task && (
          <Box>
            <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} id="file-upload-dark" />
            <label htmlFor="file-upload-dark">
              <Button
                component="span"
                sx={{
                  mb: 2,
                  background: 'var(--modal-surface-alt)',
                  color: 'var(--modal-text)',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'none',
                  '&:hover': { background: '#334155' }
                }}
              >
                📎 Selecionar Arquivo
              </Button>
            </label>
            {attachments.length === 0 ? (
              <Typography sx={{ textAlign: 'center', color: 'var(--modal-text-secondary)', fontSize: '13px' }}>Nenhum anexo.</Typography>
            ) : (
              attachments.map(att => (
                <Box key={att.id} sx={{ mb: 1, p: 1.5, background: 'var(--modal-surface-subtle)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <a href={getFileURL(att.fileUrl)} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                    {att.fileName}
                  </a>
                  <IconButton type="button" onClick={() => handleDeleteAttachment(att.id)} size="small" sx={{ color: '#ef4444' }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))
            )}
          </Box>
        )}
      </Box>
      </Box>
    </StandardModal>
  );
};

export default DarkTaskModal;

