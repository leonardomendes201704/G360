/**
 * Cria um item pendente por tipo na esteira "Minhas aprovações" para o utilizador indicado.
 * Textos neutros (ambiente de produção). Idempotente por códigos estáveis e descrições conhecidas.
 *
 * Pré-requisitos: pelo menos um utilizador ativo (ou o email em SEED_APPROVALS_USER_EMAIL). Fornecedor / conta / exercício são criados se ausentes.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ userEmail?: string, verbose?: boolean }} [options]
 */
const { Prisma } = require('@prisma/client');

/** Textos estáveis para idempotência (sem referência a demo/seed) */
const DEPT_NAME = 'Direção de operações — matriz';
const CC_NAME = 'Centro de custo — operações diretas';
const PRJ_BASELINE_NAME = 'Projeto — baseline em aprovação';
const PRJ_CTX_NAME = 'Projeto — custos, atas e propostas';
const EXPENSE_DESC = 'Despesa operacional — manutenção preventiva';
const PROJECT_COST_DESC = 'Custo de projeto — infraestrutura';
const MINUTE_TITLE = 'Ata — alinhamento de projeto';
const PROPOSAL_DESC = 'Proposta comparativa — fornecedor preferencial';
const BUDGET_NAME = 'Orçamento anual — revisão';
const GMUD_TITLE = 'Alteração — janela de manutenção programada';

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
            name: 'Materiais Silva Comércio Ltda',
            tradeName: 'Materiais Silva',
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
            name: 'Despesas correntes — operações',
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
        update: { name: DEPT_NAME },
        create: {
            code: DEPT_CODE,
            name: DEPT_NAME,
            budget: new Prisma.Decimal('100000'),
        },
    });

    const cc = await prisma.costCenter.upsert({
        where: { code: CC_CODE },
        update: {
            name: CC_NAME,
            departmentId: dept.id,
            managerId: user.id,
            isActive: true,
        },
        create: {
            code: CC_CODE,
            name: CC_NAME,
            departmentId: dept.id,
            managerId: user.id,
            isActive: true,
        },
    });

    await prisma.project.upsert({
        where: { code: PRJ_BASELINE_CODE },
        update: {
            name: PRJ_BASELINE_NAME,
            approvalStatus: 'PENDING_APPROVAL',
            costCenterId: cc.id,
            managerId: user.id,
            creatorId: user.id,
            departmentId: dept.id,
        },
        create: {
            code: PRJ_BASELINE_CODE,
            name: PRJ_BASELINE_NAME,
            description: 'Planeamento inicial e aprovação de orçamento.',
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
            name: PRJ_CTX_NAME,
            approvalStatus: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: user.id,
            costCenterId: cc.id,
            managerId: user.id,
            departmentId: dept.id,
        },
        create: {
            code: PRJ_CTX_CODE,
            name: PRJ_CTX_NAME,
            description: 'Acompanhamento operacional e documentação associada.',
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

    let exp = await prisma.expense.findFirst({
        where: {
            createdBy: user.id,
            OR: [
                { description: EXPENSE_DESC },
                { description: '[Seed Aprovações] Despesa operacional' },
                { description: { startsWith: '[Seed Aprovações] Despesa' } },
            ],
        },
    });
    if (!exp) {
        exp = await prisma.expense.create({
            data: {
                description: EXPENSE_DESC,
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
                description: EXPENSE_DESC,
                status: 'AGUARDANDO_APROVACAO',
                costCenterId: cc.id,
            },
        });
    }

    let pc = await prisma.projectCost.findFirst({
        where: {
            projectId: projectCtx.id,
            OR: [
                { description: PROJECT_COST_DESC },
                { description: '[Seed Aprovações] Custo de projeto' },
                { description: { startsWith: '[Seed Aprovações] Custo' } },
            ],
        },
    });
    if (!pc) {
        pc = await prisma.projectCost.create({
            data: {
                projectId: projectCtx.id,
                description: PROJECT_COST_DESC,
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
            data: { description: PROJECT_COST_DESC, status: 'AGUARDANDO_APROVACAO' },
        });
    }

    let minute = await prisma.meetingMinute.findFirst({
        where: {
            projectId: projectCtx.id,
            OR: [
                { title: MINUTE_TITLE },
                { title: { startsWith: '[Seed Aprovações] Ata' } },
            ],
        },
    });
    if (!minute) {
        minute = await prisma.meetingMinute.create({
            data: {
                projectId: projectCtx.id,
                title: MINUTE_TITLE,
                date: new Date(),
                fileUrl: '/uploads/ata-reuniao-projeto.pdf',
                fileName: 'ata-reuniao-projeto.pdf',
                status: 'PENDING',
                topics: [],
            },
        });
    } else {
        minute = await prisma.meetingMinute.update({
            where: { id: minute.id },
            data: {
                title: MINUTE_TITLE,
                status: 'PENDING',
                fileUrl: '/uploads/ata-reuniao-projeto.pdf',
                fileName: 'ata-reuniao-projeto.pdf',
            },
        });
    }

    let proposal = await prisma.projectProposal.findFirst({
        where: {
            projectId: projectCtx.id,
            OR: [
                { description: PROPOSAL_DESC },
                { description: { startsWith: '[Seed Aprovações] Proposta' } },
            ],
        },
    });
    if (!proposal) {
        proposal = await prisma.projectProposal.create({
            data: {
                projectId: projectCtx.id,
                supplierId: supplier.id,
                value: new Prisma.Decimal('45000'),
                status: 'AGUARDANDO_APROVACAO',
                description: PROPOSAL_DESC,
                category: 'SERVICO',
            },
        });
    } else {
        proposal = await prisma.projectProposal.update({
            where: { id: proposal.id },
            data: { description: PROPOSAL_DESC, status: 'AGUARDANDO_APROVACAO' },
        });
    }

    let budget = await prisma.budget.findFirst({
        where: {
            OR: [
                { name: BUDGET_NAME },
                { name: { startsWith: '[Seed Aprovações] Orçamento' } },
            ],
        },
    });
    if (!budget) {
        budget = await prisma.budget.create({
            data: {
                fiscalYearId: fiscalYear.id,
                name: BUDGET_NAME,
                description: 'Consolidação de rubricas para o exercício corrente.',
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
                description: 'Rubrica — despesas recorrentes',
                jan: new Prisma.Decimal('1000'),
            },
        });
    } else {
        await prisma.budget.update({
            where: { id: budget.id },
            data: {
                name: BUDGET_NAME,
                description: 'Consolidação de rubricas para o exercício corrente.',
                status: 'PENDING_APPROVAL',
            },
        });
        const itemCount = await prisma.budgetItem.count({ where: { budgetId: budget.id } });
        if (itemCount === 0) {
            await prisma.budgetItem.create({
                data: {
                    budgetId: budget.id,
                    accountId: account.id,
                    costCenterId: cc.id,
                    type: 'OPEX',
                    description: 'Rubrica — despesas recorrentes',
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
                title: GMUD_TITLE,
                description: 'Pedido formal de alteração para atualização controlada do ambiente.',
                justification: 'Janela acordada com as áreas de negócio.',
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
            data: {
                status: 'PENDING_APPROVAL',
                title: GMUD_TITLE,
                description: 'Pedido formal de alteração para atualização controlada do ambiente.',
                justification: 'Janela acordada com as áreas de negócio.',
            },
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
