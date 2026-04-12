import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Button,
  IconButton,
  TextField,
  Typography,
  FormControlLabel,
  Switch,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { CalendarToday, Close, Check } from '@mui/icons-material';

const schema = yup.object({
  year: yup.number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .required('Ano é obrigatório')
    .min(2000, 'Ano deve ser maior que 2000')
    .max(2100, 'Ano deve ser menor que 2100'),
  startDate: yup.string().required('Início é obrigatório'),
  endDate: yup.string().required('Fim é obrigatório'),
  isClosed: yup.boolean()
}).required();

// Theme-aware Styles
const modalStyles = {
  backdrop: {
    backdropFilter: 'blur(8px)',
    backgroundColor: 'var(--modal-backdrop, rgba(0, 0, 0, 0.7))'
  },
  paper: {
    borderRadius: '16px',
    background: 'var(--modal-gradient)',
    border: '1px solid var(--modal-border)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    color: 'var(--modal-text)',
    maxWidth: '500px',
    width: '100%',
    m: 2
  },
  title: {
    borderBottom: '1px solid var(--modal-border)',
    padding: '24px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  input: {
    '& .MuiOutlinedInput-root': {
      background: 'var(--modal-surface-subtle)',
      color: 'var(--modal-text-soft)',
      borderRadius: '10px',
      '& fieldset': { borderColor: 'var(--modal-border)' },
      '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.3)' },
      '&.Mui-focused fieldset': { borderColor: '#2563eb' }
    },
    '& .MuiInputLabel-root': { color: 'var(--modal-text-secondary)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#2563eb' },
    '& .MuiInputBase-input': { color: 'var(--modal-text-soft)' }
  }
};

const FiscalYearModal = ({ open, onClose, onSave, fiscalYear = null }) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { year: new Date().getFullYear(), startDate: '', endDate: '', isClosed: false }
  });

  useEffect(() => {
    if (open) {
      if (fiscalYear) {
        reset({
          ...fiscalYear,
          year: fiscalYear.year,
          startDate: fiscalYear.startDate.split('T')[0],
          endDate: fiscalYear.endDate.split('T')[0],
          isClosed: fiscalYear.isClosed
        });
      } else {
        const currentYear = new Date().getFullYear();
        reset({ year: currentYear, startDate: `${currentYear}-01-01`, endDate: `${currentYear}-12-31`, isClosed: false });
      }
    }
  }, [open, fiscalYear, reset]);

  const onSubmit = (data) => { onSave(data); };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: modalStyles.paper }}
      BackdropProps={{ sx: modalStyles.backdrop }}
      TransitionProps={{ onExited: () => reset() }}
    >
      {/* Header */}
      <DialogTitle sx={modalStyles.title}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px',
            background: 'rgba(37, 99, 235, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CalendarToday sx={{ color: '#2563eb', fontSize: 20 }} />
          </Box>
          <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'var(--modal-text-strong)' }}>
            {fiscalYear ? 'Editar Ano Fiscal' : 'Novo Ano Fiscal'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)' } }}>
          <Close />
        </IconButton>
      </DialogTitle>

      {/* Body */}
      <DialogContent sx={{ p: 4 }}>
        <form id="fiscalForm" onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <Box>
              <Controller
                name="year"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Ano de Referência"
                    type="number"
                    fullWidth
                    error={!!errors.year}
                    helperText={errors.year?.message}
                    sx={modalStyles.input}
                    required
                  />
                )}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Início"
                    type="date"
                    fullWidth
                    error={!!errors.startDate}
                    helperText={errors.startDate?.message}
                    sx={modalStyles.input}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                )}
              />
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Fim"
                    type="date"
                    fullWidth
                    error={!!errors.endDate}
                    helperText={errors.endDate?.message}
                    sx={modalStyles.input}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                )}
              />
            </Box>

            <Controller
              name="isClosed"
              control={control}
              render={({ field: { onChange, value } }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={value}
                      onChange={onChange}
                      sx={{
                        '& .MuiSwitch-thumb': { background: value ? '#2563eb' : '#64748b' },
                        '& .MuiSwitch-track': { background: value ? 'rgba(37, 99, 235, 0.3)' : 'rgba(100, 116, 139, 0.3)' }
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ color: 'var(--modal-text-secondary)' }}>
                      {value ? "Fechado (Apenas Leitura)" : "Aberto (Permite Lançamentos)"}
                    </Typography>
                  }
                />
              )}
            />
          </Box>
        </form>
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ p: '24px 32px', borderTop: '1px solid var(--modal-border)', gap: 1 }}>
        <Button onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { background: 'var(--modal-surface-hover)' } }}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="fiscalForm"
          startIcon={<Check />}
          sx={{
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            color: 'white',
            px: 3,
            py: 1,
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            '&:hover': { boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
          }}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FiscalYearModal;
