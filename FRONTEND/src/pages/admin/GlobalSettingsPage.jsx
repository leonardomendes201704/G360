import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import {
    Box, Typography, Switch, Button, TextField, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, Chip, LinearProgress,
    Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';
import GlobalSettingService from '../../services/global-setting.service';
import api from '../../services/api';

// ═══════════════ Theme Helpers ═══════════════
const useGlobalTheme = () => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    return {
        isDark,
        textPrimary: isDark ? '#f1f5f9' : '#0f172a',
        textSecondary: isDark ? '#b0bec5' : '#475569',
        textMuted: isDark ? '#8899a6' : '#64748b',
        cardBg: isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#ffffff',
        cardBorder: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
        surfaceBg: isDark ? '#1c2632' : '#f1f5f9',
        inputBg: isDark ? 'rgba(28, 38, 50, 0.6)' : '#f8fafc',
        inputBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.15)',
        hoverBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.01)',
        divider: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
    };
};

const cardStyle = (t) => ({
    background: t.cardBg,
    border: t.cardBorder,
    borderRadius: '14px',
    p: 2.5,
    mb: 2.5,
    boxShadow: t.isDark
        ? '0 1px 2px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2)'
        : '0 1px 2px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.03)',
    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
});

const inputSx = (t) => ({
    '& .MuiOutlinedInput-root': {
        background: t.inputBg,
        borderRadius: '8px',
        fontSize: '14px',
        minHeight: '48px',
        '& fieldset': { borderColor: t.inputBorder },
        '&:hover fieldset': { borderColor: '#2563eb' },
        '&.Mui-focused fieldset': { borderColor: '#2563eb', borderWidth: '2px' },
    },
    '& .MuiInputLabel-root': { color: t.textSecondary, fontSize: '13px', fontWeight: 500 },
    '& .MuiInputLabel-root.Mui-focused': { color: '#2563eb' },
    '& .MuiOutlinedInput-input': { color: t.textPrimary, padding: '12px 14px' },
});

const saveBtnSx = {
    px: 3.5, py: 1.2, borderRadius: '10px', fontSize: '14px', fontWeight: 600,
    textTransform: 'none',
    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    color: '#fff', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
    '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' },
    '&:disabled': { opacity: 0.5, transform: 'none' },
};

// ═══════════════ Setting Row ═══════════════
const SettingRow = ({ setting, value, onChange, theme: t }) => {
    if (setting.valueType === 'BOOLEAN') {
        return (
            <Box sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                py: 1.5, px: 1.5, borderRadius: '8px',
                transition: 'background 0.15s ease',
                '&:hover': { background: t.hoverBg },
            }}>
                <Box sx={{ flex: 1, mr: 2 }}>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: t.textPrimary, lineHeight: 1.4 }}>
                        {setting.label}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: t.textMuted, mt: 0.3, lineHeight: 1.5 }}>
                        {setting.description}
                    </Typography>
                </Box>
                <Switch
                    checked={value === true || value === 'true'}
                    onChange={(e) => onChange(setting.key, e.target.checked ? 'true' : 'false')}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#2563eb' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#2563eb' } }}
                />
            </Box>
        );
    }

    return (
        <Box sx={{ py: 1 }}>
            <TextField
                label={setting.label}
                value={value ?? ''}
                onChange={(e) => onChange(setting.key, e.target.value)}
                fullWidth size="small"
                type={setting.valueType === 'NUMBER' ? 'number' : 'text'}
                helperText={setting.description}
                sx={{
                    ...inputSx(t),
                    '& .MuiFormHelperText-root': { color: t.textMuted, fontSize: '11px', mt: 0.5 },
                }}
                InputLabelProps={{ shrink: true }}
            />
        </Box>
    );
};

// ═══════════════ Section Header ═══════════════
const SectionHeader = React.memo(({ icon, title, subtitle, theme: t }) => (
    <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <span className="material-icons-round" style={{ fontSize: 22, color: '#2563eb' }}>{icon}</span>
            <Typography sx={{ fontSize: '18px', fontWeight: 700, color: t.textPrimary, letterSpacing: '-0.025em' }}>
                {title}
            </Typography>
        </Box>
        <Typography sx={{ fontSize: '13px', color: t.textMuted, ml: 4.5, lineHeight: 1.5 }}>
            {subtitle}
        </Typography>
    </Box>
));

// ═══════════════ Save Bar ═══════════════
const SaveBar = ({ saving, onSave }) => (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pt: 1.5 }}>
        <Button onClick={onSave} disabled={saving} sx={saveBtnSx}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <span className="material-icons-round" style={{ fontSize: 18 }}>save</span>}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
    </Box>
);

// ═══════════════ Empty State Prompt ═══════════════
const EmptySettingsPrompt = ({ onInitialize }) => {
    const t = useGlobalTheme();
    const [loading, setLoading] = useState(false);

    const handleInit = async () => {
        setLoading(true);
        await onInitialize();
        setLoading(false);
    };

    return (
        <Box sx={{ ...cardStyle(t), p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <span className="material-icons-round" style={{ fontSize: 48, color: '#f59e0b', marginBottom: '16px' }}>warning_amber</span>
            <Typography sx={{ fontSize: '18px', fontWeight: 600, color: t.textPrimary, mb: 1 }}>
                Biela de Configuração Vazia
            </Typography>
            <Typography sx={{ color: t.textMuted, fontSize: '14px', maxWidth: 400, mb: 4 }}>
                O banco de dados de sua empresa ainda não possui os Metadados globais. Gostaria de injetar automaticamente o esqueleto de infraestrutura G360 Enterprise?
            </Typography>
            <Button onClick={handleInit} disabled={loading} sx={{
                ...saveBtnSx, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 6px 16px rgba(16,185,129,0.4)' }
            }} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <span className="material-icons-round">offline_bolt</span>}>
                {loading ? 'Injetando...' : 'Injetar Parâmetros Padrão'}
            </Button>
        </Box>
    );
};

// ═══════════════ Tab: Geral ═══════════════
const GeneralTab = ({ settings, onSave, onInitialize }) => {
    const t = useGlobalTheme();
    const [local, setLocal] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            const map = {};
            settings.forEach(s => { map[s.key] = s.value; });
            setLocal(map);
        }
    }, [settings]);

    const handleChange = (key, value) => setLocal(prev => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        await onSave('GENERAL', local);
        setSaving(false);
    };

    if (!settings || settings.length === 0) return (
        <EmptySettingsPrompt onInitialize={onInitialize} />
    );

    return (
        <Box>
            <SectionHeader icon="tune" title="Configurações Gerais" subtitle="Defina o nome, idioma e comportamento padrão da plataforma." theme={t} />

            <Box sx={{ ...cardStyle(t), '&:hover': { borderColor: t.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)' } }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                    {settings.map(s => (
                        <Box key={s.key} sx={s.valueType === 'BOOLEAN' ? { gridColumn: '1 / -1' } : {}}>
                            <SettingRow setting={s} value={local[s.key]} onChange={handleChange} theme={t} />
                        </Box>
                    ))}
                </Box>
                <SaveBar saving={saving} onSave={handleSave} />
            </Box>
        </Box>
    );
};

// ═══════════════ Tab: SMTP ═══════════════
const SmtpTab = ({ settings, onSave, onInitialize }) => {
    const t = useGlobalTheme();
    const [local, setLocal] = useState({});
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        if (settings) {
            const map = {};
            settings.forEach(s => { map[s.key] = s.value; });
            setLocal(map);
        }
    }, [settings]);

    const handleChange = (key, value) => setLocal(prev => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        await onSave('SMTP', local);
        setSaving(false);
    };

    const handleTestSmtp = async () => {
        setTesting(true);
        try {
            const res = await GlobalSettingService.testSmtp();
            enqueueSnackbar(res.data?.message || 'Email de teste enviado!', { variant: 'success' });
        } catch (err) {
            enqueueSnackbar(err.response?.data?.message || 'Falha no teste SMTP.', { variant: 'error' });
        }
        setTesting(false);
    };

    if (!settings || settings.length === 0) return (
        <EmptySettingsPrompt onInitialize={onInitialize} />
    );

    return (
        <Box>
            <SectionHeader icon="email" title="Configuração de Email (SMTP)" subtitle="Configure o servidor SMTP para envio de notificações e alertas." theme={t} />

            <Box sx={{ ...cardStyle(t), '&:hover': { borderColor: t.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)' } }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                    {settings.map(s => (
                        <Box key={s.key} sx={s.valueType === 'BOOLEAN' ? { gridColumn: '1 / -1' } : {}}>
                            <SettingRow setting={s} value={local[s.key]} onChange={handleChange} theme={t} />
                        </Box>
                    ))}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3, pt: 2, borderTop: `1px solid ${t.divider}` }}>
                    <Button onClick={handleTestSmtp} disabled={testing} sx={{
                        ...saveBtnSx,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        '&:hover': { boxShadow: '0 6px 16px rgba(16, 185, 129, 0.4)', transform: 'translateY(-1px)' },
                    }}
                        startIcon={testing ? <CircularProgress size={16} color="inherit" /> : <span className="material-icons-round" style={{ fontSize: 18 }}>send</span>}>
                        {testing ? 'Enviando...' : 'Testar Envio'}
                    </Button>
                    <Button onClick={handleSave} disabled={saving} sx={saveBtnSx}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <span className="material-icons-round" style={{ fontSize: 18 }}>save</span>}>
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

// ═══════════════ Tab: Auth ═══════════════
const AuthTab = ({ settings, onSave, onInitialize }) => {
    const t = useGlobalTheme();
    const [local, setLocal] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            const map = {};
            settings.forEach(s => { map[s.key] = s.value; });
            setLocal(map);
        }
    }, [settings]);

    const handleChange = (key, value) => setLocal(prev => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        await onSave('AUTH', local);
        setSaving(false);
    };

    if (!settings || settings.length === 0) return (
        <EmptySettingsPrompt onInitialize={onInitialize} />
    );

    return (
        <Box>
            <SectionHeader icon="lock" title="Autenticação & Segurança" subtitle="Defina políticas de senha, bloqueio de conta e autenticação SSO." theme={t} />

            <Box sx={{ ...cardStyle(t), '&:hover': { borderColor: t.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)' } }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                    {settings.map(s => (
                        <Box key={s.key} sx={s.valueType === 'BOOLEAN' ? { gridColumn: '1 / -1' } : {}}>
                            <SettingRow setting={s} value={local[s.key]} onChange={handleChange} theme={t} />
                        </Box>
                    ))}
                </Box>
                <SaveBar saving={saving} onSave={handleSave} />
            </Box>
        </Box>
    );
};


// ═══════════════ Tab: Manutenção ═══════════════
const MaintenanceTab = ({ settings, onSave, onInitialize }) => {
    const t = useGlobalTheme();
    const [local, setLocal] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            const map = {};
            settings.forEach(s => { map[s.key] = s.value; });
            setLocal(map);
        }
    }, [settings]);

    const handleChange = (key, value) => setLocal(prev => ({ ...prev, [key]: value }));
    const isMaintenanceOn = local.maintenance_mode === 'true';

    const handleSave = async () => {
        setSaving(true);
        await onSave('MAINTENANCE', local);
        setSaving(false);
    };

    if (!settings || settings.length === 0) return (
        <EmptySettingsPrompt onInitialize={onSave} />
    );

    return (
        <Box>
            <SectionHeader icon="engineering" title="Modo Manutenção" subtitle="Quando ativado, uma mensagem será exibida para todos os usuários da plataforma." theme={t} />

            {/* Main toggle card */}
            <Box sx={{
                ...cardStyle(t),
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                border: isMaintenanceOn ? '2px solid #f59e0b' : t.cardBorder,
                background: isMaintenanceOn ? (t.isDark ? 'linear-gradient(145deg, #2a2210 0%, #1a1608 100%)' : 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)') : t.cardBg,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 52, height: 52, borderRadius: '14px',
                        background: isMaintenanceOn ? 'rgba(245, 158, 11, 0.2)' : t.surfaceBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span className="material-icons-round" style={{
                            fontSize: 28,
                            color: isMaintenanceOn ? '#f59e0b' : t.textMuted,
                        }}>{isMaintenanceOn ? 'engineering' : 'build_circle'}</span>
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '16px', fontWeight: 700, color: t.textPrimary }}>
                            {isMaintenanceOn ? '⚠️ Manutenção Ativa' : 'Manutenção Desativada'}
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: t.textMuted }}>
                            {isMaintenanceOn ? 'Os usuários estão vendo a mensagem de manutenção.' : 'A plataforma está operando normalmente.'}
                        </Typography>
                    </Box>
                </Box>
                <Switch
                    checked={isMaintenanceOn}
                    onChange={(e) => handleChange('maintenance_mode', e.target.checked ? 'true' : 'false')}
                    sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#f59e0b' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#f59e0b' },
                    }}
                />
            </Box>

            {/* Message & End Time */}
            <Box sx={{ ...cardStyle(t), '&:hover': { borderColor: t.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)' } }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: t.textPrimary, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span className="material-icons-round" style={{ fontSize: 18, color: '#2563eb' }}>message</span>
                    Mensagem para os Usuários
                </Typography>
                <TextField
                    value={local.maintenance_message ?? ''}
                    onChange={(e) => handleChange('maintenance_message', e.target.value)}
                    fullWidth multiline rows={3} size="small"
                    placeholder="Informe a mensagem exibida durante a manutenção..."
                    sx={inputSx(t)}
                />

                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: t.textPrimary, mt: 3, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span className="material-icons-round" style={{ fontSize: 18, color: '#2563eb' }}>schedule</span>
                    Previsão de Término
                </Typography>
                <TextField
                    type="datetime-local"
                    value={local.maintenance_end_time ?? ''}
                    onChange={(e) => handleChange('maintenance_end_time', e.target.value)}
                    size="small" sx={{ ...inputSx(t), maxWidth: 300 }}
                    InputLabelProps={{ shrink: true }}
                />

                <SaveBar saving={saving} onSave={handleSave} />
            </Box>
        </Box>
    );
};

const GLOBAL_TAB_IDS = ['geral', 'smtp', 'auth', 'manutencao'];
const isValidGlobalTab = (t) => GLOBAL_TAB_IDS.includes(t);

// ═══════════════ Main Page ═══════════════
const GlobalSettingsPage = () => {
    const { user, loading: authLoading } = useContext(AuthContext);
    const t = useGlobalTheme();
    const { enqueueSnackbar } = useSnackbar();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window === 'undefined') return 'geral';
        const tab = new URLSearchParams(window.location.search).get('tab');
        return tab && isValidGlobalTab(tab) ? tab : 'geral';
    });
    const [allSettings, setAllSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await GlobalSettingService.getAll();
            setAllSettings(res.data);
        } catch (err) {
            enqueueSnackbar('Erro ao carregar configurações.', { variant: 'error' });
        }
        setLoading(false);
    }, [enqueueSnackbar]);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && isValidGlobalTab(tab)) setActiveTab(tab);
    }, [searchParams]);

    const selectTab = (id) => {
        setActiveTab(id);
        if (id === 'geral') {
            setSearchParams({}, { replace: true });
        } else {
            setSearchParams({ tab: id }, { replace: true });
        }
    };

    const handleInitialize = async () => {
        try {
            await api.post('/global-settings/initialize');
            enqueueSnackbar('Parâmetros padrões injetados com sucesso!', { variant: 'success' });
            await fetchSettings();
        } catch (err) {
            enqueueSnackbar('Falha ao inicializar o servidor de configurações.', { variant: 'error' });
        }
    };

    const handleSave = async (category, localValues) => {
        try {
            const settings = Object.entries(localValues).map(([key, value]) => ({
                category,
                key,
                value: typeof value === 'object' ? JSON.stringify(value) : String(value),
            }));
            await GlobalSettingService.update(settings);
            await fetchSettings();
            enqueueSnackbar('Configurações salvas com sucesso!', { variant: 'success' });
        } catch (err) {
            enqueueSnackbar(err.response?.data?.message || 'Erro ao salvar.', { variant: 'error' });
        }
    };

    const tabs = [
        { id: 'geral', label: 'Geral', icon: 'tune' },
        { id: 'smtp', label: 'Email (SMTP)', icon: 'email' },
        { id: 'auth', label: 'Autenticação', icon: 'lock' },

        { id: 'manutencao', label: 'Manutenção', icon: 'engineering' },
    ];

    const renderContent = () => {
        if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;

        switch (activeTab) {
            case 'geral': return <GeneralTab settings={allSettings?.GENERAL} onSave={handleSave} onInitialize={handleInitialize} />;
            case 'smtp': return <SmtpTab settings={allSettings?.SMTP} onSave={handleSave} onInitialize={handleInitialize} />;
            case 'auth': return <AuthTab settings={allSettings?.AUTH} onSave={handleSave} onInitialize={handleInitialize} />;

            case 'manutencao': return <MaintenanceTab settings={allSettings?.MAINTENANCE} onSave={handleSave} onInitialize={handleInitialize} />;
            default: return null;
        }
    };

    // Override page-content padding to prevent scrollbar (must match theme selector specificity)
    useEffect(() => {
        const style = document.createElement('style');
        style.id = 'settings-page-fix';
        style.textContent = `
            html { overflow: hidden !important; }
            .page-content.dark-premium-theme,
            .page-content.light-premium-theme,
            .page-content {
                padding-bottom: 0px !important;
                padding-top: 24px !important;
            }
        `;
        document.head.appendChild(style);
        return () => { style.remove(); };
    }, []);

    const roles = user?.roles || (user?.role ? [user.role] : []);
    const roleNames = roles.map((r) => (typeof r === 'string' ? r : r.name));
    const isGlobalSuperAdmin = roleNames.includes('Super Admin') && user?.schema === 'public';

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;
    }
    if (!isGlobalSuperAdmin) {
        return <Navigate to="/config/organization" replace />;
    }

    return (
        <div>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                <Box sx={{
                    width: 44, height: 44, borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span className="material-icons-round" style={{ fontSize: 24, color: '#2563eb' }}>admin_panel_settings</span>
                </Box>
                <Box>
                    <Typography sx={{ fontSize: '22px', fontWeight: 700, color: t.textPrimary, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                        Configurações Globais
                    </Typography>
                    <Typography sx={{ color: t.textMuted, fontSize: '14px', mt: 0.3, lineHeight: 1.5 }}>
                        Gerencie configurações da plataforma, email, segurança e módulos
                    </Typography>
                </Box>
            </Box>

            {/* Tabs */}
            <Box sx={{
                display: 'flex', gap: 0.5, mb: 3, overflowX: 'auto',
                pb: 1,
                borderBottom: `1px solid ${t.divider}`,
                scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
            }}>
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => selectTab(tab.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '10px 20px', borderRadius: '10px',
                                fontSize: '13px', fontWeight: isActive ? 700 : 500,
                                border: 'none', cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease',
                                background: isActive
                                    ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                                    : 'transparent',
                                color: isActive ? '#fff' : (t.isDark ? '#8899a6' : '#64748b'),
                                boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                                letterSpacing: '0.01em',
                            }}
                            onMouseEnter={(e) => { if (!isActive) e.target.style.background = t.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'; }}
                            onMouseLeave={(e) => { if (!isActive) e.target.style.background = 'transparent'; }}
                        >
                            <span className="material-icons-round" style={{ fontSize: 18 }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    );
                })}
            </Box>

            {/* Content */}
            {renderContent()}
        </div>
    );
};

export default GlobalSettingsPage;
