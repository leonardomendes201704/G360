class ExpenseRepository {
  static async create(prisma, data) {
    return prisma.expense.create({ data });
  }

  static async findById(prisma, id) {
    return prisma.expense.findUnique({
      where: { id },
      include: {
        supplier: true,
        contract: true,
        costCenter: true,
        account: true
      }
    });
  }

  static async update(prisma, id, data) {
    return prisma.expense.update({
      where: { id },
      data
    });
  }

  static async findAll(prisma, filters = {}, userId, scope = null) {
    const where = {};

    // --- SCOPING LOGIC ---
    if (scope && scope.isAdmin === false && !scope.isFinance) {
      if (scope.isManager) {
        if (scope.accessibleCostCenterIds && scope.accessibleCostCenterIds.length > 0) {
          where.costCenterId = { in: scope.accessibleCostCenterIds };
        } else {
          where.costCenterId = '__NO_ACCESS__';
        }
      } else {
        where.createdBy = userId;
      }
    }

    if (filters?.status) where.status = filters.status;
    if (filters?.searchTerm) {
      where.OR = [
        { description: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }

    return prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        supplier: true,
        costCenter: true,
        account: true
      }
    });
  }

  static async delete(prisma, id) {
    return prisma.expense.delete({
      where: { id }
    });
  }

  static async sumProjectExpenses(prisma, projectId) {
    const result = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        projectId,
        status: { in: ['APROVADO', 'PAGO'] }
      }
    });
    return result._sum.amount || 0;
  }
}

module.exports = ExpenseRepository;
