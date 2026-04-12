import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Switch, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import tenantService from '../../services/tenant.service';
import TenantModal from '../../components/modals/TenantModal';

const TenantsTab = () => {
    const [tenants, setTenants] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);

    // Status de confirmação de exclusão
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [tenantToDelete, setTenantToDelete] = useState(null);

    const loadData = async () => {
        try {
            const data = await tenantService.getAll();
            setTenants(data);
        } catch (error) {
            console.error("Erro ao carregar empresas:", error);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreate = () => {
        setEditData(null);
        setModalOpen(true);
    };

    const handleEdit = (tenant) => {
        setEditData(tenant);
        setModalOpen(true);
    };

    const handleToggleStatus = async (tenant) => {
        try {
            await tenantService.update(tenant.id, { isActive: !tenant.isActive });
            loadData(); // Recarrega para garantir
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            alert("Erro ao atualizar status.");
        }
    };

    const handleDeleteClick = (tenant) => {
        setTenantToDelete(tenant);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (tenantToDelete) {
            try {
                await tenantService.delete(tenantToDelete.id);
                loadData();
            } catch (error) {
                console.error("Erro ao excluir:", error);
                alert(error.response?.data?.error || "Erro ao excluir empresa.");
            } finally {
                setDeleteConfirmOpen(false);
                setTenantToDelete(null);
            }
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Empresas Registradas</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
                    Nova Empresa
                </Button>
            </Box>

            <TableContainer component={Paper} elevation={1}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome</TableCell>
                            <TableCell>Slug (ID)</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Criada em</TableCell>
                            <TableCell align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tenants.map((tenant) => (
                            <TableRow key={tenant.id} hover>
                                <TableCell sx={{ fontWeight: 'medium' }}>{tenant.name}</TableCell>
                                <TableCell>
                                    <Chip label={tenant.slug} size="small" variant="outlined" />
                                </TableCell>
                                <TableCell>
                                    <Tooltip title={tenant.isActive ? "Desativar" : "Ativar"}>
                                        <Switch
                                            checked={tenant.isActive}
                                            onChange={() => handleToggleStatus(tenant)}
                                            size="small"
                                            color="success"
                                        />
                                    </Tooltip>
                                </TableCell>
                                <TableCell>{new Date(tenant.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Editar">
                                        <IconButton size="small" onClick={() => handleEdit(tenant)} sx={{ mr: 1 }}>
                                            <Edit fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Excluir">
                                        <IconButton size="small" color="error" onClick={() => handleDeleteClick(tenant)}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {tenants.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                    Nenhuma empresa encontrada.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Modal de Criar/Editar */}
            <TenantModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={loadData}
                editData={editData}
            />

            {/* Dialog de Confirmação de Exclusão */}
            <Dialog
                open={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
            >
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Tem certeza que deseja excluir a empresa <strong>{tenantToDelete?.name}</strong>?
                        <br />
                        Esta ação é irreversível e excluirá todos os dados associados.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>
                        Excluir
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TenantsTab;
