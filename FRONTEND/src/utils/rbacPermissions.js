/**
 * Regras alinhadas a rbac-matrix.json na raiz do monorepo.
 * Normaliza chaves legadas armazenadas em perfis (ex.: KNOWLEDGE_BASE → KB).
 */

const ADMIN_ROLE_NAMES = new Set([
    'super admin',
    'superadmin',
    'admin',
    'administrador',
    'administrator',
]);

/**
 * @param {string} storedModule — valor vindo do banco (Role.permissions[].module)
 * @param {string} requestedModule — chave canônica da matriz (ex.: INCIDENT, KB)
 */
export function permissionModuleMatches(storedModule, requestedModule) {
    if (!requestedModule) return true;
    if (storedModule === 'ALL') return true;
    if (storedModule === requestedModule) return true;
    if (requestedModule === 'KB' && storedModule === 'KNOWLEDGE_BASE') return true;
    if (requestedModule === 'INCIDENT' && storedModule === 'INCIDENTS') return true;
    if (requestedModule === 'GMUD' && storedModule === 'CHANGE_REQUESTS') return true;
    return false;
}

export function roleIsAdminBypass(role) {
    const n = role?.name?.toLowerCase() || '';
    return ADMIN_ROLE_NAMES.has(n);
}

/**
 * @param {Array<{ name?: string, permissions?: Array<{ module: string, action: string }> }>} roles
 * @param {string} module — chave canônica da matriz
 * @param {string | null | undefined} action — se omitido, qualquer ação naquele módulo basta (menus / widgets)
 */
export function rolesMatchGranularPermission(roles, module, action) {
    if (!roles?.length) return false;
    for (const role of roles) {
        if (roleIsAdminBypass(role)) return true;
        const perms = role.permissions || [];
        for (const p of perms) {
            if (!permissionModuleMatches(p.module, module)) continue;
            if (action == null || action === undefined) return true;
            if (p.action === 'ALL' || p.action === action) return true;
        }
    }
    return false;
}

export function rolesHasAnyPermissionInModule(roles, module) {
    return rolesMatchGranularPermission(roles, module, null);
}
