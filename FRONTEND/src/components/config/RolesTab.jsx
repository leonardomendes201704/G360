import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, IconButton, Chip
} from '@mui/material';
import { Edit, Delete, Add, Security } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import roleService from '../../services/role.service';
import RoleModal from '../../components/modals/RoleModal';
import ConfirmDialog from '../common/ConfirmDialog';
import { getErrorMessage } from '../../utils/errorUtils';

const RolesTab = () => {
    const [roles, setRoles] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const { enqueueSnackbar } = useSnackbar();

    const loadData = async () => {
        try {
            const data = await roleService.getAll();
            setRoles(data);
        } catch (error) {
            console.error(error);
            enqueueSnackbar(getErrorMessage(error, 'Erro ao carregar perfis.'), { variant: 'error' });
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleEdit = (role) => { setEditData(role); setModalOpen(true); };
    const handleAdd = () => { setEditData(null); setModalOpen(true); };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await roleService.delete(deleteId);
            loadData();
            enqueueSnackbar('Perfil excluído com sucesso.', { variant: 'success' });
            setConfirmOpen(false);
            setDeleteId(null);
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error, 'Erro ao excluir perfil.'), { variant: 'error' });
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Perfis de Acesso</Typography>
                <Button data-testid="role-add" startIcon={<Add />} variant="contained" onClick={handleAdd}>Novo Perfil</Button>
            </Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome</TableCell>
                            <TableCell>Descrição</TableCell>
                            <TableCell>Permissões</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {roles.map((role) => (
                            <TableRow key={role.id}>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Security color="action" fontSize="small" />
                                        {role.name}
                                    </Box>
                                </TableCell>
                                <TableCell>{role.description || '-'}</TableCell>
                                <TableCell>
                                    <Chip label={`${role.permissions ? role.permissions.length : 0} Regras`} size="small" variant="outlined" />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => handleEdit(role)}><Edit fontSize="small" /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => handleDeleteClick(role.id)}><Delete fontSize="small" /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {roles.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">Nenhum perfil encontrado.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <RoleModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={loadData}
                editData={editData}
            />
            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Excluir Perfil"
                content="Tem certeza? Usuários com este perfil perderão o acesso."
            />
        </Box>
    );
};

export default RolesTab;
