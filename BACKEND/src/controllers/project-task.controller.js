const ProjectTaskService = require('../services/project-task.service');

class ProjectTaskController {
  static async create(req, res) {
    const { tenantId, userId } = req.user;
    const task = await ProjectTaskService.create(req.prisma, tenantId, userId, req.body);
    return res.status(201).json(task);
  }

  static async update(req, res) {
    const { id } = req.params;
    const { tenantId, userId } = req.user;
    const task = await ProjectTaskService.update(req.prisma, id, tenantId, userId, req.body);
    return res.status(200).json(task);
  }

  static async indexByProject(req, res) {
    const { projectId } = req.params;
    const { tenantId, userId } = req.user;
    const filters = req.query;
    const tasks = await ProjectTaskService.getByProject(req.prisma, tenantId, projectId, filters, userId);
    return res.status(200).json(tasks);
  }

  static async delete(req, res) {
    const { id } = req.params;
    const { tenantId, userId } = req.user;
    await ProjectTaskService.delete(req.prisma, id, tenantId, userId);
    return res.status(204).send();
  }
}

module.exports = ProjectTaskController;
