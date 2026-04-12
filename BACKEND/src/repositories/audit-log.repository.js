const { normalizeAuditLogModule } = require('../utils/audit-log-module');

class AuditLogRepository {
  static async create(prisma, data) {
    const payload = { ...data };
    if (payload.module != null) {
      payload.module = normalizeAuditLogModule(payload.module);
    }
    return prisma.auditLog.create({ data: payload });
  }

  static async findAll(prisma, filters = {}) {
    const where = {};

    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.action) where.action = filters.action;
    if (filters.userId) where.userId = filters.userId;

    return prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatar: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit ? Number(filters.limit) : 50
    });
  }
}

module.exports = AuditLogRepository;