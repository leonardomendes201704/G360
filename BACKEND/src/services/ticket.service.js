const MailService = require('./mail.service');
const EmailTemplateService = require('./email-template.service');
const HelpdeskConfigService = require('./helpdesk-config.service');
const NotificationService = require('./notification.service');
const {
  buildSlaDueDatesWallClockMinutes,
  buildSlaDueDatesBusinessMinutes,
  addBusinessMinutesUtc
} = require('../utils/business-hours.util');

/** Minutos de SLA quando não há política no catálogo (fallback por prioridade) */
const PRIORITY_SLA_MINUTES = {
  LOW: { response: 480, resolve: 4320 },
  MEDIUM: { response: 240, resolve: 1440 },
  HIGH: { response: 120, resolve: 480 },
  URGENT: { response: 60, resolve: 240 }
};

class TicketService {
  static get baseInclude() {
    return {
      requester: { select: { id: true, name: true, email: true, avatar: true } },
      assignee: { select: { id: true, name: true, email: true, avatar: true } },
      category: { select: { id: true, name: true } },
      service: { select: { id: true, name: true, categoryId: true } },
      supportGroup: { select: { id: true, name: true } },
      department: { select: { id: true, name: true, code: true } },
      costCenter: { select: { id: true, name: true, code: true } },
      slaPolicy: true,
      attachments: true
    };
  }

  /** Diretor de departamento e/ou gestor de centro de custo. */
  static async getManagerTicketScope(prismaClient, userId) {
    const [depts, ccs] = await Promise.all([
      prismaClient.department.findMany({ where: { directorId: userId }, select: { id: true } }),
      prismaClient.costCenter.findMany({ where: { managerId: userId }, select: { id: true } })
    ]);
    const departmentIds = depts.map((d) => d.id);
    const costCenterIds = ccs.map((c) => c.id);
    return {
      departmentIds,
      costCenterIds,
      hasScope: departmentIds.length > 0 || costCenterIds.length > 0
    };
  }

  static buildManagerAccessWhere(userId, scope) {
    const or = [{ requesterId: userId }];
    if (scope.departmentIds.length) {
      or.push({ departmentId: { in: scope.departmentIds } });
      // Chamados antigos sem snapshot: visibilidade pela área atual do solicitante
      or.push({ requester: { departmentId: { in: scope.departmentIds } } });
    }
    if (scope.costCenterIds.length) {
      or.push({ costCenterId: { in: scope.costCenterIds } });
      or.push({ requester: { costCenterId: { in: scope.costCenterIds } } });
    }
    return { OR: or };
  }

  /**
   * @param {{
   *   requesterId: string,
   *   departmentId?: string|null,
   *   costCenterId?: string|null,
   *   requester?: { departmentId?: string|null, costCenterId?: string|null }
   * }} ticket
   * @param {{ departmentIds: string[], costCenterIds: string[], hasScope: boolean }} scope
   */
  static ticketMatchesManagerScope(ticket, userId, scope) {
    if (!scope?.hasScope || !ticket) return false;
    if (ticket.requesterId === userId) return true;
    if (ticket.departmentId && scope.departmentIds.includes(ticket.departmentId)) return true;
    if (ticket.costCenterId && scope.costCenterIds.includes(ticket.costCenterId)) return true;
    const rd = ticket.requester?.departmentId;
    const rc = ticket.requester?.costCenterId;
    if (rd && scope.departmentIds.includes(rd)) return true;
    if (rc && scope.costCenterIds.includes(rc)) return true;
    return false;
  }

  static async resolveSnapshotIds(prismaClient, requesterId, bodyDepartmentId, bodyCostCenterId) {
    const requester = await prismaClient.user.findUnique({
      where: { id: requesterId },
      select: { departmentId: true, costCenterId: true }
    });
    const departmentId =
      bodyDepartmentId !== undefined ? bodyDepartmentId || null : requester?.departmentId ?? null;
    const costCenterId =
      bodyCostCenterId !== undefined ? bodyCostCenterId || null : requester?.costCenterId ?? null;

    if (departmentId) {
      const d = await prismaClient.department.findUnique({ where: { id: departmentId } });
      if (!d) throw new Error('Departamento inválido.');
    }
    if (costCenterId) {
      const c = await prismaClient.costCenter.findUnique({ where: { id: costCenterId } });
      if (!c) throw new Error('Centro de custo inválido.');
    }
    return { departmentId, costCenterId };
  }

  /**
   * Formato compacto sem hífens: HD + YY (2 dígitos do ano) + NNNN (sequência no ano).
   * Ex.: HD260001. A sequência atómica continua por ano civil em `TicketCodeSequence`.
   */
  static formatTicketCodeCompact(year, sequenceNumber) {
    const yy = String(year).slice(-2);
    return `HD${yy}${String(sequenceNumber).padStart(4, '0')}`;
  }

  /** Legado: HD-2026-0361 → HD260361 (mesma regra que `migrate-ticket-codes-legacy-format.js`). */
  static legacyTicketCodeToCompact(code) {
    const m = /^HD-(\d{4})-(\d+)$/.exec(String(code || '').trim());
    if (!m) return null;
    const year = parseInt(m[1], 10);
    const seq = parseInt(m[2], 10);
    const yy = String(year).slice(-2);
    return `HD${yy}${String(seq).padStart(4, '0')}`;
  }

  /**
   * Garante código persistido no formato HDyynnnn (6 dígitos após HD). Corrige legado se necessário.
   */
  static normalizeTicketCodeForStorage(code) {
    const s = String(code || '').trim();
    if (/^HD\d{6}$/.test(s)) return s;
    const fixed = this.legacyTicketCodeToCompact(s);
    if (fixed) return fixed;
    throw new Error(`Código de chamado em formato inválido: ${code}`);
  }

  /**
   * Próximo código de chamado — sequência por ano via Prisma (atómico, sem SQL bruto por dialect).
   */
  static async getNextTicketCode(prismaClient) {
    const year = new Date().getFullYear();
    const row = await prismaClient.$transaction(async (tx) =>
      tx.ticketCodeSequence.upsert({
        where: { year },
        create: { year, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } }
      })
    );
    const n = Number(row.lastNumber);
    if (!Number.isFinite(n) || n < 1) {
      throw new Error('Falha ao obter sequência de código de chamado.');
    }
    return this.formatTicketCodeCompact(year, n);
  }

  /**
   * Resolve minutos: catálogo → grupo de suporte → prioridade.
   */
  static async resolveSlaMinutes(prismaClient, serviceId, supportGroupId, priority) {
    const p = priority || 'MEDIUM';
    if (serviceId) {
      const svc = await prismaClient.serviceCatalog.findUnique({
        where: { id: serviceId },
        include: { slaPolicy: true }
      });
      if (svc?.slaPolicy?.isActive) {
        return {
          response: svc.slaPolicy.responseMinutes,
          resolve: svc.slaPolicy.resolveMinutes,
          slaPolicyId: svc.slaPolicy.id
        };
      }
    }
    if (supportGroupId) {
      const grp = await prismaClient.supportGroup.findUnique({
        where: { id: supportGroupId },
        include: { slaPolicy: true }
      });
      if (grp?.isActive && grp?.slaPolicy?.isActive) {
        return {
          response: grp.slaPolicy.responseMinutes,
          resolve: grp.slaPolicy.resolveMinutes,
          slaPolicyId: grp.slaPolicy.id
        };
      }
    }
    const fb = PRIORITY_SLA_MINUTES[p] || PRIORITY_SLA_MINUTES.MEDIUM;
    return { response: fb.response, resolve: fb.resolve, slaPolicyId: null };
  }

  static async computeSlaDueDates(prismaClient, baseDate, responseMin, resolveMin) {
    const { useBusinessCalendar, calendar } = await HelpdeskConfigService.getEffectiveCalendar(prismaClient);
    if (!useBusinessCalendar) {
      return buildSlaDueDatesWallClockMinutes(baseDate, responseMin, resolveMin);
    }
    return buildSlaDueDatesBusinessMinutes(baseDate, responseMin, resolveMin, calendar);
  }

  /**
   * Atribui o próximo analista do grupo (round-robin), com bloqueio de linha para concorrência.
   */
  static async assignRoundRobinFromGroup(prismaClient, supportGroupId) {
    try {
      return await prismaClient.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT 1 FROM "support_groups" WHERE id = $1 FOR UPDATE`, supportGroupId);
        const g = await tx.supportGroup.findUnique({
          where: { id: supportGroupId },
          include: { members: { orderBy: { createdAt: 'asc' } } }
        });
        if (!g?.isActive || !g.members?.length) return null;
        const ids = g.members.map((m) => m.userId);
        const cursor = Number(g.assignmentCursor || 0);
        const idx = cursor % ids.length;
        const userId = ids[idx];
        await tx.supportGroup.update({
          where: { id: supportGroupId },
          data: { assignmentCursor: cursor + 1 }
        });
        return userId;
      });
    } catch (e) {
      console.error('[TicketService] assignRoundRobinFromGroup', e);
      return null;
    }
  }

  static escapeCsvCell(value) {
    if (value == null || value === undefined) return '';
    const s = String(value);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  /**
   * Exportação CSV (fila / relatório). Limite 8000 linhas.
   */
  static async buildExportCsv(prisma, filters = {}) {
    const where = { ...(filters.whereTicket || {}) };
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.days) {
      const d = Number(filters.days);
      if (d > 0 && d <= 730) {
        const since = new Date(Date.now() - d * 86400000);
        where.createdAt = { gte: since };
      }
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 8000,
      include: {
        requester: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } },
        supportGroup: { select: { name: true } },
        category: { select: { name: true } },
        department: { select: { name: true, code: true } },
        costCenter: { select: { name: true, code: true } }
      }
    });

    const header = [
      'codigo',
      'titulo',
      'status',
      'prioridade',
      'categoria',
      'departamento',
      'centro_custo',
      'solicitante',
      'email_solicitante',
      'grupo',
      'responsavel',
      'aberto_em',
      'resolvido_em',
      'sla_estourado'
    ];
    const lines = [header.join(';')];
    for (const t of tickets) {
      lines.push(
        [
          this.escapeCsvCell(t.code),
          this.escapeCsvCell(t.title),
          this.escapeCsvCell(t.status),
          this.escapeCsvCell(t.priority),
          this.escapeCsvCell(t.category?.name),
          this.escapeCsvCell(t.department ? `${t.department.code} ${t.department.name}` : ''),
          this.escapeCsvCell(t.costCenter ? `${t.costCenter.code} ${t.costCenter.name}` : ''),
          this.escapeCsvCell(t.requester?.name),
          this.escapeCsvCell(t.requester?.email),
          this.escapeCsvCell(t.supportGroup?.name),
          this.escapeCsvCell(t.assignee?.name),
          this.escapeCsvCell(t.createdAt?.toISOString()),
          this.escapeCsvCell(t.resolvedAt?.toISOString()),
          t.slaBreached ? 'sim' : 'nao'
        ].join(';')
      );
    }
    return lines.join('\n');
  }

  static async create(prismaClient, data) {
    const {
      title,
      description,
      priority,
      categoryId,
      serviceId,
      requesterId,
      relatedAssetId,
      relatedIncident,
      customAnswers,
      supportGroupId,
      departmentId: bodyDepartmentId,
      costCenterId: bodyCostCenterId
    } = data;

    const { departmentId, costCenterId } = await this.resolveSnapshotIds(
      prismaClient,
      requesterId,
      bodyDepartmentId,
      bodyCostCenterId
    );

    const prio = priority || 'MEDIUM';
    const code = this.normalizeTicketCodeForStorage(await this.getNextTicketCode(prismaClient));
    const slaMin = await this.resolveSlaMinutes(prismaClient, serviceId, supportGroupId, prio);
    const slaDates = await this.computeSlaDueDates(
      prismaClient,
      new Date(),
      slaMin.response,
      slaMin.resolve
    );

    let assigneeId = null;
    if (supportGroupId) {
      const cfgRow = await prismaClient.helpdeskConfig.findUnique({ where: { id: 1 } });
      const autoOn = cfgRow?.autoAssignOnCreate !== false;
      if (autoOn) {
        assigneeId = await this.assignRoundRobinFromGroup(prismaClient, supportGroupId);
      }
    }

    const newTicket = await prismaClient.ticket.create({
      data: {
        code,
        title,
        description,
        priority: prio,
        categoryId,
        serviceId: serviceId || null,
        supportGroupId: supportGroupId || null,
        assigneeId,
        requesterId,
        relatedAssetId,
        relatedIncident,
        customAnswers: customAnswers || {},
        departmentId,
        costCenterId,
        slaMonitorId: slaMin.slaPolicyId,
        slaResponseDue: slaDates.slaResponseDue,
        slaResolveDue: slaDates.slaResolveDue
      },
      include: this.baseInclude
    });

    try {
      if (newTicket.requester && newTicket.requester.email) {
        const html = EmailTemplateService.getTicketCreatedTemplate(
          newTicket.requester.name,
          newTicket.code,
          newTicket.title,
          `/portal/tickets/${newTicket.id}`
        );
        await MailService.sendMail(prismaClient, {
          to: newTicket.requester.email,
          subject: `[${newTicket.code}] [ABERTO] Chamado: ${newTicket.title}`,
          html,
          type: 'TICKET_CREATED',
          module: 'HELPDESK'
        });
      }
    } catch (err) {
      console.error('Falha ao alertar usuário sobre novo ticket via e-mail', err);
    }

    try {
      if (newTicket.assigneeId && newTicket.assigneeId !== newTicket.requesterId) {
        const a = newTicket.assignee;
        await NotificationService.createNotification(prismaClient, {
          userId: newTicket.assigneeId,
          title: 'Novo chamado atribuído a si',
          message: `${newTicket.code}: ${newTicket.title}`,
          type: 'INFO',
          link: `/servicedesk/tickets/${newTicket.id}`,
          eventCode: 'TICKET_ASSIGNED',
          entityType: 'Ticket',
          entityId: newTicket.id,
          category: 'HELPDESK',
          mail: a?.email
            ? {
                to: a.email,
                subject: `[${newTicket.code}] Chamado atribuído`,
                html: EmailTemplateService.getSimpleAlertEmail(
                  a.name,
                  'Chamado atribuído',
                  `<p>Foi-lhe atribuído o chamado <strong>${newTicket.code}</strong> — ${newTicket.title}</p>`,
                  `/servicedesk/tickets/${newTicket.id}`
                ),
                type: 'TICKET_ASSIGNED',
                module: 'HELPDESK'
              }
            : null
        });
      }
    } catch (e) {
      console.error('Falha ao notificar responsável do chamado', e);
    }

    return newTicket;
  }

  static async getAll(prismaClient, query, userId, role = 'REQUESTER', managerScope = null) {
    const andParts = [];

    if (role === 'REQUESTER') {
      andParts.push({ requesterId: userId });
    } else if (role === 'MANAGER' && managerScope?.hasScope) {
      andParts.push(this.buildManagerAccessWhere(userId, managerScope));
    }
    // AGENT: sem filtro de âmbito

    if (query.status) andParts.push({ status: query.status });
    if (query.priority) andParts.push({ priority: query.priority });
    if (query.assigneeId) andParts.push({ assigneeId: query.assigneeId });
    if (query.departmentId) andParts.push({ departmentId: query.departmentId });
    if (query.costCenterId) andParts.push({ costCenterId: query.costCenterId });

    const where =
      andParts.length === 0 ? {} : andParts.length === 1 ? andParts[0] : { AND: andParts };

    return await prismaClient.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: this.baseInclude
    });
  }

  static async getById(prismaClient, id, options = {}) {
    const { stripInternalMessages = false } = options;
    const ticket = await prismaClient.ticket.findUnique({
      where: { id },
      include: {
        ...this.baseInclude,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, avatar: true } },
            attachments: true
          }
        }
      }
    });
    if (!ticket) throw new Error('Ticket não encontrado');
    if (stripInternalMessages && ticket.messages?.length) {
      ticket.messages = ticket.messages.filter((m) => !m.isInternal);
    }
    return ticket;
  }

  /**
   * @param {object} [options]
   * @param {string} [options.assigneeId] — define responsável ao mudar status (ex.: assumir chamado)
   */
  static async updateStatus(prismaClient, id, status, options = {}) {
    const assigneeId = options.assigneeId != null ? options.assigneeId : undefined;

    const ticketOld = await prismaClient.ticket.findUnique({ where: { id } });
    if (!ticketOld) throw new Error('Ticket não encontrado');

    const updates = { status };

    if (assigneeId !== undefined) {
      updates.assigneeId = assigneeId || null;
    }

    if (status === 'RESOLVED' || status === 'CLOSED') {
      if (!ticketOld.resolvedAt) {
        updates.resolvedAt = new Date();
      }
    }
    if (status === 'CLOSED') {
      updates.closedAt = new Date();
    }

    if (status === 'WAITING_USER' && ticketOld.status !== 'WAITING_USER') {
      updates.slaPausedAt = new Date();
    } else if (ticketOld.status === 'WAITING_USER' && status !== 'WAITING_USER') {
      if (ticketOld.slaPausedAt) {
        const pauseEnd = new Date();
        const pausedMs = pauseEnd.getTime() - new Date(ticketOld.slaPausedAt).getTime();
        const pausedMinutes = Math.floor(pausedMs / 60000);

        updates.slaTotalPausedMinutes = (ticketOld.slaTotalPausedMinutes || 0) + pausedMinutes;
        updates.slaPausedAt = null;

        if (ticketOld.slaResponseDue) {
          updates.slaResponseDue = new Date(new Date(ticketOld.slaResponseDue).getTime() + pausedMs);
        }
        if (ticketOld.slaResolveDue) {
          updates.slaResolveDue = new Date(new Date(ticketOld.slaResolveDue).getTime() + pausedMs);
        }
      }
    }

    const ticket = await prismaClient.ticket.update({
      where: { id },
      data: updates,
      include: this.baseInclude
    });

    try {
      if (ticket.requester && ticket.requester.email) {
        const html = EmailTemplateService.getTicketUpdateTemplate(
          ticket.requester.name,
          ticket.code,
          ticket.title,
          status,
          `/portal/tickets/${ticket.id}`
        );
        await MailService.sendMail(prismaClient, {
          to: ticket.requester.email,
          subject: `[${ticket.code}] [${status}] Atualização de Chamado`,
          html,
          type: 'TICKET_STATUS_UPDATED',
          module: 'HELPDESK'
        });
      }
    } catch (err) {
      console.error('Falha ao alertar usuário sobre mudança de ticket via e-mail', err);
    }

    try {
      if (ticket.assigneeId && ticket.assigneeId !== ticket.requesterId) {
        await NotificationService.createNotification(prismaClient, {
          userId: ticket.assigneeId,
          title: 'Atualização de chamado',
          message: `${ticket.code}: estado ${status}`,
          type: 'INFO',
          link: `/servicedesk/tickets/${ticket.id}`,
          eventCode: 'TICKET_STATUS_CHANGED',
          entityType: 'Ticket',
          entityId: ticket.id,
          category: 'HELPDESK'
        });
      }
    } catch (e) {
      console.error('Falha ao notificar responsável (estado)', e);
    }

    return ticket;
  }

  /**
   * Triagem: prioridade, responsável, categoria. Recalcula prazos de SLA ao mudar prioridade.
   */
  static async updateTicket(prismaClient, id, data) {
    const ticketOld = await prismaClient.ticket.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        requester: { select: { id: true, name: true, email: true } }
      }
    });
    if (!ticketOld) throw new Error('Ticket não encontrado');

    const updates = {};

    if (data.assigneeId !== undefined) {
      updates.assigneeId = data.assigneeId || null;
    }
    if (data.categoryId !== undefined) {
      updates.categoryId = data.categoryId;
    }
    if (data.supportGroupId !== undefined) {
      updates.supportGroupId = data.supportGroupId || null;
    }
    if (data.priority !== undefined) {
      updates.priority = data.priority;
    }
    if (data.departmentId !== undefined) {
      const v = data.departmentId || null;
      if (v) {
        const d = await prismaClient.department.findUnique({ where: { id: v } });
        if (!d) throw new Error('Departamento inválido.');
      }
      updates.departmentId = v;
    }
    if (data.costCenterId !== undefined) {
      const v = data.costCenterId || null;
      if (v) {
        const c = await prismaClient.costCenter.findUnique({ where: { id: v } });
        if (!c) throw new Error('Centro de custo inválido.');
      }
      updates.costCenterId = v;
    }

    const prio = data.priority !== undefined ? data.priority : ticketOld.priority;
    const grp =
      data.supportGroupId !== undefined ? data.supportGroupId : ticketOld.supportGroupId;

    const needSlaRecalc =
      (data.priority !== undefined && data.priority !== ticketOld.priority) ||
      (data.supportGroupId !== undefined && data.supportGroupId !== ticketOld.supportGroupId);

    if (needSlaRecalc) {
      const slaMin = await this.resolveSlaMinutes(prismaClient, ticketOld.serviceId, grp || null, prio);
      updates.slaMonitorId = slaMin.slaPolicyId;
      const now = new Date();
      if (!ticketOld.respondedAt) {
        const d = await this.computeSlaDueDates(prismaClient, now, slaMin.response, slaMin.resolve);
        updates.slaResponseDue = d.slaResponseDue;
        updates.slaResolveDue = d.slaResolveDue;
      } else {
        const { useBusinessCalendar, calendar } = await HelpdeskConfigService.getEffectiveCalendar(prismaClient);
        if (!useBusinessCalendar) {
          updates.slaResolveDue = new Date(now.getTime() + slaMin.resolve * 60 * 1000);
        } else {
          updates.slaResolveDue = addBusinessMinutesUtc(now, slaMin.resolve, calendar);
        }
      }
      updates.slaBreached = false;
    }

    const updated = await prismaClient.ticket.update({
      where: { id },
      data: updates,
      include: this.baseInclude
    });

    try {
      const newAssignee = data.assigneeId !== undefined ? data.assigneeId || null : ticketOld.assigneeId;
      const oldAssignee = ticketOld.assigneeId;
      if (data.assigneeId !== undefined && newAssignee && newAssignee !== oldAssignee) {
        const u = await prismaClient.user.findUnique({
          where: { id: newAssignee },
          select: { email: true, name: true }
        });
        await NotificationService.createNotification(prismaClient, {
          userId: newAssignee,
          title: 'Chamado atribuído a si',
          message: `${updated.code}: ${updated.title}`,
          type: 'INFO',
          link: `/servicedesk/tickets/${updated.id}`,
          eventCode: 'TICKET_ASSIGNED',
          entityType: 'Ticket',
          entityId: updated.id,
          category: 'HELPDESK',
          mail: u?.email
            ? {
                to: u.email,
                subject: `[${updated.code}] Atribuição de chamado`,
                html: EmailTemplateService.getSimpleAlertEmail(
                  u.name,
                  'Chamado atribuído',
                  `<p>O chamado <strong>${updated.code}</strong> foi atribuído a si.</p>`,
                  `/servicedesk/tickets/${updated.id}`
                ),
                type: 'TICKET_ASSIGNED',
                module: 'HELPDESK'
              }
            : null
        });
      }
    } catch (e) {
      console.error('Falha ao notificar nova atribuição', e);
    }

    return updated;
  }

  static async submitCsat(prismaClient, ticketId, requesterId, { score, comment }) {
    const ticket = await prismaClient.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket não encontrado');
    if (ticket.requesterId !== requesterId) {
      throw new Error('Apenas o solicitante pode avaliar o chamado.');
    }
    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      throw new Error('A avaliação só é permitida após o chamado ser resolvido.');
    }
    if (ticket.csatAt) {
      throw new Error('Avaliação já enviada para este chamado.');
    }
    const n = Number(score);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      throw new Error('Nota inválida. Use um valor entre 1 e 5.');
    }

    return prismaClient.ticket.update({
      where: { id: ticketId },
      data: {
        csatScore: n,
        csatComment: comment || null,
        csatAt: new Date()
      },
      include: this.baseInclude
    });
  }

  static async addMessage(prismaClient, ticketId, userId, content, isInternal = false, attachments = []) {
    const ticketBefore = await prismaClient.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        requesterId: true,
        assigneeId: true,
        status: true,
        respondedAt: true,
        code: true
      }
    });
    if (!ticketBefore) throw new Error('Ticket não encontrado');

    const newMessage = await prismaClient.ticketMessage.create({
      data: {
        ticketId,
        userId,
        content,
        isInternal,
        attachments: {
          create: attachments.map((att) => ({
            ticketId,
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileSize: att.size,
            mimeType: att.mimetype,
            uploadedBy: userId
          }))
        }
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        attachments: true,
        ticket: {
          include: {
            requester: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    // Primeira resposta SLA + auto-triagem
    if (!isInternal && userId !== ticketBefore.requesterId) {
      const followUp = {};
      if (!ticketBefore.respondedAt) {
        followUp.respondedAt = new Date();
      }
      if (ticketBefore.status === 'OPEN') {
        followUp.status = 'IN_PROGRESS';
        if (!ticketBefore.assigneeId) {
          followUp.assigneeId = userId;
        }
      }
      if (Object.keys(followUp).length > 0) {
        await prismaClient.ticket.update({
          where: { id: ticketId },
          data: followUp
        });
      }
    }

    if (!isInternal && newMessage.ticket && newMessage.ticket.requesterId === userId && newMessage.ticket.status === 'WAITING_USER') {
      await this.updateStatus(prismaClient, ticketId, 'IN_PROGRESS', {});
    }

    if (!isInternal && newMessage.ticket && newMessage.ticket.requesterId !== userId) {
      try {
        const requester = newMessage.ticket.requester;
        if (requester && requester.email) {
          const html = EmailTemplateService.getTicketMessageTemplate(
            requester.name,
            newMessage.ticket.code,
            content,
            `/portal/tickets/${ticketId}`
          );
          await MailService.sendMail(prismaClient, {
            to: requester.email,
            subject: `[${newMessage.ticket.code}] [RESPOSTA] Chamado`,
            html,
            type: 'TICKET_MESSAGE',
            module: 'HELPDESK'
          });
        }
      } catch (err) {
        console.error('Falha ao enviar notificação de nova mensagem', err);
      }
    }

    if (!isInternal) {
      try {
        const t = await prismaClient.ticket.findUnique({
          where: { id: ticketId },
          select: { requesterId: true, assigneeId: true, code: true }
        });
        if (t && userId !== t.requesterId && t.requesterId) {
          await NotificationService.createNotification(prismaClient, {
            userId: t.requesterId,
            title: 'Nova mensagem no chamado',
            message: `${t.code}: a equipa deixou uma resposta.`,
            type: 'INFO',
            link: `/portal/tickets/${ticketId}`,
            eventCode: 'TICKET_MESSAGE_TO_REQUESTER',
            entityType: 'Ticket',
            entityId: ticketId,
            category: 'HELPDESK'
          });
        }
        if (t && userId === t.requesterId && t.assigneeId && t.assigneeId !== userId) {
          await NotificationService.createNotification(prismaClient, {
            userId: t.assigneeId,
            title: 'Nova mensagem no chamado',
            message: `${t.code}: o solicitante respondeu.`,
            type: 'INFO',
            link: `/servicedesk/tickets/${ticketId}`,
            eventCode: 'TICKET_MESSAGE_TO_ASSIGNEE',
            entityType: 'Ticket',
            entityId: ticketId,
            category: 'HELPDESK'
          });
        }
      } catch (e) {
        console.error('Falha ao criar notificação in-app (mensagem)', e);
      }
    }

    return newMessage;
  }

  static async escalateToProblem(prismaClient, ticketId, userId) {
    const ticket = await prismaClient.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Chamado não encontrado');
    if (ticket.problemId) throw new Error('Chamado já está vinculado a um Problema');

    const year = new Date().getFullYear();
    const count = await prismaClient.problemRequest.count();
    const code = `PRB-${year}-${String(count + 1).padStart(4, '0')}`;

    const problem = await prismaClient.problemRequest.create({
      data: {
        code,
        title: `[Problema] ${ticket.title}`,
        description: `Identificado a partir do Chamado ${ticket.code}.\nDescrição: ${ticket.description}`,
        requesterId: userId,
        status: 'INVESTIGATING',
        priority: ticket.priority === 'URGENT' ? 'HIGH' : 'MEDIUM'
      }
    });

    await prismaClient.ticket.update({
      where: { id: ticketId },
      data: { problemId: problem.id }
    });

    await this.addMessage(
      prismaClient,
      ticketId,
      userId,
      `Chamado promovido para Gestão de Problemas. Tíquete Causa-Raiz gerado: ${problem.code}`,
      true
    );
    return problem;
  }

  static async escalateToChange(prismaClient, ticketId, userId) {
    const ticket = await prismaClient.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Chamado não encontrado');
    if (ticket.linkedChangeId) throw new Error('Chamado já tem Mudança vinculada');

    const year = new Date().getFullYear();
    const count = await prismaClient.changeRequest.count();
    const code = `CHG-${year}-${String(count + 1).padStart(4, '0')}`;

    const change = await prismaClient.changeRequest.create({
      data: {
        code,
        title: `[Mudança Emersa] ${ticket.title}`,
        description: `Demanda de GMUD derivada do Chamado ${ticket.code}.\nDescrição: ${ticket.description}`,
        justification: 'Mudança emergencial ou não-padrão nascida da esteira de Serviços/N1.',
        type: 'NORMAL',
        riskLevel: 'MEDIUM',
        impact: 'MEDIUM',
        status: 'DRAFT',
        scheduledStart: new Date(),
        scheduledEnd: new Date(new Date().getTime() + 86400000 * 2),
        requesterId: userId
      }
    });

    await prismaClient.ticket.update({
      where: { id: ticketId },
      data: { linkedChangeId: change.id }
    });

    await this.addMessage(
      prismaClient,
      ticketId,
      userId,
      `Chamado evoluiu para uma Gestão de Mudança (GMUD). Acompanhe pela GMUD: ${change.code}`,
      true
    );
    return change;
  }

  static async escalateToProject(prismaClient, ticketId, userId, projectName) {
    const ticket = await prismaClient.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Chamado não encontrado');
    if (ticket.linkedProjectId) throw new Error('Chamado já tem Projeto vinculado');

    const year = new Date().getFullYear();
    const count = await prismaClient.project.count();
    const code = `PRJ-${year}-${String(count + 1).padStart(4, '0')}`;

    const project = await prismaClient.project.create({
      data: {
        code,
        name: projectName || `Demanda: ${ticket.title}`,
        description: `Projeto nascido como Elevação do Chamado ${ticket.code}.\n---\n${ticket.description}`,
        type: 'INFRA',
        status: 'PLANNING',
        priority: ticket.priority === 'URGENT' ? 'HIGH' : 'MEDIUM',
        creatorId: userId,
        managerId: userId
      }
    });

    await prismaClient.ticket.update({
      where: { id: ticketId },
      data: { linkedProjectId: project.id }
    });

    await this.addMessage(
      prismaClient,
      ticketId,
      userId,
      `A Solicitação foi aprovada para virar uma Demanda Padrão de Projeto. Projeto de Acompanhamento: ${project.code}`,
      true
    );
    return project;
  }
}

module.exports = TicketService;
