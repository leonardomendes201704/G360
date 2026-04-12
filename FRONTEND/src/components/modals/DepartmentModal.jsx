import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Autocomplete, Box, CircularProgress, Typography, IconButton } from '@mui/material';
import departmentService from '../../services/department.service';
import userService from '../../services/user.service';

// Dark theme styles
const darkDialogStyle = {
  '& .MuiDialog-paper': {
    background: 'var(--modal-gradient)',
    border: '1px solid var(--modal-border)',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)'
  }
};

const darkInputStyle = {
  '& .MuiOutlinedInput-root': {
    background: 'var(--modal-surface)',
    color: 'var(--modal-text)',
    borderRadius: '12px',
    '& fieldset': { borderColor: 'var(--modal-border)' },
    '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.3)' },
    '&.Mui-focused fieldset': { borderColor: '#2563eb' }
  },
  '& .MuiInputLabel-root': { color: 'var(--modal-text-muted)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#2563eb' },
  '& input': { color: 'var(--modal-text)' },
  '& .MuiFormHelperText-root': { color: 'var(--modal-text-muted)' }
};

const DepartmentModal = ({ open, onClose, onSuccess, editData }) => {
  const [formData, setFormData] = useState({ name: '', code: '', budget: '', directorId: null });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadUsers();
      if (editData) {
        setFormData({ name: editData.name, code: editData.code, budget: editData.budget || '', directorId: editData.director?.id || editData.directorId || null });
      } else {
        setFormData({ name: '', code: '', budget: '', directorId: null });
      }
    }
  }, [open, editData]);

  const loadUsers = async () => {
    try { const data = await userService.getAll(); setUsers(data); }
    catch (error) { console.error("Erro ao carregar usuários", error); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData, budget: formData.budget ? Number(formData.budget) : null };
      if (editData) { await departmentService.update(editData.id, payload); }
      else { await departmentService.create(payload); }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar departamento", error);
      alert('Erro ao salvar departamento. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" sx={darkDialogStyle}>
      <DialogTitle sx={{ borderBottom: '1px solid var(--modal-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-icons-round" style={{ color: '#2563eb', fontSize: '20px' }}>corporate_fare</span>
          </Box>
          <Typography sx={{ fontSize: '20px', fontWeight: 600, color: 'var(--modal-text)' }}>{editData ? 'Editar Diretoria' : 'Nova Diretoria'}</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' } }}>
          <span className="material-icons-round">close</span>
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
          <Box display="flex" flexDirection="column" gap={2.5}>
            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)', fontWeight: 500, mb: 1 }}>
                Nome da Diretoria <span style={{ color: '#ef4444' }}>*</span>
              </Typography>
              <TextField name="name" value={formData.name} onChange={handleChange} required fullWidth sx={darkInputStyle} placeholder="Ex: Tecnologia da Informação" />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)', fontWeight: 500, mb: 1 }}>
                Código (Sigla) <span style={{ color: '#ef4444' }}>*</span>
              </Typography>
              <TextField name="code" value={formData.code} onChange={handleChange} required fullWidth sx={darkInputStyle} placeholder="Ex: TI" />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)', fontWeight: 500, mb: 1 }}>
                Diretor Responsável
              </Typography>
              <Autocomplete
                options={users}
                getOptionLabel={(option) => option.name || ''}
                value={users.find(u => u.id === formData.directorId) || null}
                onChange={(_, newValue) => { setFormData(prev => ({ ...prev, directorId: newValue ? newValue.id : null })); }}
                renderInput={(params) => <TextField {...params} sx={darkInputStyle} placeholder="Selecione..." />}
                sx={{ '& .MuiAutocomplete-popupIndicator': { color: 'var(--modal-text-muted)' }, '& .MuiAutocomplete-clearIndicator': { color: 'var(--modal-text-muted)' } }}
                PaperComponent={({ children }) => <Box sx={{ background: 'var(--modal-surface)', border: '1px solid var(--modal-border)', borderRadius: '12px', mt: 0.5 }}>{children}</Box>}
              />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)', fontWeight: 500, mb: 1 }}>
                Teto Orçamental (Anual)
              </Typography>
              <TextField name="budget" type="number" value={formData.budget} onChange={handleChange} fullWidth sx={darkInputStyle} />
              <Typography sx={{ fontSize: '11px', color: 'var(--modal-text-muted)', mt: 0.5 }}>Opcional. Use para relatórios de previsto vs realizado.</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--modal-border)', p: 3, gap: 1.5 }}>
          <Button onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', padding: '10px 20px', borderRadius: '10px', '&:hover': { background: 'var(--modal-surface-hover)' } }}>Cancelar</Button>
          <Button type="submit" disabled={loading} sx={{
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'var(--modal-text)',
            padding: '10px 24px', borderRadius: '10px', fontWeight: 600, minWidth: 100,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            '&:hover': { boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' },
            '&:disabled': { opacity: 0.6 }
          }}>
            {loading ? <CircularProgress size={20} sx={{ color: 'var(--modal-text)' }} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default DepartmentModal;


