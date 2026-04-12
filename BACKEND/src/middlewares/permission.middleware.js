const logger = require('../config/logger');
const {
    loadUserWithPermissions,
    userMatchesPermission,
    userMatchesAnyPermission,
    userMatchesSomePermissions,
} = require('../utils/permission-check');

/**
 * @param {string} module
 * @param {string} action
 */
const authorize = (module, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user || (!req.user.roles && !req.user.roleId)) {
                return res.status(403).json({ error: 'Acesso negado. Perfil não encontrado.' });
            }

            const prisma = req.prisma;
            const user = await loadUserWithPermissions(prisma, req.user.userId || req.user.id);

            if (!user || !user.roles || user.roles.length === 0) {
                return res.status(403).json({ error: 'Acesso negado. Nenhum perfil atribuído.' });
            }

            req.roles = user.roles;

            if (!userMatchesPermission(user, module, action)) {
                return res.status(403).json({
                    error: `Acesso negado. Requer permissão ${action} em ${module}.`,
                });
            }

            next();
        } catch (error) {
            logger.error('Authorization Error:', error);
            return res.status(500).json({ error: 'Erro interno de autorização.' });
        }
    };
};

/**
 * Autoriza se o usuário tiver qualquer uma das ações no módulo (ou ALL).
 * @param {string} module
 * @param {string[]} actions
 */
const authorizeAny = (module, actions) => {
    return async (req, res, next) => {
        try {
            if (!req.user || (!req.user.roles && !req.user.roleId)) {
                return res.status(403).json({ error: 'Acesso negado. Perfil não encontrado.' });
            }

            const prisma = req.prisma;
            const user = await loadUserWithPermissions(prisma, req.user.userId || req.user.id);

            if (!user || !user.roles || user.roles.length === 0) {
                return res.status(403).json({ error: 'Acesso negado. Nenhum perfil atribuído.' });
            }

            req.roles = user.roles;

            if (!userMatchesAnyPermission(user, module, actions)) {
                return res.status(403).json({
                    error: `Acesso negado. Requer uma das permissões em ${module}: ${actions.join(', ')}.`,
                });
            }

            next();
        } catch (error) {
            logger.error('Authorization Error (authorizeAny):', error);
            return res.status(500).json({ error: 'Erro interno de autorização.' });
        }
    };
};

/**
 * Autoriza se o usuário tiver qualquer uma das permissões (módulos/ações independentes).
 * @param {Array<{ module: string, action: string }>} permissions
 */
const authorizeSome = (permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user || (!req.user.roles && !req.user.roleId)) {
                return res.status(403).json({ error: 'Acesso negado. Perfil não encontrado.' });
            }

            const prisma = req.prisma;
            const user = await loadUserWithPermissions(prisma, req.user.userId || req.user.id);

            if (!user || !user.roles || user.roles.length === 0) {
                return res.status(403).json({ error: 'Acesso negado. Nenhum perfil atribuído.' });
            }

            req.roles = user.roles;

            if (!userMatchesSomePermissions(user, permissions)) {
                return res.status(403).json({
                    error: 'Acesso negado. Requer uma das permissões de referência configuradas.',
                });
            }

            next();
        } catch (error) {
            logger.error('Authorization Error (authorizeSome):', error);
            return res.status(500).json({ error: 'Erro interno de autorização.' });
        }
    };
};

const authorizeSuperAdmin = async (req, res, next) => {
    try {
        const hasRoleInfo = req.user && (req.user.roleId || (req.user.roles && req.user.roles.length > 0));
        if (!hasRoleInfo) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const prisma = req.prisma;
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId || req.user.id },
            include: { roles: true },
        });

        const isSuperAdmin = user?.roles.some((r) => {
            const roleName = r.name?.toLowerCase() || '';
            return ['super admin', 'superadmin', 'admin', 'administrador', 'administrator'].includes(roleName);
        });

        const isPublicSchema = req.user?.schemaName === 'public' || req.user?.tenantSlug === 'default';

        if (!isSuperAdmin || !isPublicSchema) {
            return res.status(403).json({ error: 'Acesso negado. Requer perfil Global Super Admin.' });
        }

        req.roles = user.roles;
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Erro interno de verificação de Super Admin.' });
    }
};

module.exports = { authorize, authorizeAny, authorizeSome, authorizeSuperAdmin };
