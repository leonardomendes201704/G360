import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, Avatar, Switch, Tooltip
} from '@mui/material';
import { Edit, Delete, Add, Person, Security } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import userService from '../../services/user.service';
import UserModal from '../../components/modals/UserModal';
import UserImportModal from '../../components/modals/UserImportModal';
import ConfirmDialog from '../common/ConfirmDialog';
import { getErrorMessage } from '../../utils/errorUtils';

const UsersTab = () => {
    const [users, setUsers] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [importModalOpen, setImportModalOpen] = useState(false);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const { enqueueSnackbar } = useSnackbar();

    const loadData = async () => {
        try {
            const data = await userService.getAll();
            setUsers(data);
        } catch (error) {
            console.error(error);
            enqueueSnackbar(getErrorMessage(error, 'Erro ao carregar usuários.'), { variant: 'error' });
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleEdit = (user) => { setEditData(user); setModalOpen(true); };
    const handleAdd = () => { setEditData(null); setModalOpen(true); };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await userService.delete(deleteId);
            loadData();
            enqueueSnackbar('Usuário excluído com sucesso.', { variant: 'success' });
            setConfirmOpen(false);
            setDeleteId(null);
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error, 'Erro ao excluir usuário.'), { variant: 'error' });
        }
    };

    const handleToggleStatus = async (user) => {
        try {
            await userService.toggleStatus(user.id);
            enqueueSnackbar(`Usuário ${user.isActive ? 'inativado' : 'ativado'} com sucesso.`, { variant: 'success' });
            loadData();
        } catch (error) {
            console.error(error);
            enqueueSnackbar('Erro ao alterar status.', { variant: 'error' });
        }
    };

    const getAvatarUrl = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    const handleImport = () => { setImportModalOpen(true); };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Usuários do Sistema</Typography>
                <Box display="flex" gap={2}>
                    <Button
                        startIcon={<Add />}
                        variant="outlined"
                        onClick={handleImport}
                    >
                        Importar do Azure
                    </Button>
                    <Button data-testid="user-add-local" startIcon={<Add />} variant="contained" onClick={handleAdd}>Novo Usuário Local</Button>
                </Box>
            </Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Usuário</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Perfil</TableCell>
                            <TableCell>Departamento</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <Avatar src={user.avatar || getAvatarUrl(user.name)} alt={user.name} />
                                        <Box>
                                            <Typography variant="body1">{user.name}</Typography>
                                            {user.azureId && (
                                                <Typography variant="caption" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Security fontSize="inherit" /> Azure AD
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    {user.roles && user.roles.length > 0 ? (
                                        user.roles.map(role => (
                                            <Chip key={role.id} icon={<Security fontSize="small" />} label={role.name} size="small" variant="outlined" color="primary" sx={{ mr: 0.5 }} />
                                        ))
                                    ) : (
                                        user.role ? (
                                            <Chip icon={<Security fontSize="small" />} label={user.role.name} size="small" variant="outlined" color="primary" />
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>Sem perfil</span>
                                        )
                                    )}
                                </TableCell>

                                <TableCell>
                                    {user.costCenter ? (
                                        <Typography variant="body2">{user.costCenter.name}</Typography>
                                    ) : (
                                        <Typography variant="caption" color="textSecondary">-</Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={user.isActive}
                                        onChange={() => handleToggleStatus(user)}
                                        color="success"
                                        size="small"
                                    />
                                    <Typography variant="caption" component="span" sx={{ ml: 1 }}>
                                        {user.isActive ? 'Ativo' : 'Inativo'}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => handleEdit(user)}><Edit fontSize="small" /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => handleDeleteClick(user.id)}><Delete fontSize="small" /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">Nenhum usuário encontrado.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <UserModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={loadData}
                editData={editData}
            />
            {/* Import Modal */}
            {importModalOpen && (
                <UserImportModal
                    open={importModalOpen}
                    onClose={() => setImportModalOpen(false)}
                    onSuccess={loadData}
                />
            )}
            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Excluir Usuário"
                content="Tem certeza que deseja excluir este usuário?"
            />
        </Box>
    );
};

export default UsersTab;
