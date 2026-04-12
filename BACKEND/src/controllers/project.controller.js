const ProjectService = require('../services/project.service');

class ProjectController {
  static async create(req, res) {
    const { userId } = req.user;
    const project = await ProjectService.create(req.prisma, userId, req.body);
    return res.status(201).json(project);
  }

  static async update(req, res) {
    const { userId } = req.user;
    const { id } = req.params;
    const project = await ProjectService.update(req.prisma, id, userId, req.body);
    return res.status(200).json(project);
  }

  static async index(req, res) {
    const projects = await ProjectService.getAll(req.prisma, req.query, req.user);
    return res.status(200).json(projects);
  }

  static async show(req, res) {
    const { id } = req.params;
    const { userId } = req.user;
    const project = await ProjectService.getById(req.prisma, id, userId);
    return res.status(200).json(project);
  }

  static async delete(req, res) {
    const { id } = req.params;
    const { userId } = req.user;
    await ProjectService.delete(req.prisma, id, userId);
    return res.status(204).send();
  }

  // --- MEMBROS ---

  static async addMember(req, res) {
    const { id } = req.params;
    const { userId } = req.user;
    const member = await ProjectService.addMember(req.prisma, id, req.body, userId);
    return res.status(201).json(member);
  }

  static async updateMember(req, res) {
    const { id, userId } = req.params;
    const { userId: adminId } = req.user;
    const { role } = req.body;
    const member = await ProjectService.updateMember(req.prisma, id, userId, role, adminId);
    return res.status(200).json(member);
  }

  static async removeMember(req, res) {
    const { id, userId } = req.params;
    const { userId: adminId } = req.user;
    await ProjectService.removeMember(req.prisma, id, userId, adminId);
    return res.status(204).send();
  }

  // --- WORKFLOW DE APROVAÇÃO ---

  static async submitForApproval(req, res) {
    const { id } = req.params;
    const { userId } = req.user;
    const project = await ProjectService.submitForApproval(req.prisma, id, userId);
    return res.status(200).json(project);
  }

  static async approveProject(req, res) {
    const { id } = req.params;
    const { userId } = req.user;
    const { notes } = req.body;
    const project = await ProjectService.approveProject(req.prisma, id, userId, notes);
    return res.status(200).json(project);
  }

  static async rejectProject(req, res) {
    const { id } = req.params;
    const { userId } = req.user;
    const { reason, requiresAdjustment } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Motivo da rejeição é obrigatório' });
    }

    const project = await ProjectService.rejectProject(req.prisma, id, userId, reason, requiresAdjustment === true);
    return res.status(200).json(project);
  }
}

module.exports = ProjectController;
