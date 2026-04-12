
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Alert, Box, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography,
    FormControlLabel, Switch
} from '@mui/material';
import integrationService from '../../services/integration.service';

const AzureConfigModal = ({ open, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        clientId: '',
        clientSecret: '',
        tenantIdAzure: '',
        redirectUri: window.location.origin + '/auth/callback'
    });
    const [isEnabled, setIsEnabled] = useState(true);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // Test States
    const [testLoading, setTestLoading] = useState(false);
    const [testResult, setTestResult] = useState(null);

    useEffect(() => {
        if (open) loadConfig();
    }, [open]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const integrations = await integrationService.getAll();
            const azure = integrations.find(i => i.type === 'AZURE');
            if (azure && azure.config) {
                setFormData({
                    clientId: azure.config.clientId || '',
                    clientSecret: azure.config.clientSecret || '',
                    tenantIdAzure: azure.config.tenantIdAzure || '',
                    redirectUri: azure.config.redirectUri || window.location.origin + '/auth/callback'
                });
                setIsEnabled(azure.isEnabled);
            }
        } catch (error) {
            console.error('Failed to load config', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            await integrationService.update('AZURE', {
                isEnabled,
                config: formData
            });
            setMessage({ type: 'success', text: 'Configuração salva com sucesso!' });
            onSuccess();
            setTimeout(() => { onClose(); }, 1500);
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro ao salvar: ' + (error.response?.data?.error || error.message) });
        } finally {
            setLoading(false);
        }
    };

    const handleTestConnection = async () => {
        setTestLoading(true);
        setTestResult(null);
        setMessage(null);
        try {
            const result = await integrationService.testConnection('AZURE');
            setTestResult(result);
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro no teste: ' + (error.response?.data?.error || error.message) });
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Configuração Azure AD</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

                    <Box mb={2}>
                        <FormControlLabel
                            control={<Switch checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />}
                            label="Habilitar Integração"
                        />
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Azure Tenant ID"
                            name="tenantIdAzure"
                            value={formData.tenantIdAzure}
                            onChange={handleChange}
                            required
                            placeholder="ex: b95b38fc-..."
                        />
                        <TextField
                            fullWidth
                            label="Client ID"
                            name="clientId"
                            value={formData.clientId}
                            onChange={handleChange}
                            required
                            placeholder="ex: 6ccf5896-..."
                        />
                        <TextField
                            fullWidth
                            label="Client Secret"
                            name="clientSecret"
                            type="password"
                            value={formData.clientSecret}
                            onChange={handleChange}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Redirect URI"
                            name="redirectUri"
                            value={formData.redirectUri}
                            InputProps={{ readOnly: true }}
                            helperText="Deve ser cadastrado exatamente assim no Azure Portal."
                        />
                    </Box>

                    {testResult && (
                        <Box mt={3} p={2} border={1} borderColor="grey.300" borderRadius={1}>
                            <Typography variant="subtitle1" color="success.main" gutterBottom>
                                Conexão Bem-sucedida!
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                                {testResult.count} usuários encontrados.
                            </Typography>
                            <TableContainer component={Paper} sx={{ maxHeight: 200, mt: 1 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Nome</TableCell>
                                            <TableCell>Email</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {testResult.users.slice(0, 50).map(u => (
                                            <TableRow key={u.id}>
                                                <TableCell>{u.displayName}</TableCell>
                                                <TableCell>{u.userPrincipalName}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleTestConnection}
                        color="secondary"
                        disabled={loading || testLoading}
                        variant="outlined"
                        sx={{ mr: 'auto' }}
                    >
                        {testLoading ? <CircularProgress size={24} /> : 'Testar Conexão'}
                    </Button>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="contained" color="primary" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : 'Salvar'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default AzureConfigModal;
