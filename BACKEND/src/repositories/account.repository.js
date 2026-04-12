class AccountRepository {
  static async create(prisma, data) {
    return prisma.accountingAccount.create({ data });
  }

  static async findAll(prisma) {
    return prisma.accountingAccount.findMany({
      orderBy: { code: 'asc' },
      include: {
        parent: true,
        costCenter: true
      }
    });
  }

  // Busca contas visíveis para um centro de custo (globais + específicas do CC)
  static async findAllForCostCenter(prisma, costCenterId) {
    return prisma.accountingAccount.findMany({
      where: {
        OR: [
          { costCenterId: null },        // Contas globais
          { costCenterId: costCenterId } // Contas do CC específico
        ]
      },
      orderBy: { code: 'asc' },
      include: {
        parent: true,
        costCenter: true
      }
    });
  }

  static async findByCode(prisma, code) {
    return prisma.accountingAccount.findUnique({
      where: { code }
    });
  }

  static async findById(prisma, id) {
    return prisma.accountingAccount.findUnique({
      where: { id },
      include: {
        costCenter: true
      }
    });
  }

  static async update(prisma, id, data) {
    return prisma.accountingAccount.update({
      where: { id },
      data
    });
  }

  static async delete(prisma, id) {
    return prisma.accountingAccount.delete({
      where: { id }
    });
  }

  // Verifica se a conta tem dependências (BudgetItems, Expenses, Contracts)
  static async checkDependencies(prisma, id) {
    const account = await prisma.accountingAccount.findUnique({
      where: { id },
      include: {
        budgetItems: { select: { id: true, description: true }, take: 5 },
        expenses: { select: { id: true, description: true }, take: 5 },
        contracts: { select: { id: true, number: true }, take: 5 }
      }
    });

    if (!account) return null;

    return {
      hasDependencies:
        account.budgetItems.length > 0 ||
        account.expenses.length > 0 ||
        account.contracts.length > 0,
      budgetItemsCount: account.budgetItems.length,
      expensesCount: account.expenses.length,
      contractsCount: account.contracts.length,
      samples: {
        budgetItems: account.budgetItems,
        expenses: account.expenses,
        contracts: account.contracts
      }
    };
  }
}

module.exports = AccountRepository;