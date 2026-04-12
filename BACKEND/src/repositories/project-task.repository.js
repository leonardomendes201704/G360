class ProjectTaskRepository {
  static async create(prisma, data) {
    return prisma.projectTask.create({ data });
  }

  // Busca tarefas de um projeto (Backlog ou Sprint)
  static async findAll(prisma, projectId, filters = {}) {
    const where = { projectId };

    // Filtros importantes para o Kanban
    if (filters.status) where.status = filters.status;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;

    return prisma.projectTask.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        attachments: { select: { id: true, fileName: true, fileUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async findById(prisma, id) {
    return prisma.projectTask.findUnique({
      where: { id },
      include: {
        assignee: true,
        project: true,
        attachments: true
      }
    });
  }

  // Busca múltiplas tarefas por IDs (para validar dependências)
  static async findByIds(prisma, ids, projectId) {
    return prisma.projectTask.findMany({
      where: {
        id: { in: ids },
        projectId
      },
      select: { id: true }
    });
  }

  static async update(prisma, id, data) {
    return prisma.projectTask.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        attachments: { select: { id: true, fileName: true, fileUrl: true } }
      }
    });
  }

  static async delete(prisma, id) {
    return prisma.projectTask.delete({ where: { id } });
  }
}

module.exports = ProjectTaskRepository;