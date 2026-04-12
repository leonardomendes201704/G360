class SupplierRepository {
  static async create(prisma, data) {
    return prisma.supplier.create({ data });
  }

  static async findAll(prisma, userId, scope = null) {
    const where = {};

    // Suppliers are shared master data visible to all authenticated users


    return prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  static async findById(prisma, id) {
    return prisma.supplier.findUnique({
      where: { id }
    });
  }

  static async findByDocument(prisma, document) {
    return prisma.supplier.findUnique({
      where: { document }
    });
  }

  static async update(prisma, id, data) {
    return prisma.supplier.update({
      where: { id },
      data
    });
  }

  static async delete(prisma, id) {
    return prisma.supplier.delete({
      where: { id }
    });
  }
}

module.exports = SupplierRepository;
