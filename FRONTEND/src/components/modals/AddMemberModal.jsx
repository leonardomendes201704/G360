import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Avatar,
    CircularProgress
} from '@mui/material';
import { Close, PersonAdd } from '@mui/icons-material';
import { getReferenceUsers } from '../../services/reference.service';

const ROLES = [
    { value: 'TECH_LEAD', label: 'Tech Lead' },
    { value: 'MANAGER', label: 'Gerente' },
    { value: 'DEVELOPER', label: 'Desenvolvedor' },
    { value: 'DESIGNER', label: 'Designer' },
    { value: 'QA', label: 'Analista QA' },
    { value: 'ANALYST', label: 'Analista' },
    { value: 'MEMBER', label: 'Membro' }
];

const AddMemberModal = ({ open, onClose, onSave, existingMemberIds = [], loading = false }) => {
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRole, setSelectedRole] = useState('MEMBER');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open) {
            fetchUsers();
            setSelectedUserId('');
            setSelectedRole('MEMBER');
            setErrors({});
        }
    }, [open]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const data = await getReferenceUsers();
            setUsers(data || []);
        } catch (e) {
            console.error('Error fetching users:', e);
            setUsers([]);
        } finally {
            setLoadingUsers(false);
        }
    };

    // Filtrar usuários que já são membros do projeto
    const availableUsers = users.filter(u => !existingMemberIds.includes(u.id));

    const validate = () => {
        const newErrors = {};
        if (!selectedUserId) {
            newErrors.userId = 'Selecione um usuário';
        }
        if (!selectedRole) {
            newErrors.role = 'Selecione uma função';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        onSave({ userId: selectedUserId, role: selectedRole });
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    background: 'var(--modal-gradient)',
                    border: '1px solid var(--modal-border)',
                }
            }}
        >
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--modal-border)',
                pb: 2
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <PersonAdd sx={{ color: '#10b981' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Adicionar Membro ao Projeto
                    </Typography>
                </Box>
                <IconButton onClick={handleClose} disabled={loading} size="small">
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ mt: 2 }}>
                {loadingUsers ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={32} />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {/* User Selection */}
                        <FormControl fullWidth error={!!errors.userId}>
                            <InputLabel>Usuário</InputLabel>
                            <Select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                label="Usuário"
                                disabled={loading}
                                sx={{
                                    background: 'var(--modal-surface)',
                                    '& fieldset': { borderColor: 'var(--modal-border)' },
                                    '&:hover fieldset': { borderColor: 'var(--modal-border-strong)' },
                                }}
                            >
                                {availableUsers.length === 0 ? (
                                    <MenuItem disabled>Nenhum usuário disponível</MenuItem>
                                ) : (
                                    availableUsers.map((user) => (
                                        <MenuItem key={user.id} value={user.id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: '#0ea5e9', fontSize: 14 }}>
                                                    {user.name?.charAt(0)}
                                                </Avatar>
                                                <Box>
                                                    <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                                                        {user.name}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 12, color: 'var(--modal-text-muted)' }}>
                                                        {user.email}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </MenuItem>
                                    ))
                                )}
                            </Select>
                            {errors.userId && (
                                <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, ml: 1.5 }}>
                                    {errors.userId}
                                </Typography>
                            )}
                        </FormControl>

                        {/* Role Selection */}
                        <FormControl fullWidth error={!!errors.role}>
                            <InputLabel>Função no Projeto</InputLabel>
                            <Select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                label="Função no Projeto"
                                disabled={loading}
                                sx={{
                                    background: 'var(--modal-surface)',
                                    '& fieldset': { borderColor: 'var(--modal-border)' },
                                    '&:hover fieldset': { borderColor: 'var(--modal-border-strong)' },
                                }}
                            >
                                {ROLES.map((role) => (
                                    <MenuItem key={role.value} value={role.value}>
                                        {role.label}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.role && (
                                <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, ml: 1.5 }}>
                                    {errors.role}
                                </Typography>
                            )}
                        </FormControl>

                        {/* Info */}
                        <Box sx={{
                            background: 'rgba(14, 165, 233, 0.1)',
                            borderRadius: 2,
                            p: 2,
                            border: '1px solid rgba(14, 165, 233, 0.2)'
                        }}>
                            <Typography sx={{ fontSize: 13, color: '#0ea5e9' }}>
                                💡 Após adicionar o membro, você pode criar ou editar equipes para organizá-los.
                            </Typography>
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{
                px: 3,
                py: 2,
                borderTop: '1px solid var(--modal-border)',
                gap: 1
            }}>
                <Button
                    onClick={handleClose}
                    disabled={loading}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        color: 'var(--modal-text-secondary)'
                    }}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || loadingUsers}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #059669, #0284c7)',
                        }
                    }}
                >
                    {loading ? 'Adicionando...' : 'Adicionar Membro'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddMemberModal;


