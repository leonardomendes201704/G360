class DepartmentRepository {
  static async create(prisma, data) {
    return prisma.department.create({ data });
  }

  static async findAll(prisma) {
    return prisma.department.findMany({
      include: {
        parent: true,
        director: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        _count: {
          select: {
            users: true,
            costCenters: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async findById(prisma, id) {
    return prisma.department.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        director: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        costCenters: true
      }
    });
  }

  static async findByCode(prisma, code) {
    return prisma.department.findUnique({
      where: { code }
    });
  }

  static async update(prisma, id, data) {
    return prisma.department.update({
      where: { id },
      data
    });
  }

  static async delete(prisma, id) {
    return prisma.department.delete({
      where: { id }
    });
  }
}

module.exports = DepartmentRepository;