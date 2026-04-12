import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, TextField, MenuItem, Grid, Typography
} from '@mui/material';
import { Close, Category, Check } from '@mui/icons-material';

const schema = yup.object({
  name: yup.string().required('Nome da categoria é obrigatório'),
  type: yup.string().required('Tipo é obrigatório'),
  depreciationYears: yup.number().nullable().transform((v, o) => o === '' ? null : v)
}).required();

const modalStyles = {
  backdrop: { backdropFilter: 'blur(8px)', backgroundColor: 'var(--modal-backdrop, rgba(0, 0, 0, 0.7))' },
  paper: {
    borderRadius: '16px',
    background: 'var(--modal-gradient)',
    border: '1px solid var(--modal-border)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    color: 'var(--modal-text)',
    maxWidth: '520px', width: '100%', m: 2
  },
  title: {
    borderBottom: '1px solid var(--modal-border)',
    padding: '24px 32px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  input: {
    '& .MuiOutlinedInput-root': {
      background: 'var(--modal-surface-subtle)', color: 'var(--modal-text-soft)', borderRadius: '10px',
      '& fieldset': { borderColor: 'var(--modal-border)' },
      '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.3)' },
      '&.Mui-focused fieldset': { borderColor: '#2563eb' }
    },
    '& .MuiInputLabel-root': { color: 'var(--modal-text-secondary)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#2563eb' },
    '& .MuiInputBase-input': { color: 'var(--modal-text-soft)' },
    '& .MuiSelect-icon': { color: 'var(--modal-text-secondary)' },
    '& .MuiFormHelperText-root': { color: '#f43f5e' }
  }
};

const AssetCategoryModal = ({ open, onClose, onSave, category = null }) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { name: '', type: 'HARDWARE', depreciationYears: '' }
  });

  useEffect(() => {
    if (open) {
      reset(category || { name: '', type: 'HARDWARE', depreciationYears: '' });
    }
  }, [open, category, reset]);

  const onSubmit = (data) => { onSave(data); };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: modalStyles.paper }}
      BackdropProps={{ sx: modalStyles.backdrop }}
      TransitionProps={{ onExited: () => reset() }}
    >
      <DialogTitle sx={modalStyles.title}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'rgba(59, 130, 246, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Category sx={{ color: '#3b82f6', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'var(--modal-text-strong)' }}>
              {category ? 'Editar Categoria' : 'Nova Categoria'}
            </Typography>
            <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)' }}>Classificação de ativos</Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { color: 'var(--modal-text)', background: 'var(--modal-surface-hover)' } }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <form id="catForm" onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <Controller name="name" control={control} render={({ field }) => (
              <TextField {...field} label="Nome da Categoria" placeholder="Ex: Notebooks" fullWidth
                error={!!errors.name} helperText={errors.name?.message} value={field.value ?? ''} sx={modalStyles.input} required />
            )} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Controller name="type" control={control} render={({ field }) => (
                <TextField {...field} select label="Tipo" fullWidth
                  SelectProps={{ MenuProps: { sx: { zIndex: 1400 } } }} value={field.value ?? ''} sx={modalStyles.input}>
                  <MenuItem value="HARDWARE">Hardware</MenuItem>
                  <MenuItem value="SOFTWARE">Software</MenuItem>
                </TextField>
              )} />
              <Controller name="depreciationYears" control={control} render={({ field }) => (
                <TextField {...field} type="number" label="Depreciação (Anos)" fullWidth value={field.value ?? ''} sx={modalStyles.input} />
              )} />
            </Box>
          </Box>
        </form>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid var(--modal-border)', gap: 2 }}>
        <Button onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { background: 'var(--modal-surface-hover)' } }}>Cancelar</Button>
        <Button type="submit" form="catForm" startIcon={<Check />}
          sx={{
            padding: '10px 24px', borderRadius: '10px', fontWeight: 600, textTransform: 'none',
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white',
            '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)' }
          }}
        >Salvar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssetCategoryModal;