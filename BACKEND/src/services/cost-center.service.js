const CostCenterRepository = require('../repositories/cost-center.repository');
const logger = require('../config/logger');

class CostCenterService {
  static async create(prisma, data) {
    const existing = await CostCenterRepository.findByCode(prisma, data.code);
    if (existing) {
      const error = new Error('Código de Centro de Custo já existe.');
      error.statusCode = 409;
      throw error;
    }

    return CostCenterRepository.create(prisma, {
      ...data
      // tenantId removed
    });
  }

  static async getAll(prisma, userId) {
    if (!userId) {
      logger.info('CostCenterService.getAll: No userId, returning all.');
      return CostCenterRepository.findAll(prisma);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });

    if (!user) {
      logger.info(`CostCenterService.getAll: User ${userId} not found.`);
      return [];
    }

    // Debug Log
    logger.info(`DEBUG: Fetching CCs for user ${user.email} (Rol: ${user.roles.map(r => r.name)}). CC ID: ${user.costCenterId}`);

    const isCompanyAdmin = user.roles?.some(r => ['Super Admin', 'Company Admin', 'Admin'].includes(r.name));

    if (isCompanyAdmin) {
      return CostCenterRepository.findAll(prisma);
    }

    // 2. Filtros de Visibilidade
    const filter = {};

    const isDirectorOf = await prisma.department.findMany({
      where: { directorId: userId },
      select: { id: true }
    });

    const departmentIds = isDirectorOf.map(d => d.id);

    // Filter logic:
    // 1. Manager of the Cost Center
    // 2. Director of the Department
    // 3. Member of the Cost Center (assigned via costCenterId)

    const orConditions = [
      { managerId: userId }
    ];

    if (departmentIds.length > 0) {
      orConditions.push({ departmentId: { in: departmentIds } });
    }

    if (user.costCenterId) {
      orConditions.push({ id: user.costCenterId });
    }

    filter.OR = orConditions;

    logger.info('DEBUG: CC Filter:', JSON.stringify(filter, null, 2));

    return CostCenterRepository.findAll(prisma, filter);
  }

  static async update(prisma, id, data) {
    const cc = await CostCenterRepository.findById(prisma, id);
    if (!cc) {
      const error = new Error('Centro de Custo não encontrado.');
      error.statusCode = 404;
      throw error;
    }
    return CostCenterRepository.update(prisma, id, data);
  }

  static async delete(prisma, id) {
    const cc = await CostCenterRepository.findById(prisma, id);
    if (!cc) {
      const error = new Error('Centro de Custo não encontrado.');
      error.statusCode = 404;
      throw error;
    }
    return CostCenterRepository.delete(prisma, id);
  }
}

module.exports = CostCenterService;