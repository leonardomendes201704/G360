const logger = require('../config/logger');
const { ApprovalTierService } = require('../services/approval-tier.service');

class ApprovalTierController {
  static async list(req, res) {
    try {
      const rows = await ApprovalTierService.list(req.prisma);
      return res.json(rows);
    } catch (e) {
      logger.error(e);
      return res.status(500).json({ message: 'Erro ao listar alçadas' });
    }
  }

  static async create(req, res) {
    try {
      const row = await ApprovalTierService.create(req.prisma, req.body);
      return res.status(201).json(row);
    } catch (e) {
      if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
      logger.error(e);
      return res.status(500).json({ message: 'Erro ao criar alçada' });
    }
  }

  static async update(req, res) {
    try {
      const row = await ApprovalTierService.update(req.prisma, req.params.id, req.body);
      return res.json(row);
    } catch (e) {
      if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
      logger.error(e);
      return res.status(500).json({ message: 'Erro ao atualizar alçada' });
    }
  }

  static async destroy(req, res) {
    try {
      await ApprovalTierService.remove(req.prisma, req.params.id);
      return res.status(204).send();
    } catch (e) {
      logger.error(e);
      return res.status(500).json({ message: 'Erro ao excluir alçada' });
    }
  }
}

module.exports = ApprovalTierController;
