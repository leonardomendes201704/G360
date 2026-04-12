/**
 * Verificação de RBAC reutilizável (serviços e controllers).
 * Mantém a mesma regra do middleware authorize(): ALL no módulo, bypass de admin.
 *
 * Vários perfis (Role) no mesmo usuário: as permissões são a UNIÃO entre os perfis.
 * Para cada checagem (módulo+ação), basta que qualquer um dos perfis conceda a permissão
 * (ou action ALL naquele módulo). Perfis "Super Admin" / "Admin" ignoram a matriz e liberam tudo.
 */

const ADMIN_ROLE_NAMES = ['super admin', 'superadmin', 'admin', 'administrador', 'administrator'];

async function loadUserWithPermissions(prisma, userId) {
    if (!userId || !prisma) return null;
    return prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { permissions: true } } }
    });
}

function isAdminRole(role) {
    const roleName = role.name?.toLowerCase() || '';
    return ADMIN_ROLE_NAMES.includes(roleName);
}

/** Permissões antigas no banco ainda podem usar chaves fora de rbac-matrix.json. */
function storedModuleMatchesCanonical(storedModule, canonicalModule) {
    if (storedModule === canonicalModule) return true;
    if (canonicalModule === 'KB' && storedModule === 'KNOWLEDGE_BASE') return true;
    if (canonicalModule === 'INCIDENT' && storedModule === 'INCIDENTS') return true;
    if (canonicalModule === 'GMUD' && storedModule === 'CHANGE_REQUESTS') return true;
    return false;
}

/**
 * @param {import('@prisma/client').User & { roles: Array<{ permissions: Array<{module: string, action: string}> }> }} user
 */
function userMatchesPermission(user, module, action) {
    if (!user?.roles?.length) return false;
    return user.roles.some((role) => {
        if (isAdminRole(role)) return true;
        return role.permissions.some(
            (p) =>
                storedModuleMatchesCanonical(p.module, module) &&
                (p.action === action || p.action === 'ALL')
        );
    });
}

function userMatchesAnyPermission(user, module, actions) {
    if (!user?.roles?.length) return false;
    if (user.roles.some((role) => isAdminRole(role))) return true;
    return user.roles.some((role) =>
        role.permissions.some(
            (p) =>
                storedModuleMatchesCanonical(p.module, module) &&
                (p.action === 'ALL' || actions.includes(p.action))
        )
    );
}

/**
 * @param {Array<{ module: string, action: string }>} tuples
 */
function userMatchesSomePermissions(user, tuples) {
    if (!user?.roles?.length) return false;
    if (user.roles.some((role) => isAdminRole(role))) return true;
    return tuples.some(({ module, action }) =>
        user.roles.some((role) =>
            role.permissions.some(
                (p) =>
                    storedModuleMatchesCanonical(p.module, module) &&
                    (p.action === action || p.action === 'ALL')
            )
        )
    );
}

async function userHasPermission(prisma, userId, module, action) {
    const user = await loadUserWithPermissions(prisma, userId);
    if (!user) return false;
    return userMatchesPermission(user, module, action);
}

async function userHasAnyPermission(prisma, userId, module, actions) {
    const user = await loadUserWithPermissions(prisma, userId);
    if (!user) return false;
    return userMatchesAnyPermission(user, module, actions);
}

module.exports = {
    loadUserWithPermissions,
    storedModuleMatchesCanonical,
    userMatchesPermission,
    userMatchesAnyPermission,
    userMatchesSomePermissions,
    userHasPermission,
    userHasAnyPermission,
    ADMIN_ROLE_NAMES,
};
