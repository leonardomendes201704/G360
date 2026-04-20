const crypto = require('crypto');
const ProjectTaskRepository = require('../repositories/project-task.repository');
const ProjectRepository = require('../repositories/project.repository');
const UserRepository = require('../repositories/user.repository');
const AuditLogRepository = require('../repositories/audit-log.repository');
const ProjectService = require('./project.service');
const { assertAcyclicTaskDependencies } = require('../utils/project-task-graph.util');
const logger = require('../config/logger');

class ProjectTaskService {
  static async create(prisma, tenantId, userId, data) {
    const project = await ProjectService.getById(prisma, data.projectId, userId);
    if (!project) throw { statusCode: 404, message: 'Projeto não encontrado.' };

    if (data.assigneeId) {
      const user = await UserRepository.findById(prisma, data.assigneeId);
      if (!user) throw { statusCode: 404, message: 'Usuário atribuído não encontrado.' };
    }

    // Validar dependências (se fornecidas)
    if (data.dependencies?.length) {
      const validDeps = await ProjectTaskRepository.findByIds(prisma, data.dependencies, data.projectId);
      if (validDeps.length !== data.dependencies.length) {
        throw { statusCode: 400, message: 'Uma ou mais dependências são inválidas.' };
      }
    }

    const existingGraph = await ProjectTaskRepository.findDependencyGraph(prisma, data.projectId);
    const pendingId = crypto.randomUUID();
    assertAcyclicTaskDependencies([
      ...existingGraph,
      { id: pendingId, dependencies: data.dependencies || [] },
    ]);

    // Sanitização: Cria objeto explícito para evitar erro de campos desconhecidos
    const taskData = {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      status: data.status || 'TODO',
      priority: data.priority || 'MEDIUM',
      storyPoints: data.storyPoints,
      assigneeId: data.assigneeId || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      checklist: data.checklist || null,
      // Campos para Gantt
      dependencies: data.dependencies || [],
      progress: data.progress ?? 0
    };

    const task = await ProjectTaskRepository.create(prisma, taskData);

    await AuditLogRepository.create(prisma, {
      tenantId,
      userId,
      action: 'criou uma tarefa de projeto',
      module: 'TASKS',
      entityId: project.id,
      entityType: 'PROJECT',
      newData: { taskTitle: task.title }
    });

    try {
      await ProjectService.recalculateProgress(data.projectId);
    } catch (e) {
      logger.error('Failed to recalculate progress on task creation', e);
    }

    return task;
  }

  static async update(prisma, id, tenantId, userId, data) {
    const task = await ProjectTaskRepository.findById(prisma, id);
    if (!task) throw { statusCode: 404, message: 'Tarefa não encontrada.' };

    const project = await ProjectService.getById(prisma, task.projectId, userId);
    if (!project) throw { statusCode: 403, message: 'Acesso negado a este projeto.' };

    // Sanitização no Update também
    const updateData = {};
    const allowedFields = [
      'title', 'description', 'status', 'priority',
      'storyPoints', 'assigneeId', 'checklist', 'progress'
    ];

    // Campos simples
    allowedFields.forEach(field => {
      if (data[field] !== undefined) updateData[field] = data[field];
    });

    // Tratamento de datas
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    // Tratamento de dependências
    if (data.dependencies !== undefined) {
      // Validar dependências
      if (data.dependencies.length) {
        const validDeps = await ProjectTaskRepository.findByIds(prisma, data.dependencies, task.projectId);
        if (validDeps.length !== data.dependencies.length) {
          throw { statusCode: 400, message: 'Uma ou mais dependências são inválidas.' };
        }
        // Evitar dependência circular
        if (data.dependencies.includes(id)) {
          throw { statusCode: 400, message: 'Uma tarefa não pode depender de si mesma.' };
        }
      }
      const graph = await ProjectTaskRepository.findDependencyGraph(prisma, task.projectId);
      const merged = graph.map((t) =>
        t.id === id ? { id: t.id, dependencies: data.dependencies } : { id: t.id, dependencies: t.dependencies || [] }
      );
      assertAcyclicTaskDependencies(merged);
      updateData.dependencies = data.dependencies;
    }

    // Tratamento de relacionamentos nulos
    if (data.assigneeId === '') updateData.assigneeId = null;

    const updatedTask = await ProjectTaskRepository.update(prisma, id, updateData);

    // --- LOG ---
    let action = null;
    if (updateData.status && updateData.status !== task.status) {
      action = `moveu a tarefa "${task.title}" para ${updateData.status}`;
    } else if (updateData.assigneeId && updateData.assigneeId !== task.assigneeId) {
      action = `reatribuiu a tarefa "${task.title}"`;
    }

    if (action) {
      await AuditLogRepository.create(prisma, {
        tenantId,
        userId,
        action,
        module: 'TASKS',
        entityId: project.id,
        entityType: 'PROJECT',
        newData: updatedTask
      });
    }

    try {
      await ProjectService.recalculateProgress(task.projectId);
    } catch (e) {
      logger.error('Failed to recalculate progress on task update', e);
    }

    return updatedTask;
  }

  static async getByProject(prisma, tenantId, projectId, filters, userId) {
    const project = await ProjectService.getById(prisma, projectId, userId);
    if (!project) throw { statusCode: 404, message: 'Projeto não encontrado.' };
    return ProjectTaskRepository.findAll(prisma, projectId, filters);
  }

  static async delete(prisma, id, tenantId, userId) {
    const task = await ProjectTaskRepository.findById(prisma, id);
    if (!task) throw { statusCode: 404, message: 'Tarefa não encontrada.' };

    const project = await ProjectService.getById(prisma, task.projectId, userId);
    if (!project) throw { statusCode: 403, message: 'Acesso negado.' };

    const result = await ProjectTaskRepository.delete(prisma, id);

    try {
      await ProjectService.recalculateProgress(task.projectId);
    } catch (e) {
      logger.error('Failed to recalculate progress on task deletion', e);
    }

    return result;
  }
}

module.exports = ProjectTaskService;
