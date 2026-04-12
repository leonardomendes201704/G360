
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Alert, CircularProgress, Box
} from '@mui/material';
import integrationService from '../../services/integration.service';

const LdapConfigModal = ({ open, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        host: '',
        port: '389',
        baseDN: '',
        bindDN: '',
        bindPassword: ''
    });
    const [isEnabled, setIsEnabled] = useState(true);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (open) loadConfig();
    }, [open]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const integrations = await integrationService.getAll();
            const ldap = integrations.find(i => i.type === 'LDAP');
            if (ldap && ldap.config) {
                setFormData({
                    host: ldap.config.host || '',
                    port: ldap.config.port || '389',
                    baseDN: ldap.config.baseDN || '',
                    bindDN: ldap.config.bindDN || '',
                    bindPassword: ldap.config.bindPassword || ''
                });
                setIsEnabled(ldap.isEnabled);
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
            await integrationService.update('LDAP', {
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
        setLoading(true);
        setMessage(null);
        try {
            // Primeiro salva a configuração atual
            await integrationService.update('LDAP', {
                isEnabled: true,
                config: formData
            });
            // Testa a conexão
            const result = await integrationService.testConnection('LDAP');
            setMessage({ type: 'success', text: result.message || 'Conexão LDAP estabelecida com sucesso!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Falha no teste: ' + (error.response?.data?.error || error.message) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Configuração AD Local (LDAP)</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                fullWidth
                                sx={{ flex: 2 }}
                                label="Host / IP Servidor"
                                name="host"
                                value={formData.host}
                                onChange={handleChange}
                                required
                                placeholder="192.168.1.10"
                            />
                            <TextField
                                fullWidth
                                sx={{ flex: 1 }}
                                label="Porta"
                                name="port"
                                value={formData.port}
                                onChange={handleChange}
                                required
                            />
                        </Box>

                        <TextField
                            fullWidth
                            label="Base DN"
                            name="baseDN"
                            value={formData.baseDN}
                            onChange={handleChange}
                            required
                            placeholder="dc=empresa,dc=local"
                        />
                        <TextField
                            fullWidth
                            label="Bind DN (Usuário Leitura)"
                            name="bindDN"
                            value={formData.bindDN}
                            onChange={handleChange}
                            required
                            placeholder="cn=admin,dc=empresa,dc=local"
                        />
                        <TextField
                            fullWidth
                            label="Senha do Bind"
                            name="bindPassword"
                            type="password"
                            value={formData.bindPassword}
                            onChange={handleChange}
                            required
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleTestConnection}
                        color="secondary"
                        variant="outlined"
                        sx={{ mr: 'auto' }}
                    >
                        Testar Conexão
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

export default LdapConfigModal;
