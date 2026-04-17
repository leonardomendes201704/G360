const TicketService = require('../services/ticket.service');
const HelpdeskMetricsService = require('../services/helpdesk-metrics.service');
const { userHasPermission, userHasAnyPermission } = require('../utils/permission-check');
const yup = require('yup');

class TicketController {
  static async create(req, res) {
    try {
      const emptyToNull = (value, originalValue) => (originalValue === '' ? null : value);

      const schema = yup.object().shape({
        title: yup.string().required('Título é obrigatório'),
        description: yup.string().required('Descrição é obrigatória'),
        categoryId: yup.string().uuid('ID Categoria Inválido').required('Categoria é obrigatória'),
        serviceId: yup.string().uuid().nullable().transform(emptyToNull),
        priority: yup.string().oneOf(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
        relatedAssetId: yup.string().uuid().nullable().transform(emptyToNull),
        relatedIncident: yup.string().nullable().transform(emptyToNull),
        customAnswers: yup.object().default({}),
        supportGroupId: yup.string().uuid().nullable().transform(emptyToNull),
        departmentId: yup.string().uuid().nullable().transform(emptyToNull).optional(),
        costCenterId: yup.string().uuid().nullable().transform(emptyToNull).optional()
      });

      const payload = await schema.validate(req.body, { stripUnknown: true });

      const ticket = await TicketService.create(req.prisma, { ...payload, requesterId: req.user.userId });
      return res.status(201).json(ticket);
    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      throw error;
    }
  }

  static async exportCsv(req, res) {
    try {
      const { status, priority, days } = req.query;
      const csv = await TicketService.buildExportCsv(req.prisma, { status, priority, days });
      const name = `chamados-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
      res.send(`\uFEFF${csv}`);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async metrics(req, res) {
    try {
      const userId = req.user.userId;
      const prisma = req.prisma;
      const canQueue = await userHasPermission(prisma, userId, 'HELPDESK', 'VIEW_QUEUE');
      const scope = await TicketService.getManagerTicketScope(prisma, userId);
      if (!canQueue && !scope.hasScope) {
        return res.status(403).json({ error: 'Sem permissão para métricas.' });
      }
      const days = req.query.days ? Number(req.query.days) : 30;
      const whereTicket = canQueue ? {} : TicketService.buildManagerAccessWhere(userId, scope);
      const data = await HelpdeskMetricsService.getSummary(prisma, { days, whereTicket });
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async index(req, res) {
    const userId = req.user.userId;
    const prisma = req.prisma;
    const canQueue = await userHasPermission(prisma, userId, 'HELPDESK', 'VIEW_QUEUE');
    const scope = await TicketService.getManagerTicketScope(prisma, userId);
    let roleMode = 'REQUESTER';
    if (canQueue) roleMode = 'AGENT';
    else if (scope.hasScope) roleMode = 'MANAGER';

    const tickets = await TicketService.getAll(prisma, req.query, userId, roleMode, scope);
    return res.status(200).json(tickets);
  }

  static async show(req, res) {
    try {
      const userId = req.user.userId;
      const prisma = req.prisma;
      const { id } = req.params;

      const canQueue = await userHasPermission(prisma, userId, 'HELPDESK', 'VIEW_QUEUE');
      const managerScope = await TicketService.getManagerTicketScope(prisma, userId);
      const preview = await prisma.ticket.findUnique({
        where: { id },
        select: {
          id: true,
          requesterId: true,
          assigneeId: true,
          departmentId: true,
          costCenterId: true
        }
      });
      if (!preview) {
        return res.status(404).json({ error: 'Ticket não encontrado' });
      }

      const isParticipant = preview.requesterId === userId || preview.assigneeId === userId;
      const inManagerScope = TicketService.ticketMatchesManagerScope(preview, userId, managerScope);
      if (!canQueue && !isParticipant && !inManagerScope) {
        return res.status(403).json({ error: 'Acesso negado a este chamado.' });
      }

      const canSeeInternal =
        canQueue ||
        preview.assigneeId === userId ||
        (await userHasPermission(prisma, userId, 'HELPDESK', 'VIEW_INTERNAL_NOTES'));

      const ticket = await TicketService.getById(prisma, id, { stripInternalMessages: !canSeeInternal });
      return res.status(200).json(ticket);
    } catch (err) {
      return res.status(404).json({ error: err.message });
    }
  }

  static async addMessage(req, res) {
    try {
      const schema = yup.object().shape({
        content: yup.string().required('Mensagem não pode ser vazia'),
        isInternal: yup.boolean().default(false),
        attachments: yup
          .array()
          .of(
            yup.object().shape({
              fileName: yup.string().required(),
              fileUrl: yup.string().required(),
              size: yup.number(),
              mimetype: yup.string(),
            })
          )
          .optional()
          .default([]),
      });
      const payload = await schema.validate(req.body);

      const userId = req.user.userId;
      const prisma = req.prisma;
      const { id: ticketId } = req.params;

      const canMsg = await userHasAnyPermission(prisma, userId, 'HELPDESK', [
        'READ',
        'CREATE',
        'MESSAGE',
        'VIEW_QUEUE',
      ]);
      if (!canMsg) {
        return res.status(403).json({ error: 'Sem permissão para responder chamados.' });
      }

      const canQueue = await userHasPermission(prisma, userId, 'HELPDESK', 'VIEW_QUEUE');
      const managerScope = await TicketService.getManagerTicketScope(prisma, userId);
      const ticketFull = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          requesterId: true,
          assigneeId: true,
          departmentId: true,
          costCenterId: true
        }
      });
      if (!ticketFull) {
        return res.status(404).json({ error: 'Chamado não encontrado' });
      }

      const isParticipant =
        ticketFull.requesterId === userId || ticketFull.assigneeId === userId;
      const inManagerScope = TicketService.ticketMatchesManagerScope(ticketFull, userId, managerScope);
      if (!isParticipant && !canQueue && !inManagerScope) {
        return res.status(403).json({ error: 'Apenas participantes, agentes ou gestores da área podem enviar mensagens.' });
      }

      if (payload.isInternal) {
        const canInternal =
          (await userHasPermission(prisma, userId, 'HELPDESK', 'WRITE_INTERNAL_NOTES')) &&
          (canQueue || ticketFull.assigneeId === userId);
        if (!canInternal) {
          return res.status(403).json({ error: 'Sem permissão para notas internas neste chamado.' });
        }
      }

      const msg = await TicketService.addMessage(
        prisma,
        ticketId,
        userId,
        payload.content,
        payload.isInternal,
        payload.attachments
      );
      return res.status(201).json(msg);
    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      throw error;
    }
  }

  static async updateStatus(req, res) {
    try {
      const { status, assigneeId } = req.body;
      const validStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
      }

      const ticket = await TicketService.updateStatus(req.prisma, req.params.id, status, {
        assigneeId: assigneeId !== undefined ? assigneeId : undefined
      });
      return res.status(200).json(ticket);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const emptyToNull = (value, originalValue) => (originalValue === '' ? null : value);

      const schema = yup.object().shape({
        assigneeId: yup.string().uuid().nullable().transform(emptyToNull).optional(),
        priority: yup.string().oneOf(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        categoryId: yup.string().uuid().optional(),
        supportGroupId: yup.string().uuid().nullable().transform(emptyToNull).optional(),
        departmentId: yup.string().uuid().nullable().transform(emptyToNull).optional(),
        costCenterId: yup.string().uuid().nullable().transform(emptyToNull).optional()
      });

      const payload = await schema.validate(req.body, { stripUnknown: true });
      if (Object.keys(payload).length === 0) {
        return res.status(400).json({
          error:
            'Informe ao menos um campo: assigneeId, priority, categoryId, supportGroupId, departmentId ou costCenterId.'
        });
      }

      const ticket = await TicketService.updateTicket(req.prisma, req.params.id, payload);
      return res.status(200).json(ticket);
    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      return res.status(400).json({ error: error.message });
    }
  }

  static async submitCsat(req, res) {
    try {
      const schema = yup.object().shape({
        score: yup.number().integer().min(1).max(5).required(),
        comment: yup.string().nullable().max(2000)
      });
      const payload = await schema.validate(req.body, { stripUnknown: true });

      const ticket = await TicketService.submitCsat(req.prisma, req.params.id, req.user.userId, {
        score: payload.score,
        comment: payload.comment
      });
      return res.status(200).json(ticket);
    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      return res.status(400).json({ error: error.message });
    }
  }

  static async escalateProblem(req, res) {
    try {
      const problem = await TicketService.escalateToProblem(req.prisma, req.params.id, req.user.userId);
      return res.status(201).json(problem);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async escalateChange(req, res) {
    try {
      const change = await TicketService.escalateToChange(req.prisma, req.params.id, req.user.userId);
      return res.status(201).json(change);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async escalateProject(req, res) {
    try {
      const project = await TicketService.escalateToProject(
        req.prisma,
        req.params.id,
        req.user.userId,
        req.body.projectName
      );
      return res.status(201).json(project);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
}

module.exports = TicketController;
