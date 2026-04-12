const TaskRepository = require('../repositories/task.repository');
const UserRepository = require('../repositories/user.repository');
const NotificationService = require('./notification.service');
const EmailTemplateService = require('./email-template.service');
const AuditLogRepository = require('../repositories/audit-log.repository');
const { getUserAccessScope, getAccessibleUserIds } = require('../utils/access-scope');
const logger = require('../config/logger');

class TaskService {
  static async create(prisma, userId, data) {
    // 1. Validar Responsável (se informado)
    if (data.assigneeId) {
      const assignee = await UserRepository.findById(prisma, data.assigneeId);
      if (!assignee) throw { statusCode: 404, message: 'Responsável não encontrado.' };

      const scope = await getUserAccessScope(prisma, userId);
      if (scope.isAdmin === false) {
        const accessibleUserIds = await getAccessibleUserIds(prisma, userId, scope);
        if (!accessibleUserIds || !accessibleUserIds.includes(data.assigneeId)) {
          throw { statusCode: 403, message: 'Acesso negado.' };
        }
      }
    }

    const validData = {
      creatorId: userId,
      title: data.title,
      description: data.description,
      status: data.status || 'TODO',
      priority: data.priority || 'MEDIUM',
      isPersonal: data.isPersonal || false,
      assigneeId: data.assigneeId || null,
      dueDate: data.dueDate ? (function (d) {
        try {
          if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + 'T12:00:00Z');
          const date = new Date(d);
          return isNaN(date.getTime()) ? null : date;
        } catch (e) { return null; }
      })(String(data.dueDate).split('T')[0]) : null,
      checklist: data.checklist || null,
      riskId: data.riskId || null
    };

    const task = await TaskRepository.create(prisma, validData);

    if (task.assigneeId) {
      await NotificationService.createNotification(prisma,
        task.assigneeId,
        'Nova Tarefa Atribuída',
        `Você recebeu uma nova tarefa: ${task.title}`,
        'INFO',
        `/tasks/${task.id}`
      );

      // Notify via Email
      try {
        const assignee = await UserRepository.findById(prisma, task.assigneeId);
        if (assignee && assignee.email) {
          const MailService = require('./mail.service');
          await MailService.sendMail(prisma, {
            to: assignee.email,
            subject: `[TAREFA] Nova Atribuição: ${task.title}`,
            html: EmailTemplateService.getTaskAssignmentTemplate(assignee.name, task.title, task.priority, task.id),
            type: 'TASK_ASSIGNED',
            module: 'TASKS'
          });
        }
      } catch (e) { logger.error('Error sending task email', e); }
    }

    try {
      await AuditLogRepository.create(prisma, {
        userId: userId,
        action: 'criou tarefa',
        module: 'TASKS',
        entityId: task.id,
        entityType: 'TASK',
        newData: task
      });
    } catch (e) { logger.error('Audit Log Error', e); }

    return task;
  }

  static async getAll(prisma, user, filters = {}) {
    const queryFilters = { ...filters };
    const userId = user.id || user.userId;

    if (filters.view === 'mine') {
      queryFilters.assigneeId = userId;
    } else if (filters.view === 'created') {
      queryFilters.creatorId = userId;
    }

    if (filters.riskId) {
      queryFilters.riskId = filters.riskId;
    }

    const scope = await getUserAccessScope(prisma, userId);
    const accessibleUserIds = await getAccessibleUserIds(prisma, userId, scope);
    return TaskRepository.findAll(prisma, queryFilters, userId, scope, accessibleUserIds);
  }

  static async getById(prisma, id, userId) {
    const task = await TaskRepository.findById(prisma, id);
    if (!task) throw { statusCode: 404, message: 'Tarefa nao encontrada.' };

    if (userId) {
      const scope = await getUserAccessScope(prisma, userId);
      if (scope.isAdmin === false) {
        const accessibleUserIds = await getAccessibleUserIds(prisma, userId, scope);
        const hasAccess = accessibleUserIds
          ? accessibleUserIds.includes(task.assigneeId) || accessibleUserIds.includes(task.creatorId)
          : true;

        if (!hasAccess) {
          throw { statusCode: 403, message: 'Acesso negado.' };
        }
      }
    }

    return task;
  }

  static async update(prisma, id, data) {
    await this.getById(prisma, id, data.userId);

    const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate', 'assigneeId', 'isPersonal', 'checklist', 'riskId'];
    const updateData = {};

    Object.keys(data).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'dueDate' && data[key]) {
          const dueDateStr = String(data[key]);
          updateData[key] = new Date(dueDateStr.includes('T') ? dueDateStr : `${dueDateStr.split('T')[0]}T12:00:00Z`);
        } else if (key === 'assigneeId') {
          updateData[key] = data[key] || null;
        } else {
          updateData[key] = data[key];
        }
      }
    });

    if (updateData.assigneeId) {
      const scope = await getUserAccessScope(prisma, data.userId);
      if (scope.isAdmin === false) {
        const accessibleUserIds = await getAccessibleUserIds(prisma, data.userId, scope);
        if (!accessibleUserIds || !accessibleUserIds.includes(updateData.assigneeId)) {
          throw { statusCode: 403, message: 'Acesso negado.' };
        }
      }
    }

    const updatedTask = await TaskRepository.update(prisma, id, updateData);

    if (updateData.assigneeId) {
      // Notification logic
      await NotificationService.createNotification(prisma,
        updateData.assigneeId,
        'Tarefa Atualizada',
        `Você foi atribuído à tarefa: ${updatedTask.title}`,
        'INFO',
        `/tasks/${updatedTask.id}`
      );

      try {
        const assignee = await UserRepository.findById(prisma, updateData.assigneeId);
        if (assignee && assignee.email) {
          const MailService = require('./mail.service');
          await MailService.sendMail(prisma, {
            to: assignee.email,
            subject: `[TAREFA] Nova Atribuição: ${updatedTask.title}`,
            html: EmailTemplateService.getTaskAssignmentTemplate(assignee.name, updatedTask.title, updatedTask.priority, updatedTask.id),
            type: 'TASK_ASSIGNED',
            module: 'TASKS'
          });
        }
      } catch (e) { logger.error('Error sending task email', e); }
    }

    if (updateData.status === 'DONE' || updateData.status === 'COMPLETED') {
      // Completion logic
      const creatorId = updatedTask.creatorId;
      if (creatorId) {
        await NotificationService.createNotification(prisma,
          creatorId,
          'Tarefa Concluída',
          `A tarefa "${updatedTask.title}" foi concluída.`,
          'SUCCESS',
          `/tasks/${updatedTask.id}`
        );
        // Email logic
        try {
          const creator = await UserRepository.findById(prisma, creatorId);
          if (creator && creator.email) {
            const MailService = require('./mail.service');
            await MailService.sendMail(prisma, {
              to: creator.email,
              subject: `[TAREFA] Concluída: ${updatedTask.title}`,
              html: EmailTemplateService.getTaskCompletionTemplate(creator.name, updatedTask.title, updatedTask.id),
              type: 'TASK_STATUS_UPDATED',
              module: 'TASKS'
            });
          }
        } catch (e) { logger.error('Error sending task completion email', e); }
      }
    }

    try {
      await AuditLogRepository.create(prisma, {
        userId: data.userId || 'system',
        action: 'atualizou tarefa',
        module: 'TASKS',
        entityId: id,
        entityType: 'TASK',
        newData: updatedTask
      });
    } catch (e) { logger.error('Audit Log Error', e); }

    return updatedTask;
  }

  static async delete(prisma, id, userId) {
    await this.getById(prisma, id, userId);
    const result = await TaskRepository.delete(prisma, id);

    try {
      await AuditLogRepository.create(prisma, {
        userId: 'system',
        action: 'excluiu tarefa',
        module: 'TASKS',
        entityId: id,
        entityType: 'TASK'
      });
    } catch (e) { logger.error('Audit Log Error', e); }

    return result;
  }
}

module.exports = TaskService;
