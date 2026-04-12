import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, MenuItem, Select, InputLabel, FormControl, Chip, Box, OutlinedInput, Alert,
    List, ListItem, ListItemIcon, ListItemText, FormControlLabel, Switch, Typography, Divider
} from '@mui/material';
import { Check, Close } from '@mui/icons-material';
import departmentService from '../../services/department.service';
import userService from '../../services/user.service';
import costCenterService from '../../services/cost-center.service';
import roleService from '../../services/role.service';
import notificationService from '../../services/notification.service';
// Política de senhas (espelho do backend)
const PASSWORD_POLICY = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
};
const validatePasswordPolicy = (password) => {
    if (!password) return { valid: false, checks: [] };
    const checks = [
        { rule: `Mínimo ${PASSWORD_POLICY.minLength} caracteres`, passed: password.length >= PASSWORD_POLICY.minLength },
        { rule: 'Letra maiúscula', passed: /[A-Z]/.test(password) },
        { rule: 'Letra minúscula', passed: /[a-z]/.test(password) },
        { rule: 'Número', passed: /[0-9]/.test(password) },
        { rule: 'Caractere especial (!@#$%...)', passed: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password) }
    ];
    return {
        valid: checks.every(c => c.passed),
        checks
    };
};
const UserModal = ({ open, onClose, onSuccess, editData, isProfileMode = false }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        currentPassword: '',
        password: '',
        confirmPassword: '',
        roleIds: [],
        costCenterId: '',
        authProvider: 'LOCAL'
    });
    const [roles, setRoles] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [passwordError, setPasswordError] = useState('');
    const [passwordValidation, setPasswordValidation] = useState({ valid: false, checks: [] });
    const [notifPrefs, setNotifPrefs] = useState({
        inApp: true,
        emailCritical: true,
        emailApprovals: true,
        emailProjects: true
    });
    // Determinar se o usuário é do Azure (tem azureId) ou usa authProvider != LOCAL
    const isAzureUser = !!editData?.azureId;
    const isExternalAuth = formData.authProvider !== 'LOCAL';
    useEffect(() => {
        const loadData = async () => {
            try {
                const rolesData = await roleService.getAll();
                setRoles(rolesData);
                const ccData = await costCenterService.getAll();
                setCostCenters(ccData);
            } catch (e) {
                console.error('Failed to load options', e);
            }
        };
        if (open && !isProfileMode) loadData();
    }, [open, isProfileMode]);
    useEffect(() => {
        if (editData) {
            setFormData({
                name: editData.name,
                email: editData.email,
                currentPassword: '',
                password: '',
                confirmPassword: '',
                roleIds: editData.roles ? editData.roles.map(r => r.id) : (editData.roleId ? [editData.roleId] : []),
                costCenterId: editData.costCenter?.id || editData.costCenterId || '',
                authProvider: editData.authProvider || 'LOCAL'
            });
        } else {
            setFormData({ name: '', email: '', currentPassword: '', password: '', confirmPassword: '', roleIds: [], costCenterId: '', authProvider: 'LOCAL' });
        }
        setPasswordError('');
        setPasswordValidation({ valid: false, checks: [] });
    }, [editData, open]);

    useEffect(() => {
        if (!open || !isProfileMode || !editData) return;
        const p = editData.notificationPreferences;
        if (p && typeof p === 'object') {
            setNotifPrefs({
                inApp: p.inApp !== false,
                emailCritical: p.emailCritical !== false,
                emailApprovals: p.emailApprovals !== false,
                emailProjects: p.emailProjects !== false
            });
        }
    }, [open, isProfileMode, editData]);
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        // Validar senhas ao digitar
        if (name === 'password') {
            // Validar política de senha
            setPasswordValidation(validatePasswordPolicy(value));
            // Validar correspondência se já tiver confirmação
            if (formData.confirmPassword && value !== formData.confirmPassword) {
                setPasswordError('As senhas não coincidem');
            } else {
                setPasswordError('');
            }
        } else if (name === 'confirmPassword') {
            if (value !== formData.password) {
                setPasswordError('As senhas não coincidem');
            } else {
                setPasswordError('');
            }
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Validação de senha para usuários locais
        if (!isExternalAuth && formData.password) {
            // Verificar política de senha
            const validation = validatePasswordPolicy(formData.password);
            if (!validation.valid) {
                setPasswordError('Senha não atende aos requisitos de segurança');
                return;
            }
            // Verificar correspondência
            if (formData.password !== formData.confirmPassword) {
                setPasswordError('As senhas não coincidem');
                return;
            }
            // Verificar senha atual no modo perfil
            if (isProfileMode && !formData.currentPassword) {
                setPasswordError('Por favor, informe a senha atual');
                return;
            }
        }
        try {
            const payload = { ...formData };
            // Handle empty strings
            if (!payload.costCenterId) payload.costCenterId = null;
            // Handle tenant logic
            const user = JSON.parse(localStorage.getItem('g360_user'));
            if (user && user.tenantId) {
                payload.tenantId = user.tenantId;
            }
            // Remove campos de confirmação antes de enviar
            delete payload.confirmPassword;
            // Se não tiver senha nova, remover campos de senha
            if (!payload.password) {
                delete payload.password;
                delete payload.currentPassword;
            }
            if (isProfileMode) {
                await notificationService.patchPreferences(notifPrefs);
            }
            if (editData) {
                await userService.update(editData.id, payload);
            } else {
                await userService.create(payload);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar: ' + (error.response?.data?.error || error.message));
        }
    };
    const ITEM_HEIGHT = 48;
    const ITEM_PADDING_TOP = 8;
    const MenuProps = {
        PaperProps: {
            style: {
                maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
                width: 250,
            },
        },
    };
    const inputSx = {
        '& .MuiOutlinedInput-root': {
            background: 'var(--modal-surface)',
            borderRadius: '10px',
            minHeight: 48,
            '& fieldset': { borderColor: 'var(--modal-border-strong)' },
            '&:hover fieldset': { borderColor: 'var(--modal-border-strong)' },
            '&.Mui-focused fieldset': {
                borderColor: '#2563eb',
                boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
            }
        },
        '& .MuiInputLabel-root': { color: 'var(--modal-text-secondary)' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#2563eb' },
        '& .MuiInputBase-input': {
            color: 'var(--modal-text)',
            padding: '12px 14px',
            height: 'auto',
            display: 'flex',
            alignItems: 'center'
        },
        '& .MuiSelect-select': {
            padding: '12px 14px',
            minHeight: 'unset',
            display: 'flex',
            alignItems: 'center'
        },
        '& .MuiFormHelperText-root': { color: 'var(--modal-text-muted)', marginLeft: 0 }
    };
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 600, color: 'var(--modal-text)' }}>{isProfileMode ? 'Meu Perfil' : (editData ? 'Editar Usuário' : 'Novo Usuário Local')}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            sx={inputSx}
                            label="Nome Completo"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                        <TextField
                            fullWidth
                            variant="outlined"
                            sx={inputSx}
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={isProfileMode}
                        />
                        {/* Tipo de Autenticação - Apenas no modo admin (não perfil) */}
                        {!isProfileMode && (
                            <TextField
                                select
                                fullWidth
                                variant="outlined"
                                sx={inputSx}
                                label="Tipo de Autenticação"
                                name="authProvider"
                                value={formData.authProvider}
                                onChange={handleChange}
                                helperText={
                                    formData.authProvider === 'LDAP'
                                        ? 'Usuário autenticará via Active Directory local'
                                        : formData.authProvider === 'AZURE'
                                            ? 'Usuário autenticará via Microsoft (SSO)'
                                            : 'Senha armazenada no sistema'
                                }
                            >
                                <MenuItem value="LOCAL">Senha Local</MenuItem>
                                <MenuItem value="LDAP">Active Directory (LDAP)</MenuItem>
                                <MenuItem value="AZURE">Microsoft Azure AD</MenuItem>
                            </TextField>
                        )}
                        {/* Campos de senha - Apenas para usuários locais */}
                        {!isExternalAuth && (
                            <>
                                {isProfileMode && editData && (
                                    <TextField
                                        fullWidth
                                        variant="outlined"
                                        sx={inputSx}
                                        label="Senha Atual"
                                        name="currentPassword"
                                        type="password"
                                        value={formData.currentPassword}
                                        onChange={handleChange}
                                        helperText="Necessário para alterar a senha"
                                    />
                                )}
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    sx={inputSx}
                                    label={editData ? "Nova Senha (deixe em branco para manter)" : "Senha"}
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required={!editData}
                                />
                                {(isProfileMode || formData.password) && (
                                    <TextField
                                        fullWidth
                                        variant="outlined"
                                        sx={inputSx}
                                        label="Confirmar Nova Senha"
                                        name="confirmPassword"
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        error={!!passwordError}
                                        helperText={passwordError}
                                    />
                                )}
                                {/* Checklist visual de requisitos de senha */}
                                {formData.password && passwordValidation.checks.length > 0 && (
                                    <Box sx={{
                                        p: 1.5,
                                        bgcolor: 'var(--modal-surface-subtle)',
                                        borderRadius: '10px',
                                        border: '1px solid',
                                        borderColor: passwordValidation.valid ? 'success.main' : 'var(--modal-border)'
                                    }}>
                                        <InputLabel sx={{ fontSize: '12px', mb: 1 }}>
                                            Requisitos de Segurança
                                        </InputLabel>
                                        {passwordValidation.checks.map((check, idx) => (
                                            <Box
                                                key={idx}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                    py: 0.25
                                                }}
                                            >
                                                {check.passed ? (
                                                    <Check sx={{ fontSize: 16, color: 'success.main' }} />
                                                ) : (
                                                    <Close sx={{ fontSize: 16, color: 'text.disabled' }} />
                                                )}
                                                <Box sx={{
                                                    fontSize: '12px',
                                                    color: check.passed ? 'success.main' : 'text.secondary'
                                                }}>
                                                    {check.rule}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </>
                        )}
                        {/* Alerta para usuários Azure */}
                        {isProfileMode && isAzureUser && (
                            <Alert severity="info">
                                Sua conta é gerenciada pelo Azure AD. Para alterar sua senha, utilize o portal da sua organização.
                            </Alert>
                        )}
                        {isProfileMode && (
                            <Box sx={{ mt: 1 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: 'var(--modal-text-secondary)' }}>
                                    Notificações
                                </Typography>
                                <Divider sx={{ mb: 1.5 }} />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={notifPrefs.inApp}
                                            onChange={(e) => setNotifPrefs((s) => ({ ...s, inApp: e.target.checked }))}
                                        />
                                    }
                                    label="Alertas dentro da aplicação"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={notifPrefs.emailCritical}
                                            onChange={(e) => setNotifPrefs((s) => ({ ...s, emailCritical: e.target.checked }))}
                                        />
                                    }
                                    label="E-mail: SLA e alertas críticos"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={notifPrefs.emailApprovals}
                                            onChange={(e) => setNotifPrefs((s) => ({ ...s, emailApprovals: e.target.checked }))}
                                        />
                                    }
                                    label="E-mail: aprovações e finanças"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={notifPrefs.emailProjects}
                                            onChange={(e) => setNotifPrefs((s) => ({ ...s, emailProjects: e.target.checked }))}
                                        />
                                    }
                                    label="E-mail: projetos e GMUD"
                                />
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                    Horário silencioso e categorias avançadas podem ser configurados via API (notificationPreferences).
                                </Typography>
                            </Box>
                        )}
                        {/* Perfis de acesso (somente leitura no modo perfil) */}
                        {isProfileMode && editData?.roles && editData.roles.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <InputLabel sx={{
                                    fontSize: '12px',
                                    color: 'var(--modal-text-secondary)',
                                    mb: 1.5,
                                    position: 'relative',
                                    transform: 'none',
                                    lineHeight: 1.5
                                }}>
                                    Perfis de Acesso
                                </InputLabel>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {editData.roles.map((role) => (
                                        <Chip
                                            key={role.id}
                                            label={role.name}
                                            color="primary"
                                            variant="outlined"
                                            size="small"
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}
                        {!isProfileMode && (
                            <FormControl fullWidth>
                                <InputLabel sx={{ color: 'var(--modal-text-secondary)' }}>Perfis de Acesso</InputLabel>
                                <Select
                                    multiple
                                    name="roleIds"
                                    value={formData.roleIds}
                                    onChange={handleChange}
                                    input={<OutlinedInput label="Perfis de Acesso" />}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map((value) => {
                                                const role = roles.find(r => r.id === value);
                                                return <Chip key={value} label={role ? role.name : value} size="small" />;
                                            })}
                                        </Box>
                                    )}
                                    MenuProps={MenuProps}
                                    sx={inputSx}
                                >
                                    {roles.map((role) => (
                                        <MenuItem key={role.id} value={role.id}>
                                            {role.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        {!isProfileMode && (
                            <TextField
                                select
                                fullWidth
                                variant="outlined"
                                sx={inputSx}
                                label="Centro de Custo"
                                name="costCenterId"
                                value={formData.costCenterId || ''}
                                onChange={handleChange}
                            >
                                <MenuItem value=""><em>Nenhum</em></MenuItem>
                                {costCenters.map(cc => (
                                    <MenuItem key={cc.id} value={cc.id}>{cc.name} ({cc.code})</MenuItem>
                                ))}
                            </TextField>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, pt: 1.5 }}>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="contained" color="primary" disabled={!!passwordError}>
                        Salvar
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
export default UserModal;
