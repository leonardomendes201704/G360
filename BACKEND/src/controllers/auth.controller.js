const AuthService = require('../services/auth.service');
const RefreshTokenService = require('../services/refresh-token.service');
const LdapService = require('../services/ldap.service');
const IntegrationRepository = require('../repositories/integration.repository');
const UserRepository = require('../repositories/user.repository');
const AuditLogRepository = require('../repositories/audit-log.repository');
const TenantManager = require('../config/tenant-manager');
const { sanitizeForAudit } = require('../utils/audit-sanitize.util');
const yup = require('yup');
const logger = require('../config/logger');

/** Auditoria de eventos de sessão (login/refresh/logout) — não depende do middleware `audit()` (rotas sem JWT). */
function recordAuthAudit(prisma, { userId, actionSuffix, req, newData }) {
  if (!prisma || !userId) return;
  AuditLogRepository.create(prisma, {
    action: `AUTH_${actionSuffix}`,
    module: 'AUTH',
    entityType: 'AUTH',
    entityId: null,
    userId,
    oldData: null,
    newData: newData != null ? sanitizeForAudit(newData) : null,
    ipAddress: req?.ip || req?.connection?.remoteAddress || null,
    userAgent: req?.get?.('user-agent') || null,
  }).catch(() => {});
}

class AuthController {
  static async login(req, res) {
    try {
      const schema = yup.object().shape({
        email: yup.string().email('Email inválido').required('Email é obrigatório'),
        password: yup.string().required('Palavra-passe é obrigatória')
      });

      await schema.validate(req.body, { abortEarly: false });

      const { email, password, tenantSlug } = req.body;

      // If tenantSlug is provided, the middleware already resolved the tenant → authenticate directly
      if (tenantSlug) {
        const result = await AuthService.authenticate(req.prisma, email, password, req);
        recordAuthAudit(req.prisma, {
          userId: result.user.id,
          actionSuffix: 'LOGIN',
          req,
          newData: { channel: 'LOCAL' },
        });
        return res.status(200).json(result);
      }

      // No slug → auto-discover tenant by email
      const tenants = await TenantManager.getAllActiveTenants();
      const foundInTenants = [];

      for (const tenant of tenants) {
        try {
          const prismaClient = TenantManager.getClientForTenant(tenant.schemaName);
          const user = await UserRepository.findByEmail(prismaClient, email);
          if (user && user.isActive) {
            foundInTenants.push({
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
              schemaName: tenant.schemaName,
            });
          }
        } catch (err) {
          // Skip tenants with errors (schema might be broken)
          logger.warn(`[AuthController] Error checking tenant ${tenant.slug}:`, err.message);
        }
      }

      if (foundInTenants.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      if (foundInTenants.length === 1) {
        // Found in exactly one tenant → authenticate directly
        const match = foundInTenants[0];
        const prismaClient = TenantManager.getClientForTenant(match.schemaName);
        const tenantDetails = await TenantManager.getTenantBySlug(match.slug);

        // Set req context as if tenant resolver had run
        req.prisma = prismaClient;
        req.tenantInfo = {
          id: match.id,
          slug: match.slug,
          schemaName: match.schemaName,
          name: match.name,
          enabledModules: tenantDetails?.enabledModules || null,
        };

        const result = await AuthService.authenticate(prismaClient, email, password, req);
        recordAuthAudit(prismaClient, {
          userId: result.user.id,
          actionSuffix: 'LOGIN',
          req,
          newData: { channel: 'LOCAL' },
        });
        return res.status(200).json(result);
      }

      // Found in multiple tenants → ask user to choose (obfuscated for security)
      return res.status(200).json({
        needsTenantSelection: true,
        tenants: foundInTenants.map(t => ({
          slug: t.slug,
          name: t.name.length > 3 ? t.name.substring(0, 3) + '***' : '***',
        })),
        message: 'Email encontrado em múltiplas empresas. Selecione qual deseja acessar.',
      });

    } catch (error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Erro de Validação',
          messages: error.errors
        });
      }
      throw error;
    }
  }

  /**
   * Emite JWT curto só para SSE (notificações) — evita colocar o access token completo na query string.
   */
  static async issueStreamToken(req, res) {
    try {
      const user = await UserRepository.findById(req.prisma, req.user.userId);
      if (!user || !user.isActive) {
        return res.status(404).json({ message: 'Utilizador não encontrado ou inativo.' });
      }

      const streamToken = AuthService.issueSseToken(user, req.tenantInfo);
      const raw = process.env.JWT_SSE_EXPIRES_IN || '10m';
      let expiresInSec = 600;
      const m = String(raw).match(/^(\d+)m$/i);
      const s = String(raw).match(/^(\d+)s$/i);
      if (m) expiresInSec = parseInt(m[1], 10) * 60;
      else if (s) expiresInSec = parseInt(s[1], 10);

      return res.json({ streamToken, expiresIn: expiresInSec });
    } catch (error) {
      logger.error('[issueStreamToken]', error);
      return res.status(500).json({ message: 'Erro ao emitir token de notificações.' });
    }
  }

  // Endpoint para validar o token e devolver os dados do utilizador atual (Sessão)
  static async getMe(req, res) {
    try {
      // Fetch fresh user data with permissions from DB
      const user = await UserRepository.findById(req.prisma, req.user.userId);

      if (!user) {
        return res.status(404).json({ message: 'Utilizador não encontrado.' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Utilizador inativo.' });
      }

      const { password: _, ...userWithoutPassword } = user;
      userWithoutPassword.schema = req.user?.schemaName || 'public';
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ message: 'Erro ao obter dados do utilizador.' });
    }
  }

  /**
   * Atualiza preferências de notificação (canais, categorias, horário silencioso).
   */
  static async patchNotificationPreferences(req, res) {
    try {
      const prefs = req.body?.notificationPreferences;
      if (prefs != null && typeof prefs !== 'object') {
        return res.status(400).json({ message: 'notificationPreferences deve ser um objeto.' });
      }

      await req.prisma.user.update({
        where: { id: req.user.userId },
        data: { notificationPreferences: prefs ?? {} }
      });

      const user = await UserRepository.findById(req.prisma, req.user.userId);
      const { password: _, ...rest } = user;
      return res.status(200).json({
        notificationPreferences: rest.notificationPreferences ?? null
      });
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ message: 'Erro ao guardar preferências.' });
    }
  }

  // Endpoint para Login via Azure AD SSO
  static async loginAzure(req, res) {
    try {
      const { code, tenantSlug, redirectUri } = req.body;

      if (!code || !tenantSlug) {
        return res.status(400).json({ message: 'Código e identificação da empresa são obrigatórios.' });
      }
      // Passar req.prisma + req para gerar refreshToken
      const result = await AuthService.loginWithAzure(req.prisma, code, tenantSlug, redirectUri, req);
      recordAuthAudit(req.prisma, {
        userId: result.user.id,
        actionSuffix: 'LOGIN',
        req,
        newData: { channel: 'AZURE' },
      });
      return res.json(result);
    } catch (err) {
      logger.error('Erro Login Azure:', err);
      return res.status(401).json({ message: err.message || 'Falha na autenticação SSO.' });
    }
  }

  static async loginGoogle(req, res) {
    try {
      const { code, tenantSlug, redirectUri } = req.body;

      if (!code || !tenantSlug) {
        return res.status(400).json({ message: 'Código e identificação da empresa são obrigatórios.' });
      }
      const result = await AuthService.loginWithGoogle(req.prisma, code, tenantSlug, redirectUri, req);
      recordAuthAudit(req.prisma, {
        userId: result.user.id,
        actionSuffix: 'LOGIN',
        req,
        newData: { channel: 'GOOGLE' },
      });
      return res.json(result);
    } catch (err) {
      logger.error('Erro Login Google:', err);
      return res.status(401).json({ message: err.message || 'Falha na autenticação SSO.' });
    }
  }

  // Endpoint público para obter ClientID e TenantID do Azure para o Frontend iniciar o fluxo
  static async getAzureConfig(req, res) {
    try {
      const { tenantSlug } = req.params;
      const config = await AuthService.getAzureConfig(req.prisma, tenantSlug);
      return res.json(config);
    } catch (err) {
      return res.status(404).json({ message: err.message });
    }
  }

  // Endpoint para Refresh Token (renovar JWT)
  static async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Refresh token é obrigatório'
        });
      }

      // Validar refresh token e obter usuário
      const user = await RefreshTokenService.validateRefreshToken(req.prisma, refreshToken);

      // Gerar novo JWT (sem gerar novo refresh token)
      const result = await AuthService.generateToken(user, null);

      recordAuthAudit(req.prisma, {
        userId: user.id,
        actionSuffix: 'REFRESH',
        req,
        newData: null,
      });

      // Retornar novo JWT (refresh token permanece o mesmo)
      return res.json({
        token: result.token,
        expiresIn: result.expiresIn,
        user: result.user
      });

    } catch (error) {
      logger.error('[REFRESH TOKEN ERROR]', error.message);
      return res.status(401).json({
        error: 'Refresh token inválido ou expirado',
        message: error.message
      });
    }
  }

  // Endpoint para Logout (revogar refresh token)
  static async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Refresh token é obrigatório'
        });
      }

      const user = await RefreshTokenService.validateRefreshToken(req.prisma, refreshToken);

      // Revogar refresh token (blacklist)
      await RefreshTokenService.revokeRefreshToken(req.prisma, refreshToken);

      recordAuthAudit(req.prisma, {
        userId: user.id,
        actionSuffix: 'LOGOUT',
        req,
        newData: null,
      });

      return res.json({
        message: 'Logout realizado com sucesso'
      });

    } catch (error) {
      logger.error('[LOGOUT ERROR]', error.message);
      return res.status(400).json({
        error: 'Erro ao fazer logout',
        message: error.message
      });
    }
  }

  // Endpoint para Login via LDAP/Active Directory
  static async loginLdap(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          error: 'Usuário e senha são obrigatórios'
        });
      }

      // 1. Buscar configuração LDAP do banco
      const integration = await IntegrationRepository.findByType(req.prisma, 'LDAP');

      if (!integration || !integration.isEnabled || !integration.config) {
        return res.status(400).json({
          error: 'Integração LDAP não está configurada ou habilitada.'
        });
      }

      // 2. Autenticar no LDAP e obter usuário local
      const user = await LdapService.authenticateAndGetUser(
        username,
        password,
        integration.config
      );

      // 3. Gerar tokens JWT
      const result = await AuthService.generateToken(user, req);

      recordAuthAudit(req.prisma, {
        userId: result.user.id,
        actionSuffix: 'LOGIN',
        req,
        newData: { channel: 'LDAP' },
      });

      return res.json(result);

    } catch (error) {
      logger.error('[LDAP LOGIN ERROR]', error.message);
      return res.status(401).json({
        error: 'Falha na autenticação LDAP',
        message: error.message
      });
    }
  }
}

module.exports = AuthController;