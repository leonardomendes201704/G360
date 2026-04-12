class ChangeRequestRepository {
  static async create(prisma, data) {
    // Separa assetIds e relatedIncidentIds para usar o 'connect' do Prisma
    const { assetIds, relatedIncidentIds, ...rest } = data;

    return prisma.changeRequest.create({
      data: {
        ...rest,
        assets: assetIds ? {
          connect: assetIds.map(id => ({ id }))
        } : undefined,
        relatedIncidents: relatedIncidentIds ? {
          connect: relatedIncidentIds.map(id => ({ id }))
        } : undefined
      }
    });
  }

  static async findAll(prisma, filters = {}, userId = null, scope = null, accessibleUserIds = null) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.requesterId) where.requesterId = filters.requesterId;

    if (scope && scope.isAdmin === false) {
      const orConditions = [];
      if (accessibleUserIds && accessibleUserIds.length > 0) {
        orConditions.push({ requesterId: { in: accessibleUserIds } });
      }
      if (userId) {
        orConditions.push({ approvers: { some: { userId } } });
      }
      if (scope.isManager && scope.accessibleCostCenterIds && scope.accessibleCostCenterIds.length > 0) {
        orConditions.push({ assets: { some: { costCenterId: { in: scope.accessibleCostCenterIds } } } });
      }
      if (orConditions.length > 0) {
        where.OR = orConditions;
      } else {
        where.id = '__NO_ACCESS__';
      }
    }

    return prisma.changeRequest.findMany({
      where,
      include: {
        requester: { select: { name: true, email: true } },
        approvers: {
          include: { user: { select: { name: true } } }
        },
        assets: { select: { name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async findById(prisma, id) {
    return prisma.changeRequest.findUnique({
      where: { id },
      include: {
        requester: true,
        approvers: {
          include: { user: true }
        },
        assets: true
      }
    });
  }

  static async findByCode(prisma, code) {
    return prisma.changeRequest.findUnique({
      where: { code }
    });
  }

  static async findLastCode(prisma) {
    const last = await prisma.changeRequest.findFirst({
      where: { code: { startsWith: 'GMUD-' } },
      orderBy: { code: 'desc' },
      select: { code: true }
    });
    return last?.code || null;
  }

  static async update(prisma, id, data) {
    // Lista de campos permitidos para atualização
    const allowedFields = [
      'title', 'description', 'justification', 'type', 'riskLevel', 'impact',
      'status', 'scheduledStart', 'scheduledEnd', 'executionPlan',
      'backoutPlan', 'testPlan', 'closureNotes', 'projectId'
    ];

    // Filtra apenas os campos permitidos
    const dataToUpdate = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) { // Permite null, mas ignora undefined
        dataToUpdate[key] = data[key];
      }
    }

    const { assetIds } = data;

    // PREPARA O OBJETO DATA DO PRISMA
    const prismaData = { ...dataToUpdate };

    // Se assetIds for passado (mesmo array vazio), atualiza a lista
    if (assetIds !== undefined) {
      // Filtra IDs inválidos/nulos para evitar erro do Prisma
      const validIds = Array.isArray(assetIds) ? assetIds.filter(id => id) : [];
      prismaData.assets = {
        set: validIds.map(id => ({ id }))
      };
    }

    const { relatedIncidentIds } = data;

    // Se relatedIncidentIds for passado, atualiza a lista de incidentes vinculados
    if (relatedIncidentIds !== undefined) {
      const validIncidentIds = Array.isArray(relatedIncidentIds) ? relatedIncidentIds.filter(id => id) : [];
      prismaData.relatedIncidents = {
        set: validIncidentIds.map(id => ({ id }))
      };
    }

    return prisma.changeRequest.update({
      where: { id },
      data: prismaData
    });
  }

  // --- MÉTODO QUE ESTAVA FALTANDO ---
  static async delete(prisma, id) {
    // 1. Remover Aprovadores vinculados (Cascade manual)
    await prisma.changeApprover.deleteMany({
      where: { changeRequestId: id }
    });

    // 2. Remover a GMUD
    return prisma.changeRequest.delete({
      where: { id }
    });
  }
  // ---------------------------------

  // --- APROVADORES ---

  static async addApprover(prisma, data) {
    return prisma.changeApprover.create({ data });
  }

  static async updateApproval(prisma, id, status, comment) {
    return prisma.changeApprover.update({
      where: { id },
      data: {
        status,
        notes: comment,
        reviewedAt: new Date()
      }
    });
  }

  static async findApprover(prisma, changeRequestId, userId) {
    return prisma.changeApprover.findFirst({
      where: { changeRequestId, userId }
    });
  }

  // Verifica se todos aprovaram
  static async checkAllApproved(prisma, changeRequestId) {
    const pending = await prisma.changeApprover.count({
      where: {
        changeRequestId,
        status: { in: ['PENDING', 'REJECTED'] }
      }
    });
    return pending === 0; // Retorna true se não houver pendentes/rejeitados
  }
}

module.exports = ChangeRequestRepository;
