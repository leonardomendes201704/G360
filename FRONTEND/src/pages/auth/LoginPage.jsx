import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Box, Typography, CircularProgress, IconButton, Tooltip, useMediaQuery } from '@mui/material';
import { AuthContext } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import api from '../../services/api';
import logoLight from '../../assets/g360_logo_light.png';
import logoDark from '../../assets/g360_logo_dark.png';
import splitBg from '../../assets/Governanca-de-TI.webp';

const validationSchema = Yup.object().shape({
  email: Yup.string().email('Email inválido').required('Email é obrigatório'),
  password: Yup.string().required('Senha é obrigatória'),
});

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const { mode, toggleTheme } = useContext(ThemeContext);
  const isDark = mode === 'dark';
  const isMobile = useMediaQuery('(max-width:900px)');

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [integrations, setIntegrations] = useState([]);
  const [searchParams] = useSearchParams();
  const tenantSlugFromUrl = searchParams.get('tenant') || null;

  // Multi-tenant selection state
  const [tenantOptions, setTenantOptions] = useState(null);
  const [pendingCredentials, setPendingCredentials] = useState(null);

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema,
    onSubmit: async (values) => {
      setError('');
      setLoading(true);
      try {
        const result = await login(values.email, values.password, tenantSlugFromUrl);
        if (result?.needsTenantSelection) {
          setTenantOptions(result.tenants);
          setPendingCredentials({ email: values.email, password: values.password });
        }
      } catch (err) {
        setError(err.message || 'Falha no login. Verifique suas credenciais.');
      } finally {
        setLoading(false);
      }
    },
  });

  const handleTenantSelect = async (slug) => {
    if (!pendingCredentials) return;
    setLoading(true);
    setTenantOptions(null);
    try {
      await login(pendingCredentials.email, pendingCredentials.password, slug);
    } catch (err) {
      setError(err.message || 'Falha no login.');
    } finally {
      setLoading(false);
      setPendingCredentials(null);
    }
  };

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        // Mesmo tenant onde a integração foi gravada (multi-tenant). Sem X-Tenant-Slug o API usa só o schema public.
        const slug =
          tenantSlugFromUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem('g360_tenant_slug') : null);
        const response = await api.get('/integrations/public', {
          headers: slug ? { 'X-Tenant-Slug': slug } : {},
        });
        setIntegrations(response.data);
      } catch (e) {
        console.error('Failed to load integrations', e);
      }
    };
    fetchIntegrations();
  }, [tenantSlugFromUrl]);

  const resolveSsoTenantSlug = () =>
    tenantSlugFromUrl || localStorage.getItem('g360_tenant_slug') || 'default';

  const handleAzureLogin = async () => {
    try {
      const response = await api.get('/integrations/public');
      const azure = response.data.find((i) => i.type === 'AZURE');
      if (!azure || !azure.config) {
        setError('Integração Microsoft não configurada. Contate o administrador.');
        return;
      }
      const { clientId, tenantIdAzure } = azure.config;
      const dynamicRedirectUri = `${window.location.origin}/auth/callback`;
      localStorage.setItem('sso_provider', 'azure');
      localStorage.setItem('sso_tenant_slug', resolveSsoTenantSlug());
      const authUrl = `https://login.microsoftonline.com/${tenantIdAzure}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(dynamicRedirectUri)}&response_mode=query&scope=User.Read openid profile email`;
      window.location.href = authUrl;
    } catch (err) {
      console.error('Erro ao buscar config Azure:', err);
      setError('Erro ao conectar com Microsoft. Tente novamente.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await api.get('/integrations/public');
      const google = response.data.find((i) => i.type === 'GOOGLE');
      if (!google || !google.config?.clientId) {
        setError('Integração Google não configurada. Contate o administrador.');
        return;
      }
      const { clientId } = google.config;
      const redirectUri = google.config.redirectUri || `${window.location.origin}/auth/callback`;
      const scope = encodeURIComponent('openid email profile');
      localStorage.setItem('sso_provider', 'google');
      localStorage.setItem('sso_tenant_slug', resolveSsoTenantSlug());
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        '&response_type=code' +
        `&scope=${scope}` +
        '&access_type=offline' +
        '&prompt=select_account';
      window.location.href = authUrl;
    } catch (err) {
      console.error('Erro ao buscar config Google:', err);
      setError('Erro ao conectar com Google. Tente novamente.');
    }
  };

  const ssoAzure = integrations.find(
    (i) => i.type === 'AZURE' && i.config?.clientId && i.config?.tenantIdAzure
  );
  const ssoGoogle = integrations.find((i) => i.type === 'GOOGLE' && i.config?.clientId);

  // ── Color Tokens ──
  const colors = {
    formBg: isDark ? '#0f1419' : '#ffffff',
    inputBg: isDark ? '#1c2632' : '#f8fafc',
    inputBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.12)',
    textPrimary: isDark ? '#f1f5f9' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    accent: '#2563eb',
    accentHover: '#1d4ed8',
    error: '#f43f5e',
    checkboxBorder: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.2)',
    socialBtnBg: isDark ? '#1c2632' : '#ffffff',
    socialBtnBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.12)',
    socialBtnHoverBg: isDark ? '#161d26' : '#f8fafc',
    divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
    // Branding Panel
    brandText: '#ffffff',
    brandTextMuted: 'rgba(255, 255, 255, 0.7)',
    featureIconBg: 'rgba(255, 255, 255, 0.1)',
    featureIconColor: '#ffffff',
  };

  const features = [
    { icon: 'rocket_launch', title: 'Projetos & Tarefas', desc: 'Gestão completa de portfólio' },
    { icon: 'security', title: 'Riscos & Compliance', desc: 'Matriz de riscos e controles' },
    { icon: 'swap_horiz', title: 'Gestão de Mudança', desc: 'Fluxos de aprovação de GMUDs' },
    { icon: 'attach_money', title: 'Gestão Financeira', desc: 'Controle de CAPEX e OPEX' },
    { icon: 'inventory_2', title: 'Ativos, Fornecedores e Contratos', desc: 'Gestão de inventário e contratos' },
  ];

  const inputStyle = {
    width: '100%',
    padding: '13px 13px 13px 42px',
    background: colors.inputBg,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.textPrimary,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'row',
    }}>

      {/* ═══════════════════════════════════════════ */}
      {/* LEFT SIDE — Branding Panel with Image BG */}
      {/* ═══════════════════════════════════════════ */}
      {!isMobile && (
        <Box sx={{
          width: '70%',
          minHeight: '100vh',
          backgroundImage: `url(${splitBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: 6,
        }}>
          {/* Dark Overlay for Readability */}
          <Box sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.8))',
            backdropFilter: 'blur(2px)',
            zIndex: 1
          }} />

          {/* Content */}
          <Box sx={{ position: 'relative', zIndex: 2, maxWidth: 440 }}>

            <Typography sx={{
              fontSize: '28px',
              fontWeight: 700,
              color: colors.brandText,
              lineHeight: 1.2,
              mb: 2,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              Governança de TI <br />
              <span style={{ color: '#818cf8' }}>Simples e Integrada</span>
            </Typography>

            <Typography sx={{
              fontSize: '15px',
              color: colors.brandTextMuted,
              lineHeight: 1.6,
              mb: 6,
            }}>
              Plataforma unificada para orquestrar toda sua operação de TI.
              Do planejamento estratégico à execução operacional.
            </Typography>

            {/* Feature List */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {features.map((f, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                  <Box sx={{
                    width: 42, height: 42, borderRadius: '8px',
                    background: colors.featureIconBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(4px)',
                  }}>
                    <span className="material-icons-round" style={{ fontSize: 20, color: colors.featureIconColor }}>
                      {f.icon}
                    </span>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: colors.brandText }}>
                      {f.title}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: colors.brandTextMuted }}>
                      {f.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Copyright */}
          <Typography sx={{
            position: 'absolute',
            bottom: 30,
            fontSize: '11px',
            color: 'rgba(255,255,255,0.4)',
            zIndex: 2,
          }}>
            © {new Date().getFullYear()} G360 Enterprise — Desenvolvido por Lucas Muniz
          </Typography>
        </Box>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* RIGHT SIDE — Login Form */}
      {/* ═══════════════════════════════════════════ */}
      <Box sx={{
        width: isMobile ? '100%' : '30%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: isMobile ? 3 : 6,
        background: colors.formBg,
        position: 'relative',
      }}>
        {/* Theme Toggle */}
        <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
          <Tooltip title={isDark ? 'Modo claro' : 'Modo escuro'}>
            <IconButton
              onClick={toggleTheme}
              sx={{
                width: 38, height: 38, borderRadius: '8px',
                background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
                color: colors.textSecondary,
                '&:hover': { background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)' },
              }}
            >
              <span className="material-icons-round" style={{ fontSize: 20 }}>
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Form Container */}
        <Box sx={{ width: '100%', maxWidth: 380 }}>

          {/* Mobile Logo */}
          {isMobile && (
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                component="img"
                src={isDark ? logoDark : logoLight}
                alt="G360 Enterprise"
                sx={{ height: 48, objectFit: 'contain' }}
              />
            </Box>
          )}

          <Box sx={{ mb: 4 }}>
            <Typography sx={{
              fontSize: '24px',
              fontWeight: 700,
              color: colors.textPrimary,
              mb: 0.5,
              letterSpacing: '-0.5px'
            }}>
              Bem-vindo de volta
            </Typography>
            <Typography sx={{
              fontSize: '14px',
              color: colors.textSecondary,
            }}>
              Entre com suas credenciais para continuar
            </Typography>
            {tenantSlugFromUrl && (
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 1,
                px: 1.5, py: 0.5, borderRadius: '8px',
                background: isDark ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.1)',
                border: `1px solid ${isDark ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.2)'}`,
              }}>
                <span className="material-icons-round" style={{ fontSize: 14, color: colors.accent }}>domain</span>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: colors.accent }}>
                  {tenantSlugFromUrl}
                </Typography>
              </Box>
            )}
          </Box>

          {error && (
            <Box sx={{
              p: 1.5, mb: 3, borderRadius: '8px',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              display: 'flex', alignItems: 'center', gap: 1
            }}>
              <span className="material-icons-round" style={{ fontSize: 18, color: colors.error }}>error_outline</span>
              <Typography sx={{ fontSize: '13px', color: colors.error, fontWeight: 500 }}>{error}</Typography>
            </Box>
          )}

          {/* Tenant Selection UI */}
          {tenantOptions && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{
                p: 2, borderRadius: '8px',
                background: isDark ? 'rgba(37, 99, 235, 0.08)' : 'rgba(37, 99, 235, 0.05)',
                border: `1px solid ${isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.15)'}`,
              }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: colors.textPrimary, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span className="material-icons-round" style={{ fontSize: 16, color: colors.accent }}>business</span>
                  Selecione a empresa
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {tenantOptions.map((t) => (
                    <Box
                      key={t.id}
                      data-testid={`tenant-option-${t.slug}`}
                      onClick={() => handleTenantSelect(t.slug)}
                      sx={{
                        p: 1.5, borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.1)'}`,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          background: isDark ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.08)',
                          borderColor: colors.accent,
                          transform: 'translateX(4px)',
                        },
                      }}
                    >
                      <Box sx={{
                        width: 34, height: 34, borderRadius: '8px',
                        background: isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span className="material-icons-round" style={{ fontSize: 18, color: colors.accent }}>domain</span>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: colors.textPrimary }}>{t.name}</Typography>
                        <Typography sx={{ fontSize: '11px', color: colors.textMuted }}>{t.slug}</Typography>
                      </Box>
                      <span className="material-icons-round" style={{ fontSize: 16, color: colors.textMuted, marginLeft: 'auto' }}>arrow_forward_ios</span>
                    </Box>
                  ))}
                </Box>
                <Box
                  onClick={() => { setTenantOptions(null); setPendingCredentials(null); }}
                  sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', justifyContent: 'center' }}
                >
                  <span className="material-icons-round" style={{ fontSize: 14, color: colors.textMuted }}>arrow_back</span>
                  <Typography sx={{ fontSize: '12px', color: colors.textMuted }}>Voltar ao login</Typography>
                </Box>
              </Box>
            </Box>
          )}

          {!tenantOptions && (
            <form onSubmit={formik.handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Box>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: colors.textSecondary, mb: 0.75, textTransform: 'uppercase' }}>
                  Email
                </Typography>
                <Box sx={{ position: 'relative' }}>
                  <input
                    type="email"
                    name="email"
                    placeholder="exemplo@empresa.com"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    style={{
                      ...inputStyle,
                      ...(formik.touched.email && formik.errors.email ? { borderColor: colors.error } : {}),
                    }}
                    onFocus={(e) => { e.target.style.borderColor = colors.accent; }}
                    onBlurCapture={(e) => { e.target.style.borderColor = colors.inputBorder; }}
                  />
                  <span className="material-icons-round" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 18, color: colors.textMuted, pointerEvents: 'none',
                  }}>email</span>
                </Box>
              </Box>

              <Box>
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: colors.textSecondary, mb: 0.75, textTransform: 'uppercase' }}>
                  Senha
                </Typography>
                <Box sx={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="••••••••"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    style={{
                      ...inputStyle,
                      paddingRight: '44px',
                      ...(formik.touched.password && formik.errors.password ? { borderColor: colors.error } : {}),
                    }}
                    onFocus={(e) => { e.target.style.borderColor = colors.accent; }}
                    onBlurCapture={(e) => { e.target.style.borderColor = colors.inputBorder; }}
                  />
                  <span className="material-icons-round" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 18, color: colors.textMuted, pointerEvents: 'none',
                  }}>lock</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer',
                      padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <span className="material-icons-round" style={{ fontSize: 18 }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box onClick={() => setRememberMe(!rememberMe)} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
                  <Box sx={{
                    width: 16, height: 16,
                    border: `1.5px solid ${rememberMe ? colors.accent : colors.checkboxBorder}`,
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: rememberMe ? colors.accent : 'transparent',
                    transition: 'background 0.2s',
                  }}>
                    {rememberMe && <span className="material-icons-round" style={{ fontSize: 12, color: 'white' }}>check</span>}
                  </Box>
                  <Typography sx={{ fontSize: '13px', color: colors.textSecondary }}>Lembrar-me</Typography>
                </Box>
                <Typography component="a" href="#" sx={{ fontSize: '13px', color: colors.accent, textDecoration: 'none', fontWeight: 500 }}>
                  Esqueceu a senha?
                </Typography>
              </Box>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: colors.accent,
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  opacity: loading ? 0.7 : 1,
                  marginTop: '8px',
                }}
              >
                {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Entrar na Plataforma'}
              </button>

              {(ssoAzure || ssoGoogle) && (
              <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 1 }}>
                <Box sx={{ flex: 1, height: '1px', background: colors.divider }} />
                <Typography sx={{ fontSize: '12px', color: colors.textMuted, fontWeight: 500 }}>OU</Typography>
                <Box sx={{ flex: 1, height: '1px', background: colors.divider }} />
              </Box>

              {ssoAzure && (
              <button
                type="button"
                onClick={handleAzureLogin}
                disabled={loading}
                data-testid="login-sso-azure"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: colors.socialBtnBg,
                  border: `1px solid ${colors.socialBtnBorder}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: colors.textPrimary,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { e.target.style.background = colors.socialBtnHoverBg; }}
                onMouseLeave={(e) => { e.target.style.background = colors.socialBtnBg; }}
              >
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px', width: 16, height: 16 }}>
                  <Box sx={{ background: '#f25022' }} />
                  <Box sx={{ background: '#7fba00' }} />
                  <Box sx={{ background: '#00a4ef' }} />
                  <Box sx={{ background: '#ffb900' }} />
                </Box>
                Entrar com Microsoft
              </button>
              )}

              {ssoGoogle && (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                data-testid="login-sso-google"
                style={{
                  width: '100%',
                  padding: '12px',
                  marginTop: ssoAzure ? 10 : 0,
                  background: colors.socialBtnBg,
                  border: `1px solid ${colors.socialBtnBorder}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: colors.textPrimary,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { e.target.style.background = colors.socialBtnHoverBg; }}
                onMouseLeave={(e) => { e.target.style.background = colors.socialBtnBg; }}
              >
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px', width: 16, height: 16 }}>
                  <Box sx={{ background: '#4285F4' }} />
                  <Box sx={{ background: '#EA4335' }} />
                  <Box sx={{ background: '#FBBC05' }} />
                  <Box sx={{ background: '#34A853' }} />
                </Box>
                Entrar com Google
              </button>
              )}
              </>
              )}
            </form>
          )}

          {isMobile && (
            <Typography sx={{ textAlign: 'center', mt: 4, fontSize: '11px', color: colors.textMuted }}>
              © {new Date().getFullYear()} G360 Enterprise — Desenvolvido por Lucas Muniz
            </Typography>
          )}
        </Box>
      </Box>
    </Box >
  );
};

export default LoginPage;
