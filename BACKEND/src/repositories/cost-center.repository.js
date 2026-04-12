class CostCenterRepository {
  static async create(prisma, data) {
    return prisma.costCenter.create({ data });
  }

  static async findAll(prisma, filter = {}) {
    return prisma.costCenter.findMany({
      where: {
        ...filter
      },
      include: {
        department: {
          select: { id: true, name: true, code: true }
        },
        manager: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      },
      orderBy: { code: 'asc' }
    });
  }

  static async findByCode(prisma, code) {
    return prisma.costCenter.findUnique({
      where: { code }
    });
  }

  static async findById(prisma, id) {
    return prisma.costCenter.findUnique({
      where: { id },
      include: {
        department: true,
        manager: true
      }
    });
  }

  static async update(prisma, id, data) {
    return prisma.costCenter.update({
      where: { id },
      data
    });
  }

  static async delete(prisma, id) {
    return prisma.costCenter.delete({ where: { id } });
  }
}

module.exports = CostCenterRepository;