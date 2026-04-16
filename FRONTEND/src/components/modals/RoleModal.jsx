import React, { useState, useEffect, useContext } from 'react';
import {
    TextField, Button, Box, Typography,
    Accordion, AccordionSummary, AccordionDetails, FormGroup, Switch
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import roleService from '../../services/role.service';
import { AuthContext } from '../../contexts/AuthContext';
import rbacMatrix from '../../../../rbac-matrix.json';
import StandardModal from '../common/StandardModal';

const ROLE_FORM_ID = 'role-form';

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
        <StandardModal
            open={open}
            onClose={onClose}
            title={editData ? 'Editar Perfil Funcional' : 'Novo Perfil de Governança'}
            subtitle="Matriz de permissões"
            icon="admin_panel_settings"
            size="wide"
            footer={
                <>
                    <Button type="button" onClick={onClose}>Cancelar</Button>
                    <Button
                        type="submit"
                        form={ROLE_FORM_ID}
                        variant="contained"
                        color="primary"
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Salvar Matriz de Permissões
                    </Button>
                </>
            }
        >
            <form id={ROLE_FORM_ID} onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 200 }}>
                            <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600, mb: 1 }}>
                                Nome do Perfil <span style={{ color: '#ef4444' }}>*</span>
                            </Typography>
                            <TextField
                                fullWidth
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Ex: Master Admin GRC"
                            />
                        </Box>
                        <Box sx={{ flex: 2, minWidth: 240 }}>
                            <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600, mb: 1 }}>
                                Descrição do Cargo / Responsabilidades
                            </Typography>
                            <TextField
                                fullWidth
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Descreva em que caso este perfil se aplica..."
                            />
                        </Box>
                    </Box>

                    <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span className="material-icons-round" style={{ fontSize: 18, color: '#38bdf8' }}>security</span>
                        Permissões Granulares (Privilégios Funcionais)
                    </Typography>

                    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                        {availableModuleKeys.map((modKey, idx) => {
                            const modData = rbacMatrix.modules[modKey];
                            return (
                                <Accordion key={modKey} disableGutters sx={{
                                    bgcolor: 'background.paper',
                                    boxShadow: 'none',
                                    borderBottom: idx === availableModuleKeys.length - 1 ? 'none' : 1,
                                    borderColor: 'divider',
                                    '&:before': { display: 'none' },
                                }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{modData.label}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ bgcolor: 'action.hover', p: 3 }}>
                                        <FormGroup sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                            {(modData.actions || []).map((perm) => {
                                                const isActive = isChecked(modKey, perm.key);
                                                return (
                                                    <Box key={perm.key} sx={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5,
                                                        borderRadius: 1,
                                                        border: 1,
                                                        borderColor: isActive ? 'rgba(56, 189, 248, 0.35)' : 'divider',
                                                        bgcolor: isActive ? 'rgba(56, 189, 248, 0.06)' : 'transparent',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        <Typography sx={{ fontSize: 14, fontWeight: isActive ? 600 : 400, color: isActive ? 'primary.light' : 'text.primary' }}>
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
                </Box>
            </form>
        </StandardModal>
    );
};

export default RoleModal;
