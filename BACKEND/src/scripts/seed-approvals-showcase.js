/**
 * Cria um item pendente por tipo na esteira "Minhas aprovações" para o utilizador indicado.
 * Idempotente (descrições / códigos estáveis com prefixo [Seed Aprovações]).
 *
 * Pré-requisitos: pelo menos um utilizador ativo (ou o email em SEED_APPROVALS_USER_EMAIL). Fornecedor / conta / exercício são criados se ausentes.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ userEmail?: string, verbose?: boolean }} [options]
 */
const { Prisma } = require('@prisma/client');

const PREFIX = '[Seed Aprovações]';

async function ensureSupplier(prisma) {
    let s = await prisma.supplier.findFirst({ where: { isActive: true } });
    if (s) return s;
    s = await prisma.supplier.findFirst();
    if (s) return s;
    const doc = '11222333000199';
    const existing = await prisma.supplier.findUnique({ where: { document: doc } });
    if (existing) return existing;
    return prisma.supplier.create({
        data: {
            name: 'Fornecedor (seed Minhas Aprovações)',
            tradeName: 'Seed Aprovações',
            document: doc,
            documentType: 'CNPJ',
            classification: 'OPERACIONAL',
            isActive: true,
        },
    });
}

async function ensureAccountingAccount(prisma) {
    let a = await prisma.accountingAccount.findFirst({ where: { isActive: true } });
    if (a) return a;
    a = await prisma.accountingAccount.findFirst();
    if (a) return a;
    return prisma.accountingAccount.create({
        data: {
            code: 'SEED-APPROVAL-ACC',
            name: 'Conta (seed Minhas Aprovações)',
            type: 'DESPESA',
        },
    });
}

async function ensureFiscalYear(prisma) {
    let fy = await prisma.fiscalYear.findFirst({ orderBy: { year: 'desc' } });
    if (fy) return fy;
    const y = new Date().getFullYear();
    return prisma.fiscalYear.create({
        data: {
            year: y,
            startDate: new Date(y, 0, 1),
            endDate: new Date(y, 11, 31, 23, 59, 59),
            isClosed: false,
        },
    });
}

const DEPT_CODE = 'DEPT-G360-APPROVAL-DEMO';
const CC_CODE = 'CC-G360-APPROVAL-DEMO';
const PRJ_BASELINE_CODE = 'PRJ-G360-PENDING-BASELINE';
const PRJ_CTX_CODE = 'PRJ-G360-APPROVAL-CTX';
const GMUD_CODE = 'GMUD-G360-APPROVAL-DEMO';

async function seedApprovalsShowcase(prisma, options = {}) {
    const userEmail = options.userEmail || process.env.SEED_APPROVALS_USER_EMAIL || 'admin@g360.com.br';
    const verbose = options.verbose === true;

    let user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
        user = await prisma.user.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
        });
        if (user && user.email !== userEmail) {
            console.warn(`  Aviso: ${userEmail} não existe; a usar primeiro utilizador ativo: ${user.email}`);
        }
    }
    if (!user) {
        throw new Error(`Nenhum utilizador para atribuir pendências. Crie ${userEmail} ou um utilizador ativo.`);
    }

    const supplier = await ensureSupplier(prisma);
    const account = await ensureAccountingAccount(prisma);
    const fiscalYear = await ensureFiscalYear(prisma);

    const dept = await prisma.department.upsert({
        where: { code: DEPT_CODE },
        update: { name: `${PREFIX} Depto demo` },
        create: {
            code: DEPT_CODE,
            name: `${PREFIX} Depto demo`,
            budget: new Prisma.Decimal('100000'),
        },
    });

    const cc = await prisma.costCenter.upsert({
        where: { code: CC_CODE },
        update: {
            name: `${PREFIX} Centro de custo`,
            departmentId: dept.id,
            managerId: user.id,
            isActive: true,
        },
        create: {
            code: CC_CODE,
            name: `${PREFIX} Centro de custo`,
            departmentId: dept.id,
            managerId: user.id,
            isActive: true,
        },
    });

    await prisma.project.upsert({
        where: { code: PRJ_BASELINE_CODE },
        update: {
            name: `${PREFIX} Projeto baseline pendente`,
            approvalStatus: 'PENDING_APPROVAL',
            costCenterId: cc.id,
            managerId: user.id,
            creatorId: user.id,
            departmentId: dept.id,
        },
        create: {
            code: PRJ_BASELINE_CODE,
            name: `${PREFIX} Projeto baseline pendente`,
            description: 'Seed Minhas Aprovações — baseline',
            type: 'INTERNO',
            status: 'PLANNING',
            priority: 'MEDIUM',
            departmentId: dept.id,
            costCenterId: cc.id,
            managerId: user.id,
            creatorId: user.id,
            approvalStatus: 'PENDING_APPROVAL',
            budget: new Prisma.Decimal('50000'),
        },
    });

    const projectCtx = await prisma.project.upsert({
        where: { code: PRJ_CTX_CODE },
        update: {
            name: `${PREFIX} Projeto (custos/atas/propostas)`,
            approvalStatus: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: user.id,
            costCenterId: cc.id,
            managerId: user.id,
            departmentId: dept.id,
        },
        create: {
            code: PRJ_CTX_CODE,
            name: `${PREFIX} Projeto (custos/atas/propostas)`,
            description: 'Seed Minhas Aprovações',
            type: 'INTERNO',
            status: 'IN_PROGRESS',
            priority: 'MEDIUM',
            departmentId: dept.id,
            costCenterId: cc.id,
            managerId: user.id,
            creatorId: user.id,
            approvalStatus: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: user.id,
            budget: new Prisma.Decimal('120000'),
        },
    });

    const expDesc = `${PREFIX} Despesa operacional`;
    let exp = await prisma.expense.findFirst({ where: { description: expDesc } });
    if (!exp) {
        exp = await prisma.expense.create({
            data: {
                description: expDesc,
                type: 'OPERACIONAL',
                amount: new Prisma.Decimal('350.00'),
                date: new Date(),
                status: 'AGUARDANDO_APROVACAO',
                costCenterId: cc.id,
                supplierId: supplier.id,
                accountId: account.id,
                createdBy: user.id,
            },
        });
    } else {
        exp = await prisma.expense.update({
            where: { id: exp.id },
            data: {
                status: 'AGUARDANDO_APROVACAO',
                costCenterId: cc.id,
            },
        });
    }

    const pcDesc = `${PREFIX} Custo de projeto`;
    let pc = await prisma.projectCost.findFirst({
        where: { projectId: projectCtx.id, description: pcDesc },
    });
    if (!pc) {
        pc = await prisma.projectCost.create({
            data: {
                projectId: projectCtx.id,
                description: pcDesc,
                type: 'OPEX',
                amount: new Prisma.Decimal('1200.00'),
                date: new Date(),
                status: 'AGUARDANDO_APROVACAO',
                createdBy: user.id,
                supplierId: supplier.id,
            },
        });
    } else {
        pc = await prisma.projectCost.update({
            where: { id: pc.id },
            data: { status: 'AGUARDANDO_APROVACAO' },
        });
    }

    const minuteTitle = `${PREFIX} Ata de reunião`;
    let minute = await prisma.meetingMinute.findFirst({
        where: { projectId: projectCtx.id, title: minuteTitle },
    });
    if (!minute) {
        minute = await prisma.meetingMinute.create({
            data: {
                projectId: projectCtx.id,
                title: minuteTitle,
                date: new Date(),
                fileUrl: '/uploads/seed-approval-minute.pdf',
                fileName: 'seed-approval-minute.pdf',
                status: 'PENDING',
                topics: [],
            },
        });
    } else {
        minute = await prisma.meetingMinute.update({
            where: { id: minute.id },
            data: { status: 'PENDING' },
        });
    }

    const propDesc = `${PREFIX} Proposta comparativa`;
    let proposal = await prisma.projectProposal.findFirst({
        where: { projectId: projectCtx.id, description: propDesc },
    });
    if (!proposal) {
        proposal = await prisma.projectProposal.create({
            data: {
                projectId: projectCtx.id,
                supplierId: supplier.id,
                value: new Prisma.Decimal('45000'),
                status: 'AGUARDANDO_APROVACAO',
                description: propDesc,
                category: 'SERVICO',
            },
        });
    } else {
        proposal = await prisma.projectProposal.update({
            where: { id: proposal.id },
            data: { status: 'AGUARDANDO_APROVACAO' },
        });
    }

    const budgetName = `${PREFIX} Orçamento exercício`;
    let budget = await prisma.budget.findFirst({ where: { name: budgetName } });
    if (!budget) {
        budget = await prisma.budget.create({
            data: {
                fiscalYearId: fiscalYear.id,
                name: budgetName,
                description: 'Seed Minhas Aprovações',
                status: 'PENDING_APPROVAL',
                totalOpex: new Prisma.Decimal('10000'),
                totalCapex: new Prisma.Decimal('5000'),
            },
        });
        await prisma.budgetItem.create({
            data: {
                budgetId: budget.id,
                accountId: account.id,
                costCenterId: cc.id,
                type: 'OPEX',
                description: 'Linha seed',
                jan: new Prisma.Decimal('1000'),
            },
        });
    } else {
        await prisma.budget.update({
            where: { id: budget.id },
            data: { status: 'PENDING_APPROVAL' },
        });
        const itemCount = await prisma.budgetItem.count({ where: { budgetId: budget.id } });
        if (itemCount === 0) {
            await prisma.budgetItem.create({
                data: {
                    budgetId: budget.id,
                    accountId: account.id,
                    costCenterId: cc.id,
                    type: 'OPEX',
                    description: 'Linha seed',
                    jan: new Prisma.Decimal('1000'),
                },
            });
        }
    }

    const start = new Date();
    const end = new Date(start.getTime() + 48 * 3600 * 1000);
    let gmud = await prisma.changeRequest.findFirst({ where: { code: GMUD_CODE } });
    if (!gmud) {
        gmud = await prisma.changeRequest.create({
            data: {
                code: GMUD_CODE,
                title: `${PREFIX} GMUD demonstração`,
                description: 'Seed Minhas Aprovações',
                justification: 'Demonstração do fluxo de aprovação',
                type: 'NORMAL',
                riskLevel: 'BAIXO',
                impact: 'BAIXO',
                status: 'PENDING_APPROVAL',
                scheduledStart: start,
                scheduledEnd: end,
                requesterId: user.id,
                approvers: {
                    create: [{ userId: user.id, role: 'APPROVER', status: 'PENDING' }],
                },
            },
        });
    } else {
        await prisma.changeApprover.deleteMany({ where: { changeRequestId: gmud.id } });
        await prisma.changeApprover.create({
            data: {
                changeRequestId: gmud.id,
                userId: user.id,
                role: 'APPROVER',
                status: 'PENDING',
            },
        });
        gmud = await prisma.changeRequest.update({
            where: { id: gmud.id },
            data: { status: 'PENDING_APPROVAL' },
        });
    }

    const projBaseline = await prisma.project.findUnique({ where: { code: PRJ_BASELINE_CODE } });

    if (verbose) {
        console.log(`  utilizador=${userEmail} cc=${cc.code} expense=${exp.id} projectCost=${pc.id} minute=${minute.id} proposal=${proposal.id} budget=${budget.id} gmud=${gmud.id} projectBaseline=${projBaseline?.id}`);
    }

    return {
        userEmail,
        expenseId: exp.id,
        projectCostId: pc.id,
        minuteId: minute.id,
        proposalId: proposal.id,
        budgetId: budget.id,
        gmudId: gmud.id,
        projectBaselineId: projBaseline?.id,
    };
}

module.exports = { seedApprovalsShowcase };
