const IncidentRepository = require('../repositories/incident.repository');
const NotificationService = require('./notification.service');
const AuditLogRepository = require('../repositories/audit-log.repository');
const UserRepository = require('../repositories/user.repository');
const EmailTemplateService = require('./email-template.service');
const { getUserAccessScope } = require('../utils/access-scope');
const { userHasPermission } = require('../utils/permission-check');
const logger = require('../config/logger');

// Matriz de Prioridade ITIL (Impacto x Urgência)
const PRIORITY_MATRIX = {
    'CRITICO': { 'CRITICA': 'P1', 'ALTA': 'P1', 'MEDIA': 'P2', 'BAIXA': 'P2' },
    'ALTO': { 'CRITICA': 'P1', 'ALTA': 'P2', 'MEDIA': 'P2', 'BAIXA': 'P3' },
    'MEDIO': { 'CRITICA': 'P2', 'ALTA': 'P2', 'MEDIA': 'P3', 'BAIXA': 'P3' },
    'BAIXO': { 'CRITICA': 'P2', 'ALTA': 'P3', 'MEDIA': 'P3', 'BAIXA': 'P4' }
};

// SLA por Prioridade (em minutos)
const SLA_CONFIG = {
    'P1': { response: 60, resolve: 240 },  // 1h / 4h
    'P2': { response: 240, resolve: 480 },  // 4h / 8h
    'P3': { response: 480, resolve: 1440 },  // 8h / 24h
    'P4': { response: 1440, resolve: 4320 }   // 24h / 72h
};

class IncidentService {
    /**
     * Calcula a prioridade baseado na matriz Impacto x Urgência
     */
    static calculatePriority(impact, urgency) {

        const impactUpper = (impact || 'MEDIO').toUpperCase();
        const urgencyUpper = (urgency || 'MEDIA').toUpperCase();

        if (PRIORITY_MATRIX[impactUpper] && PRIORITY_MATRIX[impactUpper][urgencyUpper]) {
            return PRIORITY_MATRIX[impactUpper][urgencyUpper];
        }
        return 'P3'; // Default
    }

    /**
     * Calcula os prazos de SLA baseado na prioridade
     */
    static calculateSLADates(priority, createdAt = new Date()) {
        const config = SLA_CONFIG[priority] || SLA_CONFIG['P3'];
        const baseTime = new Date(createdAt);

        return {
            slaResponseDue: new Date(baseTime.getTime() + config.response * 60 * 1000),
            slaResolveDue: new Date(baseTime.getTime() + config.resolve * 60 * 1000)
        };
    }

    /**
     * Verifica se o SLA foi violado
     */
    static checkSLABreach(incident) {
        const now = new Date();

        // Se já resolvido, não precisa verificar
        if (incident.resolvedAt) {
            return incident.resolvedAt > incident.slaResolveDue;
        }

        // Se não respondido e passou do prazo de resposta
        if (!incident.respondedAt && incident.slaResponseDue && now > new Date(incident.slaResponseDue)) {
            return true;
        }

        // Se não resolvido e passou do prazo de resolução
        if (incident.slaResolveDue && now > new Date(incident.slaResolveDue)) {
            return true;
        }

        return false;
    }

    static async create(prisma, userId, data) {
        // Gerar código único
        const code = await IncidentRepository.getNextCode(prisma);

        // Verificar se código já existe (redundância)
        const existing = await IncidentRepository.findByCode(prisma, code);
        if (existing) {
            throw { statusCode: 409, message: 'Código de incidente já existe. Tente novamente.' };
        }

        // Calcular prioridade
        const priority = this.calculatePriority(data.impact, data.urgency);

        // Calcular datas de SLA
        const now = new Date();
        const slaDates = this.calculateSLADates(priority, now);

        const sanitizedData = {
            ...data,
            relatedChangeId: data.relatedChangeId || null,
            relatedAssetId: data.relatedAssetId || null,
            assigneeId: data.assigneeId || null
        };

        const incident = await IncidentRepository.create(prisma, {
            ...sanitizedData,
            code,
            priority,
            reporterId: userId,
            slaResponseDue: slaDates.slaResponseDue,
            slaResolveDue: slaDates.slaResolveDue
        });

        // Registrar histórico
        await IncidentRepository.addHistory(prisma, incident.id, userId, 'CREATED', null, `Incidente criado: ${incident.title}`);

        // Log de auditoria
        await AuditLogRepository.create(prisma, {
            userId,
            action: 'criou Incidente',
            module: 'INCIDENT',
            entityId: incident.id,
            entityType: 'INCIDENT',
            newData: incident
        });

        // Email Notification to Reporter (Receipt)
        try {
            const reporter = await prisma.user.findUnique({ where: { id: userId } });
            if (reporter && reporter.email) {
                const MailService = require('./mail.service');
                await MailService.sendMail(prisma, {
                    to: reporter.email,
                    subject: `[REGISTRADO] Incidente: ${incident.code}`,
                    html: EmailTemplateService.getIncidentCreatedTemplate(reporter.name, incident),
                    type: 'INCIDENT_CREATED',
                    module: 'INCIDENT'
                });
            }
        } catch (e) { logger.error('Error sending incident creation email', e); }

        try {
            if (sanitizedData.assigneeId) {
                const assignee = await prisma.user.findUnique({
                    where: { id: sanitizedData.assigneeId },
                    select: { id: true, name: true, email: true }
                });
                await NotificationService.createNotification(prisma, {
                    userId: sanitizedData.assigneeId,
                    title: 'Incidente atribuído a si',
                    message: `${incident.code}: ${incident.title}`,
                    type: 'WARNING',
                    link: `/incidents?id=${incident.id}`,
                    eventCode: 'INCIDENT_ASSIGNED_ON_CREATE',
                    entityType: 'Incident',
                    entityId: incident.id,
                    category: 'INCIDENTS',
                    mail: assignee?.email
                        ? {
                            to: assignee.email,
                            subject: `[INCIDENTE] ${incident.code}`,
                            html: EmailTemplateService.getIncidentCreatedTemplate(assignee.name, incident),
                            type: 'INCIDENT_ASSIGNED',
                            module: 'INCIDENT'
                        }
                        : null
                });
            }
        } catch (e) {
            logger.error('Error notifying assignee on incident create', e);
        }

        return incident;
    }

    static async getAll(prisma, filters, userId) {
        const scopeBase = await getUserAccessScope(prisma, userId);
        const viewAllCc = await userHasPermission(prisma, userId, 'INCIDENT', 'VIEW_ALL_CC');
        const scope = viewAllCc ? { ...scopeBase, skipIncidentCcFilter: true } : scopeBase;
        const incidents = await IncidentRepository.findAll(prisma, filters, scope);

        // Verificar SLA breach para cada incidente nǜo fechado
        return incidents.map(inc => ({
            ...inc,
            slaBreached: inc.status !== 'CLOSED' ? this.checkSLABreach(inc) : inc.slaBreached
        }));
    }

    static async getById(prisma, id, userId) {
        const incident = await IncidentRepository.findById(prisma, id);
        if (!incident) {
            throw { statusCode: 404, message: 'Incidente nao encontrado.' };
        }
        if (userId) {
            const viewAllCc = await userHasPermission(prisma, userId, 'INCIDENT', 'VIEW_ALL_CC');
            if (!viewAllCc) {
                const scope = await getUserAccessScope(prisma, userId);
                if (scope.isAdmin === false) {
                    const ccIds = scope.accessibleCostCenterIds || [];
                    const allowedByCc = ccIds.length > 0 && (
                        (incident.reporter?.costCenterId && ccIds.includes(incident.reporter.costCenterId)) ||
                        (incident.assignee?.costCenterId && ccIds.includes(incident.assignee.costCenterId))
                    );
                    const allowedByUser = incident.reporterId === userId || incident.assigneeId === userId;
                    if (!allowedByCc && !allowedByUser) {
                        throw { statusCode: 403, message: 'Acesso negado.' };
                    }
                }
            }
        }

        // Verificar SLA em tempo real
        if (incident.status !== 'CLOSED') {
            incident.slaBreached = this.checkSLABreach(incident);
        }

        return incident;
    }

    static async update(prisma, id, userId, data) {
        const incident = await this.getById(prisma, id, userId);

        // Sanitizar dados - remover campos inválidos para update do Prisma
        // Remove objetos aninhados que vêm do frontend mas não são válidos para update
        const {
            id: _id,
            code,
            createdAt,
            updatedAt,
            category,
            reporter,
            assignee,
            relatedAsset,
            relatedChange,
            comments,
            attachments,
            history,
            _count,
            ...cleanData
        } = data;

        // Se mudou impacto ou urgência, recalcular prioridade
        if (cleanData.impact || cleanData.urgency) {
            cleanData.priority = this.calculatePriority(
                cleanData.impact || incident.impact,
                cleanData.urgency || incident.urgency
            );

            // Recalcular SLA se prioridade mudou
            if (cleanData.priority !== incident.priority) {
                const slaDates = this.calculateSLADates(cleanData.priority, incident.createdAt);
                cleanData.slaResponseDue = slaDates.slaResponseDue;
                cleanData.slaResolveDue = slaDates.slaResolveDue;
            }
        }

        const updated = await IncidentRepository.update(prisma, id, cleanData);

        try {
            if (
                cleanData.assigneeId !== undefined &&
                cleanData.assigneeId &&
                cleanData.assigneeId !== incident.assigneeId
            ) {
                const assignee = await prisma.user.findUnique({
                    where: { id: cleanData.assigneeId },
                    select: { id: true, name: true, email: true }
                });
                await NotificationService.createNotification(prisma, {
                    userId: cleanData.assigneeId,
                    title: 'Incidente atribuído a si',
                    message: `${incident.code}: ${incident.title}`,
                    type: 'WARNING',
                    link: `/incidents?id=${id}`,
                    eventCode: 'INCIDENT_ASSIGNED',
                    entityType: 'Incident',
                    entityId: id,
                    category: 'INCIDENTS',
                    mail: assignee?.email
                        ? {
                            to: assignee.email,
                            subject: `[INCIDENTE] Atribuído: ${incident.code}`,
                            html: EmailTemplateService.getIncidentCreatedTemplate(assignee.name, { ...incident, assigneeId: cleanData.assigneeId }),
                            type: 'INCIDENT_ASSIGNED',
                            module: 'INCIDENT'
                        }
                        : null
                });
            }
        } catch (e) {
            logger.error('Error notifying incident assignee on update', e);
        }

        // Registrar histórico se status mudou
        if (data.status && data.status !== incident.status) {
            await IncidentRepository.addHistory(prisma, id, userId, 'STATUS_CHANGE', incident.status, data.status);
        }

        // Log de auditoria
        await AuditLogRepository.create(prisma, {
            userId,
            action: 'atualizou Incidente',
            module: 'INCIDENT',
            entityId: id,
            entityType: 'INCIDENT',
            newData: data
        });

        return updated;
    }

    static async delete(prisma, id, userId) {
        const incident = await this.getById(prisma, id, userId);

        if (incident.status === 'CLOSED') {
            throw { statusCode: 400, message: 'Não é possível excluir incidentes já fechados.' };
        }

        await IncidentRepository.delete(prisma, id);

        await AuditLogRepository.create(prisma, {
            userId,
            action: 'excluiu Incidente',
            module: 'INCIDENT',
            entityId: id,
            entityType: 'INCIDENT',
            oldData: { code: incident.code, title: incident.title }
        });

        return { message: 'Incidente excluído com sucesso.' };
    }

    static async assign(prisma, id, assigneeId, userId) {
        const incident = await this.getById(prisma, id, userId);

        const oldAssignee = incident.assignee?.name || 'Não atribuído';

        const updateData = {
            assigneeId,
            status: incident.status === 'OPEN' ? 'IN_PROGRESS' : incident.status
        };

        // Marcar como respondido se primeira atribuição
        if (!incident.respondedAt) {
            updateData.respondedAt = new Date();
        }

        const updated = await IncidentRepository.update(prisma, id, updateData);

        // Buscar nome do novo assignee
        const newAssignee = await UserRepository.findById(prisma, assigneeId);

        // Registrar histórico
        await IncidentRepository.addHistory(prisma, id, userId, 'ASSIGNMENT', oldAssignee, newAssignee?.name || assigneeId);

        await NotificationService.createNotification(prisma, {
            userId: assigneeId,
            title: 'Incidente Atribuído',
            message: `O incidente ${incident.code}: ${incident.title} foi atribuído a você.`,
            type: 'WARNING',
            link: `/incidents?id=${id}`,
            eventCode: 'INCIDENT_ASSIGNED',
            entityType: 'Incident',
            entityId: id,
            category: 'INCIDENTS',
            mail: newAssignee?.email
                ? {
                    to: newAssignee.email,
                    subject: `[INCIDENTE] Atribuído: ${incident.code}`,
                    html: EmailTemplateService.getIncidentCreatedTemplate(newAssignee.name, incident),
                    type: 'INCIDENT_ASSIGNED',
                    module: 'INCIDENT'
                }
                : null
        });

        // Log de auditoria
        await AuditLogRepository.create(prisma, {
            userId,
            action: 'atribuiu Incidente',
            module: 'INCIDENT',
            entityId: id,
            entityType: 'INCIDENT',
            newData: { assigneeId }
        });

        return updated;
    }

    static async resolve(prisma, id, userId, solution, rootCause = null) {
        const incident = await this.getById(prisma, id, userId);

        if (incident.status === 'CLOSED') {
            throw { statusCode: 400, message: 'Incidente já está fechado.' };
        }

        if (!solution) {
            throw { statusCode: 400, message: 'Solução é obrigatória para resolver o incidente.' };
        }

        const now = new Date();
        const slaBreached = incident.slaResolveDue && now > new Date(incident.slaResolveDue);

        const updated = await IncidentRepository.update(prisma, id, {
            status: 'RESOLVED',
            solution,
            rootCause,
            resolvedAt: now,
            slaBreached
        });

        // Registrar histórico
        await IncidentRepository.addHistory(prisma, id, userId, 'RESOLVED', incident.status, 'RESOLVED');

        const reporter = await prisma.user.findUnique({
            where: { id: incident.reporterId },
            select: { id: true, name: true, email: true }
        });
        await NotificationService.createNotification(prisma, {
            userId: incident.reporterId,
            title: 'Incidente Resolvido',
            message: `O incidente ${incident.code}: ${incident.title} foi resolvido.`,
            type: 'INFO',
            link: `/incidents?id=${id}`,
            eventCode: 'INCIDENT_RESOLVED',
            entityType: 'Incident',
            entityId: id,
            category: 'INCIDENTS',
            mail: reporter?.email
                ? {
                    to: reporter.email,
                    subject: `[RESOLVIDO] Incidente: ${incident.code}`,
                    html: EmailTemplateService.getIncidentResolvedTemplate(reporter.name, incident, solution),
                    type: 'INCIDENT_RESOLVED',
                    module: 'INCIDENT'
                }
                : null
        });

        // Log de auditoria
        await AuditLogRepository.create(prisma, {
            userId,
            action: 'resolveu Incidente',
            module: 'INCIDENT',
            entityId: id,
            entityType: 'INCIDENT',
            newData: { solution, rootCause, slaBreached }
        });

        return updated;
    }

    static async close(prisma, id, userId) {
        const incident = await this.getById(prisma, id, userId);

        if (incident.status !== 'RESOLVED') {
            throw { statusCode: 400, message: 'Incidente precisa estar resolvido para ser fechado.' };
        }

        const updated = await IncidentRepository.update(prisma, id, {
            status: 'CLOSED',
            closedAt: new Date()
        });

        // Registrar histórico
        await IncidentRepository.addHistory(prisma, id, userId, 'CLOSED', 'RESOLVED', 'CLOSED');

        // Log de auditoria
        await AuditLogRepository.create(prisma, {
            userId,
            action: 'fechou Incidente',
            module: 'INCIDENT',
            entityId: id,
            entityType: 'INCIDENT'
        });

        return updated;
    }

    static async escalate(prisma, id, userId, reason) {
        const incident = await this.getById(prisma, id, userId);

        if (!reason) {
            throw { statusCode: 400, message: 'Motivo do escalonamento é obrigatório.' };
        }

        // Buscar gestor do centro de custo do reporter para escalar
        const reporter = await prisma.user.findUnique({
            where: { id: incident.reporterId },
            include: {
                costCenter: {
                    include: {
                        manager: true,
                        department: { include: { director: true } }
                    }
                }
            }
        });

        let escalationTarget = null;

        // Se já tem assignee, escalar para gestor do CC
        if (incident.assigneeId && reporter?.costCenter?.manager) {
            escalationTarget = reporter.costCenter.manager;
        }
        // Se não tem gestor de CC, escalar para diretor do departamento
        else if (reporter?.costCenter?.department?.director) {
            escalationTarget = reporter.costCenter.department.director;
        }

        // Registrar histórico
        await IncidentRepository.addHistory(prisma, id, userId, 'ESCALATION', null, reason);

        // Adicionar comentário de escalonamento
        await IncidentRepository.addComment(prisma,
            id,
            userId,
            `🚨 ESCALONAMENTO: ${reason}`,
            true // Nota interna
        );

        if (escalationTarget) {
            await NotificationService.createNotification(prisma, {
                userId: escalationTarget.id,
                title: '⚠️ Incidente Escalonado',
                message: `O incidente ${incident.code} foi escalonado. Motivo: ${reason}`,
                type: 'ERROR',
                link: `/incidents?id=${id}`,
                eventCode: 'INCIDENT_ESCALATED',
                entityType: 'Incident',
                entityId: id,
                category: 'INCIDENTS'
            });
        }

        // Log de auditoria
        await AuditLogRepository.create(prisma, {
            userId,
            action: 'escalonou Incidente',
            module: 'INCIDENT',
            entityId: id,
            entityType: 'INCIDENT',
            newData: { reason, escalationTarget: escalationTarget?.name }
        });

        return {
            message: 'Incidente escalonado com sucesso.',
            escalatedTo: escalationTarget?.name || 'Sem gestor definido'
        };
    }

    static async addComment(prisma, incidentId, userId, content, isInternal = false) {
        const incident = await this.getById(prisma, incidentId);

        const comment = await IncidentRepository.addComment(prisma, incidentId, userId, content, isInternal);

        // Registrar histórico
        await IncidentRepository.addHistory(prisma, incidentId, userId, 'COMMENT', null, isInternal ? 'Nota interna' : 'Comentário público');

        if (incident.assigneeId && incident.assigneeId !== userId && !isInternal) {
            const recipient = await prisma.user.findUnique({ where: { id: incident.assigneeId } });
            const commenter = await prisma.user.findUnique({ where: { id: userId } });
            await NotificationService.createNotification(prisma, {
                userId: incident.assigneeId,
                title: 'Novo Comentário',
                message: `Novo comentário no incidente ${incident.code}.`,
                type: 'INFO',
                link: `/incidents?id=${incidentId}`,
                eventCode: 'INCIDENT_NEW_COMMENT',
                entityType: 'Incident',
                entityId: incidentId,
                category: 'INCIDENTS',
                mail: recipient?.email
                    ? {
                        to: recipient.email,
                        subject: `[COMENTÁRIO] Incidente: ${incident.code}`,
                        html: EmailTemplateService.getNewCommentTemplate(
                            recipient.name,
                            'Incidentes',
                            `${incident.code} - ${incident.title}`,
                            commenter ? commenter.name : 'Alguém',
                            content,
                            `/incidents?id=${incidentId}`
                        ),
                        type: 'NEW_COMMENT',
                        module: 'INCIDENT'
                    }
                    : null
            });
        }

        return comment;
    }

    static async getKPIs(prisma) {
        const base = await IncidentRepository.getKPIs(prisma);

        // Compute 7-day trend comparison
        try {
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

            const [prevOpen, prevResolved, resolvedWithTime] = await Promise.all([
                prisma.incident.count({
                    where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } }
                }),
                prisma.incident.count({
                    where: { resolvedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } }
                }),
                prisma.incident.findMany({
                    where: { resolvedAt: { gte: sevenDaysAgo }, createdAt: { not: null } },
                    select: { createdAt: true, resolvedAt: true },
                    take: 50
                })
            ]);

            const calcTrend = (curr, prev) => {
                if (prev === 0) return curr > 0 ? 100 : 0;
                return Math.round(((curr - prev) / prev) * 100);
            };

            const mttrMinutes = resolvedWithTime.length > 0
                ? resolvedWithTime.reduce((sum, i) => sum + (new Date(i.resolvedAt) - new Date(i.createdAt)), 0)
                / resolvedWithTime.length / 60000
                : null;

            return {
                ...base,
                trendOpen: calcTrend(base.open || 0, prevOpen),
                trendResolved: calcTrend(base.resolvedToday || 0, prevResolved),
                mttrHours: mttrMinutes ? Math.round(mttrMinutes / 60 * 10) / 10 : null,
            };
        } catch (e) {
            return base;
        }
    }

    static async getCategories(prisma, activeOnly = true) {
        return IncidentRepository.getCategories(prisma, activeOnly);
    }

    static async createCategory(prisma, data) {
        return IncidentRepository.createCategory(prisma, data);
    }

    static async updateCategory(prisma, id, data) {
        return IncidentRepository.updateCategory(prisma, id, data);
    }

    static async getHistory(prisma, incidentId) {
        return IncidentRepository.getHistory(prisma, incidentId);
    }
}

module.exports = IncidentService;


