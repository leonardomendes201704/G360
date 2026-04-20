
import React, { useState, useEffect, useContext } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, CardActions, Button, Chip, Divider
} from '@mui/material';
import { Settings, CheckCircle, Cancel, Cloud, Mail, VpnKey } from '@mui/icons-material';
import integrationService from '../../services/integration.service';
import AzureConfigModal from '../modals/AzureConfigModal';
import GoogleConfigModal from '../modals/GoogleConfigModal';
import SmtpConfigModal from '../modals/SmtpConfigModal';
import LdapConfigModal from '../modals/LdapConfigModal';
import { ThemeContext } from '../../contexts/ThemeContext';

const GoogleMark = () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3px', width: 28, height: 28 }}>
        <Box sx={{ bgcolor: '#4285F4', borderRadius: '2px' }} />
        <Box sx={{ bgcolor: '#EA4335', borderRadius: '2px' }} />
        <Box sx={{ bgcolor: '#FBBC05', borderRadius: '2px' }} />
        <Box sx={{ bgcolor: '#34A853', borderRadius: '2px' }} />
    </Box>
);

const AVAILABLE_INTEGRATIONS = [
    {
        type: 'AZURE',
        name: 'Microsoft Azure AD',
        description: 'Permite login com contas Microsoft corporativas e importação de usuários do Azure AD.',
        icon: <Cloud sx={{ fontSize: 36, color: '#0078D4' }} />,
        color: '#0078D4',
    },
    {
        type: 'GOOGLE',
        name: 'Google (OAuth)',
        description: 'Permite login com contas Google via OAuth 2.0 (Google Cloud Console).',
        icon: (
            <Box sx={{
                width: 48, height: 48, borderRadius: '8px',
                background: '#4285F415',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <GoogleMark />
            </Box>
        ),
        color: '#4285F4',
    },
    {
        type: 'SMTP',
        name: 'Servidor SMTP',
        description: 'Envio de notificações e emails do sistema via servidor SMTP configurável.',
        icon: <Mail sx={{ fontSize: 36, color: '#EA4335' }} />,
        color: '#EA4335',
    },
    {
        type: 'LDAP',
        name: 'AD Local (LDAP)',
        description: 'Sincronização e autenticação contra diretório LDAP / Active Directory no ambiente local.',
        icon: <VpnKey sx={{ fontSize: 36, color: '#6366f1' }} />,
        color: '#6366f1',
    },
];

const IntegrationsTab = () => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [azureModalOpen, setAzureModalOpen] = useState(false);
    const [googleModalOpen, setGoogleModalOpen] = useState(false);
    const [smtpModalOpen, setSmtpModalOpen] = useState(false);
    const [ldapModalOpen, setLdapModalOpen] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await integrationService.getAll();
            setIntegrations(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const getConfigured = (type) => integrations.find(i => i.type === type);

    const handleConfig = (type) => {
        if (type === 'AZURE') setAzureModalOpen(true);
        if (type === 'GOOGLE') setGoogleModalOpen(true);
        if (type === 'SMTP') setSmtpModalOpen(true);
        if (type === 'LDAP') setLdapModalOpen(true);
    };

    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textMuted = isDark ? '#64748b' : '#94a3b8';
    const cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#ffffff';
    const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.1)';

    return (
        <Box>
            <Grid container spacing={3}>
                {AVAILABLE_INTEGRATIONS.map((item) => {
                    const configured = getConfigured(item.type);
                    const isActive = configured?.isEnabled;

                    return (
                        <Grid size={{ xs: 12, sm: 4 }} key={item.type}>
                            <Card sx={{
                                height: '100%', display: 'flex', flexDirection: 'column',
                                background: cardBg,
                                border: `1px solid ${isActive ? item.color + '40' : cardBorder}`,
                                borderRadius: '8px',
                                boxShadow: 'none',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    borderColor: item.color + '60',
                                    transform: 'translateY(-2px)',
                                    boxShadow: `0 4px 20px ${item.color}15`,
                                },
                            }}>
                                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            {item.type === 'GOOGLE' ? (
                                                item.icon
                                            ) : (
                                            <Box sx={{
                                                width: 48, height: 48, borderRadius: '8px',
                                                background: item.color + '15',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {item.icon}
                                            </Box>
                                            )}
                                            <Box>
                                                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary }}>
                                                    {item.name}
                                                </Typography>
                                                <Chip
                                                    label={isActive ? 'Ativo' : configured ? 'Inativo' : 'Não configurado'}
                                                    size="small"
                                                    sx={{
                                                        mt: 0.5,
                                                        fontSize: '11px',
                                                        height: 22,
                                                        background: isActive ? '#10b98120' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                                                        color: isActive ? '#10b981' : textMuted,
                                                        border: 'none',
                                                    }}
                                                    icon={isActive
                                                        ? <CheckCircle sx={{ fontSize: 14, color: '#10b981 !important' }} />
                                                        : <Cancel sx={{ fontSize: 14, color: textMuted + ' !important' }} />
                                                    }
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                    <Typography sx={{ fontSize: '13px', color: textMuted, lineHeight: 1.6 }}>
                                        {item.description}
                                    </Typography>
                                    {configured && (
                                        <>
                                            <Divider sx={{ my: 2, borderColor: cardBorder }} />
                                            <Typography sx={{ fontSize: '11px', color: textMuted }}>
                                                Última sincronização: {configured.lastSync ? new Date(configured.lastSync).toLocaleString() : 'Nunca'}
                                            </Typography>
                                        </>
                                    )}
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                                    <Button
                                        data-testid={`integration-open-${item.type}`}
                                        size="small"
                                        variant={configured ? 'outlined' : 'contained'}
                                        startIcon={<Settings sx={{ fontSize: 16 }} />}
                                        onClick={() => handleConfig(item.type)}
                                        sx={{
                                            textTransform: 'none',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            ...(configured ? {} : {
                                                background: item.color,
                                                '&:hover': { background: item.color + 'dd' },
                                            }),
                                        }}
                                    >
                                        {configured ? 'Configurar' : 'Configurar Agora'}
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {azureModalOpen && (
                <AzureConfigModal
                    open={azureModalOpen}
                    onClose={() => setAzureModalOpen(false)}
                    onSuccess={loadData}
                />
            )}

            {googleModalOpen && (
                <GoogleConfigModal
                    open={googleModalOpen}
                    onClose={() => setGoogleModalOpen(false)}
                    onSuccess={loadData}
                />
            )}

            {smtpModalOpen && (
                <SmtpConfigModal
                    open={smtpModalOpen}
                    onClose={() => setSmtpModalOpen(false)}
                    onSuccess={loadData}
                />
            )}

            {ldapModalOpen && (
                <LdapConfigModal
                    open={ldapModalOpen}
                    onClose={() => setLdapModalOpen(false)}
                    onSuccess={loadData}
                />
            )}
        </Box>
    );
};

export default IntegrationsTab;
