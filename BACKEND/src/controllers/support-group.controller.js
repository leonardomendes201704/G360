const SupportGroupService = require('../services/support-group.service');
const yup = require('yup');

class SupportGroupController {
  static async index(req, res) {
    try {
      const list = await SupportGroupService.listAll(req.prisma);
      return res.status(200).json(list);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async indexActive(req, res) {
    try {
      const list = await SupportGroupService.list(req.prisma);
      return res.status(200).json(list);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async create(req, res) {
    try {
      const schema = yup.object().shape({
        name: yup.string().required('Nome é obrigatório').min(2).max(120),
        description: yup.string().nullable().max(500),
        slaPolicyId: yup.string().uuid().nullable(),
        memberIds: yup.array().of(yup.string().uuid()).default([])
      });
      const payload = await schema.validate(req.body, { stripUnknown: true });
      const g = await SupportGroupService.create(req.prisma, payload);
      return res.status(201).json(g);
    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      return res.status(400).json({ error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const schema = yup.object().shape({
        name: yup.string().min(2).max(120),
        description: yup.string().nullable().max(500),
        slaPolicyId: yup.string().uuid().nullable(),
        isActive: yup.boolean(),
        memberIds: yup.array().of(yup.string().uuid())
      });
      const payload = await schema.validate(req.body, { stripUnknown: true });
      const g = await SupportGroupService.update(req.prisma, req.params.id, payload);
      return res.status(200).json(g);
    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      return res.status(400).json({ error: error.message });
    }
  }

  static async deactivate(req, res) {
    try {
      await SupportGroupService.deleteSoft(req.prisma, req.params.id);
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = SupportGroupController;
