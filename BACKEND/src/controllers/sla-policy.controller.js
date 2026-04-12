const SlaPolicyService = require('../services/sla-policy.service');

class SlaPolicyController {
  static async getAll(req, res) {
    try {
      const data = await SlaPolicyService.getAll(req.prisma);
      res.json(data);
    } catch (e) { 
      res.status(400).json({ error: e.message }); 
    }
  }

  static async create(req, res) {
    try {
      const data = await SlaPolicyService.create(req.prisma, req.body);
      res.status(201).json(data);
    } catch (e) { 
      res.status(400).json({ error: e.message }); 
    }
  }

  static async delete(req, res) {
    try {
      await SlaPolicyService.delete(req.prisma, req.params.id);
      res.status(204).send();
    } catch (e) { 
      res.status(400).json({ error: e.message }); 
    }
  }
}

module.exports = SlaPolicyController;
