import React, { useState, useEffect, useContext } from 'react';
import { Box, Button, IconButton, Typography, Autocomplete, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import userService from '../../services/user.service';
import roleService from '../../services/role.service';
import ConfirmDialog from '../common/ConfirmDialog';
import StandardModal from '../common/StandardModal';
import { ThemeContext } from '../../contexts/ThemeContext';

const CabMembersTab = () => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#475569';
    const textMuted = isDark ? '#64748b' : '#64748b';
    const cardBg = isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#ffffff';
    const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)';
    const surfaceBg = isDark ? '#1c2632' : '#f1f5f9';
    const rowHoverBg = isDark ? '#1c2632' : '#f1f5f9';
    const inputBg = isDark ? '#1c2632' : '#ffffff';
    const inputBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.12)';

    const cardStyle = {
        background: cardBg,
        border: cardBorder,
        borderRadius: '8px'
    };

    const tableHeaderStyle = {
        background: surfaceBg,
        color: textMuted,
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        padding: '16px 24px',
        borderBottom: cardBorder,
        textAlign: 'left'
    };

    const tableCellStyle = {
        color: textSecondary,
        fontSize: '14px',
        padding: '20px 24px',
        borderBottom: cardBorder
    };

    const actionBtnStyle = (type = 'edit') => ({
        width: 32, height: 32, borderRadius: '8px',
        background: type === 'delete' ? 'rgba(244, 63, 94, 0.1)' : surfaceBg,
        border: cardBorder,
        color: type === 'delete' ? '#f43f5e' : textSecondary,
        '&:hover': {
            background: type === 'delete' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(37, 99, 235, 0.12)',
            color: type === 'delete' ? '#f43f5e' : '#2563eb',
            borderColor: type === 'delete' ? '#f43f5e' : '#2563eb'
        }
    });

    const inputSx = {
        '& .MuiOutlinedInput-root': {
            background: inputBg,
            color: textPrimary,
            '& fieldset': { borderColor: inputBorder }
        },
        '& .MuiInputLabel-root': { color: textMuted }
    };
    const { enqueueSnackbar } = useSnackbar();
    const [members, setMembers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [userToRemove, setUserToRemove] = useState(null);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const users = await userService.getAll();
            const cabMembers = users.filter(u => u.roles && u.roles.some(r => r.name === 'CAB Member'));
            setMembers(cabMembers);
            setAllUsers(users);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMembers(); }, []);

    const handleAddMember = async () => {
        if (!selectedUser) return;
        try {
            const currentRoles = selectedUser.roles ? selectedUser.roles.map(r => r.id) : [];
            const roles = await roleService.getAll();
            const cabRole = roles.find(r => r.name === 'CAB Member');
            if (cabRole) {
                const newRoles = [...new Set([...currentRoles, cabRole.id])];
                await userService.updateUser(selectedUser.id, { roleIds: newRoles });
                enqueueSnackbar('Membro adicionado ao CAB com sucesso!', { variant: 'success' });
                setOpenModal(false);
                setSelectedUser(null);
                fetchMembers();
            } else {
                enqueueSnackbar('Erro: Perfil "CAB Member" nao encontrado no sistema.', { variant: 'error' });
            }
        } catch (error) {
            enqueueSnackbar('Erro ao adicionar membro.', { variant: 'error' });
        }
    };

    const handleRemoveClick = (user) => {
        setUserToRemove(user);
        setConfirmOpen(true);
    };

    const handleConfirmRemove = async () => {
        if (!userToRemove) return;
        setConfirmOpen(false);
        try {
            const currentRoles = userToRemove.roles ? userToRemove.roles.map(r => r.id) : [];
            const roles = await roleService.getAll();
            const cabRole = roles.find(r => r.name === 'CAB Member');
            if (cabRole) {
                const newRoles = currentRoles.filter(rid => rid !== cabRole.id);
                await userService.updateUser(userToRemove.id, { roleIds: newRoles });
                enqueueSnackbar('Membro removido do CAB.', { variant: 'success' });
                fetchMembers();
            }
        } catch (error) {
            enqueueSnackbar('Erro ao remover membro.', { variant: 'error' });
        } finally {
            setUserToRemove(null);
        }
    };

    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography sx={{ fontSize: '24px', fontWeight: 600, color: textPrimary }}>Change Advisory Board (CAB)</Typography>
                <Button onClick={() => setOpenModal(true)} sx={{
                    padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
                }} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>person_add</span>}>
                    Adicionar Membro
                </Button>
            </Box>

            <Box sx={{ ...cardStyle, overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={tableHeaderStyle}>Membro</th>
                                <th style={tableHeaderStyle}>Cargo</th>
                                <th style={tableHeaderStyle}>Diretoria</th>
                                <th style={tableHeaderStyle}>E-mail</th>
                                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Acoes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.length === 0 ? (
                                <tr><td colSpan={5} style={{ ...tableCellStyle, textAlign: 'center', padding: '60px' }}>
                                    <span className="material-icons-round" style={{ fontSize: '64px', color: textMuted, opacity: 0.5, display: 'block', marginBottom: '16px' }}>groups</span>
                                    <Typography sx={{ color: textMuted, fontSize: '16px' }}>Nenhum membro definido para o comite</Typography>
                                </td></tr>
                            ) : members.map((u) => (
                                <tr key={u.id} style={{ transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = rowHoverBg} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <td style={tableCellStyle}><strong style={{ color: textPrimary }}>{u.name}</strong></td>
                                    <td style={tableCellStyle}>{u.roles?.find(r => r.name !== 'CAB Member')?.name || 'Membro'}</td>
                                    <td style={tableCellStyle}>{u.department?.name || '-'}</td>
                                    <td style={tableCellStyle}>{u.email}</td>
                                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                            <IconButton onClick={() => handleRemoveClick(u)} sx={actionBtnStyle('delete')} title="Remover do CAB">
                                                <span className="material-icons-round" style={{ fontSize: '18px' }}>remove_circle</span>
                                            </IconButton>
                                        </Box>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Box>
            </Box>

            <StandardModal
                open={openModal}
                onClose={() => setOpenModal(false)}
                title="Adicionar Membro ao CAB"
                icon="group_add"
                size="form"
                actions={[
                    { label: 'Cancelar', onClick: () => setOpenModal(false) },
                    { label: 'Adicionar', onClick: handleAddMember, disabled: !selectedUser },
                ]}
            >
                <Autocomplete
                    options={allUsers.filter(u => !members.some(m => m.id === u.id))}
                    getOptionLabel={(option) => `${option.name} (${option.email})`}
                    value={selectedUser}
                    onChange={(e, v) => setSelectedUser(v)}
                    renderInput={(params) => <TextField {...params} label="Selecione o Usuario" fullWidth sx={inputSx} />}
                    sx={{ '& .MuiAutocomplete-listbox': { background: inputBg } }}
                />
            </StandardModal>

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => { setConfirmOpen(false); setUserToRemove(null); }}
                onConfirm={handleConfirmRemove}
                title="Remover do CAB"
                content={`Tem certeza que deseja remover ${userToRemove?.name || 'este membro'} do CAB?`}
            />
        </>
    );
};

export default CabMembersTab;

