class AssetMaintenanceRepository {
  static async create(prisma, data) {
    return prisma.assetMaintenance.create({ data });
  }

  static async findAll(prisma, assetId) {
    return prisma.assetMaintenance.findMany({
      where: { assetId },
      orderBy: { startDate: 'desc' }
    });
  }

  static async update(prisma, id, data) {
    return prisma.assetMaintenance.update({
      where: { id },
      data
    });
  }

  static async delete(prisma, id) {
    return prisma.assetMaintenance.delete({ where: { id } });
  }
}

module.exports = AssetMaintenanceRepository;