import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Checkbox, FormControlLabel, Box, Autocomplete, CircularProgress, Typography, IconButton } from '@mui/material';
import costCenterService from '../../services/cost-center.service';
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
  '& input': { color: 'var(--modal-text)' }
};

const CostCenterModal = ({ open, onClose, onSuccess, editData }) => {
  const [formData, setFormData] = useState({ code: '', name: '', isActive: true, departmentId: null, managerId: null });
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadDependencies();
      if (editData) {
        setFormData({ code: editData.code, name: editData.name, isActive: editData.isActive, departmentId: editData.department?.id || editData.departmentId || null, managerId: editData.manager?.id || editData.managerId || null });
      } else {
        setFormData({ code: '', name: '', isActive: true, departmentId: null, managerId: null });
      }
    }
  }, [open, editData]);

  const loadDependencies = async () => {
    try {
      const [deps, usrs] = await Promise.all([departmentService.getAll(), userService.getAll()]);
      setDepartments(deps);
      setUsers(usrs);
    } catch (error) { console.error("Erro ao carregar dependências", error); }
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editData) { await costCenterService.update(editData.id, formData); }
      else { await costCenterService.create(formData); }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar centro de custo", error);
      alert('Erro ao salvar. Verifique se o código já existe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" sx={darkDialogStyle}>
      <DialogTitle sx={{ borderBottom: '1px solid var(--modal-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-icons-round" style={{ color: '#10b981', fontSize: '20px' }}>account_balance</span>
          </Box>
          <Typography sx={{ fontSize: '20px', fontWeight: 600, color: 'var(--modal-text)' }}>{editData ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</Typography>
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
                Código <span style={{ color: '#ef4444' }}>*</span>
              </Typography>
              <TextField name="code" value={formData.code} onChange={handleChange} required fullWidth sx={darkInputStyle} placeholder="Ex: CC-001" />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)', fontWeight: 500, mb: 1 }}>
                Nome <span style={{ color: '#ef4444' }}>*</span>
              </Typography>
              <TextField name="name" value={formData.name} onChange={handleChange} required fullWidth sx={darkInputStyle} placeholder="Ex: Infraestrutura TI" />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)', fontWeight: 500, mb: 1 }}>
                Diretoria Vinculada
              </Typography>
              <Autocomplete
                options={departments}
                getOptionLabel={(option) => option.name || ''}
                value={departments.find(d => d.id === formData.departmentId) || null}
                onChange={(_, newValue) => { setFormData(prev => ({ ...prev, departmentId: newValue ? newValue.id : null })); }}
                renderInput={(params) => <TextField {...params} sx={darkInputStyle} placeholder="Selecione..." />}
                sx={{ '& .MuiAutocomplete-popupIndicator': { color: 'var(--modal-text-muted)' } }}
                PaperComponent={({ children }) => <Box sx={{ background: 'var(--modal-surface)', border: '1px solid var(--modal-border)', borderRadius: '12px', mt: 0.5 }}>{children}</Box>}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)', fontWeight: 500, mb: 1 }}>
                Gestor Responsável
              </Typography>
              <Autocomplete
                options={users}
                getOptionLabel={(option) => option.name || ''}
                value={users.find(u => u.id === formData.managerId) || null}
                onChange={(_, newValue) => { setFormData(prev => ({ ...prev, managerId: newValue ? newValue.id : null })); }}
                renderInput={(params) => <TextField {...params} sx={darkInputStyle} placeholder="Selecione..." />}
                sx={{ '& .MuiAutocomplete-popupIndicator': { color: 'var(--modal-text-muted)' } }}
                PaperComponent={({ children }) => <Box sx={{ background: 'var(--modal-surface)', border: '1px solid var(--modal-border)', borderRadius: '12px', mt: 0.5 }}>{children}</Box>}
              />
            </Box>

            <FormControlLabel
              control={<Checkbox checked={formData.isActive} onChange={handleChange} name="isActive" sx={{ color: 'var(--modal-text-muted)', '&.Mui-checked': { color: '#10b981' } }} />}
              label={<Typography sx={{ color: 'var(--modal-text-secondary)' }}>Centro de Custo Ativo</Typography>}
            />
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

export default CostCenterModal;


