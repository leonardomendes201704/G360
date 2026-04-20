const UserRepository = require('../repositories/user.repository');
const IntegrationRepository = require('../repositories/integration.repository');
const LdapService = require('./ldap.service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const msal = require('@azure/msal-node');
const RefreshTokenService = require('./refresh-token.service');
const { recordFailedAttempt, checkIfLocked, clearAttempts, getRemainingAttempts } = require('../utils/login-attempts');
require('isomorphic-fetch');
const logger = require('../config/logger');

class AuthService {
  /**
   * Autenticação local/LDAP
   * @param {object} prisma - PrismaClient do tenant
   * @param {string} email
   * @param {string} password
   * @param {object} req - Express request (para refresh token)
   */
  static async authenticate(prisma, email, password, req = null) {
    // 0. Verificar se o email está bloqueado
    const lockStatus = await checkIfLocked(prisma, email);
    if (lockStatus.locked) {
      const error = new Error(`Conta temporariamente bloqueada. Tente novamente em ${lockStatus.remainingMinutes} minutos.`);
      error.statusCode = 429;
      throw error;
    }

    // 1. Validar se o utilizador existe
    const user = await UserRepository.findByEmail(prisma, email);

    if (!user) {
      await recordFailedAttempt(prisma, email);
      const error = new Error('Credenciais inválidas.');
      error.statusCode = 401;
      throw error;
    }

    // 2. Verificar se o utilizador está ativo
    if (!user.isActive) {
      const error = new Error('Utilizador inativo. Contacte o administrador.');
      error.statusCode = 403;
      throw error;
    }

    // 3. Rotear autenticação por authProvider
    const authProvider = user.authProvider || 'LOCAL';

    if (authProvider === 'AZURE') {
      const error = new Error('Este usuário usa autenticação Microsoft. Clique em "Entrar com Microsoft".');
      error.statusCode = 400;
      throw error;
    }

    if (authProvider === 'GOOGLE') {
      const error = new Error('Este usuário usa autenticação Google. Clique em "Entrar com Google".');
      error.statusCode = 400;
      throw error;
    }

    if (authProvider === 'LDAP') {
      // Autenticar via LDAP
      const integration = await IntegrationRepository.findByType(prisma, 'LDAP');
      if (!integration || !integration.isEnabled || !integration.config) {
        const error = new Error('Integração LDAP não está configurada.');
        error.statusCode = 400;
        throw error;
      }

      try {
        await LdapService.authenticate(email, password, integration.config);
      } catch (ldapError) {
        await recordFailedAttempt(prisma, email);
        const error = new Error(ldapError.message || 'Credenciais inválidas.');
        error.statusCode = 401;
        throw error;
      }
    } else {
      // authProvider === 'LOCAL' - Comparar senha no banco
      if (!user.password) {
        const error = new Error('Este usuário não possui senha local configurada.');
        error.statusCode = 400;
        throw error;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        const attemptResult = await recordFailedAttempt(prisma, email);
        if (attemptResult.locked) {
          const error = new Error(`Muitas tentativas falhas. Conta bloqueada por 15 minutos.`);
          error.statusCode = 429;
          throw error;
        }
        const error = new Error('Credenciais inválidas.');
        error.statusCode = 401;
        throw error;
      }
    }

    // Login bem-sucedido - limpar tentativas
    await clearAttempts(prisma, email);

    // Gerar token
    return this.generateToken(user, req);
  }

  static async generateToken(user, req = null) {
    // 4. Gerar o Token JWT (curto - 15min)
    const payload = {
      userId: user.id,
      email: user.email,
      roles: user.roles?.map(r => r.id) || [],
      // Multi-Tenant: incluir info do tenant no JWT
      tenantSlug: req?.tenantInfo?.slug || 'default',
      schemaName: req?.tenantInfo?.schemaName || 'public',
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });

    // Gerar refresh token (longo - 7 dias)
    let refreshToken = null;
    if (req && req.prisma) {
      refreshToken = await RefreshTokenService.generateRefreshToken(req.prisma, user.id, req);
    }

    const { password: _, ...userWithoutPassword } = user;
    userWithoutPassword.schema = req?.tenantInfo?.schemaName || 'public';

    return {
      token,
      refreshToken,
      expiresIn: 900, // 15 minutos em segundos
      user: userWithoutPassword,
      enabledModules: req?.tenantInfo?.enabledModules || null,
    };
  }

  /**
   * JWT de curta duração só para EventSource (SSE) — não expor o access token completo na query string.
   * @param {object} user - utilizador com roles
   * @param {{ slug?: string, schemaName?: string } | null} tenantInfo
   */
  static issueSseToken(user, tenantInfo) {
    const payload = {
      userId: user.id,
      email: user.email,
      roles: user.roles?.map((r) => r.id) || [],
      tenantSlug: tenantInfo?.slug || 'default',
      schemaName: tenantInfo?.schemaName || 'public',
      purpose: 'sse',
    };
    const expiresIn = process.env.JWT_SSE_EXPIRES_IN || '10m';
    return jwt.sign(payload, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn,
    });
  }

  /**
   * Login via Azure AD SSO
   * @param {object} prisma - PrismaClient do tenant
   */
  static async loginWithAzure(prisma, code, tenantSlug, redirectUri, req) {
    // 1. Obter config do Banco
    logger.debug('[SSO] Starting loginWithAzure');
    const integration = await IntegrationRepository.findByType(prisma, 'AZURE');
    if (!integration || !integration.isEnabled || !integration.config) {
      logger.error('[SSO-DEBUG] Integration not found/disabled');
      throw new Error('Integração com Azure não está ativa.');
    }
    logger.debug('[SSO] Integration found');

    const { clientId, clientSecret, tenantIdAzure } = integration.config;

    // 2. Trocar Code por Token (MSAL)
    const msalConfig = {
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantIdAzure}`,
        clientSecret,
      }
    };
    logger.debug('[SSO] Acquiring token...');

    const cca = new msal.ConfidentialClientApplication(msalConfig);
    const tokenResponse = await cca.acquireTokenByCode({
      code,
      scopes: ['user.read'],
      redirectUri
    });
    logger.debug('[SSO] Token acquired: ' + (!!tokenResponse));

    if (!tokenResponse) {
      throw new Error('Falha ao obter token do Azure.');
    }

    // 3. Validar se o email veio no token
    const azureEmail = tokenResponse.account.username;
    logger.debug('[SSO] User email resolved');

    // 4. Buscar usuário no banco local
    let user = await UserRepository.findByEmail(prisma, azureEmail);
    logger.debug('[SSO] User found:', !!user);

    if (!user) {
      logger.error('[SSO-DEBUG] User not found in DB');
      throw new Error(`Usuário ${azureEmail} não encontrado no sistema. Peça ao administrador para importá-lo.`);
    }

    if (!user.isActive) {
      logger.error('[SSO-DEBUG] User inactive');
      throw new Error('Utilizador inativo.');
    }

    // 5. Se o usuário não tiver azureId vinculado, vincula agora
    if (!user.azureId) {
      // await UserRepository.update(prisma, user.id, { azureId: tokenResponse.account.homeAccountId });
    }

    // 6. Gerar Token JWT da nossa app (COM refreshToken)
    return this.generateToken(user, req);
  }

  /**
   * Login via Google OAuth 2.0
   * @param {object} prisma - PrismaClient do tenant
   */
  static async loginWithGoogle(prisma, code, tenantSlug, redirectUri, req) {
    logger.debug('[SSO] Starting loginWithGoogle');
    const integration = await IntegrationRepository.findByType(prisma, 'GOOGLE');
    if (!integration || !integration.isEnabled || !integration.config) {
      throw new Error('Integração com Google não está ativa.');
    }

    const { clientId, clientSecret, redirectUri: configuredRedirect } = integration.config;
    const redirect = redirectUri || configuredRedirect;

    if (!clientId || !clientSecret || !redirect) {
      throw new Error('Configuração Google incompleta.');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirect,
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenData.access_token) {
      logger.error('[SSO] Google token error', tokenData);
      throw new Error(
        tokenData.error_description || tokenData.error || 'Falha ao obter token do Google.'
      );
    }

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userInfoRes.json().catch(() => ({}));
    if (!profile.email) {
      throw new Error('Não foi possível obter o email da conta Google.');
    }

    const googleEmail = profile.email;
    const user = await UserRepository.findByEmail(prisma, googleEmail);

    if (!user) {
      throw new Error(
        `Usuário ${googleEmail} não encontrado no sistema. Peça ao administrador para criá-lo.`
      );
    }

    if (!user.isActive) {
      throw new Error('Utilizador inativo.');
    }

    return this.generateToken(user, req);
  }

  /**
   * Obter configuração pública do Azure AD para o tenant
   * @param {object} prisma - PrismaClient do tenant
   */
  static async getAzureConfig(prisma, tenantSlug) {
    const integration = await IntegrationRepository.findByType(prisma, 'AZURE');
    if (!integration || !integration.isEnabled) throw new Error('Integração não disponível');

    const { clientId, tenantIdAzure } = integration.config;
    return { clientId, tenantId: tenantIdAzure }; // Public info only
  }
}

module.exports = AuthService;