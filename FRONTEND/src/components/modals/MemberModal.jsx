import { useState, useEffect } from 'react';
import {
    Box, Button, Typography, TextField, MenuItem
} from '@mui/material';
import userService from '../../services/user.service';
import StandardModal from '../common/StandardModal';

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

    const title = readOnly
        ? 'Visualizar membro'
        : isEditing
            ? 'Editar função do membro'
            : 'Adicionar membro';
    const subtitle = readOnly
        ? 'Detalhes do membro no projeto'
        : isEditing
            ? 'Altere a função deste membro'
            : 'Inclua uma pessoa na equipe';

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title={title}
            subtitle={subtitle}
            icon="group_add"
            size="form"
            loading={loading}
            footer={
                <>
                    <Button type="button" onClick={onClose}>
                        {readOnly ? 'Fechar' : 'Cancelar'}
                    </Button>
                    {!readOnly && (
                        <Button
                            type="button"
                            onClick={() => onSave({ userId, role })}
                            disabled={loading || !userId}
                            variant="contained"
                            color="primary"
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            {isEditing ? 'Salvar alterações' : 'Adicionar'}
                        </Button>
                    )}
                </>
            }
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                    select
                    label="Usuário"
                    fullWidth
                    required
                    value={userId}
                    onChange={e => setUserId(e.target.value)}
                    disabled={isEditing || readOnly}
                    SelectProps={{ MenuProps: { sx: { zIndex: 1600 } } }}
                >
                    <MenuItem value=""><em>Selecione um usuário…</em></MenuItem>
                    {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name} ({u.email})</MenuItem>)}
                </TextField>

                <TextField
                    select
                    label="Função no projeto"
                    fullWidth
                    required
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    disabled={readOnly}
                    SelectProps={{ MenuProps: { sx: { zIndex: 1600 } } }}
                >
                    {roleOptions.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                </TextField>

                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 2, p: 2.5,
                    bgcolor: 'action.hover', borderRadius: '8px',
                    border: '2px dashed', borderColor: 'divider'
                }}>
                    <Box sx={{
                        width: 56, height: 56, borderRadius: '8px',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '20px', fontWeight: 600
                    }}>
                        {selectedUser?.name?.charAt(0) || '?'}
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '15px', fontWeight: 600 }}>
                            {selectedUser?.name || 'Selecione um usuário'}
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
                            {userId ? roleOptions.find(r => r.value === role)?.label || role : 'A prévia aparecerá aqui'}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </StandardModal>
    );
};

export default MemberModal;
