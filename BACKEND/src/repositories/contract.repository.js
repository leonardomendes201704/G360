class ContractRepository {
  static async create(prisma, data) {
    return prisma.contract.create({ data });
  }

  static async findAll(prisma, filters = {}, scope = null) {
    const where = {};

    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.status) where.status = filters.status;
    if (scope && scope.isAdmin === false) {
      if (!scope.accessibleCostCenterIds || scope.accessibleCostCenterIds.length === 0) {
        where.costCenterId = '__NO_ACCESS__';
      } else {
        where.costCenterId = { in: scope.accessibleCostCenterIds };
      }
    }

    return prisma.contract.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
        costCenter: { select: { name: true, code: true } },
        account: { select: { name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async findById(prisma, id) {
    return prisma.contract.findUnique({
      where: { id },
      include: {
        supplier: true,
        costCenter: true,
        account: true,
        attachments: true,
        addendums: true
      }
    });
  }

  static async update(prisma, id, data) {
    return prisma.contract.update({
      where: { id },
      data
    });
  }

  static async delete(prisma, id) {
    await prisma.contractAttachment.deleteMany({ where: { contractId: id } });
    await prisma.contractAddendum.deleteMany({ where: { contractId: id } });
    return prisma.contract.delete({ where: { id } });
  }
  static async findLastContractNumber(prisma) {
    const last = await prisma.contract.findFirst({
      where: { number: { startsWith: 'CT-' } },
      orderBy: { number: 'desc' },
      select: { number: true }
    });
    return last?.number || null;
  }

  static async countAddendums(prisma, contractId) {
    return prisma.contractAddendum.count({ where: { contractId } });
  }
}

module.exports = ContractRepository;
