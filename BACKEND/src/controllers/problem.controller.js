const ProblemService = require('../services/problem.service');
const yup = require('yup');

class ProblemController {
  static async index(req, res) {
    try {
      const problems = await ProblemService.getAll(req.prisma, req.query);
      return res.status(200).json(problems);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async show(req, res) {
    try {
      const problem = await ProblemService.getById(req.prisma, req.params.id);
      return res.status(200).json(problem);
    } catch(err) {
      return res.status(404).json({ error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const schema = yup.object().shape({
        title: yup.string().required('Título é obrigatório'),
        description: yup.string().required('Descrição é obrigatória'),
        priority: yup.string().oneOf(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('HIGH')
      });
      const data = await schema.validate(req.body);
      const problem = await ProblemService.create(req.prisma, { ...data, requesterId: req.user.userId });
      return res.status(201).json(problem);
    } catch(err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async updateStatus(req, res) {
    try {
      const { status, rootCause, workaround } = req.body;
      const problem = await ProblemService.updateStatus(req.prisma, req.params.id, status, rootCause, workaround);
      return res.status(200).json(problem);
    } catch(err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async linkIncident(req, res) {
    try {
      const { ticketId } = req.body;
      if (!ticketId) return res.status(400).json({ error: 'ticketId é obrigatório' });
      await ProblemService.linkIncident(req.prisma, req.params.id, ticketId);
      return res.status(200).json({ message: 'Incidente vinculado com sucesso.' });
    } catch(err) {
      return res.status(400).json({ error: err.message });
    }
  }
}

module.exports = ProblemController;
