import React, { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { Box, Typography, Dialog, IconButton, CircularProgress, Chip } from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';
import { useSnackbar } from 'notistack';

const TenantAdminPage = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [editTenant, setEditTenant] = useState(null);
    const [saving, setSaving] = useState(false);
    const [poolStats, setPoolStats] = useState(null);

    const { mode } = useContext(ThemeContext);
    const { enqueueSnackbar } = useSnackbar();
    const isDark = mode === 'dark';

    // ── Color Tokens ──
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#475569';
    const textMuted = isDark ? '#64748b' : '#64748b';
    const cardBg = isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#ffffff';
    const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)';
    const surfaceBg = isDark ? '#1c2632' : '#f1f5f9';
    const inputBg = isDark ? '#1c2632' : '#ffffff';
    const inputBorder = isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.12)';
    const modalShadow = isDark ? '0 20px 60px rgba(0, 0, 0, 0.6)' : '0 20px 60px rgba(15, 23, 42, 0.15)';

    const cardStyle = { background: cardBg, border: cardBorder, borderRadius: '16px' };

    const inputStyle = {
        width: '100%', padding: '12px 14px', background: inputBg, border: inputBorder,
        borderRadius: '10px', fontSize: '14px', color: textPrimary, outline: 'none',
        fontFamily: 'inherit', boxSizing: 'border-box',
    };

    const labelStyle = {
        display: 'block', fontSize: '12px', fontWeight: 600, color: textSecondary,
        marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px',
    };

    // ── Fetch ──
    const fetchTenants = async () => {
        setLoading(true);
        try {
            const res = await api.get('/tenants');
            setTenants(res.data.data || []);
        } catch (err) {
            console.error('Erro ao listar tenants:', err);
            enqueueSnackbar('Erro ao listar tenants.', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchPoolStats = async () => {
        try {
            const res = await api.get('/tenants/pool-stats');
            setPoolStats(res.data.data);
        } catch (err) {
            console.error('Erro ao buscar pool stats:', err);
        }
    };

    useEffect(() => { fetchTenants(); fetchPoolStats(); }, []);

    // ── CRUD ──
    const handleCreate = async (formData) => {
        setSaving(true);
        try {
            await api.post('/tenants', formData);
            enqueueSnackbar('Tenant criado e provisionado com sucesso!', { variant: 'success' });
            setCreateOpen(false);
            fetchTenants();
            fetchPoolStats();
        } catch (err) {
            const msg = err.response?.data?.message || 'Erro ao criar tenant.';
            enqueueSnackbar(msg, { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (id, formData) => {
        setSaving(true);
        try {
            await api.put(`/tenants/${id}`, formData);
            enqueueSnackbar('Tenant atualizado com sucesso!', { variant: 'success' });
            setEditTenant(null);
            fetchTenants();
        } catch (err) {
            const msg = err.response?.data?.message || 'Erro ao atualizar tenant.';
            enqueueSnackbar(msg, { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (tenant) => {
        const action = tenant.isActive ? 'desativar' : 'ativar';
        if (!window.confirm(`Deseja ${action} o tenant "${tenant.name}"?`)) return;

        try {
            if (tenant.isActive) {
                await api.delete(`/tenants/${tenant.id}`);
            } else {
                await api.put(`/tenants/${tenant.id}`, { isActive: true });
            }
            enqueueSnackbar(`Tenant ${action === 'desativar' ? 'desativado' : 'ativado'}!`, { variant: 'success' });
            fetchTenants();
        } catch (err) {
            enqueueSnackbar(`Erro ao ${action} tenant.`, { variant: 'error' });
        }
    };

    // ── Plan defaults & badges ──
    const planDefaults = { STARTER: 15, STANDARD: 50, PLUS: 100, ENTERPRISE: 1000 };
    const planColors = {
        STARTER: { bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' },
        STANDARD: { bg: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' },
        PLUS: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
        ENTERPRISE: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    };

    // ── Create/Edit Modal ──
    const TenantFormModal = ({ open, onClose, tenant = null }) => {
        const normalizeEnabledModules = (mods) =>
            (mods || []).map((k) => (k === 'KNOWLEDGE_BASE' ? 'KB' : k));

        const ALL_MODULES = [
            { key: 'PROJECTS', label: 'Projetos', icon: 'rocket_launch', color: '#f472b6' },
            { key: 'TASKS', label: 'Tarefas', icon: 'task_alt', color: '#60a5fa' },
            { key: 'FINANCE', label: 'Financeiro', icon: 'attach_money', color: '#fbbf24' },
            { key: 'SUPPLIERS', label: 'Fornecedores', icon: 'local_shipping', color: '#34d399' },
            { key: 'CONTRACTS', label: 'Contratos', icon: 'description', color: '#a78bfa' },
            { key: 'ASSETS', label: 'Ativos e Licenças', icon: 'devices', color: '#2dd4bf' },
            { key: 'GMUD', label: 'Gestão de Mudança', icon: 'swap_horiz', color: '#fb923c' },
            { key: 'INCIDENT', label: 'Incidentes', icon: 'warning', color: '#f87171' },
            { key: 'HELPDESK', label: 'Help Desk / Suporte', icon: 'support_agent', color: '#14b8a6' },

            { key: 'APPROVALS', label: 'Aprovações', icon: 'how_to_reg', color: '#38bdf8' },
            { key: 'KB', label: 'Base de Conhecimento', icon: 'menu_book', color: '#c084fc' },
            { key: 'PROBLEM', label: 'Gestão de Problemas', icon: 'bug_report', color: '#a855f7' },
            { key: 'ACTIVITY_LOG', label: 'Atividade Recente', icon: 'history', color: '#94a3b8' },
            { key: 'RISKS', label: 'Riscos & Compliance', icon: 'shield', color: '#f43f5e' },
            { key: 'CONFIG', label: 'Configurações', icon: 'settings', color: '#94a3b8' },
        ];

        const [form, setForm] = useState({
            name: tenant?.name || '',
            slug: tenant?.slug || '',
            plan: tenant?.plan || 'STANDARD',
            maxUsers: tenant?.maxUsers || 50,
            adminEmail: '',
            adminPassword: '',
            adminName: '',
            enabledModules: normalizeEnabledModules(tenant?.enabledModules || []),
        });
        const [loadingAdmin, setLoadingAdmin] = useState(false);

        const isEdit = !!tenant;

        // Fetch admin user data when editing
        useEffect(() => {
            if (isEdit && tenant?.id) {
                setLoadingAdmin(true);
                api.get(`/tenants/${tenant.id}/admin`)
                    .then(res => {
                        const admin = res.data?.data;
                        if (admin) {
                            setForm(prev => ({
                                ...prev,
                                adminEmail: admin.email || '',
                                adminName: admin.name || '',
                            }));
                        }
                    })
                    .catch(() => { })
                    .finally(() => setLoadingAdmin(false));
            }
        }, []);

        const handleSubmit = async (e) => {
            e.preventDefault();
            if (isEdit) {
                // Update tenant data
                handleUpdate(tenant.id, {
                    name: form.name, plan: form.plan, maxUsers: parseInt(form.maxUsers),
                    enabledModules: form.enabledModules.length > 0 ? form.enabledModules : null,
                });
                // Update admin if changed
                const adminPayload = {};
                if (form.adminEmail) adminPayload.email = form.adminEmail;
                if (form.adminName) adminPayload.name = form.adminName;
                if (form.adminPassword) adminPayload.password = form.adminPassword;
                if (Object.keys(adminPayload).length > 0) {
                    try {
                        await api.put(`/tenants/${tenant.id}/admin`, adminPayload);
                    } catch (err) {
                        enqueueSnackbar('Erro ao atualizar admin.', { variant: 'error' });
                    }
                }
            } else {
                handleCreate({
                    name: form.name, slug: form.slug, plan: form.plan,
                    maxUsers: parseInt(form.maxUsers),
                    adminEmail: form.adminEmail || undefined,
                    adminPassword: form.adminPassword || undefined,
                });
            }
        };

        return (
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth={false}
                PaperProps={{
                    sx: {
                        background: cardBg, border: cardBorder, borderRadius: '24px',
                        width: '100%', maxWidth: isEdit ? '680px' : '560px', overflow: 'hidden',
                        boxShadow: modalShadow,
                    }
                }}
                BackdropProps={{ sx: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.7)' } }}
            >
                {/* Header */}
                <div style={{ padding: '24px 32px', borderBottom: cardBorder, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-icons-round" style={{ fontSize: '24px', color: '#2563eb' }}>
                                {isEdit ? 'edit' : 'domain_add'}
                            </span>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>
                            {isEdit ? 'Editar Tenant' : 'Novo Tenant'}
                        </div>
                    </div>
                    <IconButton onClick={onClose} sx={{ color: textSecondary, '&:hover': { color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)' } }}>
                        <span className="material-icons-round">close</span>
                    </IconButton>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit}>
                    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
                        <div>
                            <label style={labelStyle}>Nome da Empresa *</label>
                            <input
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Ex: Empresa Alpha Ltda"
                                style={inputStyle}
                            />
                        </div>

                        {/* Slug - editable on create, read-only on edit */}
                        {!isEdit ? (
                            <div>
                                <label style={labelStyle}>Slug (identificador único) *</label>
                                <input
                                    required
                                    value={form.slug}
                                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                                    placeholder="Ex: empresa-alpha"
                                    style={inputStyle}
                                />
                                <div style={{ fontSize: '11px', color: textMuted, marginTop: '4px' }}>
                                    Schema: tenant_{form.slug?.replace(/-/g, '_') || '...'}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Slug</label>
                                    <div style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="material-icons-round" style={{ fontSize: 16, color: textMuted }}>link</span>
                                        {tenant.slug}
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Schema</label>
                                    <div style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace' }}>
                                        <span className="material-icons-round" style={{ fontSize: 16, color: textMuted }}>database</span>
                                        {tenant.schemaName}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={labelStyle}>Plano</label>
                                <select
                                    value={form.plan}
                                    onChange={(e) => {
                                        const plan = e.target.value;
                                        setForm({ ...form, plan, maxUsers: planDefaults[plan] || 50 });
                                    }}
                                    style={{ ...inputStyle, cursor: 'pointer' }}
                                >
                                    <option value="STARTER">Starter (15 usuários)</option>
                                    <option value="STANDARD">Standard (50 usuários)</option>
                                    <option value="PLUS">Plus (100 usuários)</option>
                                    <option value="ENTERPRISE">Enterprise (1000 usuários)</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Máx. Usuários</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={form.maxUsers}
                                    onChange={(e) => setForm({ ...form, maxUsers: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* Admin Section - both create and edit */}
                        <>
                            <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)', margin: '4px 0' }} />
                            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: textMuted, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <span className="material-icons-round" style={{ fontSize: 16 }}>{isEdit ? 'manage_accounts' : 'person_add'}</span>
                                {isEdit ? 'Admin do Tenant' : 'Admin do Tenant (opcional)'}
                                {loadingAdmin && <CircularProgress size={12} sx={{ ml: 1, color: textMuted }} />}
                            </Typography>

                            {isEdit && (
                                <div>
                                    <label style={labelStyle}>Nome do Admin</label>
                                    <input
                                        value={form.adminName}
                                        onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                                        placeholder="Nome do administrador"
                                        style={inputStyle}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Email do Admin</label>
                                    <input
                                        type="email"
                                        value={form.adminEmail}
                                        onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                                        placeholder={isEdit ? 'email@tenant.com' : `admin@${form.slug || 'slug'}.com`}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>{isEdit ? 'Nova Senha (deixe vazio p/ manter)' : 'Senha do Admin'}</label>
                                    <input
                                        type="password"
                                        value={form.adminPassword}
                                        onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                                        placeholder={isEdit ? '••••••••' : 'Padrão: admin123'}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        </>

                        {/* Module Toggle Section (edit only) */}
                        {isEdit && (
                            <>
                                <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)', margin: '4px 0' }} />
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: textMuted, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <span className="material-icons-round" style={{ fontSize: 16 }}>extension</span>
                                        Módulos Habilitados
                                    </Typography>
                                    <Typography
                                        onClick={() => {
                                            if (form.enabledModules.length === ALL_MODULES.length) {
                                                setForm({ ...form, enabledModules: [] });
                                            } else {
                                                setForm({ ...form, enabledModules: ALL_MODULES.map(m => m.key) });
                                            }
                                        }}
                                        sx={{ fontSize: '11px', color: '#2563eb', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                                    >
                                        {form.enabledModules.length === ALL_MODULES.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                    </Typography>
                                </div>
                                <Typography sx={{ fontSize: '11px', color: textMuted, mb: 0.5 }}>
                                    {form.enabledModules.length === 0 ? 'Nenhum limite — todos os módulos ativos' : `${form.enabledModules.length} de ${ALL_MODULES.length} módulos selecionados`}
                                </Typography>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    {ALL_MODULES.map(mod => {
                                        const isActive = form.enabledModules.length === 0 || form.enabledModules.includes(mod.key);
                                        const toggleModule = () => {
                                            let updated;
                                            if (form.enabledModules.length === 0) {
                                                // First click: select all except this one
                                                updated = ALL_MODULES.map(m => m.key).filter(k => k !== mod.key);
                                            } else if (form.enabledModules.includes(mod.key)) {
                                                updated = form.enabledModules.filter(k => k !== mod.key);
                                            } else {
                                                updated = [...form.enabledModules, mod.key];
                                            }
                                            setForm({ ...form, enabledModules: updated });
                                        };
                                        return (
                                            <div
                                                key={mod.key}
                                                onClick={toggleModule}
                                                style={{
                                                    padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                    background: isActive ? `${mod.color}15` : (isDark ? '#1c2632' : '#f8fafc'),
                                                    border: `1px solid ${isActive ? `${mod.color}40` : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)')}`,
                                                    transition: 'all 0.15s',
                                                    opacity: isActive ? 1 : 0.5,
                                                }}
                                            >
                                                <span className="material-icons-round" style={{ fontSize: 18, color: isActive ? mod.color : textMuted }}>
                                                    {mod.icon}
                                                </span>
                                                <span style={{ fontSize: '12px', fontWeight: 500, color: isActive ? textPrimary : textMuted, flex: 1 }}>
                                                    {mod.label}
                                                </span>
                                                <span className="material-icons-round" style={{ fontSize: 16, color: isActive ? '#10b981' : textMuted }}>
                                                    {isActive ? 'check_circle' : 'radio_button_unchecked'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '20px 32px', borderTop: cardBorder, display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '12px 24px', background: surfaceBg, color: textSecondary,
                                border: inputBorder, borderRadius: '10px', cursor: 'pointer', fontWeight: 500,
                                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px',
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                padding: '12px 28px', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                color: 'white', border: 'none', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer',
                                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px',
                                opacity: saving ? 0.7 : 1, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                            }}
                        >
                            {saving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : (
                                <span className="material-icons-round" style={{ fontSize: 18 }}>{isEdit ? 'save' : 'add'}</span>
                            )}
                            {isEdit ? 'Salvar' : 'Criar Tenant'}
                        </button>
                    </div>
                </form>
            </Dialog>
        );
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ ...cardStyle, mb: 3, p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 48, height: 48, borderRadius: '12px',
                        background: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(37, 99, 235, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb',
                    }}>
                        <span className="material-icons-round" style={{ fontSize: '24px' }}>domain</span>
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>
                            Gerenciamento de Tenants
                        </Typography>
                        <Typography sx={{ color: textMuted, fontSize: '14px' }}>
                            Provisionar e administrar organizações multi-tenant
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <button
                        onClick={() => { fetchTenants(); fetchPoolStats(); }}
                        style={{
                            padding: '10px 18px', background: surfaceBg, border: inputBorder,
                            borderRadius: '10px', color: textSecondary, cursor: 'pointer', fontWeight: 500,
                            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px',
                        }}
                    >
                        <span className="material-icons-round" style={{ fontSize: 18 }}>refresh</span>
                        Atualizar
                    </button>
                    <button
                        onClick={() => setCreateOpen(true)}
                        style={{
                            padding: '10px 20px', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                            color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                        }}
                    >
                        <span className="material-icons-round" style={{ fontSize: 18 }}>add</span>
                        Novo Tenant
                    </button>
                </Box>
            </Box>

            {/* Pool Stats Cards */}
            {poolStats && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2.5, mb: 3 }}>
                    {[
                        { label: 'Total de Tenants', value: tenants.length, icon: 'domain', color: '#2563eb' },
                        { label: 'Tenants Ativos', value: tenants.filter(t => t.isActive).length, icon: 'check_circle', color: '#10b981' },
                        { label: 'Clients no Pool', value: poolStats.activeClients || 0, icon: 'storage', color: '#06b6d4' },
                        { label: 'Uptime Pool', value: poolStats.uptime || 'N/A', icon: 'timer', color: '#f59e0b' },
                    ].map((kpi, i) => (
                        <Box key={i} sx={{
                            ...cardStyle, p: 3, display: 'flex', alignItems: 'center', gap: 2.5,
                            transition: 'all 0.2s', '&:hover': { transform: 'translateY(-3px)' },
                        }}>
                            <Box sx={{
                                width: 52, height: 52, borderRadius: '12px',
                                background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <span className="material-icons-round" style={{ fontSize: '26px', color: kpi.color }}>{kpi.icon}</span>
                            </Box>
                            <Box>
                                <Typography sx={{ color: textMuted, fontSize: '13px' }}>{kpi.label}</Typography>
                                <Typography sx={{ color: textPrimary, fontSize: '28px', fontWeight: 700, lineHeight: 1.1 }}>{kpi.value}</Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>
            )}

            {/* Tenant List */}
            <Box sx={{ ...cardStyle, overflow: 'hidden' }}>
                <Box sx={{ p: 2.5, borderBottom: cardBorder, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span className="material-icons-round" style={{ fontSize: '20px', color: '#2563eb' }}>list</span>
                        Tenants Registrados
                        <span style={{ fontSize: '13px', color: textMuted, fontWeight: 400, marginLeft: '8px' }}>
                            ({tenants.length})
                        </span>
                    </Typography>
                </Box>

                {/* Table Header */}
                <Box sx={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px',
                    gap: 2, p: '12px 24px', background: surfaceBg, borderBottom: cardBorder,
                }}>
                    {['Tenant', 'Slug / Schema', 'Plano', 'Usuários', 'Status', 'Ações'].map(h => (
                        <Typography key={h} sx={{ fontSize: '11px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {h}
                        </Typography>
                    ))}
                </Box>

                {loading ? (
                    <Box sx={{ p: 6, textAlign: 'center' }}>
                        <CircularProgress size={32} sx={{ color: '#2563eb' }} />
                    </Box>
                ) : tenants.length === 0 ? (
                    <Box sx={{ p: 6, textAlign: 'center' }}>
                        <span className="material-icons-round" style={{ fontSize: '48px', color: textMuted }}>domain_disabled</span>
                        <Typography sx={{ color: textSecondary, fontSize: '16px', mt: 2 }}>Nenhum tenant cadastrado</Typography>
                        <Typography sx={{ color: textMuted, fontSize: '13px', mt: 0.5 }}>Clique em "Novo Tenant" para começar</Typography>
                    </Box>
                ) : (
                    tenants.map((tenant) => {
                        const planColor = planColors[tenant.plan] || planColors.STANDARD;
                        return (
                            <Box
                                key={tenant.id}
                                sx={{
                                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px',
                                    gap: 2, p: '16px 24px', borderBottom: cardBorder,
                                    transition: 'all 0.15s', cursor: 'pointer',
                                    '&:hover': { background: surfaceBg },
                                    opacity: tenant.isActive ? 1 : 0.6,
                                }}
                            >
                                {/* Name */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{
                                        width: 40, height: 40, borderRadius: '10px',
                                        background: tenant.isActive ? 'rgba(37, 99, 235, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <span className="material-icons-round" style={{
                                            fontSize: 20, color: tenant.isActive ? '#2563eb' : textMuted,
                                        }}>
                                            {tenant.isActive ? 'domain' : 'domain_disabled'}
                                        </span>
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary }}>{tenant.name}</Typography>
                                        <Typography sx={{ fontSize: '11px', color: textMuted }}>
                                            {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Slug/Schema */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 500, color: textPrimary }}>{tenant.slug}</Typography>
                                    <Typography sx={{ fontSize: '11px', color: textMuted, fontFamily: 'monospace' }}>{tenant.schemaName}</Typography>
                                </Box>

                                {/* Plan */}
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Chip
                                        label={tenant.plan}
                                        size="small"
                                        sx={{
                                            background: planColor.bg, color: planColor.color,
                                            fontWeight: 600, fontSize: '11px', height: 24,
                                            border: `1px solid ${planColor.color}30`,
                                        }}
                                    />
                                </Box>

                                {/* Max Users */}
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: textPrimary }}>
                                        {tenant.maxUsers}
                                    </Typography>
                                </Box>

                                {/* Status */}
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box sx={{
                                        display: 'flex', alignItems: 'center', gap: 0.5,
                                        padding: '4px 10px', borderRadius: '20px',
                                        background: tenant.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                                        border: `1px solid ${tenant.isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                                    }}>
                                        <Box sx={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: tenant.isActive ? '#10b981' : '#f43f5e',
                                        }} />
                                        <Typography sx={{
                                            fontSize: '11px', fontWeight: 600,
                                            color: tenant.isActive ? '#10b981' : '#f43f5e',
                                        }}>
                                            {tenant.isActive ? 'Ativo' : 'Inativo'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Actions */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <IconButton
                                        onClick={(e) => { e.stopPropagation(); setEditTenant(tenant); }}
                                        size="small"
                                        sx={{ color: textSecondary, '&:hover': { color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)' } }}
                                    >
                                        <span className="material-icons-round" style={{ fontSize: 18 }}>edit</span>
                                    </IconButton>
                                    <IconButton
                                        onClick={(e) => { e.stopPropagation(); handleToggleActive(tenant); }}
                                        size="small"
                                        sx={{
                                            color: textSecondary,
                                            '&:hover': {
                                                color: tenant.isActive ? '#f43f5e' : '#10b981',
                                                background: tenant.isActive ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                            }
                                        }}
                                    >
                                        <span className="material-icons-round" style={{ fontSize: 18 }}>
                                            {tenant.isActive ? 'block' : 'check_circle'}
                                        </span>
                                    </IconButton>
                                </Box>
                            </Box>
                        );
                    })
                )}
            </Box>

            {/* Create Modal */}
            {createOpen && (
                <TenantFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
            )}

            {/* Edit Modal */}
            {editTenant && (
                <TenantFormModal open={!!editTenant} onClose={() => setEditTenant(null)} tenant={editTenant} />
            )}
        </Box>
    );
};

export default TenantAdminPage;
