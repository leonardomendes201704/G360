class AssetCategoryRepository {
  static async create(prisma, data) {
    return prisma.assetCategory.create({ data });
  }

  static async findAll(prisma) {
    // Categorias costumam ser globais ou pouco sensíveis, mas se quiser filtrar pode.
    // Aqui listaremos todas.
    return prisma.assetCategory.findMany({
      orderBy: { name: 'asc' }
    });
  }

  static async findById(prisma, id) {
    return prisma.assetCategory.findUnique({ where: { id } });
  }

  static async update(prisma, id, data) {
    return prisma.assetCategory.update({
      where: { id },
      data
    });
  }

  static async delete(prisma, id) {
    return prisma.assetCategory.delete({ where: { id } });
  }
}

module.exports = AssetCategoryRepository;