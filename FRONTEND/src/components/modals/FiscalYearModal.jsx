import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button, TextField, Typography, FormControlLabel, Switch, Box } from '@mui/material';
import StandardModal from '../common/StandardModal';

const FISCAL_YEAR_FORM_ID = 'fiscal-year-form';

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

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <StandardModal
      open={open}
      onClose={handleClose}
      title={fiscalYear ? 'Editar Ano Fiscal' : 'Novo Ano Fiscal'}
      subtitle="Período contábil"
      icon="calendar_today"
      size="form"
      footer={
        <>
          <Button type="button" onClick={handleClose}>Cancelar</Button>
          <Button
            type="submit"
            form={FISCAL_YEAR_FORM_ID}
            variant="contained"
            color="primary"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <form id={FISCAL_YEAR_FORM_ID} onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                  required
                />
              )}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Início"
                  type="date"
                  fullWidth
                  sx={{ flex: 1, minWidth: 140 }}
                  error={!!errors.startDate}
                  helperText={errors.startDate?.message}
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
                  sx={{ flex: 1, minWidth: 140 }}
                  error={!!errors.endDate}
                  helperText={errors.endDate?.message}
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
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    {value ? 'Fechado (Apenas Leitura)' : 'Aberto (Permite Lançamentos)'}
                  </Typography>
                }
              />
            )}
          />
        </Box>
      </form>
    </StandardModal>
  );
};

export default FiscalYearModal;
