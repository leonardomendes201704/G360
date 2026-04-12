const ChangeRequestService = require('../services/change-request.service');
const yup = require('yup');

class ChangeRequestController {
  static async create(req, res) {
    try {
      const schema = yup.object().shape({
        code: yup.string().required(),
        title: yup.string().required(),
        description: yup.string().required(),
        justification: yup.string().required(),
        type: yup.string().oneOf(['NORMAL', 'PADRAO', 'EMERGENCIAL']).required(),
        riskLevel: yup.string().oneOf(['BAIXO', 'MEDIO', 'ALTO', 'CRITICO']),
        impact: yup.string().oneOf(['MENOR', 'SIGNIFICATIVO', 'MAIOR']).required(),
        scheduledStart: yup.date().required(),
        scheduledEnd: yup.date().required(),
        backoutPlan: yup.string(),
        assetIds: yup.array().of(yup.string().uuid()),
        projectId: yup.string().nullable().transform((v) => (v === '' ? null : v)).uuid()
      });

      const validatedData = await schema.validate(req.body);
      const { userId } = req.user;

      const gmud = await ChangeRequestService.create(req.prisma, userId, validatedData);
      return res.status(201).json(gmud);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  static async index(req, res) {
    const list = await ChangeRequestService.getAll(req.prisma, req.query, req.user.userId);
    return res.status(200).json(list);
  }

  static async show(req, res) {
    try {
      const { id } = req.params;
      const gmud = await ChangeRequestService.getById(req.prisma, id, req.user.userId);
      return res.status(200).json(gmud);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const { user } = req; // Pass full user object // userId is inside user

      // Sanitize input
      if (req.body.projectId === '') req.body.projectId = null;

      const gmud = await ChangeRequestService.update(req.prisma, id, user, req.body);
      return res.status(200).json(gmud);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const { user } = req; // Pass full user object

      await ChangeRequestService.delete(req.prisma, id, user);
      return res.status(204).send();
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  static async addApprover(req, res) {
    const { id } = req.params;
    const { userId, role } = req.body;

    await ChangeRequestService.addApprover(req.prisma, id, userId, role, req.user.userId);
    return res.status(201).send();
  }

  static async review(req, res) {
    const { id } = req.params;
    const { userId } = req.user;
    const { status, comment } = req.body;

    await ChangeRequestService.reviewChange(req.prisma, id, userId, { status, comment });
    return res.status(200).send();
  }

  /**
   * GOVERNANCE: Verificar conflitos de schedule antes de criar/editar GMUD
   */
  static async checkConflicts(req, res) {
    try {
      const ScheduleConflictService = require('../services/schedule-conflict.service');
      const { scheduledStart, scheduledEnd, excludeId } = req.query;

      if (!scheduledStart || !scheduledEnd) {
        return res.status(400).json({ message: 'scheduledStart e scheduledEnd são obrigatórios.' });
      }

      const conflicts = await ScheduleConflictService.checkConflicts(req.prisma, scheduledStart, scheduledEnd, excludeId || null, req.user.userId);

      return res.status(200).json({
        hasConflicts: conflicts.length > 0,
        count: conflicts.length,
        conflicts
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  /**
   * GOVERNANCE: Forward Schedule of Changes (FSC) - Calendário consolidado
   */
  static async getForwardSchedule(req, res) {
    try {
      const ScheduleConflictService = require('../services/schedule-conflict.service');
      const { startDate, endDate } = req.query;

      // Default: próximos 30 dias
      const start = startDate ? new Date(startDate) : new Date();
      const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const schedule = await ScheduleConflictService.getForwardSchedule(req.prisma, start, end, req.user.userId);
      return res.status(200).json(schedule);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  /**
   * GOVERNANCE: Dias com alta concentração de GMUDs
   */
  static async getHighConcentrationDays(req, res) {
    try {
      const ScheduleConflictService = require('../services/schedule-conflict.service');
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date();
      const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const days = await ScheduleConflictService.getHighConcentrationDays(req.prisma, start, end, req.user.userId);
      return res.status(200).json(days);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  /**
   * METRICS: Dashboard de métricas de eficiência
   */
  static async getMetrics(req, res) {
    try {
      const ChangeMetricsService = require('../services/change-metrics.service');
      const { startDate, endDate } = req.query;
      const metrics = await ChangeMetricsService.getMetrics(req.prisma, { startDate, endDate }, req.user.userId);
      return res.status(200).json(metrics);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  /**
   * METRICS: Relatório PIR consolidado
   */
  static async getPIRReport(req, res) {
    try {
      const ChangeMetricsService = require('../services/change-metrics.service');
      const { startDate, endDate } = req.query;
      const report = await ChangeMetricsService.getPIRReport(req.prisma, { startDate, endDate }, req.user.userId);
      return res.status(200).json(report);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  /**
   * METRICS: Tendências mensais
   */
  static async getTrends(req, res) {
    try {
      const ChangeMetricsService = require('../services/change-metrics.service');
      const trends = await ChangeMetricsService.getTrends(req.prisma, req.user.userId);
      return res.status(200).json(trends);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
}

module.exports = ChangeRequestController;


