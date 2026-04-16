
import React, { useState, useEffect } from 'react';
import {
    Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Checkbox, TextField, MenuItem, CircularProgress, Typography, Box, Alert
} from '@mui/material';
import StandardModal from '../common/StandardModal';
import integrationService from '../../services/integration.service';
import userService from '../../services/user.service';
import roleService from '../../services/role.service';

const UserImportModal = ({ open, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [azureUsers, setAzureUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedRole, setSelectedRole] = useState('');
    const [roles, setRoles] = useState([]);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (open) {
            loadInitialData();
        }
    }, [open]);

    const loadInitialData = async () => {
        setLoading(true);
        setError(null);
        setAzureUsers([]);
        setSelectedUsers([]);
        try {
            const rolesData = await roleService.getAll();
            setRoles(rolesData);

            const result = await integrationService.testConnection('AZURE');
            if (result && result.success && result.users) {
                setAzureUsers(result.users);
            } else {
                throw new Error('Não foi possível obter a lista de usuários do Azure.');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.message || 'Erro ao carregar usuários.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedUsers(azureUsers.map((u) => u.id));
        } else {
            setSelectedUsers([]);
        }
    };

    const handleSelectUser = (event, userId) => {
        if (event.target.checked) {
            setSelectedUsers([...selectedUsers, userId]);
        } else {
            setSelectedUsers(selectedUsers.filter((id) => id !== userId));
        }
    };

    const handleImport = async () => {
        if (selectedUsers.length === 0) return;

        setImporting(true);
        setError(null);
        try {
            const usersToImport = azureUsers
                .filter(u => selectedUsers.includes(u.id))
                .map(u => ({
                    name: u.displayName,
                    email: u.userPrincipalName,
                    azureId: u.id,
                    roleId: selectedRole || undefined
                }));

            await userService.importAzureUsers(usersToImport);

            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Erro ao importar usuários.');
        } finally {
            setImporting(false);
        }
    };

    const filteredUsers = azureUsers.filter(user =>
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userPrincipalName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title="Importar usuários do Azure AD"
            subtitle="Contas do Microsoft Entra ID"
            icon="cloud_upload"
            size="detail"
            loading={importing}
            footer={
                <Box
                    data-testid="user-import-modal-footer"
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end', width: '100%' }}
                >
                    <Button type="button" onClick={onClose} disabled={importing}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleImport}
                        variant="contained"
                        color="primary"
                        disabled={importing || loading || selectedUsers.length === 0}
                        startIcon={importing ? <CircularProgress size={18} color="inherit" /> : null}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {importing ? 'Importando…' : 'Importar selecionados'}
                    </Button>
                </Box>
            }
        >
            {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : (
                <>
                    <Box mb={2}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Selecione os usuários para importar ou atualizar. Os usuários existentes serão vinculados.
                        </Typography>
                    </Box>

                    <Box mb={3} display="flex" gap={2} flexWrap="wrap">
                        <TextField
                            label="Buscar por nome ou e-mail"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            fullWidth
                            sx={{ flex: '1 1 200px', minWidth: 0 }}
                            placeholder="Digite para filtrar…"
                        />
                        <TextField
                            select
                            label="Atribuir perfil"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            fullWidth
                            sx={{ flex: '1 1 200px', minWidth: 0 }}
                            helperText="Opcional"
                        >
                            <MenuItem value=""><em>Nenhum</em></MenuItem>
                            {roles.map(r => (
                                <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                            ))}
                        </TextField>
                    </Box>

                    <TableContainer sx={{ maxHeight: 400, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            indeterminate={selectedUsers.length > 0 && selectedUsers.length < azureUsers.length}
                                            checked={azureUsers.length > 0 && selectedUsers.length === azureUsers.length}
                                            onChange={handleSelectAll}
                                        />
                                    </TableCell>
                                    <TableCell>Nome</TableCell>
                                    <TableCell>E-mail (UPN)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredUsers.map((user) => {
                                    const isSelected = selectedUsers.indexOf(user.id) !== -1;
                                    return (
                                        <TableRow
                                            hover
                                            onClick={(event) => handleSelectUser({ target: { checked: !isSelected } }, user.id)}
                                            role="checkbox"
                                            aria-checked={isSelected}
                                            tabIndex={-1}
                                            key={user.id}
                                            selected={isSelected}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <TableCell padding="checkbox">
                                                <Checkbox checked={isSelected} />
                                            </TableCell>
                                            <TableCell>{user.displayName}</TableCell>
                                            <TableCell>{user.userPrincipalName}</TableCell>
                                        </TableRow>
                                    );
                                })}
                                {azureUsers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center">Nenhum usuário encontrado no Azure.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                        {selectedUsers.length} usuário(s) selecionado(s).
                    </Typography>
                </>
            )}
        </StandardModal>
    );
};

export default UserImportModal;
