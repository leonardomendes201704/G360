class BudgetRepository {
  static async create(prisma, data) {
    return prisma.budget.create({ data });
  }

  static async findAll(prisma, costCenterIds = null) {
    const where = {};
    if (Array.isArray(costCenterIds)) {
      if (costCenterIds.length > 0) {
        where.OR = [
          { items: { some: { costCenterId: { in: costCenterIds } } } },
          { items: { some: { costCenterId: null } } },
          { items: { none: {} } }
        ];
      } else {
        where.id = '__NO_ACCESS__';
      }
    }
    return prisma.budget.findMany({
      where,
      include: {
        fiscalYear: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async findById(prisma, id) {
    return prisma.budget.findUnique({
      where: { id },
      include: {
        fiscalYear: true,
        items: {
          include: {
            account: true,
            costCenter: true,
            supplier: { select: { name: true } }
          },
          orderBy: { account: { code: 'asc' } }
        }
      }
    });
  }

  static async update(prisma, id, data) {
    return prisma.budget.update({
      where: { id },
      data
    });
  }

  static async delete(prisma, id) {
    return prisma.$transaction([
      prisma.budgetItem.deleteMany({ where: { budgetId: id } }),
      prisma.budget.delete({ where: { id } })
    ]);
  }

  // --- ITENS ---

  static async createItem(prisma, data) {
    return prisma.budgetItem.create({ data });
  }

  static async createManyItems(prisma, dataArray) {
    return prisma.budgetItem.createMany({
      data: dataArray,
      skipDuplicates: true // Optional: avoid crashing on dupes, though UUIDs likely unique
    });
  }

  static async findItemById(prisma, id) {
    return prisma.budgetItem.findUnique({
      where: { id },
      include: { budget: true }
    });
  }

  static async updateItem(prisma, id, data) {
    return prisma.budgetItem.update({
      where: { id },
      data
    });
  }

  static async deleteItem(prisma, id) {
    return prisma.budgetItem.delete({ where: { id } });
  }

  static async calculateTotals(prisma, budgetId) {
    const items = await prisma.budgetItem.findMany({
      where: { budgetId },
      include: { account: true }
    });

    let totalOpex = 0;
    let totalCapex = 0;

    items.forEach(item => {
      const itemTotal = Number(item.total);
      if (item.type === 'CAPEX') {
        totalCapex += itemTotal;
      } else {
        totalOpex += itemTotal;
      }
    });

    return prisma.budget.update({
      where: { id: budgetId },
      data: {
        totalOpex,
        totalCapex
      }
    });
  }
}

module.exports = BudgetRepository;
