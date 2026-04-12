class TaskRepository {
  static async create(prisma, data) {
    return prisma.task.create({ data });
  }

  static async findAll(prisma, filters = {}, userId, scope = null, accessibleUserIds = null) {
    const where = {};

    // --- SCOPING LOGIC ---
    if (scope && scope.isAdmin === false) {
      if (scope.isManager) {
        const ids = accessibleUserIds && accessibleUserIds.length > 0
          ? accessibleUserIds
          : ['__NO_ACCESS__'];
        where.OR = [
          { assigneeId: { in: ids } },
          { creatorId: { in: ids } }
        ];
      } else {
        where.OR = [
          { assigneeId: userId },
          { creatorId: userId }
        ];
      }
    }
    // --- FILTERS ---
    if (filters.status) where.status = filters.status;
    if (filters.priority && filters.priority !== 'ALL') where.priority = filters.priority;

    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.creatorId) where.creatorId = filters.creatorId;
    if (filters.riskId) where.riskId = filters.riskId;

    if (filters.search) {
      const searchCondition = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchCondition }];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    return prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true, avatar: true } },
        risk: { select: { id: true, title: true } },
        _count: { select: { comments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async findById(prisma, id) {
    return prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true, avatar: true } },
        comments: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' }
        },
        attachments: true
      }
    });
  }

  static async update(prisma, id, data) {
    return prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true, avatar: true } },
        risk: { select: { id: true, title: true } },
        _count: { select: { comments: true } }
      }
    });
  }

  static async delete(prisma, id) {
    return prisma.task.delete({ where: { id } });
  }
}

module.exports = TaskRepository;
