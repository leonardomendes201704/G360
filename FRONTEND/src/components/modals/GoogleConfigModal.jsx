import React, { useState, useEffect } from 'react';
import {
    TextField, Button, Alert, Box, CircularProgress, Typography,
    FormControlLabel, Switch,
} from '@mui/material';
import StandardModal from '../common/StandardModal';
import integrationService from '../../services/integration.service';

const GOOGLE_FORM_ID = 'google-config-form';

const GoogleConfigModal = ({ open, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        clientId: '',
        clientSecret: '',
        redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback',
    });
    const [isEnabled, setIsEnabled] = useState(true);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const [testLoading, setTestLoading] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const busy = loading || testLoading;

    useEffect(() => {
        if (open) loadConfig();
    }, [open]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const integrations = await integrationService.getAll();
            const row = integrations.find((i) => i.type === 'GOOGLE');
            if (row && row.config) {
                setFormData({
                    clientId: row.config.clientId || '',
                    clientSecret: row.config.clientSecret || '',
                    redirectUri:
                        row.config.redirectUri ||
                        (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback'),
                });
                setIsEnabled(row.isEnabled);
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
            await integrationService.update('GOOGLE', {
                isEnabled,
                config: formData,
            });
            setMessage({ type: 'success', text: 'Configuração salva com sucesso!' });
            onSuccess();
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error) {
            setMessage({
                type: 'error',
                text: `Erro ao salvar: ${error.response?.data?.error || error.message}`,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleTestConnection = async () => {
        setTestLoading(true);
        setTestResult(null);
        setMessage(null);
        try {
            const result = await integrationService.testConnection('GOOGLE');
            setTestResult(result);
        } catch (error) {
            setMessage({
                type: 'error',
                text: `Erro no teste: ${error.response?.data?.error || error.message}`,
            });
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title="Configuração Google (OAuth)"
            subtitle="Login com Google — Google Cloud Console (OAuth 2.0 Client ID)"
            icon="login"
            size="detail"
            loading={busy}
            footer={
                <>
                    <Button
                        type="button"
                        onClick={handleTestConnection}
                        color="secondary"
                        variant="outlined"
                        disabled={busy}
                        sx={{ mr: 'auto', textTransform: 'none', fontWeight: 600 }}
                    >
                        {testLoading ? <CircularProgress size={24} /> : 'Testar Conexão'}
                    </Button>
                    <Button type="button" onClick={onClose} disabled={busy}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form={GOOGLE_FORM_ID}
                        variant="contained"
                        color="primary"
                        disabled={busy}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Salvar'}
                    </Button>
                </>
            }
        >
            <form id={GOOGLE_FORM_ID} onSubmit={handleSubmit}>
                {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

                <Box mb={2}>
                    <FormControlLabel
                        control={<Switch checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} disabled={busy} />}
                        label="Habilitar Integração"
                    />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                    Crie um cliente OAuth <strong>Web application</strong> na Google Cloud Console e adicione este
                    Redirect URI em &quot;URIs de redirecionamento autorizados&quot; (deve coincidir exatamente).
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        fullWidth
                        label="Client ID"
                        name="clientId"
                        value={formData.clientId}
                        onChange={handleChange}
                        required
                        placeholder="ex: xxx.apps.googleusercontent.com"
                        disabled={busy}
                    />
                    <TextField
                        fullWidth
                        label="Client Secret"
                        name="clientSecret"
                        type="password"
                        value={formData.clientSecret}
                        onChange={handleChange}
                        required
                        disabled={busy}
                    />
                    <TextField
                        fullWidth
                        label="Redirect URI"
                        name="redirectUri"
                        value={formData.redirectUri}
                        InputProps={{ readOnly: true }}
                        helperText="Registre o mesmo valor na Google Cloud Console."
                        disabled={busy}
                    />
                </Box>

                {testResult?.message && (
                    <Box mt={3} p={2} border={1} borderColor="grey.300" borderRadius={1}>
                        <Typography variant="subtitle1" color="success.main" gutterBottom>
                            Teste concluído
                        </Typography>
                        <Typography variant="body2">{testResult.message}</Typography>
                    </Box>
                )}
            </form>
        </StandardModal>
    );
};

export default GoogleConfigModal;
