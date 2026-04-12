const ProjectService = require('../services/project.service');
const BudgetService = require('../services/budget.service');
const ChangeRequestService = require('../services/change-request.service');
const logger = require('../config/logger');
const {
  buildExpensePendingWhere,
  buildProjectCostPendingWhere,
  buildProjectBaselinePendingWhere,
  buildMeetingMinutePendingWhere,
  buildProposalPendingWhere,
  userCanApproveExpense,
  userCanApproveProjectCost,
  userCanApproveProjectBaseline,
  userCanApproveMeetingMinute,
  userCanApproveProposal,
  userCanApproveBudget,
  filterBudgetsPendingForUser,
  isSuperAdminUser,
} = require('../services/approval-tier.service');

class ApprovalController {

    // Obter contagem de pendências por tipo
    static async getCounts(req, res) {
        const { userId } = req.user;

        try {
            const userWithRoles = await req.prisma.user.findUnique({
                where: { id: userId },
                include: { roles: true }
            });
            const userRoles = userWithRoles?.roles?.map(r => r.name) || [];
            const isSuperAdmin = userRoles.some(r => r.toLowerCase().includes('super admin') || r.toLowerCase() === 'superadmin');

            // GMUD: fluxo próprio (CAB / aprovadores em ChangeApprover), não usa ApprovalTier
            const [
                expenseWhere,
                projectCostWhere,
                projectWhere,
                minuteWhere,
                proposalWhere,
            ] = await Promise.all([
                buildExpensePendingWhere(req.prisma, userId),
                buildProjectCostPendingWhere(req.prisma, userId),
                buildProjectBaselinePendingWhere(req.prisma, userId, isSuperAdmin),
                buildMeetingMinutePendingWhere(req.prisma, userId, isSuperAdmin),
                buildProposalPendingWhere(req.prisma, userId, isSuperAdmin),
            ]);

            const budgetCandidates = await req.prisma.budget.findMany({
                where: { status: 'PENDING_APPROVAL' },
                select: {
                    id: true,
                    name: true,
                    totalOpex: true,
                    totalCapex: true,
                    createdAt: true,
                    status: true,
                    items: { select: { costCenterId: true } },
                },
            });
            const visibleBudgets = await filterBudgetsPendingForUser(req.prisma, userId, budgetCandidates);

            const [expenses, projectCosts, minutes, gmuds, projects, proposals] = await Promise.all([
                req.prisma.expense.count({ where: expenseWhere }),
                req.prisma.projectCost.count({ where: projectCostWhere }),
                req.prisma.meetingMinute.count({ where: minuteWhere }),
                req.prisma.changeRequest.count({
                    where: {
                        status: { in: ['PENDING_APPROVAL', 'WAITING_CAB'] },
                        approvers: {
                            some: {
                                userId: userId,
                                status: 'PENDING'
                            }
                        }
                    }
                }),
                req.prisma.project.count({ where: projectWhere }),
                req.prisma.projectProposal.count({ where: proposalWhere }),
            ]);

            const budgets = visibleBudgets.length;

            return res.json({
                expenses,
                projectCosts,
                minutes,
                gmuds,
                projects,
                proposals,
                budgets,
                total: expenses + projectCosts + minutes + gmuds + projects + proposals + budgets
            });
        } catch (error) {
            logger.error('Erro ao buscar contagens:', error);
            return res.status(500).json({ message: 'Erro ao buscar pendências', error: error.message });
        }
    }

    // Listar pendências por tipo
    static async getPending(req, res) {
        const { userId } = req.user;
        const { type } = req.query;

        try {
            // Buscar projetos e centros de custo gerenciados
            const managedProjects = await req.prisma.project.findMany({
                where: { managerId: userId },
                select: { id: true, name: true }
            });
            const projectIds = managedProjects.map(p => p.id);

            const managedCostCenters = await req.prisma.costCenter.findMany({
                where: { managerId: userId },
                select: { id: true, name: true }
            });
            const costCenterIds = managedCostCenters.map(cc => cc.id);

            // Verificar roles para visualização de Projetos (mantido lógica antiga para projetos)
            const userWithRoles = await req.prisma.user.findUnique({
                where: { id: userId },
                include: { roles: true }
            });
            const userRoles = userWithRoles?.roles?.map(r => r.name) || [];
            const isSuperAdmin = userRoles.some(r => r.toLowerCase().includes('super admin') || r.toLowerCase() === 'superadmin');

            let items = [];

            const expenseWhere = await buildExpensePendingWhere(req.prisma, userId);
            const projectCostWhere = await buildProjectCostPendingWhere(req.prisma, userId);
            const projectWhere = await buildProjectBaselinePendingWhere(req.prisma, userId, isSuperAdmin);
            const minuteWhere = await buildMeetingMinutePendingWhere(req.prisma, userId, isSuperAdmin);
            const proposalWhere = await buildProposalPendingWhere(req.prisma, userId, isSuperAdmin);

            // Despesas
            if (!type || type === 'expenses') {
                const expenses = await req.prisma.expense.findMany({
                    where: expenseWhere,
                    include: {
                        costCenter: { select: { name: true } },
                        supplier: { select: { name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                });
                items.push(...expenses.map(e => ({
                        id: e.id,
                        type: 'expense',
                        title: e.description,
                        subtitle: e.costCenter?.name || 'Sem centro de custo',
                        value: Number(e.amount),
                        requestedBy: e.createdBy,
                        createdAt: e.createdAt,
                        supplier: e.supplier?.name,
                        invoiceNumber: e.invoiceNumber
                    })));
            }

            // Custos de Projeto
            if (!type || type === 'projectCosts') {
                const costs = await req.prisma.projectCost.findMany({
                    where: projectCostWhere,
                    include: {
                        project: { select: { name: true } },
                        supplier: { select: { name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                });
                items.push(...costs.map(c => ({
                        id: c.id,
                        type: 'projectCost',
                        title: c.description,
                        subtitle: c.project?.name || 'Projeto',
                        value: Number(c.amount),
                        requestedBy: c.createdBy,
                        createdAt: c.createdAt,
                        supplier: c.supplier?.name,
                        invoiceNumber: c.invoiceNumber,
                        projectId: c.projectId
                    })));
            }

            // Atas
            if (!type || type === 'minutes') {
                const minutes = await req.prisma.meetingMinute.findMany({
                    where: minuteWhere,
                    include: { project: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' }
                });
                items.push(...minutes.map(m => ({
                    id: m.id,
                    type: 'minute',
                    title: m.title,
                    subtitle: m.project?.name || 'Projeto',
                    value: null,
                    requestedBy: null,
                    createdAt: m.createdAt,
                    date: m.date,
                    projectId: m.projectId
                })));
            }

            // GMUDs (CAB / aprovadores designados — não usa alçadas parametrizadas)
            if (!type || type === 'gmuds') {
                const gmuds = await req.prisma.changeRequest.findMany({
                    where: {
                        status: { in: ['PENDING_APPROVAL', 'WAITING_CAB'] },
                        approvers: {
                            some: {
                                userId: userId,
                                status: 'PENDING'
                            }
                        }
                    },
                    include: {
                        requester: { select: { name: true, avatar: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                });

                items.push(...gmuds.map(g => ({
                    id: g.id,
                    type: 'gmud',
                    title: g.title,
                    subtitle: `GMUD-${g.code || g.id.slice(0, 8)}`,
                    value: null,
                    requestedBy: g.requesterId,
                    requesterName: g.requester?.name,
                    createdAt: g.createdAt,
                    impact: g.impact,
                    risk: g.riskLevel
                })));
            }

            // Projetos
            if (!type || type === 'projects') {
                const projects = await req.prisma.project.findMany({
                    where: projectWhere,
                    include: { manager: true, costCenter: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' }
                });
                items.push(...projects.map(p => ({
                    id: p.id,
                    type: 'project',
                    title: p.name,
                    subtitle: `${p.code || 'Projeto'} - ${p.costCenter?.name || ''}`,
                    value: Number(p.budget || 0),
                    requestedBy: p.creatorId,
                    createdAt: p.createdAt
                })));
            }

            // Propostas
            if (!type || type === 'proposals') {
                const proposals = await req.prisma.projectProposal.findMany({
                    where: proposalWhere,
                    include: {
                        project: { select: { name: true } },
                        supplier: { select: { name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                });
                items.push(...proposals.map(p => ({
                    id: p.id,
                    type: 'proposal',
                    title: p.description || `Proposta ${p.supplier?.name || 'Fornecedor'}`,
                    subtitle: p.project?.name || 'Projeto',
                    value: Number(p.value),
                    requestedBy: null,
                    createdAt: p.createdAt,
                    supplier: p.supplier?.name,
                    category: p.category,
                    projectId: p.projectId
                })));
            }

            // Orçamentos (enviados para aprovação — alçadas BUDGET)
            if (!type || type === 'budgets') {
                const budgetRows = await req.prisma.budget.findMany({
                    where: { status: 'PENDING_APPROVAL' },
                    include: { fiscalYear: { select: { year: true } } },
                    orderBy: { createdAt: 'desc' }
                });
                const budgetItems = await Promise.all(
                    budgetRows.map((b) =>
                        req.prisma.budgetItem.findMany({
                            where: { budgetId: b.id },
                            select: { costCenterId: true },
                        }).then((items) => ({ ...b, items }))
                    )
                );
                const allowedBudgets = await filterBudgetsPendingForUser(req.prisma, userId, budgetItems);
                items.push(
                    ...allowedBudgets.map((b) => ({
                        id: b.id,
                        type: 'budget',
                        title: b.name,
                        subtitle: b.fiscalYear ? `Exercício ${b.fiscalYear.year}` : 'Orçamento',
                        value: Number(b.totalOpex || 0) + Number(b.totalCapex || 0),
                        requestedBy: null,
                        createdAt: b.createdAt,
                    }))
                );
            }

            // Ordenar por data
            items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return res.json(items);
        } catch (error) {
            logger.error('Erro ao buscar pendências:', error);
            return res.status(500).json({ message: 'Erro ao buscar pendências', error: error.message });
        }
    }


    // Obter detalhes de um item para aprovação
    static async getDetail(req, res) {
        const { type, id } = req.params;
        const { userId } = req.user;

        try {
            let item = null;

            // Standardizing detail fetching based on type
            switch (type) {
                case 'expense':
                    item = await req.prisma.expense.findUnique({
                        where: { id },
                        include: {
                            costCenter: true,
                            supplier: true,
                            account: true
                        }
                    });
                    if (item && !(await userCanApproveExpense(req.prisma, userId, item))) {
                        return res.status(403).json({ message: 'Sem permissão para acessar este item' });
                    }
                    break;

                case 'projectCost':
                    item = await req.prisma.projectCost.findUnique({
                        where: { id },
                        include: {
                            project: true,
                            supplier: true,
                            proposal: { include: { supplier: true } }
                        }
                    });
                    if (item && !(await userCanApproveProjectCost(req.prisma, userId, item))) {
                        return res.status(403).json({ message: 'Sem permissão para acessar este item' });
                    }
                    break;

                case 'minute':
                    item = await req.prisma.meetingMinute.findUnique({
                        where: { id },
                        include: {
                            project: true
                        }
                    });
                    if (item && !(await userCanApproveMeetingMinute(req.prisma, userId, item))) {
                        return res.status(403).json({ message: 'Sem permissão para acessar este item' });
                    }
                    break;

                case 'gmud':
                    item = await req.prisma.changeRequest.findUnique({
                        where: { id },
                        include: {
                            requester: { select: { name: true, avatar: true } },
                            affectedServices: true,
                            approvers: true
                        }
                    });
                    if (item) {
                        const isGmudApprover = item.approvers?.some(
                            (a) => a.userId === userId && a.status === 'PENDING'
                        );
                        if (!(await isSuperAdminUser(req.prisma, userId)) && !isGmudApprover) {
                            return res.status(403).json({ message: 'Sem permissão para acessar esta GMUD' });
                        }
                    }
                    break;

                case 'project':
                    item = await req.prisma.project.findUnique({
                        where: { id },
                        include: {
                            manager: { select: { name: true, avatar: true } },
                            costCenter: true,
                            members: { include: { user: { select: { name: true, avatar: true } } } }
                        }
                    });
                    if (
                        item &&
                        item.approvalStatus === 'PENDING_APPROVAL' &&
                        !(await userCanApproveProjectBaseline(req.prisma, userId, item))
                    ) {
                        return res.status(403).json({ message: 'Sem permissão para acessar este item' });
                    }
                    break;

                case 'proposal':
                    item = await req.prisma.projectProposal.findUnique({
                        where: { id },
                        include: {
                            project: true,
                            supplier: true
                        }
                    });
                    if (item && !(await userCanApproveProposal(req.prisma, userId, item))) {
                        return res.status(403).json({ message: 'Sem permissão para acessar este item' });
                    }
                    break;

                case 'budget': {
                    const BudgetRepository = require('../repositories/budget.repository');
                    item = await BudgetRepository.findById(req.prisma, id);
                    if (item && item.status !== 'PENDING_APPROVAL') {
                        return res.status(400).json({ message: 'Orçamento não está aguardando aprovação' });
                    }
                    if (item && !(await userCanApproveBudget(req.prisma, userId, item))) {
                        return res.status(403).json({ message: 'Sem permissão para acessar este item' });
                    }
                    break;
                }

                default:
                    return res.status(400).json({ message: 'Tipo inválido' });
            }

            if (!item) {
                return res.status(404).json({ message: 'Item não encontrado' });
            }

            return res.json(item);
        } catch (error) {
            logger.error('Erro ao buscar detalhes do item:', error);
            return res.status(500).json({ message: 'Erro ao buscar detalhes', error: error.message });
        }
    }

    // Aprovar item
    static async approve(req, res) {
        const { type, id } = req.params;
        const { userId } = req.user;

        try {
            let result;

            switch (type) {
                case 'expense': {
                    const expApprove = await req.prisma.expense.findUnique({ where: { id } });
                    if (!expApprove) return res.status(404).json({ message: 'Despesa não encontrada' });
                    if (expApprove.status !== 'AGUARDANDO_APROVACAO') {
                        return res.status(400).json({ message: 'Despesa não está aguardando aprovação' });
                    }
                    if (!(await userCanApproveExpense(req.prisma, userId, expApprove))) {
                        return res.status(403).json({ message: 'Sem permissão para aprovar esta despesa' });
                    }
                    result = await req.prisma.expense.update({
                        where: { id },
                        data: {
                            status: 'APROVADO',
                            approvedBy: userId,
                            approvedAt: new Date()
                        }
                    });
                    break;
                }

                case 'projectCost': {
                    const costApprove = await req.prisma.projectCost.findUnique({ where: { id } });
                    if (!costApprove) return res.status(404).json({ message: 'Custo não encontrado' });
                    if (costApprove.status !== 'AGUARDANDO_APROVACAO') {
                        return res.status(400).json({ message: 'Custo não está aguardando aprovação' });
                    }
                    if (!(await userCanApproveProjectCost(req.prisma, userId, costApprove))) {
                        return res.status(403).json({ message: 'Sem permissão para aprovar este custo' });
                    }
                    result = await req.prisma.projectCost.update({
                        where: { id },
                        data: {
                            status: 'REALIZADO',
                            paymentDate: new Date(),
                            approvedBy: userId,
                            approvedAt: new Date()
                        }
                    });
                    // Atualizar custo realizado do projeto
                    const cost = await req.prisma.projectCost.findUnique({ where: { id } });
                    if (cost) {
                        const totalResult = await req.prisma.projectCost.aggregate({
                            where: { projectId: cost.projectId, status: 'REALIZADO' },
                            _sum: { amount: true }
                        });
                        await req.prisma.project.update({
                            where: { id: cost.projectId },
                            data: { actualCost: totalResult._sum.amount || 0 }
                        });
                    }
                    break;
                }

                case 'minute': {
                    const minAp = await req.prisma.meetingMinute.findUnique({ where: { id } });
                    if (!minAp) return res.status(404).json({ message: 'Ata não encontrada' });
                    if (minAp.status !== 'PENDING') {
                        return res.status(400).json({ message: 'Ata não está aguardando aprovação' });
                    }
                    if (!(await userCanApproveMeetingMinute(req.prisma, userId, minAp))) {
                        return res.status(403).json({ message: 'Sem permissão para aprovar esta ata' });
                    }
                    result = await req.prisma.meetingMinute.update({
                        where: { id },
                        data: {
                            status: 'APPROVED',
                            approvedBy: userId,
                            approvedAt: new Date()
                        }
                    });
                    break;
                }

                case 'gmud':
                    // CORRIGIDO: Usar ChangeRequestService para o workflow de aprovação correto
                    result = await ChangeRequestService.reviewChange(req.prisma, id, userId, {
                        status: 'APPROVED',
                        comment: 'Aprovado via Minhas Aprovações'
                    });

                    // Retornar objeto atualizado para consistência
                    const updatedGmudApprove = await req.prisma.changeRequest.findUnique({ where: { id } });
                    result = updatedGmudApprove;
                    break;

                case 'project':
                    result = await ProjectService.approveProject(req.prisma, id, userId, 'Aprovado via Minhas Aprovações');
                    break;

                case 'proposal': {
                    const propAp = await req.prisma.projectProposal.findUnique({ where: { id } });
                    if (!propAp) return res.status(404).json({ message: 'Proposta não encontrada' });
                    if (propAp.status !== 'AGUARDANDO_APROVACAO') {
                        return res.status(400).json({ message: 'Proposta não está aguardando aprovação' });
                    }
                    if (!(await userCanApproveProposal(req.prisma, userId, propAp))) {
                        return res.status(403).json({ message: 'Sem permissão para aprovar esta proposta' });
                    }
                    if (propAp.projectId) {
                        await req.prisma.projectProposal.updateMany({
                            where: { projectId: propAp.projectId },
                            data: { isWinner: false },
                        });
                    }
                    result = await req.prisma.projectProposal.update({
                        where: { id },
                        data: {
                            status: 'APROVADA',
                            isWinner: true,
                        },
                    });
                    break;
                }

                case 'budget': {
                    result = await BudgetService.approve(req.prisma, id, userId);
                    break;
                }

                default:
                    return res.status(400).json({ message: 'Tipo inválido' });
            }

            // Log de auditoria (módulos que já registram audit próprio)
            if (!['project', 'gmud', 'budget'].includes(type)) {
                await req.prisma.auditLog.create({
                    data: {
                        userId,
                        action: `aprovou ${type}`,
                        module: 'APPROVALS',
                        entityId: id,
                        entityType: type.toUpperCase()
                    }
                });
            }

            return res.json({ message: 'Aprovado com sucesso', result });
        } catch (error) {
            logger.error('Erro ao aprovar:', error);
            if (error.statusCode) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            return res.status(500).json({ message: 'Erro ao aprovar item', error: error.message });
        }
    }

    // Rejeitar item
    static async reject(req, res) {
        const { type, id } = req.params;
        const { userId } = req.user;
        const { reason, requiresAdjustment } = req.body;

        try {
            let result;
            const rejectNote = reason ? `Rejeitado: ${reason}` : 'Rejeitado';

            switch (type) {
                case 'expense': {
                    const expReject = await req.prisma.expense.findUnique({ where: { id } });
                    if (!expReject) return res.status(404).json({ message: 'Despesa não encontrada' });
                    if (expReject.status !== 'AGUARDANDO_APROVACAO') {
                        return res.status(400).json({ message: 'Despesa não está aguardando aprovação' });
                    }
                    if (!(await userCanApproveExpense(req.prisma, userId, expReject))) {
                        return res.status(403).json({ message: 'Sem permissão para rejeitar esta despesa' });
                    }
                    result = await req.prisma.expense.update({
                        where: { id },
                        data: { status: 'REJEITADO', notes: rejectNote }
                    });
                    break;
                }

                case 'projectCost': {
                    const costReject = await req.prisma.projectCost.findUnique({ where: { id } });
                    if (!costReject) return res.status(404).json({ message: 'Custo não encontrado' });
                    if (costReject.status !== 'AGUARDANDO_APROVACAO') {
                        return res.status(400).json({ message: 'Custo não está aguardando aprovação' });
                    }
                    if (!(await userCanApproveProjectCost(req.prisma, userId, costReject))) {
                        return res.status(403).json({ message: 'Sem permissão para rejeitar este custo' });
                    }
                    result = await req.prisma.projectCost.update({
                        where: { id },
                        data: {
                            status: requiresAdjustment ? 'RETURNED' : 'CANCELADO',
                            rejectionReason: reason || null,
                            requiresAdjustment: requiresAdjustment || false,
                            notes: rejectNote
                        }
                    });
                    break;
                }

                case 'minute': {
                    const minRj = await req.prisma.meetingMinute.findUnique({ where: { id } });
                    if (!minRj) return res.status(404).json({ message: 'Ata não encontrada' });
                    if (minRj.status !== 'PENDING') {
                        return res.status(400).json({ message: 'Ata não está aguardando aprovação' });
                    }
                    if (!(await userCanApproveMeetingMinute(req.prisma, userId, minRj))) {
                        return res.status(403).json({ message: 'Sem permissão para rejeitar esta ata' });
                    }
                    result = await req.prisma.meetingMinute.update({
                        where: { id },
                        data: {
                            status: requiresAdjustment ? 'RETURNED' : 'REJECTED',
                            rejectionReason: reason || null,
                            requiresAdjustment: requiresAdjustment || false,
                        },
                    });
                    break;
                }

                case 'gmud':
                    // CORRIGIDO: Usar ChangeRequestService para workflow de revisão
                    const status = requiresAdjustment ? 'REVISION_REQUESTED' : 'REJECTED';
                    result = await ChangeRequestService.reviewChange(req.prisma, id, userId, {
                        status: status,
                        comment: rejectNote
                    });

                    const updatedGmudReject = await req.prisma.changeRequest.findUnique({ where: { id } });
                    result = updatedGmudReject;
                    break;

                case 'project':
                    result = await ProjectService.rejectProject(req.prisma, id, userId, reason, requiresAdjustment === true);
                    break;

                case 'proposal': {
                    const propRj = await req.prisma.projectProposal.findUnique({ where: { id } });
                    if (!propRj) return res.status(404).json({ message: 'Proposta não encontrada' });
                    if (propRj.status !== 'AGUARDANDO_APROVACAO') {
                        return res.status(400).json({ message: 'Proposta não está aguardando aprovação' });
                    }
                    if (!(await userCanApproveProposal(req.prisma, userId, propRj))) {
                        return res.status(403).json({ message: 'Sem permissão para rejeitar esta proposta' });
                    }
                    result = await req.prisma.projectProposal.update({
                        where: { id },
                        data: {
                            status: requiresAdjustment ? 'DEVOLVIDA' : 'REJEITADA',
                            rejectionReason: reason || null,
                            isWinner: false,
                        },
                    });
                    break;
                }

                case 'budget': {
                    const BudgetRepository = require('../repositories/budget.repository');
                    const budRj = await BudgetRepository.findById(req.prisma, id);
                    if (!budRj) return res.status(404).json({ message: 'Orçamento não encontrado' });
                    if (budRj.status !== 'PENDING_APPROVAL') {
                        return res.status(400).json({ message: 'Orçamento não está aguardando aprovação' });
                    }
                    if (!(await userCanApproveBudget(req.prisma, userId, budRj))) {
                        return res.status(403).json({ message: 'Sem permissão para rejeitar este orçamento' });
                    }
                    result = await BudgetRepository.update(req.prisma, id, {
                        status: 'DRAFT',
                        notes: budRj.notes ? `${budRj.notes}\n\n${rejectNote}` : rejectNote,
                    });
                    break;
                }

                default:
                    return res.status(400).json({ message: 'Tipo inválido' });
            }

            // Log de auditoria
            if (!['project', 'gmud', 'budget'].includes(type)) {
                await req.prisma.auditLog.create({
                    data: {
                        userId,
                        action: `rejeitou ${type}`,
                        module: 'APPROVALS',
                        entityId: id,
                        entityType: type.toUpperCase(),
                        newData: { reason }
                    }
                });
            }

            return res.json({ message: 'Rejeitado', result });
        } catch (error) {
            logger.error('Erro ao rejeitar:', error);
            if (error.statusCode) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            return res.status(500).json({ message: 'Erro ao rejeitar item', error: error.message });
        }
    }

    // Histórico
    static async getHistory(req, res) {
        const { userId } = req.user;
        const { limit = 50 } = req.query;

        try {
            const history = await req.prisma.auditLog.findMany({
                where: {
                    userId,
                    module: { in: ['APPROVALS', 'APROVACOES'] }
                },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                include: {
                    user: { select: { name: true, avatar: true } }
                }
            });

            return res.json(history);
        } catch (error) {
            logger.error('Erro ao buscar histórico:', error);
            return res.status(500).json({ message: 'Erro ao buscar histórico', error: error.message });
        }
    }
}

module.exports = ApprovalController;
