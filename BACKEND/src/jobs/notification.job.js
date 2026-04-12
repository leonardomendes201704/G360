const cron = require('node-cron');
const TenantManager = require('../config/tenant-manager');
const NotificationService = require('../services/notification.service');
const EmailTemplateService = require('../services/email-template.service');

class NotificationJob {
    /**
     * Helper: executa uma função para cada tenant ativo.
     * Jobs rodam em background sem req, então precisam iterar
     * sobre todos os tenants e obter um prisma para cada.
     */
    static async forEachTenant(jobName, fn) {
        try {
            const tenants = await TenantManager.getAllActiveTenants();
            for (const tenant of tenants) {
                try {
                    const prisma = await TenantManager.getClientForTenant(tenant.schemaName);
                    await fn(prisma, tenant);
                } catch (err) {
                    console.error(`[Job Error] ${jobName} for tenant ${tenant.slug}:`, err);
                }
            }
        } catch (err) {
            console.error(`[Job Error] ${jobName} - Failed to get tenants:`, err);
        }
    }

    static init() {
        console.log('📅 Inicializando Jobs de Notificação...');

        // 1. Tarefas Atrasadas e Próximas do Vencimento (Diariamente às 08:00)
        cron.schedule('0 8 * * *', async () => {
            console.log('⏰ Rodando Job: Verificação de Tarefas...');
            await NotificationJob.forEachTenant('checkOverdueTasks', async (prisma, tenant) => {
                await NotificationJob.checkOverdueTasks(prisma, tenant);
                await NotificationJob.checkUpcomingTasks(prisma, tenant);
            });
        });

        // 2. Licenças de Software Próximas do Vencimento (Diariamente às 09:00)
        cron.schedule('0 9 * * *', async () => {
            console.log('⏰ Rodando Job: Verificação de Licenças...');
            await NotificationJob.forEachTenant('checkExpiringLicenses', async (prisma, tenant) => {
                await NotificationJob.checkExpiringLicenses(prisma, tenant);
            });
        });

        // 3. Orçamento Financeiro (1º dia do mês às 07:00)
        cron.schedule('0 7 1 * *', async () => {
            console.log('⏰ Rodando Job: Verificação de Orçamento...');
            await NotificationJob.forEachTenant('checkBudgetAlerts', async (prisma, tenant) => {
                await NotificationJob.checkBudgetAlerts(prisma, tenant);
            });
        });

        // 4. Contratos Vencendo (Diariamente às 09:30)
        cron.schedule('30 9 * * *', async () => {
            console.log('⏰ Rodando Job: Verificação de Contratos...');
            await NotificationJob.forEachTenant('checkExpiringContracts', async (prisma, tenant) => {
                await NotificationJob.checkExpiringContracts(prisma, tenant);
            });
        });

        // 5. Aprovações Pendentes (A cada 8 horas: 08:00, 16:00, 00:00)
        cron.schedule('0 8,16,0 * * *', async () => {
            console.log('⏰ Rodando Job: Verificação de Aprovações Pendentes...');
            await NotificationJob.forEachTenant('checkPendingApprovals', async (prisma, tenant) => {
                await NotificationJob.checkPendingApprovals(prisma, tenant);
            });
        });

        // 6. SLA de Incidentes (A cada hora)
        cron.schedule('0 * * * *', async () => {
            console.log('⏰ Rodando Job: Verificação de SLA de Incidentes...');
            await NotificationJob.forEachTenant('checkIncidentSLA', async (prisma, tenant) => {
                await NotificationJob.checkIncidentSLA(prisma, tenant);
            });
        });
    }

    // --- JOB LOGIC ---

    static async checkOverdueTasks(prisma, tenant) {
        const slug = tenant?.slug;
        try {
            const today = new Date();
            const overdueTasks = await prisma.task.findMany({
                where: {
                    dueDate: { lt: today },
                    status: { notIn: ['DONE', 'COMPLETED'] },
                    assigneeId: { not: null }
                },
                include: { assignee: true }
            });

            for (const task of overdueTasks) {
                await NotificationService.createNotification(prisma, {
                    userId: task.assigneeId,
                    title: 'Tarefa Atrasada',
                    message: `A tarefa "${task.title}" está atrasada.`,
                    type: 'ERROR',
                    link: `/tasks/${task.id}`,
                    eventCode: 'TASK_OVERDUE',
                    entityType: 'Task',
                    entityId: task.id,
                    dedupeKey: `task-overdue-${task.id}`,
                    category: 'DEFAULT',
                    tenantSlug: slug
                });
            }
            if (overdueTasks.length > 0) console.log(`[Job] Notificadas ${overdueTasks.length} tarefas atrasadas.`);

        } catch (error) {
            console.error('[Job Error] checkOverdueTasks:', error);
        }
    }

    static async checkUpcomingTasks(prisma, tenant) {
        const slug = tenant?.slug;
        try {
            const today = new Date();
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(today.getDate() + 3);

            const upcomingTasks = await prisma.task.findMany({
                where: {
                    dueDate: { gt: today, lte: threeDaysFromNow },
                    status: { notIn: ['DONE', 'COMPLETED'] },
                    assigneeId: { not: null }
                }
            });

            for (const task of upcomingTasks) {
                await NotificationService.createNotification(prisma, {
                    userId: task.assigneeId,
                    title: 'Tarefa Próxima do Vencimento',
                    message: `A tarefa "${task.title}" vence em breve.`,
                    type: 'WARNING',
                    link: `/tasks/${task.id}`,
                    eventCode: 'TASK_UPCOMING',
                    entityType: 'Task',
                    entityId: task.id,
                    dedupeKey: `task-upcoming-${task.id}`,
                    category: 'DEFAULT',
                    tenantSlug: slug
                });
            }
        } catch (error) {
            console.error('[Job Error] checkUpcomingTasks:', error);
        }
    }

    static async checkExpiringLicenses(prisma, tenant) {
        const slug = tenant?.slug;
        const ymd = new Date().toISOString().slice(0, 10);
        try {
            const today = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(today.getDate() + 30);

            const expiringLicenses = await prisma.softwareLicense.findMany({
                where: {
                    expirationDate: { gt: today, lte: thirtyDaysFromNow },
                    status: 'ACTIVE'
                }
            });

            if (expiringLicenses.length > 0) {
                const admins = await prisma.user.findMany({
                    where: { roles: { some: { name: 'Super Admin' } } }
                });
                for (const admin of admins) {
                    await NotificationService.createNotification(prisma, {
                        userId: admin.id,
                        title: 'Licenças Expirando',
                        message: `${expiringLicenses.length} licenças de software vencem em 30 dias.`,
                        type: 'WARNING',
                        link: '/assets/licenses',
                        eventCode: 'LICENSE_EXPIRING_BATCH',
                        dedupeKey: `license-expiry-${admin.id}-${ymd}`,
                        category: 'DEFAULT',
                        tenantSlug: slug,
                        mail: admin.email
                            ? {
                                to: admin.email,
                                subject: `[ALERTA] ${expiringLicenses.length} Licenças Expirando`,
                                html: EmailTemplateService.getLicenseExpiryTemplate(admin.name, expiringLicenses.length, expiringLicenses),
                                type: 'LICENSE_EXPIRING',
                                module: 'Ativos'
                            }
                            : null
                    });
                }
            }
        } catch (e) {
            console.error('[Job Error] checkExpiringLicenses:', e);
        }
    }

    static async checkExpiringContracts(prisma, tenant) {
        const slug = tenant?.slug;
        const ymd = new Date().toISOString().slice(0, 10);
        try {
            const today = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(today.getDate() + 30);

            const expiringContracts = await prisma.contract.findMany({
                where: {
                    endDate: { gt: today, lte: thirtyDaysFromNow },
                    status: 'ACTIVE'
                },
                include: { costCenter: { include: { manager: true } } }
            });

            for (const contract of expiringContracts) {
                const manager = contract.costCenter?.manager;
                if (manager) {
                    await NotificationService.createNotification(prisma, {
                        userId: manager.id,
                        title: 'Contrato Vencendo',
                        message: `O contrato "${contract.number}" vence em breve (${contract.endDate.toLocaleDateString('pt-BR')}).`,
                        type: 'WARNING',
                        link: `/contracts/${contract.id}`,
                        eventCode: 'CONTRACT_EXPIRING',
                        entityType: 'Contract',
                        entityId: contract.id,
                        dedupeKey: `contract-exp-${contract.id}-${manager.id}-${ymd}`,
                        category: 'DEFAULT',
                        tenantSlug: slug,
                        mail: manager.email
                            ? {
                                to: manager.email,
                                subject: `[CONTRATO] Vencimento Próximo: ${contract.number}`,
                                html: EmailTemplateService.getContractExpiryTemplate(manager.name, contract.number, contract.endDate),
                                type: 'CONTRACT_EXPIRING',
                                module: 'Contratos'
                            }
                            : null
                    });
                }
            }
            if (expiringContracts.length > 0) console.log(`[Job] Contratos notificadas: ${expiringContracts.length}`);

        } catch (e) {
            console.error('[Job Error] checkExpiringContracts:', e);
        }
    }

    static async checkBudgetAlerts(prisma, tenant) {
        void prisma;
        void tenant;
        // Placeholder for future logic
    }

    /**
     * GOVERNANCE: Verifica aprovações pendentes há mais de 24h e envia lembretes
     */
    static async checkPendingApprovals(prisma, tenant) {
        const slug = tenant?.slug;
        try {
            const twentyFourHoursAgo = new Date();
            twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

            const pendingGMUDs = await prisma.changeRequestApprover.findMany({
                where: {
                    status: 'PENDING',
                    createdAt: { lte: twentyFourHoursAgo }
                },
                include: {
                    changeRequest: { select: { id: true, code: true, title: true, status: true } },
                    user: { select: { id: true, name: true, email: true } }
                }
            });

            const validGMUDs = pendingGMUDs.filter(a =>
                ['PENDING_APPROVAL', 'WAITING_CAB'].includes(a.changeRequest.status)
            );

            for (const approval of validGMUDs) {
                const cr = approval.changeRequest;
                await NotificationService.createNotification(prisma, {
                    userId: approval.userId,
                    title: '⏰ Lembrete: Aprovação Pendente',
                    message: `A GMUD "${cr.code}: ${cr.title}" aguarda sua aprovação há mais de 24h.`,
                    type: 'WARNING',
                    link: `/changes?id=${cr.id}`,
                    eventCode: 'GMUD_APPROVAL_REMINDER',
                    entityType: 'ChangeRequest',
                    entityId: cr.id,
                    dedupeKey: `gmud-pend-${cr.id}-${approval.userId}`,
                    category: 'GMUD',
                    tenantSlug: slug,
                    mail: approval.user?.email
                        ? {
                            to: approval.user.email,
                            subject: `[Lembrete] Aprovação GMUD ${cr.code}`,
                            html: EmailTemplateService.getSimpleAlertEmail(
                                approval.user.name,
                                'Aprovação pendente',
                                `<p>A GMUD <strong>${cr.code}</strong> — ${cr.title}</p><p>Aguarda sua aprovação há mais de 24 horas.</p>`,
                                `/changes?id=${cr.id}`
                            ),
                            type: 'GMUD_APPROVAL_REMINDER',
                            module: 'GMUD'
                        }
                        : null
                });
            }

            const staleProjects = await prisma.project.findMany({
                where: {
                    approvalStatus: 'PENDING_APPROVAL',
                    updatedAt: { lte: twentyFourHoursAgo },
                },
                include: {
                    costCenter: { include: { manager: { select: { id: true, name: true, email: true } } } },
                },
            });

            for (const p of staleProjects) {
                const mgrId = p.costCenter?.managerId;
                const mgr = p.costCenter?.manager;
                if (!mgrId) continue;
                await NotificationService.createNotification(prisma, {
                    userId: mgrId,
                    title: '⏰ Lembrete: Aprovação Pendente',
                    message: `O projeto "${p.code}: ${p.name}" aguarda aprovação há mais de 24h.`,
                    type: 'WARNING',
                    link: `/projects/${p.id}`,
                    eventCode: 'PROJECT_APPROVAL_REMINDER',
                    entityType: 'Project',
                    entityId: p.id,
                    dedupeKey: `proj-appr-${p.id}-${mgrId}`,
                    category: 'PROJECTS',
                    tenantSlug: slug,
                    mail: mgr?.email
                        ? {
                            to: mgr.email,
                            subject: `[Lembrete] Projeto ${p.code || ''} aguarda aprovação`,
                            html: EmailTemplateService.getSimpleAlertEmail(
                                mgr.name,
                                'Projeto pendente de aprovação',
                                `<p>O projeto <strong>${p.code}: ${p.name}</strong> aguarda aprovação há mais de 24 horas.</p>`,
                                `/projects/${p.id}`
                            ),
                            type: 'PROJECT_APPROVAL_REMINDER',
                            module: 'PROJECTS'
                        }
                        : null
                });
            }

            const totalReminders = validGMUDs.length + staleProjects.length;
            if (totalReminders > 0) {
                console.log(`[Job] Enviados ${totalReminders} lembretes de aprovação pendente.`);
            }

        } catch (error) {
            console.error('[Job Error] checkPendingApprovals:', error);
        }
    }

    /**
     * ITSM: Verifica SLA de incidentes próximos do vencimento ou já estourados
     */
    static async checkIncidentSLA(prisma, tenant) {
        const slug = tenant?.slug;
        try {
            const now = new Date();
            const oneHourFromNow = new Date();
            oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

            const nearBreachResponse = await prisma.incident.findMany({
                where: {
                    status: { in: ['OPEN'] },
                    respondedAt: null,
                    slaResponseDue: { lte: oneHourFromNow, gt: now }
                },
                include: {
                    assignee: { select: { id: true, name: true, email: true } },
                    reporter: { select: { id: true, name: true, email: true } }
                }
            });

            for (const incident of nearBreachResponse) {
                const targetUser = incident.assigneeId || incident.reporterId;
                if (!targetUser) continue;
                const u = incident.assigneeId ? incident.assignee : incident.reporter;
                await NotificationService.createNotification(prisma, {
                    userId: targetUser,
                    title: '⚠️ SLA Crítico: Resposta',
                    message: `O incidente ${incident.code} está próximo de estourar o SLA de resposta!`,
                    type: 'ERROR',
                    link: `/incidents?id=${incident.id}`,
                    eventCode: 'INCIDENT_SLA_NEAR_RESPONSE',
                    entityType: 'Incident',
                    entityId: incident.id,
                    dedupeKey: `inc-sla-resp-${incident.id}-${targetUser}`,
                    category: 'SLA',
                    tenantSlug: slug,
                    mail: u?.email
                        ? {
                            to: u.email,
                            subject: `[SLA] Incidente ${incident.code} — prazo de resposta`,
                            html: EmailTemplateService.getSimpleAlertEmail(
                                u.name,
                                'SLA de resposta em risco',
                                `<p>O incidente <strong>${incident.code}</strong> está próximo de estourar o SLA de <strong>resposta</strong>.</p>`,
                                `/incidents?id=${incident.id}`
                            ),
                            type: 'INCIDENT_SLA_NEAR',
                            module: 'INCIDENT'
                        }
                        : null
                });
            }

            const nearBreachResolve = await prisma.incident.findMany({
                where: {
                    status: { in: ['IN_PROGRESS', 'PENDING'] },
                    resolvedAt: null,
                    slaResolveDue: { lte: oneHourFromNow, gt: now }
                },
                include: {
                    assignee: { select: { id: true, name: true, email: true } }
                }
            });

            for (const incident of nearBreachResolve) {
                if (!incident.assigneeId) continue;
                const u = incident.assignee;
                await NotificationService.createNotification(prisma, {
                    userId: incident.assigneeId,
                    title: '⚠️ SLA Crítico: Resolução',
                    message: `O incidente ${incident.code} está próximo de estourar o SLA de resolução!`,
                    type: 'ERROR',
                    link: `/incidents?id=${incident.id}`,
                    eventCode: 'INCIDENT_SLA_NEAR_RESOLVE',
                    entityType: 'Incident',
                    entityId: incident.id,
                    dedupeKey: `inc-sla-res-${incident.id}-${incident.assigneeId}`,
                    category: 'SLA',
                    tenantSlug: slug,
                    mail: u?.email
                        ? {
                            to: u.email,
                            subject: `[SLA] Incidente ${incident.code} — prazo de resolução`,
                            html: EmailTemplateService.getSimpleAlertEmail(
                                u.name,
                                'SLA de resolução em risco',
                                `<p>O incidente <strong>${incident.code}</strong> está próximo de estourar o SLA de <strong>resolução</strong>.</p>`,
                                `/incidents?id=${incident.id}`
                            ),
                            type: 'INCIDENT_SLA_NEAR',
                            module: 'INCIDENT'
                        }
                        : null
                });
            }

            const breachedIncidents = await prisma.incident.findMany({
                where: {
                    slaBreached: false,
                    status: { notIn: ['CLOSED', 'RESOLVED'] },
                    OR: [
                        { slaResponseDue: { lt: now }, respondedAt: null },
                        { slaResolveDue: { lt: now }, resolvedAt: null }
                    ]
                }
            });

            for (const incident of breachedIncidents) {
                await prisma.incident.update({
                    where: { id: incident.id },
                    data: { slaBreached: true }
                });
            }

            const totalAlerts = nearBreachResponse.length + nearBreachResolve.length;
            if (totalAlerts > 0) {
                console.log(`[Job] Enviados ${totalAlerts} alertas de SLA crítico.`);
            }
            if (breachedIncidents.length > 0) {
                console.log(`[Job] Marcados ${breachedIncidents.length} incidentes como SLA Breached.`);
            }

        } catch (error) {
            console.error('[Job Error] checkIncidentSLA:', error);
        }
    }
}

module.exports = NotificationJob;
