class SlaPolicyService {
  static async getAll(prisma) {
    return prisma.slaPolicy.findMany({
      orderBy: { name: 'asc' }
    });
  }

  static async create(prisma, data) {
    return prisma.slaPolicy.create({
      data: {
        name: data.name,
        description: data.description,
        responseMinutes: parseInt(data.responseMinutes) || 60,
        resolveMinutes: parseInt(data.resolveMinutes) || 1440
      }
    });
  }

  static async delete(prisma, id) {
    // Pode falhar caso existam tickets ou catálogos presos à policy (OnDelete Restrict behavior default Prisma)
    return prisma.slaPolicy.delete({
      where: { id }
    });
  }
}

module.exports = SlaPolicyService;
