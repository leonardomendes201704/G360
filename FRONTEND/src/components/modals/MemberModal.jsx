import { useState, useEffect } from 'react';
import {
    Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    IconButton, Typography, TextField, MenuItem
} from '@mui/material';
import { Close, GroupAdd, Check } from '@mui/icons-material';
import userService from '../../services/user.service';

const modalStyles = {
    backdrop: { backdropFilter: 'blur(8px)', backgroundColor: 'var(--modal-backdrop, rgba(0, 0, 0, 0.7))' },
    paper: {
        borderRadius: '16px',
        background: 'var(--modal-gradient)',
        border: '1px solid var(--modal-border)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: 'var(--modal-text)',
        maxWidth: '540px', width: '100%', m: 2
    },
    title: {
        borderBottom: '1px solid var(--modal-border)',
        padding: '24px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    input: {
        '& .MuiOutlinedInput-root': {
            background: 'var(--modal-surface-subtle)', color: 'var(--modal-text-soft)', borderRadius: '10px',
            '& fieldset': { borderColor: 'var(--modal-border)' },
            '&:hover fieldset': { borderColor: 'rgba(59, 130, 246, 0.3)' },
            '&.Mui-focused fieldset': { borderColor: '#3b82f6' }
        },
        '& .MuiInputLabel-root': { color: 'var(--modal-text-secondary)' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
        '& .MuiInputBase-input': { color: 'var(--modal-text-soft)' },
        '& .MuiSelect-icon': { color: 'var(--modal-text-secondary)' }
    }
};

const roleOptions = [
    { value: 'MANAGER', label: '👨‍💼 Gerente de Projeto' },
    { value: 'TECH_LEAD', label: '🔧 Tech Lead' },
    { value: 'DEVELOPER', label: '👨‍💻 Desenvolvedor' },
    { value: 'ANALYST', label: '📊 Analista' },
    { value: 'TESTER', label: '🧪 QA / Tester' },
    { value: 'STAKEHOLDER', label: '👁️ Observador' },
    { value: 'MEMBER', label: '👤 Membro' },
    { value: 'DESIGNER', label: '🎨 Designer' },
    { value: 'QA', label: '🔍 Analista QA' }
];

const MemberModal = ({ open, onClose, onSave, loading, memberToEdit = null, readOnly = false }) => {
    const [users, setUsers] = useState([]);
    const [userId, setUserId] = useState('');
    const [role, setRole] = useState('DEVELOPER');

    useEffect(() => {
        if (open) {
            userService.getAll().then(setUsers).catch(console.error);
            if (memberToEdit) {
                setUserId(memberToEdit.user.id);
                setRole(memberToEdit.role?.split('|')[0].split(' - ')[0] || memberToEdit.role);
            } else {
                setUserId('');
                setRole('DEVELOPER');
            }
        }
    }, [open, memberToEdit]);

    const isEditing = !!memberToEdit;
    const selectedUser = users.find(u => u.id === userId);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{ sx: modalStyles.paper }}
            BackdropProps={{ sx: modalStyles.backdrop }}
        >
            <DialogTitle sx={modalStyles.title}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 44, height: 44, borderRadius: '12px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <GroupAdd sx={{ color: '#3b82f6', fontSize: 24 }} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'var(--modal-text-strong)' }}>
                            {readOnly ? 'Visualizar Membro' : isEditing ? 'Editar Função do Membro' : 'Adicionar Membro'}
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)' }}>
                            {readOnly ? 'Detalhes do membro no projeto' : isEditing ? 'Altere a função deste membro' : 'Inclua uma pessoa na equipe'}
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { color: 'var(--modal-text)', background: 'var(--modal-surface-hover)' } }}>
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                    <TextField
                        select label="Usuário" fullWidth required
                        value={userId} onChange={e => setUserId(e.target.value)}
                        disabled={isEditing || readOnly}
                        SelectProps={{ MenuProps: { sx: { zIndex: 1400 } } }}
                        sx={modalStyles.input}
                    >
                        <MenuItem value=""><em>Selecione um usuário...</em></MenuItem>
                        {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name} ({u.email})</MenuItem>)}
                    </TextField>

                    <TextField
                        select label="Função no Projeto" fullWidth required
                        value={role} onChange={e => setRole(e.target.value)}
                        disabled={readOnly}
                        SelectProps={{ MenuProps: { sx: { zIndex: 1400 } } }}
                        sx={modalStyles.input}
                    >
                        {roleOptions.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                    </TextField>

                    {/* Preview */}
                    <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 2, p: 2.5,
                        background: 'var(--modal-surface-subtle)', borderRadius: '12px',
                        border: '2px dashed var(--modal-border)'
                    }}>
                        <Box sx={{
                            width: 56, height: 56, borderRadius: '14px',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '20px', fontWeight: 600
                        }}>
                            {selectedUser?.name?.charAt(0) || '?'}
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'var(--modal-text-strong)' }}>
                                {selectedUser?.name || 'Selecione um usuário'}
                            </Typography>
                            <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)' }}>
                                {userId ? roleOptions.find(r => r.value === role)?.label || role : 'A prévia aparecerá aqui'}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: '1px solid var(--modal-border)', gap: 2 }}>
                <Button onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { background: 'var(--modal-surface-hover)' } }}>
                    {readOnly ? 'Fechar' : 'Cancelar'}
                </Button>
                {!readOnly && (
                    <Button
                        onClick={() => onSave({ userId, role })}
                        disabled={loading || !userId}
                        startIcon={<Check />}
                        sx={{
                            padding: '10px 24px', borderRadius: '10px', fontWeight: 600, textTransform: 'none',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white',
                            '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' },
                            '&.Mui-disabled': { background: 'rgba(100, 116, 139, 0.3)', color: 'rgba(255,255,255,0.3)' }
                        }}
                    >
                        {isEditing ? 'Salvar Alterações' : 'Adicionar'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default MemberModal;
