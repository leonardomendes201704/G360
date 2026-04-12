import React, { useState, useEffect, useContext } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, Typography, Divider, IconButton,
    Accordion, AccordionSummary, AccordionDetails, FormGroup, FormControlLabel, Switch
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import roleService from '../../services/role.service';
import { AuthContext } from '../../contexts/AuthContext';
import rbacMatrix from '../../../../rbac-matrix.json';

const darkDialogStyle = {
    '& .MuiDialog-paper': {
        background: 'var(--modal-gradient)',
        border: '1px solid var(--modal-border)',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
        backgroundImage: 'none',
        // Permite rolar só o miolo: título + ações fixos, lista de permissões com scroll
        maxHeight: 'min(90vh, 880px)',
        display: 'flex',
        flexDirection: 'column',
    }
};

const darkInputStyle = {
    '& .MuiOutlinedInput-root': {
        background: 'var(--modal-surface)',
        color: 'var(--modal-text)',
        borderRadius: '10px',
        '& fieldset': { borderColor: 'var(--modal-border)' },
        '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.3)' },
        '&.Mui-focused fieldset': { borderColor: '#2563eb' }
    },
    '& .MuiInputLabel-root': { color: 'var(--modal-text-muted)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#2563eb' },
    '& input, & textarea': { color: 'var(--modal-text)' },
    '& .MuiFormHelperText-root': { color: 'var(--modal-text-muted)' }
};

/** Transversais à licença por módulo de negócio (API exige permissão explícita). */
const ALWAYS_LICENSED_MODULES = ['NOTIFICATIONS', 'UPLOAD'];

/** Licença de módulo do tenant (enabledModules) + legado KNOWLEDGE_BASE → KB */
function isModuleLicensed(modKey, enabledModules) {
    if (ALWAYS_LICENSED_MODULES.includes(modKey)) return true;
    if (!enabledModules || enabledModules.length === 0) return true;
    if (enabledModules.includes(modKey)) return true;
    if (modKey === 'KB' && enabledModules.includes('KNOWLEDGE_BASE')) return true;
    return false;
}

const RoleModal = ({ open, onClose, onSuccess, editData }) => {
    const { user } = useContext(AuthContext);
    const enabledModules = user?.enabledModules || [];
    const roleNames = user?.roles?.map((r) => r.name) || (user?.role ? [user.role] : []);
    const isPlatformMaster = roleNames.includes('Super Admin') && user?.schema === 'public';

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: [] // Array of { module, action }
    });

    useEffect(() => {
        if (editData) {
            setFormData({
                name: editData.name,
                description: editData.description || '',
                permissions: editData.permissions || []
            });
        } else {
            setFormData({ name: '', description: '', permissions: [] });
        }
    }, [editData, open]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePermissionChange = (moduleKey, actionKey, checked) => {
        let newPermissions = [...formData.permissions];
        if (checked) {
            if (!newPermissions.find(p => p.module === moduleKey && p.action === actionKey)) {
                newPermissions.push({ module: moduleKey, action: actionKey });
            }
        } else {
            newPermissions = newPermissions.filter(p => !(p.module === moduleKey && p.action === actionKey));
        }
        setFormData({ ...formData, permissions: newPermissions });
    };

    const isChecked = (moduleKey, actionKey) => {
        return !!formData.permissions.find(p => p.module === moduleKey && p.action === actionKey);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editData) {
                await roleService.update(editData.id, formData);
            } else {
                await roleService.create(formData);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar perfil: ' + (error.response?.data?.error || error.message));
        }
    };

    const availableModuleKeys = Object.keys(rbacMatrix.modules).filter((modKey) => {
        if (modKey === 'SUPER_ADMIN' && !isPlatformMaster) return false;
        return isModuleLicensed(modKey, enabledModules);
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth sx={darkDialogStyle}>
            <DialogTitle sx={{ flexShrink: 0, borderBottom: '1px solid var(--modal-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-icons-round" style={{ color: '#2563eb', fontSize: '20px' }}>admin_panel_settings</span>
                    </Box>
                    <Typography sx={{ fontSize: '20px', fontWeight: 600, color: 'var(--modal-text)' }}>
                        {editData ? 'Editar Perfil Funcional' : 'Novo Perfil de Governança'}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' } }}>
                    <span className="material-icons-round">close</span>
                </IconButton>
            </DialogTitle>
            <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
            >
                <DialogContent
                    sx={{
                        p: 3,
                        flex: '1 1 auto',
                        minHeight: 0,
                        overflowY: 'auto',
                        // Garante scrollbar visível quando necessário (WebKit)
                        '&::-webkit-scrollbar': { width: 8 },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: 'rgba(148, 163, 184, 0.35)',
                            borderRadius: 4,
                        },
                    }}
                >
                    <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)', fontWeight: 600, mb: 1 }}>
                                Nome do Perfil <span style={{ color: '#ef4444' }}>*</span>
                            </Typography>
                            <TextField
                                fullWidth
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                sx={darkInputStyle}
                                placeholder="Ex: Master Admin GRC"
                            />
                        </Box>
                        <Box sx={{ flex: 2 }}>
                            <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)', fontWeight: 600, mb: 1 }}>
                                Descrição do Cargo / Responsabilidades
                            </Typography>
                            <TextField
                                fullWidth
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                sx={darkInputStyle}
                                placeholder="Descreva em que caso este perfil se aplica..."
                            />
                        </Box>
                    </Box>

                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--modal-text)', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span className="material-icons-round" style={{ fontSize: '18px', color: '#38bdf8' }}>security</span>
                        Permissões Granulares (Privilégios Funcionais)
                    </Typography>
                    
                    <Box sx={{ border: '1px solid var(--modal-border)', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                        {availableModuleKeys.map((modKey, idx) => {
                            const modData = rbacMatrix.modules[modKey];
                            return (
                                <Accordion key={modKey} disableGutters sx={{ 
                                    bgcolor: 'transparent', 
                                    color: 'var(--modal-text)',
                                    boxShadow: 'none',
                                    borderBottom: idx === availableModuleKeys.length - 1 ? 'none' : '1px solid var(--modal-border)',
                                    '&:before': { display: 'none' },
                                }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'var(--modal-text-secondary)' }} />} sx={{ bgcolor: 'var(--modal-surface)', '&:hover': { bgcolor: 'var(--modal-surface-hover)' } }}>
                                        <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>{modData.label}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ bgcolor: 'rgba(15, 23, 42, 0.3)', p: 3 }}>
                                        <FormGroup sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                            {(modData.actions || []).map((perm) => {
                                                const isActive = isChecked(modKey, perm.key);
                                                return (
                                                    <Box key={perm.key} sx={{ 
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, 
                                                        borderRadius: '8px', border: `1px solid ${isActive ? 'rgba(56, 189, 248, 0.3)' : 'var(--modal-border)'}`,
                                                        bgcolor: isActive ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        <Typography sx={{ fontSize: '14px', fontWeight: isActive ? 600 : 400, color: isActive ? '#38bdf8' : 'var(--modal-text)' }}>
                                                            {perm.label}
                                                        </Typography>
                                                        <Switch 
                                                            size="small"
                                                            checked={isActive} 
                                                            onChange={(e) => handlePermissionChange(modKey, perm.key, e.target.checked)} 
                                                            sx={{
                                                                '& .MuiSwitch-switchBase.Mui-checked': { color: '#38bdf8' },
                                                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#38bdf8' }
                                                            }}
                                                        />
                                                    </Box>
                                                );
                                            })}
                                        </FormGroup>
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ flexShrink: 0, borderTop: '1px solid var(--modal-border)', p: 3, gap: 1.5, bgcolor: 'var(--modal-surface)' }}>
                    <Button onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', fontWeight: 600, '&:hover': { background: 'var(--modal-surface-hover)' } }}>Cancelar</Button>
                    <Button type="submit" variant="contained" sx={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#fff', px: 4, py: 1, borderRadius: '8px', fontWeight: 700,
                        textTransform: 'none', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                        '&:hover': { background: 'linear-gradient(135deg, #0369a1 0%, #075985 100%)', boxShadow: '0 6px 16px rgba(2, 132, 199, 0.4)' }
                    }}>
                        Salvar Matriz de Permissões
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default RoleModal;
