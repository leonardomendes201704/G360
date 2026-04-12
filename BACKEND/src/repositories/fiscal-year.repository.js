class FiscalYearRepository {
  static async create(prisma, data) {
    return prisma.fiscalYear.create({ data });
  }

  static async findAll(prisma) {
    return prisma.fiscalYear.findMany({
      orderBy: { year: 'desc' }
    });
  }

  static async findByYear(prisma, year) {
    return prisma.fiscalYear.findUnique({
      where: { year }
    });
  }

  static async findById(prisma, id) {
    return prisma.fiscalYear.findUnique({ where: { id } });
  }

  static async update(prisma, id, data) {
    return prisma.fiscalYear.update({
      where: { id },
      data
    });
  }

  static async delete(prisma, id) {
    return prisma.fiscalYear.delete({ where: { id } });
  }
}

module.exports = FiscalYearRepository;