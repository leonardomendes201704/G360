import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Alert, FormControlLabel, Switch,
    Box, Typography, Grid, CircularProgress, Divider, Checkbox, FormGroup
} from '@mui/material';
import integrationService from '../../services/integration.service';
import api from '../../services/api';

const SmtpConfigModal = ({ open, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [error, setError] = useState('');

    const [config, setConfig] = useState({
        host: '',
        port: 587,
        user: '',
        pass: '',
        secure: false,
        fromName: 'G360 Notification',
        fromEmail: 'noreply@g360.com.br',
        events: {
            PROJECT_CREATED: true,
            PROJECT_TASK_ASSIGNED: true,
            CONTRACT_CREATED: true,
            CONTRACT_EXPIRING: true,
            CHANGE_REQUEST_CREATED: true,
            CHANGE_REQUEST_APPROVAL_NEEDED: true,
            CHANGE_REQUEST_STATUS_UPDATED: true,
            TASK_ASSIGNED: true,
            TASK_DUE_SOON: true,
            ASSET_MAINTENANCE_DUE: true,
            EXPENSE_APPROVED: true,
            BUDGET_EXCEEDED: true,
            SYSTEM_ALERT: true
        },
        groups: {}
    });

    const [isEnabled, setIsEnabled] = useState(false);

    useEffect(() => {
        if (open) {
            loadConfig();
        }
    }, [open]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const integrations = await integrationService.getAll();
            const smtp = integrations.find(i => i.type === 'SMTP');
            if (smtp) {
                setConfig(prev => ({ ...prev, ...smtp.config }));
                setIsEnabled(smtp.isEnabled);
            }
        } catch (err) {
            console.error(err);
            setError('Falha ao carregar configurações.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleEventChange = (e) => {
        const { name, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            events: {
                ...prev.events,
                [name]: checked
            }
        }));
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const response = await api.post('/integrations/SMTP/test', config);
            setTestResult({ success: true, message: response.data.message });
        } catch (err) {
            console.error(err);
            setTestResult({
                success: false,
                message: err.response?.data?.error || 'Falha na conexão SMTP.'
            });
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await integrationService.update('SMTP', {
                name: 'E-mail (SMTP)',
                isEnabled,
                config
            });
            onSuccess();
            onClose();
        } catch (err) {
            setError('Erro ao salvar configurações.');
        } finally {
            setLoading(false);
        }
    };

    const moduleGroups = {
        'Projetos': [
            { key: 'PROJECT_CREATED', label: 'Novo Projeto Criado' },
            { key: 'PROJECT_TASK_ASSIGNED', label: 'Tarefa de Projeto Atribuída' },
            { key: 'PROJECT_DELAYED', label: 'Projeto Atrasado (Prazo Excedido)' },
            { key: 'PROJECT_RISK_CREATED', label: 'Novo Risco Identificado' },
            { key: 'PROJECT_FOLLOWUP_CREATED', label: 'Novo Follow-Up Registrado' }
        ],
        'Contratos': [
            { key: 'CONTRACT_CREATED', label: 'Novo Contrato' },
            { key: 'CONTRACT_EXPIRING', label: 'Contrato Vencendo' }
        ],
        'GMUD': [
            { key: 'CHANGE_REQUEST_CREATED', label: 'Nova Mudança (GMUD)' },
            { key: 'CHANGE_REQUEST_APPROVAL_NEEDED', label: 'Aprovação Necessária' },
            { key: 'CHANGE_REQUEST_STATUS_UPDATED', label: 'Status de Mudança Atualizado' }
        ],
        'Tarefas': [
            { key: 'TASK_ASSIGNED', label: 'Tarefa Atribuída' },
            { key: 'TASK_DUE_SOON', label: 'Tarefa a Vencer' }
        ],
        'Ativos': [
            { key: 'ASSET_MAINTENANCE_DUE', label: 'Manutenção de Ativo Vencendo' },
            { key: 'LICENSE_EXPIRING', label: 'Licença de Software Expirando' }
        ],
        'Financeiro': [
            { key: 'EXPENSE_CREATED', label: 'Nova Despesa Lançada' },
            { key: 'EXPENSE_APPROVED', label: 'Despesa Aprovada' },
            { key: 'BUDGET_EXCEEDED', label: 'Dotação Orçamentária Excedida' }
        ],
        'Sistema': [
            { key: 'SYSTEM_ALERT', label: 'Alertas de Sistema' }
        ]
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Configuração de E-mail (SMTP)</DialogTitle>
            <DialogContent>
                {loading && <Box display="flex" justifyContent="center" m={3}><CircularProgress /></Box>}

                {!loading && (
                    <Box sx={{ mt: 1 }}>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        <FormControlLabel
                            control={<Switch checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />}
                            label="Habilitar Envio de E-mails"
                            sx={{ mb: 2 }}
                        />

                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Servidor SMTP</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={8}>
                                        <TextField fullWidth label="Host (Servidor)" name="host" value={config.host} onChange={handleChange} size="small" />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <TextField fullWidth label="Porta" name="port" type="number" value={config.port} onChange={handleChange} size="small" />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth label="Usuário" name="user" value={config.user} onChange={handleChange} size="small" />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth label="Senha" name="pass" type="password" value={config.pass} onChange={handleChange} size="small" />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <FormControlLabel
                                            control={<Checkbox checked={config.secure === true || config.secure === 'true'} onChange={(e) => setConfig(prev => ({ ...prev, secure: e.target.checked }))} name="secure" />}
                                            label="Usar SSL/TLS (Secure)"
                                        />
                                    </Grid>
                                </Grid>

                                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Remetente</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth label="Nome do Remetente" name="fromName" value={config.fromName} onChange={handleChange} size="small" helperText="Ex: G360 | Não responda" />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth label="E-mail do Remetente" name="fromEmail" value={config.fromEmail} onChange={handleChange} size="small" helperText="Deve ser igual ao usuário SMTP" />
                                    </Grid>
                                </Grid>
                            </Grid>

                            <Grid item xs={12}>
                                <Divider sx={{ my: 3 }} />
                                <Typography variant="h6" gutterBottom>Regras de Notificação</Typography>
                                <Typography variant="caption" color="textSecondary" display="block" mb={2}>
                                    Selecione quais eventos geram e-mails. Desmarque para silenciar.
                                </Typography>

                                <Grid container spacing={2}>
                                    {Object.entries(moduleGroups).map(([module, events]) => (
                                        <Grid item xs={12} sm={6} md={4} key={module}>
                                            <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                                <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>
                                                    {module}
                                                </Typography>

                                                <Box flexGrow={1}>
                                                    <FormGroup>
                                                        {events.map((evt) => (
                                                            <FormControlLabel
                                                                key={evt.key}
                                                                control={
                                                                    <Checkbox
                                                                        checked={config.events?.[evt.key] !== false}
                                                                        onChange={handleEventChange}
                                                                        name={evt.key}
                                                                        size="small"
                                                                        sx={{ p: 0.5 }}
                                                                    />
                                                                }
                                                                label={<Typography variant="caption" sx={{ fontSize: '0.75rem' }}>{evt.label}</Typography>}
                                                                sx={{ mb: 0.5, ml: 0 }}
                                                            />
                                                        ))}
                                                    </FormGroup>
                                                </Box>

                                                <Divider sx={{ my: 1.5 }} />

                                                <TextField
                                                    label="E-mails em cópia (CC)"
                                                    placeholder="email1@g360.com, email2..."
                                                    size="small"
                                                    fullWidth
                                                    variant="outlined"
                                                    value={config.groups?.[module] || ''}
                                                    onChange={(e) => setConfig(prev => ({
                                                        ...prev,
                                                        groups: {
                                                            ...prev.groups,
                                                            [module]: e.target.value
                                                        }
                                                    }))}
                                                    InputLabelProps={{ shrink: true, style: { fontSize: '0.75rem' } }}
                                                    inputProps={{ style: { fontSize: '0.75rem' } }}
                                                    helperText={<span style={{ fontSize: '0.65rem' }}>Separar por vírgula</span>}
                                                />
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Grid>
                        </Grid>

                        <Box mt={3} display="flex" alignItems="center" gap={2}>
                            <Button variant="outlined" onClick={handleTest} disabled={testing}>
                                {testing ? <CircularProgress size={24} /> : 'Testar Conexão'}
                            </Button>
                            {testResult && (
                                <Typography color={testResult.success ? "success.main" : "error"}>
                                    {testResult.message}
                                </Typography>
                            )}
                        </Box>

                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave} variant="contained" disabled={loading}>
                    Salvar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SmtpConfigModal;
