class UserRepository {
  // Busca usuário por email (único no sistema agora)
  static async findByEmail(prisma, email) {
    return prisma.user.findUnique({
      where: { email }, // Agora email é @unique globalmente
      include: {
        roles: { include: { permissions: true } }
      }
    });
  }

  // Criação de usuário
  static async create(prisma, data) {
    const { roleIds, ...rest } = data;
    return prisma.user.create({
      data: {
        ...rest,
        roles: roleIds ? {
          connect: roleIds.map(id => ({ id }))
        } : undefined
      },
      include: { roles: true }
    });
  }

  static async findById(prisma, id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { permissions: true } }
      }
    });
  }

  // Removemos parametro tenantId
  static async findAll(prisma) {
    return prisma.user.findMany({
      include: {
        roles: true,
        department: true,
        costCenter: true
      },
      orderBy: { name: 'asc' }
    });
  }

  static async update(prisma, id, data) {
    const { roleIds, ...rest } = data;
    return prisma.user.update({
      where: { id },
      data: {
        ...rest,
        roles: roleIds ? {
          set: roleIds.map(id => ({ id }))
        } : undefined
      },
      include: { roles: true }
    });
  }

  static async delete(prisma, id) {
    // Soft delete: apenas desativa o usuário para preservar integridade referencial
    // (usuário pode ter Tasks, Projetos, AuditLogs, etc. associados)
    return prisma.user.update({
      where: { id },
      data: { isActive: false }
    });
  }
}

module.exports = UserRepository;