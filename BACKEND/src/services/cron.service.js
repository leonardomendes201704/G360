const cron = require('node-cron');
const MailService = require('./mail.service');
const EmailTemplateService = require('./email-template.service');
const NotificationService = require('./notification.service');
const TenantManager = require('../config/tenant-manager');
const logger = require('../config/logger');
const InboundEmailService = require('./inbound-email.service');

class CronService {
  static init() {
    // PROTEÇÃO PARA PM2 CLUSTER MODE:
    // Garante que apenas o "Instância 0" do PM2 agende as tarefas, evitando duplicação em múltiplos Cores.
    if (process.env.NODE_APP_INSTANCE !== undefined && process.env.NODE_APP_INSTANCE !== '0') {
      logger.info(`⏰ CronService: Bypassing schedulers on PM2 Secondary Instance [${process.env.NODE_APP_INSTANCE}] to prevent duplicate jobs.`);
      return;
    }

    logger.info('⏰ CronService: Initializing schedulers (Primary Instance)...');

        // Retenção de AuditLog (por tenant) — desativar com AUDIT_LOG_RETENTION_DAYS=0 ou AUDIT_LOG_RETENTION_DISABLED=true
        cron.schedule('30 3 * * *', async () => {
            if (process.env.AUDIT_LOG_RETENTION_DISABLED === 'true') {
                return;
            }
            const days = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '365', 10);
            if (!Number.isFinite(days) || days <= 0) {
                return;
            }
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            logger.info(`⏰ CronJob: AuditLog retention prune (>${days} days)...`);
            const tenants = await TenantManager.getAllActiveTenants();
            for (const tenant of tenants) {
                try {
                    const prisma = TenantManager.getClientForTenant(tenant.schemaName);
                    const result = await prisma.auditLog.deleteMany({
                        where: { createdAt: { lt: cutoff } },
                    });
                    if (result.count > 0) {
                        logger.cron(`AuditLog prune [${tenant.slug}]: ${result.count} registos removidos`);
                    }
                } catch (err) {
                    logger.error(`AuditLog prune error for tenant ${tenant.slug}:`, err);
                }
            }
        });

        // Run every day at 08:00 AM
        cron.schedule('0 8 * * *', async () => {
            logger.info('⏰ CronJob: Running daily checks...');
            const tenants = await TenantManager.getAllActiveTenants();
            for (const tenant of tenants) {
                try {
                    const prisma = await TenantManager.getClientForTenant(tenant.schemaName);
                    await CronService.checkContractExpirations(prisma, tenant);
                    await CronService.checkLicenseExpirations(prisma, tenant);
                } catch (err) {
                    logger.error(`CronJob error for tenant ${tenant.slug}:`, err);
                }
            }
        });

        // Run Help Desk SLA Monitor every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            logger.info('⏰ CronJob: Running SLA Monitor...');
            const tenants = await TenantManager.getAllActiveTenants();
            for (const tenant of tenants) {
                try {
                    const prisma = await TenantManager.getClientForTenant(tenant.schemaName);
                    await CronService.checkTicketSLA(prisma, tenant);
                } catch (err) {
                    logger.error(`CronJob SLA error for tenant ${tenant.slug}:`, err);
                }
            }
        });

        // Inbox Listener (IMAP) para Respostas de API (A cada 1 minuto)
        cron.schedule('* * * * *', async () => {
            logger.info('⏰ CronJob: Varrilha da Caixa Postal de Respostas (IMAP)...');
            const tenants = await TenantManager.getAllActiveTenants();
            for (const tenant of tenants) {
                try {
                    const prisma = await TenantManager.getClientForTenant(tenant.schemaName);
                    await InboundEmailService.processUnreadEmails(prisma);
                } catch (err) {
                    logger.error(`CronJob InboundIMAP error for tenant ${tenant.slug}:`, err);
                }
            }
        });
    }

    static async checkContractExpirations(prisma, tenant) {
        const slug = tenant?.slug;
        try {
            const today = new Date();
            const thresholds = [30, 15, 7]; // Days

            for (const days of thresholds) {
                const targetDate = new Date();
                targetDate.setDate(today.getDate() + days);

                const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
                const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

                const contracts = await prisma.contract.findMany({
                    where: {
                        endDate: {
                            gte: startOfDay,
                            lte: endOfDay
                        },
                        status: 'ACTIVE'
                    },
                    include: { costCenter: { include: { department: true } } }
                });

                for (const contract of contracts) {
                    const managerId = contract.costCenter?.department?.managerId;
                    if (managerId) {
                        const manager = await prisma.user.findUnique({ where: { id: managerId } });
                        await NotificationService.createNotification(prisma, {
                            userId: managerId,
                            title: 'Vencimento de Contrato',
                            message: `O contrato ${contract.number} vence em ${days} dias.`,
                            type: 'WARNING',
                            link: `/contracts/${contract.id}`,
                            eventCode: 'CONTRACT_EXPIRY_THRESHOLD',
                            entityType: 'Contract',
                            entityId: contract.id,
                            dedupeKey: `contract-thresh-${contract.id}-${managerId}-${days}d`,
                            category: 'DEFAULT',
                            tenantSlug: slug,
                            mail: manager?.email
                                ? {
                                    to: manager.email,
                                    subject: `[ALERTA] Contrato Vencendo em ${days} dias`,
                                    html: EmailTemplateService.getContractExpiryTemplate(manager.name, contract.number, contract.endDate),
                                    type: 'CONTRACT_EXPIRY',
                                    module: 'Contratos'
                                }
                                : null
                        });
                    }
                }
            }
        } catch (error) {
            logger.error('❌ CronJob Error (Contracts):', error);
        }
    }

    static async checkLicenseExpirations(prisma, tenant) {
        void tenant;
        try {
            const today = new Date();
            const thresholds = [30, 15, 7];

            const admins = await prisma.user.findMany({
                where: { roles: { some: { name: 'Super Admin' } } }
            });

            if (admins.length === 0) return;

            for (const days of thresholds) {
                const targetDate = new Date();
                targetDate.setDate(today.getDate() + days);
                const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
                const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

                const licenses = await prisma.softwareLicense.findMany({
                    where: {
                        expirationDate: {
                            gte: startOfDay,
                            lte: endOfDay
                        }
                    }
                });

                if (licenses.length > 0) {
                    for (const admin of admins) {
                        if (admin.email) {
                            await MailService.sendMail(prisma, {
                                to: admin.email,
                                subject: `[ALERTA] ${licenses.length} Licenças Vencendo em ${days} dias`,
                                html: EmailTemplateService.getLicenseExpiryTemplate(admin.name, licenses.length, licenses),
                                type: 'LICENSE_EXPIRY',
                                module: 'Assets'
                            });
                        }
                    }
                }
            }
        } catch (error) {
            logger.error('❌ CronJob Error (Licenses):', error);
        }
    }

    static async checkTicketSLA(prisma, tenant) {
        const slug = tenant?.slug;
        try {
            const now = new Date();

            const breachedTickets = await prisma.ticket.findMany({
                where: {
                    status: { in: ['OPEN', 'IN_PROGRESS'] },
                    slaBreached: false,
                    OR: [
                        { slaResponseDue: { lt: now }, respondedAt: null },
                        { slaResolveDue: { lt: now }, resolvedAt: null }
                    ]
                },
                include: {
                    assignee: { select: { id: true, name: true, email: true } },
                    requester: { select: { id: true, name: true, email: true } }
                }
            });

            if (breachedTickets.length === 0) return;

            const admins = await prisma.user.findMany({
                where: { roles: { some: { name: 'Super Admin' } } },
                select: { id: true, name: true, email: true }
            });

            for (const ticket of breachedTickets) {
                logger.warn(`SLA Quebrado no Chamado ${ticket.code}`);

                await prisma.ticket.update({
                    where: { id: ticket.id },
                    data: { slaBreached: true }
                });

                const link = `/servicedesk/tickets/${ticket.id}`;

                if (ticket.assigneeId) {
                    const a = ticket.assignee;
                    await NotificationService.createNotification(prisma, {
                        userId: ticket.assigneeId,
                        title: 'Alerta de SLA Estourado',
                        message: `O Chamado ${ticket.code} ultrapassou o limite de SLA.`,
                        type: 'ERROR',
                        link,
                        eventCode: 'TICKET_SLA_BREACHED',
                        entityType: 'Ticket',
                        entityId: ticket.id,
                        dedupeKey: `ticket-sla-${ticket.id}-${ticket.assigneeId}`,
                        category: 'SLA',
                        tenantSlug: slug,
                        mail: a?.email
                            ? {
                                to: a.email,
                                subject: `[SLA] Chamado ${ticket.code} — prazo estourado`,
                                html: EmailTemplateService.getSimpleAlertEmail(
                                    a.name,
                                    'SLA estourado',
                                    `<p>O chamado <strong>${ticket.code}</strong> ultrapassou o limite de SLA.</p>`,
                                    link
                                ),
                                type: 'TICKET_SLA_BREACH',
                                module: 'HELPDESK'
                            }
                            : null
                    });
                }

                for (const admin of admins) {
                    if (ticket.assigneeId && admin.id === ticket.assigneeId) continue;
                    await NotificationService.createNotification(prisma, {
                        userId: admin.id,
                        title: 'SLA estourado (Help Desk)',
                        message: `Chamado ${ticket.code}: SLA ultrapassado.`,
                        type: 'ERROR',
                        link,
                        eventCode: 'TICKET_SLA_BREACHED_ADMIN',
                        entityType: 'Ticket',
                        entityId: ticket.id,
                        dedupeKey: `ticket-sla-adm-${ticket.id}-${admin.id}`,
                        category: 'SLA',
                        tenantSlug: slug,
                        mail: admin.email
                            ? {
                                to: admin.email,
                                subject: `[SLA] Chamado ${ticket.code} — alerta administrativo`,
                                html: EmailTemplateService.getSimpleAlertEmail(
                                    admin.name,
                                    'SLA de chamado estourado',
                                    `<p>O chamado <strong>${ticket.code}</strong> ultrapassou o SLA (visão administrador).</p>`,
                                    link
                                ),
                                type: 'TICKET_SLA_BREACH_ADMIN',
                                module: 'HELPDESK'
                            }
                            : null
                    });
                }
            }
        } catch (error) {
            logger.error('❌ CronJob Error (SLA Ticket Monitor):', error);
        }
    }
}

module.exports = CronService;
