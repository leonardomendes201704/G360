const { auditLogModuleQueryVariants } = require('./audit-log-module');

/**
 * Constrói `where` do Prisma para listagem/export de AuditLog com o mesmo RBAC que `AuditLogController.list`.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} userId
 * @param {object} query - req.query (module, start, end)
 */
async function buildAuditLogWhere(prisma, userId, query) {
  const { module, start, end } = query;

  let where = {};

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: true,
      directedDepartments: { select: { id: true } },
      managedCostCenters: { select: { id: true } },
    },
  });

  if (!user) {
    return { error: 'USER_NOT_FOUND', where: { userId: '___none___' } };
  }

  const isSuperAdmin = user.roles.some((r) => r.name === 'Super Admin' || r.name === 'Admin');
  const isManager = user.roles.some(
    (r) => r.name === 'Manager' || r.name === 'Director' || r.name === 'Gestor'
  );

  if (isSuperAdmin) {
    // sem filtro extra por equipa
  } else if (isManager) {
    const managedDeptIds = user.directedDepartments.map((d) => d.id);
    const managedCcIds = user.managedCostCenters.map((c) => c.id);

    const teamUsers = await prisma.user.findMany({
      where: {
        OR: [
          { departmentId: { in: managedDeptIds } },
          { costCenterId: { in: managedCcIds } },
          { id: userId },
        ],
      },
      select: { id: true },
    });

    const teamUserIds = teamUsers.map((u) => u.id);
    where.userId = { in: teamUserIds };
  } else {
    where.userId = userId;
  }

  if (module) {
    const variants = auditLogModuleQueryVariants(module);
    where.module = variants.length === 1 ? variants[0] : { in: variants };
  }

  if (start || end) {
    where.createdAt = {};
    if (start) where.createdAt.gte = new Date(start);
    if (end) where.createdAt.lte = new Date(end);
  }

  return { error: null, where };
}

module.exports = { buildAuditLogWhere };
