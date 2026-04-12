const CostCenterService = require('../services/cost-center.service');
const yup = require('yup');
const logger = require('../config/logger');

class CostCenterController {
  static async create(req, res) {
    try {
      const schema = yup.object().shape({
        code: yup.string().required('Código é obrigatório'),
        name: yup.string().required('Nome é obrigatório'),
        isActive: yup.boolean().default(true),
        departmentId: yup.string().uuid().nullable(),
        managerId: yup.string().uuid().nullable()
      });

      await schema.validate(req.body);

      const result = await CostCenterService.create(req.prisma, req.body);
      return res.status(201).json(result);
    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      throw error;
    }
  }

  static async index(req, res) {
    const { userId } = req.user;
    logger.info(`DEBUG CONTROLLER: Index called by UserID: ${userId}`);
    const result = await CostCenterService.getAll(req.prisma, userId);
    logger.info(`DEBUG CONTROLLER: Returning ${result.length} cost centers.`);
    return res.status(200).json(result);
  }

  static async update(req, res) {
    try {
      const schema = yup.object().shape({
        code: yup.string(),
        name: yup.string(),
        isActive: yup.boolean(),
        departmentId: yup.string().uuid().nullable(),
        managerId: yup.string().uuid().nullable()
      });

      await schema.validate(req.body);

      const { id } = req.params;
      const result = await CostCenterService.update(req.prisma, id, req.body);
      return res.status(200).json(result);
    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      throw error;
    }
  }

  static async delete(req, res) {
    const { id } = req.params;
    await CostCenterService.delete(req.prisma, id);
    return res.status(204).send();
  }
}

module.exports = CostCenterController;