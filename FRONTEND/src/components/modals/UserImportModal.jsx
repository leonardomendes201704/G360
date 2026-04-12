
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Checkbox, TextField, MenuItem, CircularProgress, Typography, Box, Alert
} from '@mui/material';
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
    const [searchTerm, setSearchTerm] = useState(''); // Restore search term if it was there or add it back

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
            // Carregar Perfis
            const rolesData = await roleService.getAll();
            setRoles(rolesData);

            // Carregar Usuários do Azure
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
            // Filtrar usuários selecionados e montar payload
            const usersToImport = azureUsers
                .filter(u => selectedUsers.includes(u.id))
                .map(u => ({
                    name: u.displayName,
                    email: u.userPrincipalName, // Assume UPN is email
                    azureId: u.id,
                    roleId: selectedRole || undefined
                }));

            await userService.importAzureUsers(usersToImport);

            onSuccess(); // Recarrega lista pai
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
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Importar Usuários do Azure AD</DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <>
                        <Box mb={2}>
                            <Typography variant="body2" gutterBottom>
                                Selecione os usuários para importar ou atualizar. Os usuários existentes serão vinculados.
                            </Typography>
                        </Box>

                        <Box mb={3} display="flex" gap={2}>
                            <TextField
                                label="Buscar por Nome ou Email"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                fullWidth
                                placeholder="Digite para filtrar..."
                            />
                            <TextField
                                select
                                label="Atribuir Perfil (Role)"
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                fullWidth
                                helperText="Opcional"
                            >
                                <MenuItem value=""><em>Nenhum</em></MenuItem>
                                {roles.map(r => (
                                    <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                                ))}
                            </TextField>
                        </Box>

                        <TableContainer sx={{ maxHeight: 400 }}>
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
                                        <TableCell>Email (UPN)</TableCell>
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
                                                style={{ cursor: 'pointer' }}
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
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            {selectedUsers.length} usuário(s) selecionado(s).
                        </Typography>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={importing}>Cancelar</Button>
                <Button
                    onClick={handleImport}
                    variant="contained"
                    color="primary"
                    disabled={importing || loading || selectedUsers.length === 0}
                >
                    {importing ? <CircularProgress size={24} color="inherit" /> : 'Importar Selecionados'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UserImportModal;
