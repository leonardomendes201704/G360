const TaskService = require('../services/task.service');

class TaskController {
  static async create(req, res) {
    const { userId } = req.user;
    const task = await TaskService.create(req.prisma, userId, req.body);
    return res.status(201).json(task);
  }

  static async index(req, res) {
    const tasks = await TaskService.getAll(req.prisma, req.user, req.query);
    return res.status(200).json(tasks);
  }

  static async show(req, res) {
    const { id } = req.params;
    const { userId } = req.user;
    const task = await TaskService.getById(req.prisma, id, userId);
    return res.status(200).json(task);
  }

  static async update(req, res) {
    const { id } = req.params;
    const task = await TaskService.update(req.prisma, id, { ...req.body, userId: req.user.userId });
    return res.status(200).json(task);
  }

  static async delete(req, res) {
    const { id } = req.params;
    await TaskService.delete(req.prisma, id, req.user.userId);
    return res.status(204).send();
  }
}

module.exports = TaskController;
