const DashboardRepository = require('../repositories/dashboard.repository');
const { getUserAccessScope, getAccessibleUserIds } = require('../utils/access-scope');

class DashboardService {
  static async getFinancialSummary(prisma, year) {
    // 1. Definir o range de datas do ano solicitado
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    // 2. Buscar Total ORÇADO (Budgets) para o ano
    // Precisamos encontrar o Ano Fiscal primeiro, ou filtrar orçamentos pelos anos fiscais desse ano
    // Vamos simplificar somando orçamentos cujo ano fiscal corresponde ao ano solicitado
    const budgets = await prisma.budget.findMany({
      where: {
        fiscalYear: { year: parseInt(year) }
      }
    });

    const totalBudgetOpex = budgets.reduce((acc, b) => acc + Number(b.totalOpex), 0);
    const totalBudgetCapex = budgets.reduce((acc, b) => acc + Number(b.totalCapex), 0);

    // 3. Buscar Total REALIZADO (Expenses) para o ano
    const expenses = await prisma.expense.groupBy({
      by: ['type'],
      where: {
        date: { gte: startDate, lte: endDate },
        status: { not: 'CANCELADO' } // Ignorar despesas canceladas se houver esse status
      },
      _sum: { amount: true }
    });

    // Processar o resultado do groupBy
    let totalRealizedOpex = 0;
    let totalRealizedCapex = 0;

    expenses.forEach(item => {
      const amount = Number(item._sum.amount || 0);
      if (item.type === 'CAPEX') totalRealizedCapex += amount;
      else totalRealizedOpex += amount; // Assume OPEX
    });

    // 4. Buscar Gastos por Centro de Custo (Top 5)
    const expensesByCostCenter = await prisma.expense.groupBy({
      by: ['costCenterId'],
      where: {
        date: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5
    });

    // Enriquecer com os nomes dos centros de custo
    const topCostCenters = await Promise.all(expensesByCostCenter.map(async (item) => {
      const cc = await prisma.costCenter.findUnique({
        where: { id: item.costCenterId },
        select: { name: true }
      });
      return {
        name: cc?.name || 'Desconhecido',
        amount: Number(item._sum.amount)
      };
    }));

    return {
      year: parseInt(year),
      opex: {
        budgeted: totalBudgetOpex,
        realized: totalRealizedOpex,
        remaining: totalBudgetOpex - totalRealizedOpex,
        percentUsed: totalBudgetOpex > 0 ? (totalRealizedOpex / totalBudgetOpex) * 100 : 0
      },
      capex: {
        budgeted: totalBudgetCapex,
        realized: totalRealizedCapex,
        remaining: totalBudgetCapex - totalRealizedCapex,
        percentUsed: totalBudgetCapex > 0 ? (totalRealizedCapex / totalBudgetCapex) * 100 : 0
      },
      topCostCenters
    };
  }

  static async getSuperAdminStats(prisma) {
    const repo = DashboardRepository;

    const [totalUsers, activeUsers, totalProjects, activeProjects, completedProjects, totalTasks, openTasks, totalIncidents, totalChangeRequests, totalAssets, totalContracts] = await Promise.all([
      repo.countUsers(prisma),
      repo.countUsers(prisma, { isActive: true }),
      repo.countProjects(prisma),
      repo.countProjects(prisma, { status: 'ACTIVE' }),
      repo.countProjects(prisma, { status: 'COMPLETED' }),
      repo.countTasks(prisma),
      repo.countTasks(prisma, { status: { in: ['TODO', 'IN_PROGRESS'] } }),
      repo.countIncidents(prisma),
      repo.countChangeRequests(prisma),
      repo.countAssets(prisma),
      repo.countContracts(prisma),
    ]);

    let overdueTasks = 0;
    try { overdueTasks = await repo.countTasks(prisma, { status: { not: 'DONE' }, endDate: { lt: new Date() } }); } catch (_) { }

    let totalRisks = 0, criticalRisks = 0;
    try { totalRisks = await prisma.risk.count(); criticalRisks = await prisma.risk.count({ where: { severity: 'CRITICAL' } }); } catch (_) { }

    let totalDepartments = 0, totalCostCenters = 0;
    try { totalDepartments = await prisma.department.count(); totalCostCenters = await prisma.costCenter.count(); } catch (_) { }

    const [recentProjects, recentIncidents] = await Promise.all([
      repo.findRecentProjects(prisma, {}, 5),
      repo.findRecentIncidents(prisma, {}, 5),
    ]);

    let totalBudget = 0, totalExpenses = 0;
    try {
      const budgetAgg = await repo.sumBudgetItems(prisma);
      const sums = budgetAgg._sum || {};
      totalBudget = Object.values(sums).reduce((a, v) => a + (Number(v) || 0), 0);
      const expenseAgg = await repo.sumBudgetExpenses(prisma);
      totalExpenses = Number(expenseAgg._sum?.amount) || 0;
    } catch (_) { }

    return {
      users: { total: totalUsers, active: activeUsers },
      projects: { total: totalProjects, active: activeProjects, completed: completedProjects },
      tasks: { total: totalTasks, open: openTasks, overdue: overdueTasks },
      incidents: { total: totalIncidents },
      changeRequests: { total: totalChangeRequests },
      assets: { total: totalAssets },
      contracts: { total: totalContracts },
      risks: { total: totalRisks, critical: criticalRisks },
      departments: totalDepartments,
      costCenters: totalCostCenters,
      financial: { budget: totalBudget, expenses: totalExpenses },
      recentProjects,
      recentIncidents,
    };
  }

  static async getCollaboratorStats(prisma, userId) {
    // 1. KPIs
    const projectCount = await prisma.project.count({
      where: {
        OR: [{ managerId: userId }, { members: { some: { userId: userId } } }],
        status: { not: 'CANCELLED' }
      }
    });

    const taskCount = await prisma.task.count({
      where: {
        assigneeId: userId,
        status: { notIn: ['DONE', 'CANCELLED'] }
      }
    });

    const gmudCount = await prisma.changeRequest.count({
      where: {
        requesterId: userId, // Correct field name
        status: { not: 'CANCELLED' }
      }
    });

    // 2. My Tasks
    const myTasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { notIn: ['DONE', 'CANCELLED'] }
      },
      include: {
        // project: { select: { name: true } } // Task entity does not have direct project relation
      },
      orderBy: [
        { dueDate: 'asc' },
        { priority: 'desc' }
      ],
      take: 5
    });

    // 3. My Projects
    const myProjects = await prisma.project.findMany({
      where: {
        OR: [{ managerId: userId }, { members: { some: { userId: userId } } }],
        status: { not: 'CANCELLED' }
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
        _count: {
          select: { tasks: true }
        },
        tasks: {
          where: { status: 'DONE' },
          select: { id: true }
        }
      },
      take: 3
    });

    const projectsWithProgress = myProjects.map(p => {
      const total = p._count.tasks;
      const completed = p.tasks.length;
      return {
        ...p,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        totalTasks: total,
        completedTasks: completed
      };
    });

    // 4. Upcoming Deadlines
    const upcomingGmuds = await prisma.changeRequest.findMany({
      where: {
        requesterId: userId, // Correct field
        scheduledStart: { gte: new Date() }
      },
      orderBy: { scheduledStart: 'asc' },
      take: 3
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Overdue tasks
    const overdueCount = await prisma.task.count({
      where: { assigneeId: userId, status: { notIn: ['DONE', 'CANCELLED'] }, dueDate: { lt: now } }
    });

    // Completed this month
    const completedThisMonth = await prisma.task.count({
      where: { assigneeId: userId, status: 'DONE', updatedAt: { gte: startOfMonth } }
    });

    // My pending approvals (expenses I submitted, awaiting approval)
    const pendingApprovalCount = await prisma.expense.count({
      where: { submittedById: userId, status: 'AGUARDANDO_APROVACAO' }
    }).catch(() => 0);

    return {
      kpis: {
        projects: projectCount,
        tasks: taskCount,
        gmuds: gmudCount,
        overdueCount,
        completedThisMonth,
        pendingApprovalCount,
      },
      myTasks,
      myProjects: projectsWithProgress,
      upcomingGmuds
    };
  }

  static async getManagerStats(prisma, user) {
    const userId = user.id;
    const scope = await getUserAccessScope(prisma, userId);
    const costCenterIds = scope.accessibleCostCenterIds && scope.accessibleCostCenterIds.length > 0
      ? scope.accessibleCostCenterIds
      : ['__NO_ACCESS__'];

    const projectCount = await prisma.project.count({
      where: {
        status: { not: 'CANCELLED' },
        OR: [
          { costCenterId: { in: costCenterIds } },
          { managerId: userId },
          { techLeadId: userId },
          { creatorId: userId },
          { members: { some: { userId } } }
        ]
      }
    });

    const taskCount = await prisma.task.count({
      where: {
        status: { notIn: ['DONE', 'CANCELLED'] },
        OR: [
          { assignee: { costCenterId: { in: costCenterIds } } },
          { creator: { costCenterId: { in: costCenterIds } } }
        ]
      }
    });

    const gmudFilter = {
      status: 'PENDING_APPROVAL',
      approvers: {
        some: {
          userId: userId,
          status: 'PENDING'
        }
      }
    };

    const gmudCount = await prisma.changeRequest.count({ where: gmudFilter });

    const assetCount = await prisma.asset.count({ where: { costCenterId: { in: costCenterIds } } });

    const contractCount = await prisma.contract.count({
      where: {
        status: 'ACTIVE',
        OR: [
          { responsibleId: userId },
          { costCenterId: { in: costCenterIds } }
        ]
      }
    });

    // === Finance Logic (Scoped) ===
    const currentYear = new Date().getFullYear();
    const fiscalYear = await prisma.fiscalYear.findUnique({
      where: { year: currentYear }
    });

    let totalBudget = 0;
    const budgetStatusFilter = { status: 'APPROVED' };
    if (fiscalYear) {
      const budgetResult = await prisma.budgetItem.aggregate({
        where: {
          budget: { fiscalYearId: fiscalYear.id, ...budgetStatusFilter },
          costCenterId: { in: costCenterIds }
        },
        _sum: { total: true }
      });
      totalBudget = Number(budgetResult._sum.total || 0);
    }

    const startOfYear = new Date(`${currentYear}-01-01`);
    const endOfYear = new Date(`${currentYear}-12-31T23:59:59.999Z`);

    const expenses = await prisma.expense.aggregate({
      where: {
        type: 'OPEX',
        date: { gte: startOfYear, lte: endOfYear },
        costCenterId: { in: costCenterIds }
      },
      _sum: { amount: true }
    });

    // Pending Approvals (Assigned to Me)
    const pendingGmuds = await prisma.changeRequest.findMany({
      where: gmudFilter,
      include: { requester: { select: { name: true } } },
      take: 5
    });

    // Pending Expenses (Managed Cost Centers)
    const pendingExpenses = await prisma.expense.findMany({
      where: {
        status: 'AGUARDANDO_APROVACAO',
        costCenterId: { in: costCenterIds }
      },
      include: {
        costCenter: { select: { name: true } },
        supplier: { select: { name: true } }
      },
      take: 5,
      orderBy: { date: 'asc' }
    });

    // Pending Meeting Minutes (Projects in Managed Cost Centers)
    const pendingMinutes = await prisma.meetingMinute.findMany({
      where: {
        status: 'PENDING',
        project: {
          costCenterId: { in: costCenterIds }
        }
      },
      include: {
        project: { select: { name: true } }
      },
      take: 5,
      orderBy: { date: 'desc' }
    });

    const pendingApprovals = [
      ...pendingGmuds.map(g => ({
        type: 'GMUD',
        id: g.id,
        code: g.code,
        title: g.title,
        requester: g.requester?.name || 'Sistema',
        date: g.createdAt,
        status: 'PENDING_APPROVAL'
      })),
      ...pendingExpenses.map(e => ({
        type: 'EXPENSE',
        id: e.id,
        code: 'DESP',
        title: `${e.description} - ${Number(e.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
        requester: e.supplier?.name || 'Fornecedor',
        date: e.date,
        status: 'PREVISTO'
      })),
      ...pendingMinutes.map(m => ({
        type: 'MINUTE',
        id: m.id,
        projectId: m.projectId,
        code: `ATA-${String(m.id).slice(-3).padStart(3, '0')}`,
        title: m.title,
        requester: m.project?.name || 'Projeto',
        date: m.date,
        status: 'PENDING'
      }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 10);

    // Expiring Contracts (Scoped)
    const expiringDateFilter = {
      endDate: {
        gte: new Date(),
        lte: new Date(new Date().setDate(new Date().getDate() + 30))
      }
    };

    const expiringContracts = await prisma.contract.findMany({
      where: { status: 'ACTIVE', costCenterId: { in: costCenterIds }, ...expiringDateFilter },
      take: 5
    });

    // Recent Activity (Scoped)
    const accessibleUserIds = await getAccessibleUserIds(prisma, userId, scope) || [];
    const logs = await prisma.auditLog.findMany({
      where: {
        userId: { in: accessibleUserIds.length > 0 ? accessibleUserIds : ['__NO_ACCESS__'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { name: true } }
      }
    });

    const activities = logs.map(log => {
      let type = 'TASK';
      let moduleLower = log.module ? log.module.toLowerCase() : '';

      if (moduleLower.includes('projeto')) type = 'PROJECT';
      else if (moduleLower.includes('gmud') || moduleLower.includes('mudanca')) type = 'GMUD';
      else if (moduleLower.includes('contrato')) type = 'CONTRACT';
      else if (moduleLower.includes('tarefa') || moduleLower.includes('task')) type = 'TASK';
      else if (moduleLower.includes('despesa') || moduleLower.includes('expense')) type = 'EXPENSE';
      else if (moduleLower.includes('aprovacao') || moduleLower.includes('approval')) type = 'APPROVAL';
      else if (moduleLower.includes('login')) type = 'LOGIN';

      let highlight = log.module;
      if (log.newData && typeof log.newData === 'object') {
        const data = log.newData;
        if (data.code) highlight = data.code;
        else if (data.number) highlight = data.number;
        else if (data.title) highlight = data.title;
        else if (data.name) highlight = data.name;
      } else if (log.oldData && typeof log.oldData === 'object') {
        const data = log.oldData;
        if (data.code) highlight = data.code;
        else if (data.number) highlight = data.number;
        else if (data.title) highlight = data.title;
        else if (data.name) highlight = data.name;
      }

      return {
        type,
        id: log.entityId,
        date: log.createdAt,
        text: log.action,
        user: log.user?.name || 'Usuario',
        highlight: highlight
      };
    });

    // Team Health: tasks per team member in scoped cost centers
    let teamHealth = [];
    try {
      const teamMembers = await prisma.user.findMany({
        where: { costCenterId: { in: costCenterIds }, isActive: true },
        select: { id: true, name: true, avatar: true },
        take: 10
      });
      teamHealth = await Promise.all(teamMembers.map(async (member) => {
        const [open, overdue] = await Promise.all([
          prisma.task.count({ where: { assigneeId: member.id, status: { notIn: ['DONE', 'CANCELLED'] } } }),
          prisma.task.count({ where: { assigneeId: member.id, status: { notIn: ['DONE', 'CANCELLED'] }, dueDate: { lt: new Date() } } }),
        ]);
        return { ...member, openTasks: open, overdueTasks: overdue };
      }));
    } catch (_) { }

    const overdueTeamTasks = teamHealth.reduce((acc, m) => acc + m.overdueTasks, 0);

    return {
      kpis: {
        projects: projectCount,
        tasks: taskCount,
        gmuds: gmudCount,
        assets: assetCount,
        contracts: contractCount,
        finance: {
          spent: Number(expenses._sum.amount || 0),
          budget: totalBudget
        },
        overdueTeamTasks,
      },
      pendingApprovals,
      expiringContracts,
      activities,
      teamHealth,
    };
  }
}

module.exports = DashboardService;
