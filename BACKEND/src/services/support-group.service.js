class SupportGroupService {
  static baseInclude() {
    return {
      slaPolicy: { select: { id: true, name: true, responseMinutes: true, resolveMinutes: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } }
        }
      }
    };
  }

  static async list(prisma) {
    return prisma.supportGroup.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: this.baseInclude()
    });
  }

  static async listAll(prisma) {
    return prisma.supportGroup.findMany({
      orderBy: { name: 'asc' },
      include: this.baseInclude()
    });
  }

  static async getById(prisma, id) {
    const g = await prisma.supportGroup.findUnique({
      where: { id },
      include: this.baseInclude()
    });
    if (!g) throw new Error('Grupo não encontrado.');
    return g;
  }

  static async create(prisma, { name, description, slaPolicyId, memberIds = [] }) {
    const group = await prisma.supportGroup.create({
      data: {
        name: name.trim(),
        description: description || null,
        slaPolicyId: slaPolicyId || null,
        members: memberIds.length
          ? {
              create: memberIds.map((userId) => ({ userId }))
            }
          : undefined
      },
      include: this.baseInclude()
    });
    return group;
  }

  static async update(prisma, id, { name, description, slaPolicyId, isActive, memberIds }) {
    const existing = await prisma.supportGroup.findUnique({ where: { id } });
    if (!existing) throw new Error('Grupo não encontrado.');

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description;
    if (slaPolicyId !== undefined) data.slaPolicyId = slaPolicyId || null;
    if (isActive !== undefined) data.isActive = isActive;

    if (memberIds !== undefined) {
      await prisma.supportGroupMember.deleteMany({ where: { supportGroupId: id } });
      if (memberIds.length) {
        await prisma.supportGroupMember.createMany({
          data: memberIds.map((userId) => ({ supportGroupId: id, userId })),
          skipDuplicates: true
        });
      }
      data.assignmentCursor = 0;
    }

    return prisma.supportGroup.update({
      where: { id },
      data,
      include: this.baseInclude()
    });
  }

  static async deleteSoft(prisma, id) {
    return prisma.supportGroup.update({
      where: { id },
      data: { isActive: false }
    });
  }
}

module.exports = SupportGroupService;
