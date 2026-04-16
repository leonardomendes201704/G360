import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Box, Button, TextField, MenuItem } from '@mui/material';
import StandardModal from '../common/StandardModal';

const ASSET_CATEGORY_FORM_ID = 'asset-category-form';

const schema = yup.object({
  name: yup.string().required('Nome da categoria é obrigatório'),
  type: yup.string().required('Tipo é obrigatório'),
  depreciationYears: yup.number().nullable().transform((v, o) => o === '' ? null : v)
}).required();

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

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <StandardModal
      open={open}
      onClose={handleClose}
      title={category ? 'Editar categoria' : 'Nova categoria'}
      subtitle="Classificação de ativos"
      icon="category"
      size="form"
      footer={
        <>
          <Button type="button" onClick={handleClose}>Cancelar</Button>
          <Button
            type="submit"
            form={ASSET_CATEGORY_FORM_ID}
            variant="contained"
            color="primary"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <form id={ASSET_CATEGORY_FORM_ID} onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Controller name="name" control={control} render={({ field }) => (
            <TextField {...field} label="Nome da categoria" placeholder="Ex.: Notebooks" fullWidth
              error={!!errors.name} helperText={errors.name?.message} value={field.value ?? ''} required />
          )} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Controller name="type" control={control} render={({ field }) => (
              <TextField {...field} select label="Tipo" fullWidth
                SelectProps={{ MenuProps: { sx: { zIndex: 1400 } } }} value={field.value ?? ''}>
                <MenuItem value="HARDWARE">Hardware</MenuItem>
                <MenuItem value="SOFTWARE">Software</MenuItem>
              </TextField>
            )} />
            <Controller name="depreciationYears" control={control} render={({ field }) => (
              <TextField {...field} type="number" label="Depreciação (anos)" fullWidth value={field.value ?? ''} />
            )} />
          </Box>
        </Box>
      </form>
    </StandardModal>
  );
};

export default AssetCategoryModal;
