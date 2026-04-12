class SoftwareLicenseRepository {
  static async create(prisma, data) {
    const { id, createdAt, updatedAt, ...rest } = data;

    if (rest.purchaseDate) rest.purchaseDate = new Date(rest.purchaseDate);
    if (rest.expirationDate) rest.expirationDate = new Date(rest.expirationDate);
    if (rest.cost) rest.cost = Number(rest.cost);

    return prisma.softwareLicense.create({ data: rest });
  }

  static async findAll(prisma, tenantId) {
    // Single tenant adaptation: ignored tenantId if not used in schema, but keeping safe
    return prisma.softwareLicense.findMany({
      orderBy: { name: 'asc' }
    });
  }

  static async findById(prisma, id) {
    return prisma.softwareLicense.findUnique({
      where: { id }
    });
  }

  static async update(prisma, id, data) {
    const { id: _id, createdAt, updatedAt, ...rest } = data;

    if (rest.purchaseDate) rest.purchaseDate = new Date(rest.purchaseDate);
    if (rest.expirationDate) rest.expirationDate = new Date(rest.expirationDate);
    if (rest.cost) rest.cost = Number(rest.cost);

    return prisma.softwareLicense.update({
      where: { id },
      data: rest
    });
  }

  static async delete(prisma, id) {
    return prisma.softwareLicense.delete({ where: { id } });
  }
}

module.exports = SoftwareLicenseRepository;