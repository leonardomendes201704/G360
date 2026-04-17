/**
 * Cria até 5 chamados por serviço do catálogo (um por estado do workflow), para testar o Portal de Suporte.
 * Textos alinhados a produção (sem prefixos de demo). Idempotente por serviço + estado + solicitante + título exacto.
 *
 * Estados: OPEN, IN_PROGRESS, WAITING_USER, RESOLVED, CLOSED (alinhados a `TicketController.updateStatus`).
 *
 * Snapshots `departmentId` / `costCenterId`: perfil do solicitante; se faltar, usa o primeiro departamento
 * (por nome) e um centro de custo ativo (preferindo o ligado ao departamento).
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ userEmail?: string, verbose?: boolean, maxServices?: number|null, cleanupFirst?: boolean }} [options]
 *   cleanupFirst — remove chamados gerados por execuções anteriores deste script (critérios abaixo), depois recria.
 */
const TicketService = require('../services/ticket.service');

const STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/** Prefixo legado (apenas para limpeza / migração de bases antigas) */
const LEGACY_PORTAL_PREFIX = '[Seed Portal]';

/** @param {number} slotIndex 1..5 (ordem alinhada a STATUSES) */
function buildTitle(serviceName, slotIndex) {
    return `${serviceName} — requisição ${slotIndex}`;
}

function buildDescription(categoryName, serviceName, status) {
    return `Registado via portal de suporte. Categoria: ${categoryName || '—'}. Serviço: ${serviceName}. Estado: ${status}.`;
}

/**
 * Remove chamados criados por versões anteriores deste script (títulos legados ou texto de descrição conhecido).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} requesterId
 * @returns {Promise<number>}
 */
async function deleteSeedPortalTickets(prisma, requesterId) {
    const result = await prisma.ticket.deleteMany({
        where: {
            requesterId,
            OR: [
                { title: { startsWith: LEGACY_PORTAL_PREFIX } },
                { description: { contains: 'Demonstração Portal de Suporte' } },
                { description: { startsWith: 'Registado via portal de suporte.' } },
            ],
        },
    });
    return result.count;
}

/**
 * Resolve departamento e centro de custo: valida perfil do utilizador; senão escolhe registos no tenant.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ id: string, departmentId?: string|null, costCenterId?: string|null }} user
 */
async function resolveSeedDepartmentCostCenter(prisma, user) {
    let departmentId = user.departmentId || null;
    let costCenterId = user.costCenterId || null;

    if (departmentId) {
        const exists = await prisma.department.findUnique({ where: { id: departmentId }, select: { id: true } });
        if (!exists) departmentId = null;
    }
    if (costCenterId) {
        const exists = await prisma.costCenter.findFirst({
            where: { id: costCenterId, isActive: true },
            select: { id: true },
        });
        if (!exists) costCenterId = null;
    }

    let department = departmentId
        ? await prisma.department.findUnique({ where: { id: departmentId } })
        : null;
    if (!department) {
        department = await prisma.department.findFirst({ orderBy: { name: 'asc' } });
        departmentId = department?.id ?? null;
    }

    let costCenter = null;
    if (costCenterId) {
        costCenter = await prisma.costCenter.findFirst({
            where: { id: costCenterId, isActive: true },
        });
    }
    if (!costCenter && departmentId) {
        costCenter = await prisma.costCenter.findFirst({
            where: { departmentId, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    if (!costCenter) {
        costCenter = await prisma.costCenter.findFirst({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    costCenterId = costCenter?.id ?? null;

    if (!departmentId && costCenter?.departmentId) {
        departmentId = costCenter.departmentId;
    }

    if (departmentId && costCenterId) {
        await prisma.user.update({
            where: { id: user.id },
            data: { departmentId, costCenterId },
        });
    }

    return { departmentId, costCenterId };
}

async function seedPortalTicketsShowcase(prisma, options = {}) {
    const userEmail =
        options.userEmail ||
        process.env.SEED_PORTAL_REQUESTER_EMAIL ||
        process.env.SEED_APPROVALS_USER_EMAIL ||
        'admin@g360.com.br';
    const verbose = options.verbose === true;
    const maxServices =
        options.maxServices !== undefined
            ? options.maxServices
            : process.env.SEED_PORTAL_MAX_SERVICES != null && process.env.SEED_PORTAL_MAX_SERVICES !== ''
                ? parseInt(process.env.SEED_PORTAL_MAX_SERVICES, 10)
                : null;

    let user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
        user = await prisma.user.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
        });
        if (user && user.email !== userEmail) {
            console.warn(`  Aviso: ${userEmail} não existe; requester: ${user.email}`);
        }
    }
    if (!user) {
        throw new Error('Nenhum utilizador para requesterId dos chamados.');
    }

    let deleted = 0;
    if (options.cleanupFirst === true) {
        deleted = await deleteSeedPortalTickets(prisma, user.id);
        if (options.verbose) {
            console.log(`  Removidos ${deleted} chamado(s) de showcase do portal existentes.`);
        }
    }

    const { departmentId: seedDeptId, costCenterId: seedCcId } = await resolveSeedDepartmentCostCenter(prisma, user);
    if (options.verbose && (seedDeptId || seedCcId)) {
        console.log(`  Departamento / centro de custo (snapshots): ${seedDeptId || '—'} / ${seedCcId || '—'}`);
    }

    const allServices = await prisma.serviceCatalog.findMany({
        where: { isActive: true },
        include: { category: { select: { name: true } } },
        orderBy: { name: 'asc' },
    });

    const services =
        maxServices != null && !Number.isNaN(maxServices) && maxServices > 0
            ? allServices.slice(0, maxServices)
            : allServices;

    if (!services.length) {
        throw new Error(
            'Nenhum serviço ativo no catálogo. Rode o seed ITIL/catálogo (`npm run seed:catalog` ou equivalente) antes.'
        );
    }

    let created = 0;
    let skipped = 0;

    let prioIdx = 0;
    for (const svc of services) {
        for (let idx = 0; idx < STATUSES.length; idx++) {
            const status = STATUSES[idx];
            const title = buildTitle(svc.name, idx + 1);
            const existing = await prisma.ticket.findFirst({
                where: {
                    serviceId: svc.id,
                    status,
                    requesterId: user.id,
                    title,
                },
            });
            if (existing) {
                skipped += 1;
                continue;
            }

            const code = await TicketService.getNextTicketCode(prisma);
            const prio = PRIORITIES[prioIdx % PRIORITIES.length];
            prioIdx += 1;

            const slaMin = await TicketService.resolveSlaMinutes(prisma, svc.id, null, prio);
            const slaDates = await TicketService.computeSlaDueDates(
                prisma,
                new Date(),
                slaMin.response,
                slaMin.resolve
            );

            /** @type {Record<string, unknown>} */
            const data = {
                code,
                title,
                description: buildDescription(svc.category?.name, svc.name, status),
                status,
                priority: prio,
                categoryId: svc.categoryId,
                serviceId: svc.id,
                requesterId: user.id,
                departmentId: seedDeptId ?? null,
                costCenterId: seedCcId ?? null,
                customAnswers: {},
                slaMonitorId: slaMin.slaPolicyId,
                slaResponseDue: slaDates.slaResponseDue,
                slaResolveDue: slaDates.slaResolveDue,
            };

            if (status === 'IN_PROGRESS') {
                data.respondedAt = new Date();
            }
            if (status === 'WAITING_USER') {
                data.respondedAt = new Date();
                data.slaPausedAt = new Date();
            }
            if (status === 'RESOLVED' || status === 'CLOSED') {
                data.respondedAt = new Date();
                data.resolvedAt = new Date();
            }
            if (status === 'CLOSED') {
                data.closedAt = new Date();
            }

            await prisma.ticket.create({ data });
            created += 1;
        }
    }

    if (verbose) {
        console.log(`  criados=${created} ignorados(já existiam)=${skipped} serviços=${services.length}`);
    }

    return {
        created,
        skipped,
        deletedSeedTickets: options.cleanupFirst ? deleted : undefined,
        servicesProcessed: services.length,
        ticketsPerService: STATUSES.length,
        requesterEmail: user.email,
        seedDepartmentId: seedDeptId ?? null,
        seedCostCenterId: seedCcId ?? null,
    };
}

module.exports = {
    seedPortalTicketsShowcase,
    deleteSeedPortalTickets,
    resolveSeedDepartmentCostCenter,
    STATUSES,
    buildTitle,
    LEGACY_PORTAL_PREFIX,
};
