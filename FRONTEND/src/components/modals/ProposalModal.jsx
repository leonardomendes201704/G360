import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Box, Typography, TextField, Select, MenuItem, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Close, Article, CloudUpload, Description, Add } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { createProposal, updateProposal } from '../../services/project-details.service';
import { getFileURL } from '../../utils/urlUtils';

// Categorias padrão de propostas
const DEFAULT_CATEGORIES = [
  'Hardware',
  'Software',
  'Serviços',
  'Licenciamento',
  'Infraestrutura',
  'Consultoria',
  'Manutenção',
  'Treinamento',
  'Outros'
];

// Validation schema
const schema = yup
  .object({
    supplierId: yup.string().required('Fornecedor é obrigatório'),
    value: yup.number().required('Valor é obrigatório').min(0, 'Valor deve ser positivo'),
    category: yup.string().nullable(),
    description: yup.string().nullable(),
    notes: yup.string().nullable(),
    validity: yup.string().nullable()
  })
  .required();

const ProposalModal = ({
  open,
  onClose,
  onSave,
  projectId,
  projectName,
  editingProposal,
  suppliers = []
}) => {
  const [mounted, setMounted] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    register,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      supplierId: '',
      value: '',
      category: '',
      description: '',
      notes: '',
      validity: ''
    }
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (open) {
      if (editingProposal) {
        reset({
          supplierId: editingProposal.supplierId || '',
          value: editingProposal.value || '',
          category: editingProposal.category || '',
          description: editingProposal.description || '',
          notes: editingProposal.notes || '',
          validity: editingProposal.validity?.split('T')[0] || ''
        });
      } else {
        reset({
          supplierId: '',
          value: '',
          category: '',
          description: '',
          notes: '',
          validity: ''
        });
        setSelectedFile(null);
      }
    }
  }, [open, editingProposal, reset]);

  const onSubmit = async (data) => {
    if (!editingProposal && !selectedFile) {
      enqueueSnackbar('Anexe a proposta comercial (PDF/Imagem) para continuar.', { variant: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        value: Number(data.value),
        projectName,
        isWinner: false
      };

      if (selectedFile) {
        payload.file = selectedFile;
      }

      if (editingProposal) {
        await updateProposal(projectId, editingProposal.id, payload);
        enqueueSnackbar('Proposta atualizada com sucesso!', { variant: 'success' });
      } else {
        await createProposal(projectId, payload);
        enqueueSnackbar('Proposta criada com sucesso!', { variant: 'success' });
      }

      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar proposta:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao salvar proposta.';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          background: 'var(--modal-bg)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--modal-surface-hover)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
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
      <Box
        sx={{
          padding: '24px 24px 20px 24px',
          borderBottom: '1px solid var(--modal-border-strong)',
          background: 'var(--modal-header-gradient)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
            <Box
              sx={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              <Article sx={{ color: 'var(--modal-text)', fontSize: '24px' }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  color: 'var(--modal-text)',
                  fontSize: '18px',
                  fontWeight: 600,
                  letterSpacing: '-0.01em'
                }}
              >
                {editingProposal ? 'Editar Proposta' : 'Nova Proposta'}
              </Typography>
              <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '13px', mt: 0.25 }}>
                Proposta comercial de fornecedor
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
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          background: 'var(--modal-bg)',
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: 'var(--modal-border-strong)',
            borderRadius: '3px'
          },
          '&::-webkit-scrollbar-thumb:hover': { background: 'var(--modal-border-strong)' }
        }}
      >
        <form id="proposalForm" onSubmit={handleSubmit(onSubmit)}>
          {/* Fornecedor */}
          <Box sx={{ mb: 2.5 }}>
            <Typography
              sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}
            >
              Fornecedor <span style={{ color: '#ef4444' }}>*</span>
            </Typography>
            <Controller
              name="supplierId"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  fullWidth
                  disabled={!!editingProposal}
                  error={!!errors.supplierId}
                  sx={{
                    background: 'var(--modal-surface-hover)',
                    border: '1px solid var(--modal-border-strong)',
                    borderRadius: '10px',
                    color: 'var(--modal-text)',
                    fontSize: '14px',
                    '& fieldset': { border: 'none' },
                    '&:hover': { borderColor: 'var(--modal-border-strong)' },
                    '&.Mui-focused': {
                      borderColor: '#3b82f6',
                      background: 'rgba(59, 130, 246, 0.05)',
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
                    },
                    '& .MuiSelect-icon': { color: 'var(--modal-text-muted)' }
                  }}
                >
                  <MenuItem value="">Selecione um fornecedor...</MenuItem>
                  {suppliers.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                      {s.cnpj && (
                        <Typography
                          component="span"
                          sx={{ ml: 1, color: 'text.secondary', fontSize: '12px' }}
                        >
                          ({s.cnpj})
                        </Typography>
                      )}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
            {errors.supplierId && (
              <Typography sx={{ color: '#ef4444', fontSize: '12px', mt: 0.5 }}>
                {errors.supplierId.message}
              </Typography>
            )}
          </Box>

          {/* Categoria */}
          <Box sx={{ mb: 2.5 }}>
            <Typography
              sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}
            >
              Categoria
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    fullWidth
                    displayEmpty
                    sx={{
                      background: 'var(--modal-surface-hover)',
                      border: '1px solid var(--modal-border-strong)',
                      borderRadius: '10px',
                      color: 'var(--modal-text)',
                      fontSize: '14px',
                      '& fieldset': { border: 'none' },
                      '&:hover': { borderColor: 'var(--modal-border-strong)' },
                      '&.Mui-focused': {
                        borderColor: '#3b82f6',
                        background: 'rgba(59, 130, 246, 0.05)',
                        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
                      },
                      '& .MuiSelect-icon': { color: 'var(--modal-text-muted)' }
                    }}
                  >
                    <MenuItem value="">Selecione uma categoria...</MenuItem>
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              <IconButton
                onClick={() => setNewCategoryOpen(true)}
                sx={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#3b82f6',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  '&:hover': { background: 'rgba(59, 130, 246, 0.25)' }
                }}
              >
                <Add />
              </IconButton>
            </Box>
          </Box>

          {/* Título e Valor */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  color: 'var(--modal-text-secondary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  mb: 1
                }}
              >
                Título da Proposta
              </Typography>
              <TextField
                {...register('description')}
                placeholder="Ex: Licenciamento SAP Business One"
                fullWidth
                error={!!errors.description}
                helperText={errors.description?.message}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: 'var(--modal-surface-hover)',
                    border: '1px solid var(--modal-border-strong)',
                    borderRadius: '10px',
                    color: 'var(--modal-text)',
                    fontSize: '14px',
                    '& fieldset': { border: 'none' },
                    '&:hover': { borderColor: 'var(--modal-border-strong)' },
                    '&.Mui-focused': {
                      borderColor: '#3b82f6',
                      background: 'rgba(59, 130, 246, 0.05)',
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
                    }
                  },
                  '& input::placeholder': { color: 'var(--modal-text-muted)' }
                }}
              />
            </Box>
            <Box sx={{ flex: '0 0 180px' }}>
              <Typography
                sx={{
                  color: 'var(--modal-text-secondary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  mb: 1
                }}
              >
                Valor <span style={{ color: '#ef4444' }}>*</span>
              </Typography>
              <Box sx={{ position: 'relative' }}>
                <Typography
                  sx={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--modal-text-muted)',
                    fontSize: '14px',
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                >
                  R$
                </Typography>
                <TextField
                  {...register('value')}
                  type="number"
                  fullWidth
                  error={!!errors.value}
                  helperText={errors.value?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      background: 'var(--modal-surface-hover)',
                      border: '1px solid var(--modal-border-strong)',
                      borderRadius: '10px',
                      color: 'var(--modal-text)',
                      fontSize: '14px',
                      paddingLeft: '38px',
                      '& input': { paddingLeft: 0 },
                      '& fieldset': { border: 'none' },
                      '&:hover': { borderColor: 'var(--modal-border-strong)' },
                      '&.Mui-focused': {
                        borderColor: '#3b82f6',
                        background: 'rgba(59, 130, 246, 0.05)',
                        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
                      }
                    }
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Validade */}
          <Box sx={{ mb: 2.5 }}>
            <Typography
              sx={{
                color: 'var(--modal-text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                mb: 1
              }}
            >
              Validade da Proposta
            </Typography>
            <TextField
              {...register('validity')}
              type="date"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'var(--modal-surface-hover)',
                  border: '1px solid var(--modal-border-strong)',
                  borderRadius: '10px',
                  color: 'var(--modal-text)',
                  fontSize: '14px',
                  '& fieldset': { border: 'none' },
                  '&:hover': { borderColor: 'var(--modal-border-strong)' },
                  '&.Mui-focused': {
                    borderColor: '#3b82f6',
                    background: 'rgba(59, 130, 246, 0.05)',
                    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
                  }
                }
              }}
            />
          </Box>

          {/* Observações */}
          <Box sx={{ mb: 2.5 }}>
            <Typography
              sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}
            >
              Observações / Detalhes
            </Typography>
            <TextField
              {...register('notes')}
              placeholder="Informações adicionais sobre a proposta, condições comerciais, prazos de entrega, etc."
              multiline
              rows={3}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'var(--modal-surface-hover)',
                  border: '1px solid var(--modal-border-strong)',
                  borderRadius: '10px',
                  color: 'var(--modal-text)',
                  fontSize: '14px',
                  '& fieldset': { border: 'none' },
                  '&:hover': { borderColor: 'var(--modal-border-strong)' },
                  '&.Mui-focused': {
                    borderColor: '#3b82f6',
                    background: 'rgba(59, 130, 246, 0.05)',
                    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
                  }
                },
                '& textarea::placeholder': { color: 'var(--modal-text-muted)' }
              }}
            />
          </Box>

          {/* Upload Section */}
          <Box
            sx={{
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--modal-border-strong)',
              background: 'var(--modal-surface-subtle)'
            }}
          >
            <Typography
              sx={{
                color: 'var(--modal-text-muted)',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                mb: 1.5
              }}
            >
              ANEXO DA PROPOSTA
            </Typography>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              hidden
              id="proposal-file-input"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
            <label htmlFor="proposal-file-input">
              <Button
                component="span"
                fullWidth
                startIcon={<CloudUpload />}
                sx={{
                  background: 'var(--modal-surface-hover)',
                  border: '1px dashed var(--modal-border-strong)',
                  borderRadius: '10px',
                  color: 'var(--modal-text-secondary)',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'var(--modal-border-strong)',
                    borderColor: 'var(--modal-text-muted)'
                  }
                }}
              >
                {selectedFile ? selectedFile.name : 'Selecionar arquivo (PDF, Imagem)'}
              </Button>
            </label>
            {editingProposal?.fileUrl && !selectedFile && (
              <Button
                fullWidth
                startIcon={<Description />}
                onClick={() =>
                  window.open(getFileURL(editingProposal.fileUrl), '_blank')
                }
                sx={{
                  mt: 1,
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  color: '#3b82f6',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'rgba(59, 130, 246, 0.15)',
                    borderColor: 'rgba(59, 130, 246, 0.4)'
                  }
                }}
              >
                Ver Anexo Atual
              </Button>
            )}
          </Box>
        </form>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          padding: '16px 24px',
          borderTop: '1px solid var(--modal-border-strong)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
          background: 'var(--modal-surface-subtle)'
        }}
      >
        <Button
          onClick={onClose}
          disabled={submitting}
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
          Cancelar
        </Button>
        <Button
          type="submit"
          form="proposalForm"
          disabled={submitting}
          sx={{
            background: 'var(--modal-surface-alt)',
            color: 'var(--modal-text)',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': { background: '#334155' },
            '&:disabled': { opacity: 0.5 }
          }}
        >
          ✓ {editingProposal ? 'Salvar Alterações' : 'Criar Proposta'}
        </Button>
      </Box>

      {/* Dialog para criar nova categoria */ }
  <Dialog
    open={newCategoryOpen}
    onClose={() => setNewCategoryOpen(false)}
    PaperProps={{
      sx: {
        background: 'var(--modal-surface-alt)',
        color: '#fff',
        borderRadius: '12px',
        minWidth: '400px'
      }
    }}
  >
    <DialogTitle sx={{ color: 'var(--modal-text)', fontSize: '16px', fontWeight: 600 }}>
      Nova Categoria
    </DialogTitle>
    <DialogContent>
      <TextField
        autoFocus
        fullWidth
        placeholder="Nome da categoria"
        value={newCategoryName}
        onChange={(e) => setNewCategoryName(e.target.value)}
        sx={{
          mt: 1,
          '& .MuiOutlinedInput-root': {
            background: 'var(--modal-surface-hover)',
            border: '1px solid var(--modal-border-strong)',
            borderRadius: '10px',
            color: 'var(--modal-text)',
            fontSize: '14px',
            '& fieldset': { border: 'none' },
            '&:hover': { borderColor: 'var(--modal-border-strong)' },
            '&.Mui-focused': {
              borderColor: '#3b82f6',
              background: 'rgba(59, 130, 246, 0.05)'
            }
          },
          '& input::placeholder': { color: 'var(--modal-text-muted)' }
        }}
      />
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button
        onClick={() => setNewCategoryOpen(false)}
        sx={{ color: 'var(--modal-text-muted)' }}
      >
        Cancelar
      </Button>
      <Button
        onClick={() => {
          if (newCategoryName.trim()) {
            const newCat = newCategoryName.trim();
            if (!categories.includes(newCat)) {
              setCategories([...categories, newCat]);
            }
            setValue('category', newCat);
            setNewCategoryName('');
            setNewCategoryOpen(false);
          }
        }}
        variant="contained"
        sx={{
          background: '#3b82f6',
          '&:hover': { background: '#2563eb' }
        }}
      >
        Adicionar
      </Button>
    </DialogActions>
  </Dialog>
    </Dialog>
  );
};

export default ProposalModal;
