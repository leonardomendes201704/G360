import { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { uploadMinute, updateMinute } from '../../services/project-details.service';
import {
  Box, Typography, TextField, Button, IconButton, Chip, Dialog
} from '@mui/material';
import { Description, Close, Add, Delete, CheckCircle } from '@mui/icons-material';

const MinuteModal = ({ open, onClose, onSave, projectId, projectName, minuteToEdit = null }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('');
  const [participants, setParticipants] = useState('');
  const [topics, setTopics] = useState([]);
  const [topicInput, setTopicInput] = useState('');
  const [actions, setActions] = useState([]);
  const [actionInput, setActionInput] = useState('');
  const [actionAssignee, setActionAssignee] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (open) {
      if (minuteToEdit) {
        setTitle(minuteToEdit.title);
        setDate(minuteToEdit.date ? minuteToEdit.date.split('T')[0] : '');
        setLocation(minuteToEdit.location || '');
        setDuration(minuteToEdit.duration || '');
        setParticipants(minuteToEdit.participants || '');
        setTopics(minuteToEdit.topics || []);
        setActions(minuteToEdit.actions || []);
        setFile(null);
      } else {
        setTitle('');
        setDate(new Date().toISOString().split('T')[0]);
        setLocation('');
        setDuration('');
        setParticipants('');
        setTopics([]);
        setActions([]);
        setFile(null);
      }
    }
  }, [open, minuteToEdit]);

  const handleAddTopic = () => {
    if (topicInput.trim()) {
      setTopics([...topics, topicInput.trim()]);
      setTopicInput('');
    }
  };

  const handleRemoveTopic = (index) => {
    setTopics(topics.filter((_, i) => i !== index));
  };

  const handleAddAction = () => {
    if (actionInput.trim()) {
      setActions([...actions, { title: actionInput.trim(), completed: false, assignee: actionAssignee.trim() || null }]);
      setActionInput('');
      setActionAssignee('');
    }
  };

  const handleRemoveAction = (index) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleToggleAction = (index) => {
    setActions(actions.map((action, i) => i === index ? { ...action, completed: !action.completed } : action));
  };

  const handleSave = async () => {
    if (!title) return enqueueSnackbar('Título é obrigatório.', { variant: 'warning' });
    if (!minuteToEdit && !file) return enqueueSnackbar('Anexe o arquivo da ata para continuar.', { variant: 'warning' });

    setLoading(true);
    try {
      const payload = {
        title,
        date,
        location,
        duration,
        participants,
        topics,
        actions,
        file,
        projectName
      };

      if (minuteToEdit) {
        await updateMinute(projectId, minuteToEdit.id, payload);
        enqueueSnackbar('Ata atualizada com sucesso!', { variant: 'success' });
      } else {
        await uploadMinute(projectId, payload);
        enqueueSnackbar('Ata salva com sucesso!', { variant: 'success' });
      }

      if (onSave) onSave();
      onClose();
    } catch (error) {
      enqueueSnackbar('Erro ao salvar ata.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Input style
  const inputSx = {
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
    '& .MuiInputLabel-root': { color: 'var(--modal-text-muted)' },
    '& input::placeholder, & textarea::placeholder': { color: 'var(--modal-text-muted)' }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
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
        padding: '24px 24px 20px 24px',
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
              <Description sx={{ color: 'var(--modal-text)', fontSize: '24px' }} />
            </Box>
            <Box>
              <Typography sx={{ color: 'var(--modal-text)', fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                {minuteToEdit ? 'Editar Ata' : 'Nova Ata de Reunião'}
              </Typography>
              <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '13px', mt: 0.25 }}>
                Documente a reunião realizada
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
        {/* Informações Básicas */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>
            INFORMAÇÕES BÁSICAS
          </Typography>

          <TextField
            fullWidth
            placeholder="Título da reunião *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            sx={{ ...inputSx, mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              placeholder="Horário (ex: 09:00 - 10:30)"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              sx={{ ...inputSx, flex: 1 }}
            />
          </Box>

          <TextField
            fullWidth
            placeholder="Local (ex: Sala A, Google Meet)"
            value={location}
            onChange={e => setLocation(e.target.value)}
            sx={inputSx}
          />
        </Box>

        {/* Participantes */}
        <Box sx={{ mb: 3, p: 2, borderRadius: '12px', border: '1px solid var(--modal-border-strong)', background: 'var(--modal-surface-subtle)' }}>
          <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>
            PARTICIPANTES
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Liste os participantes da reunião..."
            value={participants}
            onChange={e => setParticipants(e.target.value)}
            sx={inputSx}
          />
        </Box>

        {/* Pautas Discutidas */}
        <Box sx={{ mb: 3, p: 2, borderRadius: '12px', border: '1px solid var(--modal-border-strong)', background: 'var(--modal-surface-subtle)' }}>
          <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>
            PAUTAS DISCUTIDAS
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Digite uma pauta e pressione Enter"
              value={topicInput}
              onChange={e => setTopicInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
              sx={inputSx}
            />
            <Button
              onClick={handleAddTopic}
              sx={{
                minWidth: 'auto',
                px: 2,
                background: 'rgba(37, 99, 235, 0.15)',
                color: '#2563eb',
                borderRadius: '10px',
                '&:hover': { background: 'rgba(37, 99, 235, 0.25)' }
              }}
            >
              <Add />
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {topics.map((topic, idx) => (
              <Chip
                key={idx}
                label={topic}
                onDelete={() => handleRemoveTopic(idx)}
                sx={{
                  background: 'rgba(37, 99, 235, 0.15)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(37, 99, 235, 0.3)',
                  '& .MuiChip-deleteIcon': { color: '#f43f5e', '&:hover': { color: '#ff6b6b' } }
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Ações Definidas */}
        <Box sx={{ mb: 3, p: 2, borderRadius: '12px', border: '1px solid var(--modal-border-strong)', background: 'var(--modal-surface-subtle)' }}>
          <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>
            AÇÕES DEFINIDAS
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              placeholder="Descrição da ação"
              value={actionInput}
              onChange={e => setActionInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddAction())}
              sx={{ ...inputSx, flex: 2 }}
            />
            <TextField
              placeholder="Responsável"
              value={actionAssignee}
              onChange={e => setActionAssignee(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddAction())}
              sx={{ ...inputSx, flex: 1 }}
            />
            <Button
              onClick={handleAddAction}
              sx={{
                minWidth: 'auto',
                px: 2,
                background: 'rgba(37, 99, 235, 0.15)',
                color: '#2563eb',
                borderRadius: '10px',
                '&:hover': { background: 'rgba(37, 99, 235, 0.25)' }
              }}
            >
              <Add />
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {actions.map((action, idx) => (
              <Box key={idx} sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                background: 'var(--modal-surface)',
                borderRadius: '8px',
                border: '1px solid var(--modal-border)'
              }}>
                <IconButton
                  size="small"
                  onClick={() => handleToggleAction(idx)}
                  sx={{ color: action.completed ? '#10b981' : 'var(--modal-text-muted)' }}
                >
                  <CheckCircle fontSize="small" />
                </IconButton>
                <Typography sx={{
                  flex: 1,
                  fontSize: '13px',
                  color: action.completed ? 'var(--modal-text-muted)' : 'var(--modal-text)',
                  textDecoration: action.completed ? 'line-through' : 'none'
                }}>
                  {action.title}
                </Typography>
                {action.assignee && (
                  <Typography sx={{ fontSize: '12px', color: '#3b82f6' }}>
                    👤 {action.assignee}
                  </Typography>
                )}
                <IconButton
                  size="small"
                  onClick={() => handleRemoveAction(idx)}
                  sx={{ color: '#f43f5e', '&:hover': { background: 'rgba(244, 63, 94, 0.1)' } }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Documento da Ata */}
        <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid var(--modal-border-strong)', background: 'var(--modal-surface-subtle)' }}>
          <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>
            DOCUMENTO DA ATA {!minuteToEdit && <span style={{ color: '#ef4444' }}>*</span>}
          </Typography>
          <Box
            component="label"
            htmlFor="file-ata-dark"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              borderRadius: '12px',
              border: '2px dashed rgba(37, 99, 235, 0.3)',
              background: 'rgba(37, 99, 235, 0.05)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: '#2563eb',
                background: 'rgba(37, 99, 235, 0.1)'
              }
            }}
          >
            <Description sx={{ fontSize: 40, color: '#2563eb', mb: 1 }} />
            <Typography sx={{ color: 'var(--modal-text)', fontSize: '14px', fontWeight: 500, mb: 0.5 }}>
              {file ? file.name : (minuteToEdit ? 'Clique para substituir o arquivo' : 'Arraste o PDF aqui ou clique para selecionar')}
            </Typography>
            <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '12px' }}>
              Formatos aceitos: PDF, DOC (máx. 10MB)
            </Typography>
            <input
              type="file"
              id="file-ata-dark"
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{
        padding: '16px 24px',
        borderTop: '1px solid var(--modal-border-strong)',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 2,
        background: 'var(--modal-surface-subtle)'
      }}>
        <Button
          onClick={onClose}
          sx={{
            color: 'var(--modal-text-secondary)',
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            '&:hover': { background: 'var(--modal-surface-hover)' }
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading}
          sx={{
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            color: 'var(--modal-text)',
            fontSize: '14px',
            fontWeight: 600,
            textTransform: 'none',
            padding: '10px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1d4ed8 0%, #1d4ed8 100%)',
              boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)'
            },
            '&:disabled': {
              background: 'var(--modal-border-strong)',
              color: 'var(--modal-text-muted)'
            }
          }}
        >
          ✓ {minuteToEdit ? 'Atualizar' : 'Salvar'}
        </Button>
      </Box>
    </Dialog>
  );
};

export default MinuteModal;



