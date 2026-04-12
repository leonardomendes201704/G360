
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';

const AuthCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useContext(AuthContext); // Precisamos de um método customizado ou manual
    // Como o context pode não expor o login com token direto, vamos fazer login manual aqui e setar localStorage/Context

    const [status, setStatus] = useState('Processando login...');
    const [error, setError] = useState(null);


    const dataFetched = React.useRef(false);

    useEffect(() => {
        const code = searchParams.get('code');

        // Robust Idempotency: Check if we already processed THIS code
        if (window.lastProcessedCode === code) return;

        if (dataFetched.current) return;

        if (!code) {
            const errorParam = searchParams.get('error');
            const errorDesc = searchParams.get('error_description');
            if (errorParam) {
                setError(`Erro do Azure: ${errorDesc || errorParam}`);
            } else {
                if (!status.includes('Processando'))
                    setError('Código de autorização não encontrado.');
            }
            return;
        }

        dataFetched.current = true;
        // Lock this code to preventing double-fire
        window.lastProcessedCode = code;

        // Clear the code from URL immediately to prevent reuse
        window.history.replaceState({}, document.title, window.location.pathname);

        const processLogin = async () => {
            // code variable is captured from the closure before we cleared URL
            const errorParam = searchParams.get('error');
            const errorDesc = searchParams.get('error_description');

            if (errorParam) {
                setError(`Erro do Azure: ${errorDesc || errorParam}`);
                return;
            }

            // Recupera tenant salvo no passo anterior (no LoginPage) ou usa AZURE default
            const tenantSlug = localStorage.getItem('sso_tenant_slug') || 'AZURE';

            try {
                setStatus('Validando credenciais com o servidor...');
                // Chama backend passing _skipAuthCheck to prevent auto-redirect on 401
                const response = await api.post('/auth/azure', {
                    code,
                    tenantSlug,
                    redirectUri: window.location.origin + '/auth/callback'
                }, {
                    _skipAuthCheck: true
                });

                const { token, refreshToken, user } = response.data;

                // Salva token, refreshToken e user (mesma lógica do AuthProvider)
                localStorage.setItem('g360_token', token);
                localStorage.setItem('g360_refresh_token', refreshToken);
                localStorage.setItem('g360_user', JSON.stringify(user));

                // Force cleanup of global flag on success (though redirection will handle it)
                window.authCallbackProcessed = false;

                // Força recarregamento
                window.location.href = '/dashboard';
            } catch (err) {
                console.error("SSO Error:", err);
                // Allow retry if it failed (e.g. user needs to click "Back")
                // But code is burned, so they MUST start over.
                // We don't reset authCallbackProcessed because the code is invalid now anyway.

                const msg = err.response?.data?.message || 'Falha ao realizar login SSO.';
                setError(msg);
            }
        };

        processLogin();
    }, [searchParams]);

    return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
            {error ? (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            ) : (
                <>
                    <CircularProgress size={60} sx={{ mb: 4 }} />
                    <Typography variant="h6">{status}</Typography>
                </>
            )}
            {error && (
                <Typography
                    variant="button"
                    sx={{ mt: 2, cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => navigate('/login')}
                >
                    Voltar para Login
                </Typography>
            )}
        </Box>
    );
};

export default AuthCallbackPage;
