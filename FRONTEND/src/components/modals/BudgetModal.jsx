import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Typography
} from '@mui/material';
import { Close, AccountBalanceWallet, Check } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import fiscalYearService from '../../services/fiscal-year.service';

const schema = yup.object({
  name: yup.string().required('Nome é obrigatório'),
  fiscalYearId: yup.string().required('Ano Fiscal é obrigatório'),
  description: yup.string(),
  type: yup.string().oneOf(['OPEX', 'CAPEX', 'MIXED']).default('MIXED'),
  isOBZ: yup.boolean().default(false)
}).required();

const modalStyles = {
  backdrop: { backdropFilter: 'blur(8px)', backgroundColor: 'var(--modal-backdrop, rgba(0, 0, 0, 0.7))' },
  paper: {
    borderRadius: '16px',
    background: 'var(--modal-gradient)',
    border: '1px solid var(--modal-border)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    color: 'var(--modal-text)',
    maxWidth: '500px', width: '100%', m: 2
  },
  title: {
    borderBottom: '1px solid var(--modal-border)',
    padding: '24px 32px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  nativeInput: {
    background: 'var(--modal-surface-subtle)',
    border: '1px solid var(--modal-border)',
    borderRadius: '10px',
    padding: '14px 16px',
    color: 'var(--modal-text-soft)',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit'
  },
  nativeSelect: {
    background: 'var(--modal-surface-subtle)',
    border: '1px solid var(--modal-border)',
    borderRadius: '10px',
    padding: '14px 16px',
    color: 'var(--modal-text-soft)',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    fontFamily: 'inherit',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center'
  }
};

const BudgetModal = ({ open, onClose, onSave, budget }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [fiscalYears, setFiscalYears] = useState([]);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { name: '', fiscalYearId: '', description: '', isOBZ: false }
  });

  useEffect(() => {
    if (open) {
      fiscalYearService.getAll().then(setFiscalYears).catch(console.error);
      if (budget) {
        reset({ name: budget.name, fiscalYearId: budget.fiscalYearId, description: budget.description || '', isOBZ: budget.isOBZ || false });
      } else {
        reset({ name: '', fiscalYearId: '', description: '', isOBZ: false });
      }
    }
  }, [open, budget, reset]);

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
            background: 'rgba(6, 182, 212, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <AccountBalanceWallet sx={{ color: '#06b6d4', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'var(--modal-text-strong)' }}>{budget ? 'Editar Orçamento' : 'Novo Orçamento'}</Typography>
            <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)' }}>{budget ? 'Alterar dados' : 'Planejamento financeiro anual'}</Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { color: 'var(--modal-text)', background: 'var(--modal-surface-hover)' } }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, background: 'transparent !important' }}>
        <form id="budgetForm" onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <label style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>Nome do Orçamento *</label>
              <Controller name="name" control={control} render={({ field }) => (
                <input {...field} data-testid="input-budget-name" style={{ ...modalStyles.nativeInput, borderColor: errors.name ? '#f43f5e' : 'var(--modal-border)' }} placeholder="Ex: Orçamento TI 2025" />
              )} />
              {errors.name && <span style={{ fontSize: '11px', color: '#f43f5e', marginTop: '4px', display: 'block' }}>{errors.name.message}</span>}
            </Box>

            <Box>
              <label style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>Ano Fiscal *</label>
              <Controller name="fiscalYearId" control={control} render={({ field }) => (
                <select {...field} data-testid="select-fiscal-year" style={{ ...modalStyles.nativeSelect, borderColor: errors.fiscalYearId ? '#f43f5e' : 'var(--modal-border)' }}>
                  <option value="" style={{ background: '#1e293b' }}>Selecione...</option>
                  {fiscalYears.map(fy => (
                    <option key={fy.id} value={fy.id} style={{ background: '#1e293b' }}>{fy.year} ({fy.isClosed ? 'Fechado' : 'Aberto'})</option>
                  ))}
                </select>
              )} />
              {errors.fiscalYearId && <span style={{ fontSize: '11px', color: '#f43f5e', marginTop: '4px', display: 'block' }}>{errors.fiscalYearId.message}</span>}
              {fiscalYears.length === 0 && <span style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px', display: 'block' }}>⚠️ Não há anos fiscais cadastrados.</span>}
            </Box>

            <Box>
              <label style={{ fontSize: '12px', color: 'var(--modal-text-secondary)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>Descrição (Opcional)</label>
              <Controller name="description" control={control} render={({ field }) => (
                <textarea {...field} data-testid="input-budget-description" style={{ ...modalStyles.nativeInput, minHeight: '80px', resize: 'vertical' }} placeholder="Descreva o objetivo deste orçamento..." />
              )} />
            </Box>

            {/* OBZ Toggle */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, p: 2, background: 'rgba(37, 99, 235, 0.08)', borderRadius: '12px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
              <Controller name="isOBZ" control={control} render={({ field }) => (
                <Box
                  data-testid="toggle-obz"
                  onClick={() => field.onChange(!field.value)}
                  sx={{
                    width: 44, height: 24, borderRadius: '12px', cursor: 'pointer',
                    background: field.value ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' : 'rgba(255, 255, 255, 0.1)',
                    position: 'relative', transition: 'all 0.2s', flexShrink: 0, mt: '2px'
                  }}
                >
                  <Box sx={{
                    width: 18, height: 18, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 3,
                    left: field.value ? 23 : 3, transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }} />
                </Box>
              )} />
              <Box>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--modal-text-strong)' }}>Metodologia OBZ (Orçamento Base Zero)</Typography>
                <Typography sx={{ fontSize: '12px', color: 'var(--modal-text-secondary)', mt: 0.5 }}>
                  Cada linha do orçamento exigirá justificativa e classificação de prioridade (Essencial, Importante, Desejável)
                </Typography>
              </Box>
            </Box>
          </Box>
        </form>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid var(--modal-border)', gap: 2 }}>
        <Button onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { background: 'var(--modal-surface-hover)' } }}>Cancelar</Button>
        <Button type="submit" form="budgetForm" data-testid="btn-save-budget" startIcon={<Check />}
          sx={{
            padding: '10px 24px', borderRadius: '10px', fontWeight: 600, textTransform: 'none',
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white',
            '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)' }
          }}
        >{budget ? 'Salvar Alterações' : 'Criar Orçamento'}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default BudgetModal;
