class AssetRepository {
  static async create(prisma, data) {
    return prisma.asset.create({ data });
  }

  static async findAll(prisma, filters = {}, scope = null) {
    const where = {};

    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.status) where.status = filters.status;
    if (filters.assignedTo) where.assignedTo = { contains: filters.assignedTo, mode: 'insensitive' };
    if (scope && scope.isAdmin === false) {
      if (!scope.accessibleCostCenterIds || scope.accessibleCostCenterIds.length === 0) {
        where.costCenterId = '__NO_ACCESS__';
      } else {
        where.costCenterId = { in: scope.accessibleCostCenterIds };
      }
    }

    return prisma.asset.findMany({
      where,
      include: {
        category: true,
        supplier: { select: { name: true } },
        costCenter: { select: { name: true, code: true } },
        contract: { select: { number: true, description: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async findById(prisma, id) {
    return prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: true,
        contract: true,
        costCenter: true,
        maintenances: true
      }
    });
  }

  static async findByCode(prisma, code) {
    return prisma.asset.findUnique({
      where: { code }
    });
  }

  static async update(prisma, id, data) {
    return prisma.asset.update({
      where: { id },
      data
    });
  }

  static async delete(prisma, id) {
    await prisma.assetMaintenance.deleteMany({
      where: { assetId: id }
    });
    return prisma.asset.delete({ where: { id } });
  }
}

module.exports = AssetRepository;
