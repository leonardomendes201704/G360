/**
 * Middleware de Resolução de Tenant (Multi-Tenant)
 * 
 * Injeta `req.prisma` com o PrismaClient correto para o schema do tenant.
 * 
 * Estratégias de resolução (em ordem de prioridade):
 *  1. JWT payload: req.user.schemaName (rotas autenticadas)
 *  2. URL param: req.params.tenantSlug (rotas públicas como login)
 *  3. Header: x-tenant-slug (alternativa para APIs)
 *  4. Default: schema do DATABASE_URL original (fallback, single-tenant mode)
 */

const TenantManager = require('../config/tenant-manager');
const logger = require('../config/logger');

/**
 * Middleware para rotas AUTENTICADAS.
 * O tenant já foi identificado no login e está no JWT.
 */
const tenantResolver = () => {
    return async (req, res, next) => {
        try {
            // 1. Priority: JWT payload (set by authMiddleware)
            let user = req.user;

            // 1b. If authMiddleware hasn't run yet, try to decode JWT from header
            if (!user) {
                const authHeader = req.headers.authorization;
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    try {
                        const jwt = require('jsonwebtoken');
                        const token = authHeader.split(' ')[1];
                        user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
                    } catch (_) {
                        // Token invalid/expired — fall through to other strategies
                    }
                }
            }

            // 1c. EventSource não envia Authorization — apenas JWT curto dedicado (?token=) para SSE
            if (!user && req.method === 'GET' && req.query && req.query.token) {
                try {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(String(req.query.token), process.env.JWT_SECRET, { algorithms: ['HS256'] });
                    if (decoded.purpose === 'sse') {
                        user = decoded;
                        req.user = user;
                    }
                } catch (_) {
                    // ignorar
                }
            }

            if (user && user.schemaName) {
                req.prisma = TenantManager.getClientForTenant(user.schemaName);
                req.tenantInfo = {
                    slug: user.tenantSlug,
                    schemaName: user.schemaName,
                };
                return next();
            }

            // 2. Fallback: Header x-tenant-slug
            const headerSlug = req.headers['x-tenant-slug'];
            if (headerSlug) {
                const tenant = await TenantManager.getTenantBySlug(headerSlug);
                if (!tenant) {
                    return res.status(404).json({
                        status: 'error',
                        message: `Tenant "${headerSlug}" não encontrado ou inativo.`,
                    });
                }
                req.prisma = TenantManager.getClientForTenant(tenant.schemaName);
                req.tenantInfo = {
                    slug: tenant.slug,
                    schemaName: tenant.schemaName,
                };
                return next();
            }

            // 3. Fallback final: client padrão (backward compatibility / single-tenant)
            req.prisma = TenantManager.getDefaultClient();
            req.tenantInfo = { slug: 'default', schemaName: 'public' };
            return next();

        } catch (error) {
            logger.error('[TenantResolver] Error:', error.message);
            return res.status(500).json({
                status: 'error',
                message: 'Erro ao resolver tenant.',
            });
        }
    };
};

/**
 * Middleware para rotas PÚBLICAS (login, azure-config).
 * O tenant é identificado pelo slug na URL.
 */
const tenantResolverPublic = () => {
    return async (req, res, next) => {
        try {
            const tenantSlug = req.params.tenantSlug || req.body?.tenantSlug || req.headers['x-tenant-slug'];

            if (!tenantSlug) {
                // Sem slug → modo single-tenant (backward compat)
                req.prisma = TenantManager.getDefaultClient();
                req.tenantInfo = { slug: 'default', schemaName: 'public' };
                return next();
            }

            const tenant = await TenantManager.getTenantBySlug(tenantSlug);

            if (!tenant) {
                return res.status(404).json({
                    status: 'error',
                    message: `Empresa "${tenantSlug}" não encontrada.`,
                });
            }

            req.prisma = TenantManager.getClientForTenant(tenant.schemaName);
            req.tenantInfo = {
                id: tenant.id,
                slug: tenant.slug,
                schemaName: tenant.schemaName,
                name: tenant.name,
                plan: tenant.plan,
                enabledModules: tenant.enabledModules || null,
            };

            return next();

        } catch (error) {
            logger.error('[TenantResolverPublic] Error:', error.message);
            return res.status(500).json({
                status: 'error',
                message: 'Erro ao resolver empresa.',
            });
        }
    };
};

/**
 * Middleware para rotas de SUPER-ADMIN.
 * Usa o client do catálogo (schema public) para gerenciar tenants.
 */
const tenantResolverAdmin = () => {
    return (req, res, next) => {
        req.prisma = TenantManager.getCatalogClient();
        req.tenantInfo = { slug: 'admin', schemaName: 'public' };
        next();
    };
};

module.exports = {
    tenantResolver,
    tenantResolverPublic,
    tenantResolverAdmin,
};
