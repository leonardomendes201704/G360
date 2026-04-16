
import React, { useState, useEffect } from 'react';
import {
    TextField, Button, Alert, CircularProgress, Box,
} from '@mui/material';
import StandardModal from '../common/StandardModal';
import integrationService from '../../services/integration.service';

const LDAP_FORM_ID = 'ldap-config-form';

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
            await integrationService.update('LDAP', {
                isEnabled: true,
                config: formData
            });
            const result = await integrationService.testConnection('LDAP');
            setMessage({ type: 'success', text: result.message || 'Conexão LDAP estabelecida com sucesso!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Falha no teste: ' + (error.response?.data?.error || error.message) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title="Configuração AD Local (LDAP)"
            subtitle="Integração com diretório"
            icon="vpn_key"
            size="detail"
            loading={loading}
            footer={
                <>
                    <Button
                        type="button"
                        onClick={handleTestConnection}
                        color="secondary"
                        variant="outlined"
                        disabled={loading}
                        sx={{ mr: 'auto' }}
                    >
                        Testar Conexão
                    </Button>
                    <Button type="button" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form={LDAP_FORM_ID}
                        variant="contained"
                        color="primary"
                        disabled={loading}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Salvar'}
                    </Button>
                </>
            }
        >
            <form id={LDAP_FORM_ID} onSubmit={handleSubmit}>
                {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            </form>
        </StandardModal>
    );
};

export default LdapConfigModal;
