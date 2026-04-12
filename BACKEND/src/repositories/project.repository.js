// Standardized Date parsing
const parseDate = (val) => {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
};

class ProjectRepository {
  static async create(prisma, data) {
    const {
      departmentId, managerId, techLeadId, costCenterId, creatorId,
      ...rest
    } = data;

    // Prisma Create Data Construction
    const createData = {
      ...rest,
      // Auto-submit for approval on creation
      approvalStatus: 'PENDING_APPROVAL',
      // Relations using connect
      department: departmentId ? { connect: { id: departmentId } } : undefined,
      manager: managerId ? { connect: { id: managerId } } : undefined,
      techLead: techLeadId ? { connect: { id: techLeadId } } : undefined,
      costCenter: costCenterId ? { connect: { id: costCenterId } } : undefined,
      creator: creatorId ? { connect: { id: creatorId } } : undefined,
    };

    return prisma.project.create({ data: createData });
  }

  static async findAll(prisma, filters = {}, userId, scope = null) {
    const where = {};

    // --- SCOPING LOGIC ---
    if (scope && scope.isAdmin === false) {
      const orConditions = [
        { members: { some: { userId } } },
        { managerId: userId },
        { techLeadId: userId },
        { creatorId: userId }
      ];

      if (scope.isManager) {
        if (scope.accessibleCostCenterIds && scope.accessibleCostCenterIds.length > 0) {
          orConditions.push({ costCenterId: { in: scope.accessibleCostCenterIds } });
        } else {
          orConditions.push({ costCenterId: '__NO_ACCESS__' });
        }
      }

      where.OR = orConditions;
    }

    // --- FILTERS ---
    // Note: Projects with any approval status are shown in list
    // Access control is enforced at the detail page level
    if (filters.approvalStatus && filters.approvalStatus !== 'ALL') {
      where.approvalStatus = filters.approvalStatus;
    }

    if (filters.status && filters.status !== 'ALL') {
      // Support multiple status filter (comma-separated)
      if (filters.status.includes(',')) {
        where.status = { in: filters.status.split(',').map(s => s.trim()) };
      } else {
        where.status = filters.status;
      }
    }
    if (filters.priority && filters.priority !== 'ALL') where.priority = filters.priority;
    if (filters.managerId && filters.managerId !== 'ALL') where.managerId = filters.managerId;
    if (filters.techLeadId && filters.techLeadId !== 'ALL') where.techLeadId = filters.techLeadId;

    if (filters.search) {
      const searchCondition = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } }
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchCondition }
        ];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    // Pagination
    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const limit = filters.limit ? parseInt(filters.limit, 10) : 0; // 0 means no pagination for backward compatibility
    
    // Sorting override from filters
    const orderBy = {};
    if (filters.sortBy) {
       orderBy[filters.sortBy] = filters.sortDirection === 'desc' ? 'desc' : 'asc';
    } else {
       orderBy.updatedAt = 'desc';
    }

    const queryArgs = {
      where,
      include: {
        manager: { select: { id: true, name: true, email: true, avatar: true } },
        techLead: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } }
        },
        department: { select: { id: true, name: true } },
        tasks: true,
        _count: {
          select: {
            tasks: true,
            members: true,
            risks: true
          }
        },
        followUps: {
          where: filters.refDate ? {
            date: { lte: new Date(filters.refDate) }
          } : undefined,
          orderBy: { date: 'desc' },
          take: 1
        }
      },
      orderBy
    };

    if (limit > 0) {
      const skip = (page - 1) * limit;
      queryArgs.skip = skip;
      queryArgs.take = limit;
      
      const [data, total] = await Promise.all([
        prisma.project.findMany(queryArgs),
        prisma.project.count({ where })
      ]);
      
      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

    // Default unpaginated response
    const data = await prisma.project.findMany(queryArgs);
    return {
      data,
      meta: { total: data.length, page: 1, limit: data.length, totalPages: 1 }
    };
  }

  static async findById(prisma, id) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        manager: true,
        techLead: true,
        costCenter: true, // [NEW] Include for specific permission checks
        tasks: true,
        risks: true,
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
        }
      }
    });
  }

  static async findByCode(prisma, code) {
    return prisma.project.findUnique({
      where: { code }
    });
  }

  static async findLastProjectCode(prisma) {
    const project = await prisma.project.findFirst({
      where: {
        code: {
          startsWith: 'PRJ-'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        code: true
      }
    });
    return project?.code;
  }

  static async update(prisma, id, data) {
    const {
      id: _id, createdAt, updatedAt, _count, manager, tasks, members, budgetItems, expenses, actualCost,
      department, techLead, costCenter, followUps, risks, sprints, creator, approver, // Exclude relation objects
      departmentId, managerId, techLeadId, creatorId, costCenterId, approvedBy, // Exclude relation IDs (handle separately)
      ...rest
    } = data;

    const updateData = { ...rest };

    // Handle relations using connect syntax
    if (departmentId) updateData.department = { connect: { id: departmentId } };
    if (managerId) updateData.manager = { connect: { id: managerId } };
    if (techLeadId) updateData.techLead = { connect: { id: techLeadId } };
    if (creatorId) updateData.creator = { connect: { id: creatorId } };
    if (costCenterId) updateData.costCenter = { connect: { id: costCenterId } };
    if (approvedBy) updateData.approver = { connect: { id: approvedBy } };

    // Dates - using standard parseDate
    if (updateData.startDate !== undefined) updateData.startDate = parseDate(updateData.startDate);
    if (updateData.endDate !== undefined) updateData.endDate = parseDate(updateData.endDate);
    if (updateData.actualStartDate !== undefined) updateData.actualStartDate = parseDate(updateData.actualStartDate);
    if (updateData.actualEndDate !== undefined) updateData.actualEndDate = parseDate(updateData.actualEndDate);
    if (updateData.approvedAt && typeof updateData.approvedAt === 'string') updateData.approvedAt = new Date(updateData.approvedAt);

    return prisma.project.update({
      where: { id },
      data: updateData
    });
  }

  static async updateActualCost(prisma, id, newCost) {
    return prisma.project.update({
      where: { id },
      data: { actualCost: newCost }
    });
  }

  static async delete(prisma, id) {
    return prisma.project.delete({ where: { id } });
  }

  // --- MEMBROS ---

  static async addMember(prisma, data) {
    return prisma.projectMember.create({ data });
  }

  static async updateMemberRole(prisma, projectId, userId, newRole) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } }
    });

    if (!member) throw new Error('Membro não encontrado.');

    return prisma.projectMember.update({
      where: { id: member.id },
      data: { role: newRole }
    });
  }

  static async removeMember(prisma, projectId, userId) {
    return prisma.projectMember.deleteMany({
      where: { projectId, userId }
    });
  }
}

module.exports = ProjectRepository;
