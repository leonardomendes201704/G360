import { useState, useEffect } from 'react';
import {
    TextField, Button, Box, Typography,
    FormControl, InputLabel, Select, MenuItem,
    Avatar, CircularProgress
} from '@mui/material';
import { getReferenceUsers } from '../../services/reference.service';
import StandardModal from '../common/StandardModal';

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
        <StandardModal
            open={open}
            onClose={handleClose}
            title="Adicionar membro ao projeto"
            subtitle="Usuário e função na equipe"
            icon="person_add"
            size="form"
            loading={loading}
            footer={
                <>
                    <Button type="button" onClick={handleClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        variant="contained"
                        color="primary"
                        disabled={loading || loadingUsers}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {loading ? 'Adicionando…' : 'Adicionar membro'}
                    </Button>
                </>
            }
        >
            {loadingUsers ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <FormControl fullWidth error={!!errors.userId}>
                        <InputLabel>Usuário</InputLabel>
                        <Select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            label="Usuário"
                            disabled={loading}
                        >
                            {availableUsers.length === 0 ? (
                                <MenuItem disabled>Nenhum usuário disponível</MenuItem>
                            ) : (
                                availableUsers.map((user) => (
                                    <MenuItem key={user.id} value={user.id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                                                {user.name?.charAt(0)}
                                            </Avatar>
                                            <Box>
                                                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                                                    {user.name}
                                                </Typography>
                                                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
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

                    <FormControl fullWidth error={!!errors.role}>
                        <InputLabel>Função no projeto</InputLabel>
                        <Select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            label="Função no projeto"
                            disabled={loading}
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

                    <Box sx={{
                        background: 'rgba(14, 165, 233, 0.08)',
                        borderRadius: 2,
                        p: 2,
                        border: '1px solid rgba(14, 165, 233, 0.2)'
                    }}>
                        <Typography sx={{ fontSize: 13, color: 'info.main' }}>
                            Depois de adicionar o membro, você pode criar ou editar equipes para organizá-los.
                        </Typography>
                    </Box>
                </Box>
            )}
        </StandardModal>
    );
};

export default AddMemberModal;
