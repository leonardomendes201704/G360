/**
 * Controle de Acesso por Escopo — Multi-Tenant
 * 
 * Determina quais recursos um usuário pode acessar
 * com base em seus roles e cost centers.
 * 
 * Recebe `prisma` como primeiro parâmetro para suportar multi-tenant.
 */

const MANAGER_ROLES = ['Manager', 'Gestor', 'Gerente'];
const ADMIN_ROLES = ['Super Admin', 'Admin', 'Company Admin'];
const FINANCE_ROLES = ['Finance', 'Financeiro', 'Financial'];

const getUserAccessScope = async (prisma, userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { roles: true }
    });

    if (!user) {
        return {
            userId,
            isAdmin: false,
            isManager: false,
            accessibleCostCenterIds: []
        };
    }

    const roleNames = (user.roles || []).map(r => r.name);
    const isAdmin = roleNames.some(r => ADMIN_ROLES.includes(r));
    const isManager = roleNames.some(r => MANAGER_ROLES.includes(r));
    const isFinance = roleNames.some(r => FINANCE_ROLES.includes(r));

    let managedCostCenterIds = [];
    if (isManager) {
        const managed = await prisma.costCenter.findMany({
            where: { managerId: userId },
            select: { id: true }
        });
        managedCostCenterIds = managed.map(cc => cc.id);
    }

    const accessibleCostCenterIds = Array.from(new Set([
        ...(managedCostCenterIds || []),
        user.costCenterId
    ].filter(Boolean)));

    return {
        userId,
        isAdmin,
        isManager,
        isFinance,
        userCostCenterId: user.costCenterId,
        accessibleCostCenterIds
    };
};

const getAccessibleUserIds = async (prisma, userId, scope = null) => {
    const resolvedScope = scope || await getUserAccessScope(prisma, userId);

    if (resolvedScope.isAdmin) {
        return null;
    }

    if (resolvedScope.isManager) {
        const users = await prisma.user.findMany({
            where: {
                costCenterId: {
                    in: resolvedScope.accessibleCostCenterIds.length > 0
                        ? resolvedScope.accessibleCostCenterIds
                        : ['__NO_ACCESS__']
                }
            },
            select: { id: true }
        });
        const ids = users.map(u => u.id);
        if (!ids.includes(userId)) ids.push(userId);
        return ids;
    }

    return [userId];
};

const getScopedCostCenterIds = (scope) => {
    if (!scope || scope.isAdmin) return null;
    if (scope.isManager) {
        return scope.accessibleCostCenterIds || [];
    }
    return scope.userCostCenterId ? [scope.userCostCenterId] : [];
};

module.exports = {
    getUserAccessScope,
    getAccessibleUserIds,
    getScopedCostCenterIds
};
