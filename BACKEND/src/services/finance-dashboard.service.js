const { getUserAccessScope, getScopedCostCenterIds, getAccessibleUserIds } = require('../utils/access-scope');

// === CONSTANTES REUTILIZÁVEIS ===
const REALIZED_STATUSES = ['APROVADO', 'PAGO'];

const buildDateRange = (year) => ({
  gte: new Date(`${year}-01-01`),
  lte: new Date(`${year}-12-31T23:59:59`)
});

const buildExpenseWhere = (year, filters) => ({
  status: { in: REALIZED_STATUSES },
  date: buildDateRange(year),
  ...(filters.accountId && { accountId: filters.accountId }),
  ...(filters.costCenterId && { costCenterId: filters.costCenterId }),
  ...(filters.costCenterIds && { costCenterId: { in: filters.costCenterIds } }),
  ...(filters.supplierId && { supplierId: filters.supplierId })
});

const buildBudgetItemWhere = (year, filters) => ({
  budget: { fiscalYear: { year }, status: 'APPROVED' },
  ...(filters.accountId && { accountId: filters.accountId }),
  ...(filters.costCenterId && { costCenterId: filters.costCenterId }),
  ...(filters.costCenterIds && { costCenterId: { in: filters.costCenterIds } }),
  ...(filters.supplierId && { supplierId: filters.supplierId })
});

const applyCostCenterScope = async (prisma, filters, userId) => {
  if (!userId) return { filters };
  const scope = await getUserAccessScope(prisma, userId);
  if (scope.isAdmin) return { filters, scope };

  const allowedCostCenters = getScopedCostCenterIds(scope) || [];
  if (filters.costCenterId) {
    if (!allowedCostCenters.includes(filters.costCenterId)) {
      throw { statusCode: 403, message: 'Acesso negado.' };
    }
    return {
      filters: { ...filters, costCenterIds: [filters.costCenterId] },
      scope
    };
  }

  return {
    filters: { ...filters, costCenterIds: allowedCostCenters },
    scope
  };
};

class FinanceDashboardService {

  static async getBudgetOverview(prisma, year, filters = {}, userId) {
    const scoped = await applyCostCenterScope(prisma, filters, userId);
    filters = scoped.filters;
    const fiscalYear = await prisma.fiscalYear.findFirst({ where: { year: year } });
    if (!fiscalYear) return { totalBudget: 0, totalSpent: 0, available: 0, consumption: 0 };

    // Construir filtro para BudgetItems - SOMENTE ORÇAMENTOS APROVADOS
    const budgetItemWhere = { budget: { fiscalYearId: fiscalYear.id, status: 'APPROVED' } };
    if (filters.accountId) budgetItemWhere.accountId = filters.accountId;
    if (filters.costCenterId) budgetItemWhere.costCenterId = filters.costCenterId;
    if (filters.costCenterIds) budgetItemWhere.costCenterId = { in: filters.costCenterIds };
    if (filters.supplierId) budgetItemWhere.supplierId = filters.supplierId;

    const budgetItems = await prisma.budgetItem.findMany({ where: budgetItemWhere });

    let totalBudget = 0;
    budgetItems.forEach(item => totalBudget += Number(item.total));

    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31T23:59:59`);

    // Construir filtro para Expenses
    const expenseWhere = {
      status: { in: ['APROVADO', 'PAGO'] }, // STRICT REALIZED LOGIC
      date: { gte: startOfYear, lte: endOfYear }
    };
    if (filters.accountId) expenseWhere.accountId = filters.accountId;
    if (filters.costCenterId) expenseWhere.costCenterId = filters.costCenterId;
    if (filters.costCenterIds) expenseWhere.costCenterId = { in: filters.costCenterIds };
    if (filters.supplierId) expenseWhere.supplierId = filters.supplierId;

    const expenses = await prisma.expense.aggregate({
      where: expenseWhere,
      _sum: { amount: true }
    });

    const totalSpent = Number(expenses._sum.amount || 0);

    // Calcular Unplanned Spent (Inclui Pendentes como risco)
    const unplannedExpenses = await prisma.expense.aggregate({
      where: {
        ...expenseWhere,
        status: { in: ['APROVADO', 'PAGO', 'AGUARDANDO_APROVACAO'] },
        approvalStatus: 'UNPLANNED'
      },
      _sum: { amount: true }
    });
    const unplannedSpent = Number(unplannedExpenses._sum.amount || 0);

    const budgetRecord = await prisma.budget.findFirst({ where: { fiscalYearId: fiscalYear.id, status: 'APPROVED' } });
    const budgetStatus = budgetRecord ? 'APPROVED' : 'SEM_ORCAMENTO_APROVADO';

    return {
      year,
      totalBudget,
      totalSpent,
      unplannedSpent, // New Field
      available: totalBudget - totalSpent,
      consumption: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      budgetStatus
    };
  }

  static async getMonthlyEvolution(prisma, year, filters = {}, userId) {
    const scoped = await applyCostCenterScope(prisma, filters, userId);
    filters = scoped.filters;
    const fiscalYear = await prisma.fiscalYear.findFirst({ where: { year } });
    if (!fiscalYear) return {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      planned: [],
      actual: []
    };

    // 1. Orçado - SOMENTE ORÇAMENTOS APROVADOS
    const budgetItemWhere = { budget: { fiscalYearId: fiscalYear.id, status: 'APPROVED' } };
    if (filters.accountId) budgetItemWhere.accountId = filters.accountId;
    if (filters.costCenterId) budgetItemWhere.costCenterId = filters.costCenterId;
    if (filters.costCenterIds) budgetItemWhere.costCenterId = { in: filters.costCenterIds };
    if (filters.supplierId) budgetItemWhere.supplierId = filters.supplierId;

    const budgetItems = await prisma.budgetItem.findMany({ where: budgetItemWhere });

    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthlyPlanned = Array(12).fill(0);

    budgetItems.forEach(item => {
      months.forEach((m, index) => {
        monthlyPlanned[index] += Number(item[m] || 0);
      });
    });

    // 2. Realizado
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31T23:59:59`);

    const expenseWhere = {
      status: { in: ['APROVADO', 'PAGO'] }, // STRICT REALIZED LOGIC
      date: { gte: startOfYear, lte: endOfYear }
    };
    if (filters.accountId) expenseWhere.accountId = filters.accountId;
    if (filters.costCenterId) expenseWhere.costCenterId = filters.costCenterId;
    if (filters.costCenterIds) expenseWhere.costCenterId = { in: filters.costCenterIds };
    if (filters.supplierId) expenseWhere.supplierId = filters.supplierId;

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      select: { date: true, amount: true }
    });

    const monthlyActual = Array(12).fill(0);
    expenses.forEach(exp => {
      const monthIndex = new Date(exp.date).getMonth();
      monthlyActual[monthIndex] += Number(exp.amount);
    });

    return {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      planned: monthlyPlanned,
      actual: monthlyActual
    };
  }

  static async getCostCenterPerformance(prisma, year, filters = {}, userId) {
    const scoped = await applyCostCenterScope(prisma, filters, userId);
    filters = scoped.filters;
    // === OTIMIZADO: Usa groupBy ao invés de N queries ===

    // 1. Buscar todos os CCs ativos (para ter nome/código)
    const ccWhere = { isActive: true };
    if (filters.costCenterId) ccWhere.id = filters.costCenterId;
    if (filters.costCenterIds) ccWhere.id = { in: filters.costCenterIds };
    const costCenters = await prisma.costCenter.findMany({
      where: ccWhere,
      select: { id: true, name: true, code: true }
    });
    const ccMap = new Map(costCenters.map(cc => [cc.id, cc]));

    // 2. Orçado por CC (1 query agregada)
    const budgetSums = await prisma.budgetItem.groupBy({
      by: ['costCenterId'],
      where: buildBudgetItemWhere(year, filters),
      _sum: { total: true }
    });
    const budgetMap = new Map(budgetSums.map(b => [b.costCenterId, Number(b._sum.total || 0)]));

    // 3. Realizado por CC (1 query agregada)
    const expenseSums = await prisma.expense.groupBy({
      by: ['costCenterId'],
      where: buildExpenseWhere(year, filters),
      _sum: { amount: true }
    });
    const expenseMap = new Map(expenseSums.map(e => [e.costCenterId, Number(e._sum.amount || 0)]));

    // 4. Combinar resultados
    const result = [];
    for (const [ccId, cc] of ccMap) {
      const planned = budgetMap.get(ccId) || 0;
      const actual = expenseMap.get(ccId) || 0;
      if (planned > 0 || actual > 0) {
        result.push({
          name: cc.name,
          code: cc.code,
          planned,
          actual,
          delta: planned - actual,
          percent: planned > 0 ? (actual / planned) * 100 : 0
        });
      }
    }
    return result.sort((a, b) => b.actual - a.actual);
  }

  static async getAccountPerformance(prisma, year, filters = {}, userId) {
    const scoped = await applyCostCenterScope(prisma, filters, userId);
    filters = scoped.filters;
    // === OTIMIZADO: Usa groupBy ao invés de N queries ===

    // 1. Buscar todas as contas (para ter nome/código)
    const accWhere = {};
    if (filters.accountId) accWhere.id = filters.accountId;
    const accounts = await prisma.accountingAccount.findMany({
      where: accWhere,
      select: { id: true, name: true, code: true }
    });
    const accMap = new Map(accounts.map(acc => [acc.id, acc]));

    // 2. Orçado por Conta (1 query agregada)
    const budgetSums = await prisma.budgetItem.groupBy({
      by: ['accountId'],
      where: buildBudgetItemWhere(year, filters),
      _sum: { total: true }
    });
    const budgetMap = new Map(budgetSums.map(b => [b.accountId, Number(b._sum.total || 0)]));

    // 3. Realizado por Conta (1 query agregada)
    const expenseSums = await prisma.expense.groupBy({
      by: ['accountId'],
      where: buildExpenseWhere(year, filters),
      _sum: { amount: true }
    });
    const expenseMap = new Map(expenseSums.map(e => [e.accountId, Number(e._sum.amount || 0)]));

    // 4. Combinar resultados
    const result = [];
    for (const [accId, acc] of accMap) {
      const planned = budgetMap.get(accId) || 0;
      const actual = expenseMap.get(accId) || 0;
      if (planned > 0 || actual > 0) {
        result.push({
          name: acc.name,
          code: acc.code,
          planned,
          actual,
          delta: planned - actual,
          percent: planned > 0 ? (actual / planned) * 100 : 0
        });
      }
    }
    return result.sort((a, b) => b.actual - a.actual);
  }

  static async getAdvancedStats(prisma, year, filters = {}, userId) {
    const scoped = await applyCostCenterScope(prisma, filters, userId);
    filters = scoped.filters;
    // Determine date range
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31T23:59:59`);

    const baseWhere = {
      date: { gte: startOfYear, lte: endOfYear }
    };

    if (filters.costCenterId) baseWhere.costCenterId = filters.costCenterId;
    if (filters.costCenterIds) baseWhere.costCenterId = { in: filters.costCenterIds };

    // 1. Fetch Expenses (needed for Heatmap, Suppliers, Actuals)
    const expenses = await prisma.expense.findMany({
      where: baseWhere,
      select: {
        date: true,
        amount: true,
        accountId: true, // Need ID for grouping
        account: { select: { name: true, code: true } }, // Need details for heatmap
        costCenter: { select: { id: true, name: true, code: true } },
        supplier: { select: { id: true, name: true } }
      }
    });

    // 2. Fetch Budgets (needed for Scatter/Treemap) - SOMENTE APROVADOS
    // Note: Budget is annual, but items are monthly. We want annual totals per CC.
    const budgets = await prisma.budgetItem.findMany({
      where: {
        budget: { fiscalYear: { year: year }, status: 'APPROVED' },
        ...(filters.costCenterIds ? { costCenterId: { in: filters.costCenterIds } } : {})
      },
      include: { costCenter: true, supplier: true, account: true }
    });

    // --- AGGREGATION LOGIC ---

    // A. Heatmap (Month x Accounting Account) & Account Totals
    const heatmap = {}; // { accId: { id, name, months: [0..11], total: 0 } }

    // Initialize heatmap with budget data to ensure all Accounts with budget are present
    budgets.forEach(b => {
      if (b.account) { // BudgetItem has accountId relation
        const id = b.accountId;
        // Accounting Account might not be included in budget query? Let's check include below
        if (!heatmap[id]) heatmap[id] = { id, name: b.account.name, code: b.account.code, months: Array(12).fill(0), totalActual: 0, totalBudget: 0 };
        heatmap[id].totalBudget += Number(b.total);
      }
    });

    expenses.forEach(exp => {
      // Group by Account
      const month = exp.date.getMonth(); // 0-11
      const id = exp.accountId;
      // We need Account Name/Code. Expense has accountId. 
      // We didn't fetch account relation in expenses query!

      // WAIT. I need to update Expense Query to include Account info.
      // And Budget Query to include Account info.

      if (!heatmap[id] && exp.account) {
        heatmap[id] = { id, name: exp.account.name, code: exp.account.code, months: Array(12).fill(0), totalActual: 0, totalBudget: 0 };
      }

      if (heatmap[id]) {
        heatmap[id].months[month] += Number(exp.amount);
        heatmap[id].totalActual += Number(exp.amount);
      }
    });

    // Convert Heatmap to Arrays
    const heatmapData = Object.values(heatmap).map(h => ({
      ...h,
      months: h.months.map(m => Number(m.toFixed(2)))
    })).sort((a, b) => b.totalActual - a.totalActual); // Sort by highest spenders

    // B. Scatter / Treemap Data
    // We need: Name, Budget (X/Size), Deviation (Y/Color)
    const scatterData = heatmapData.map(h => {
      const budget = h.totalBudget;
      const actual = h.totalActual;
      // Deviation %: (Actual - Budget) / Budget
      // If Budget is 0, Deviation is 100% (or defined max) if Actual > 0
      let deviation = 0;
      if (budget > 0) deviation = ((actual - budget) / budget) * 100;
      else if (actual > 0) deviation = 100;

      return {
        id: h.id,
        name: h.name,
        budget: Number(budget.toFixed(2)),
        actual: Number(actual.toFixed(2)),
        deviation: Number(deviation.toFixed(2))
      };
    }).filter(d => d.budget > 0 || d.actual > 0);

    // C. Top Suppliers
    const supplierMap = {};
    expenses.forEach(exp => {
      if (exp.supplier) {
        const id = exp.supplier.id;
        if (!supplierMap[id]) supplierMap[id] = { id, name: exp.supplier.name, value: 0 };
        supplierMap[id].value += Number(exp.amount);
      }
    });
    const suppliersData = Object.values(supplierMap)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(s => ({ ...s, value: Number(s.value.toFixed(2)) }));




    // E. Supplier Risk (Treemap Data)
    const supRiskMap = {};

    // Fill Budgets
    budgets.forEach(b => {
      if (b.supplier && b.supplierId) {
        const id = b.supplierId;
        if (!supRiskMap[id]) supRiskMap[id] = { id, name: b.supplier.name, budget: 0, actual: 0 };
        supRiskMap[id].budget += Number(b.total);
      }
    });

    // Fill Actuals (from Expenses)
    expenses.forEach(exp => {
      if (exp.supplier && exp.supplierId) {
        const id = exp.supplierId;
        if (!supRiskMap[id]) supRiskMap[id] = { id, name: exp.supplier.name, budget: 0, actual: 0 };
        supRiskMap[id].actual += Number(exp.amount);
      }
    });

    // Calculate Deviation
    const suppliersRisk = Object.values(supRiskMap).map(s => {
      const budget = s.budget;
      const actual = s.actual;
      let deviation = 0;
      if (budget > 0) deviation = ((actual - budget) / budget) * 100;
      else if (actual > 0) deviation = 100;

      return {
        id: s.id,
        name: s.name,
        budget: Number(budget.toFixed(2)),
        actual: Number(actual.toFixed(2)),
        deviation: Number(deviation.toFixed(2))
      };
    }).filter(d => d.budget > 0 || d.actual > 0).sort((a, b) => b.budget - a.budget);

    // D. Sankey Data
    // Nodes: [0: "Orçamento Total", 1..N: Top CCs, N+1: Others]
    // Links: Source 0 -> Target i (Value = Budget or Actual? Plan said Budget flow, but usually actual flow is interesting. Let's use Actual for "Flow of Money Spent")
    // Re-reading Plan: "Fluxo (Orçamento Total -> ...)" -> OK, let's use Budget to show how money is distributed.

    // Sort scatterData by Budget for Sankey
    const sortedByBudget = [...scatterData].sort((a, b) => b.budget - a.budget);
    const top5Budget = sortedByBudget.slice(0, 5);
    const othersBudget = sortedByBudget.slice(5).reduce((sum, item) => sum + item.budget, 0);
    const totalBudget = sortedByBudget.reduce((sum, item) => sum + item.budget, 0);

    const sankeyNodes = [{ name: 'Orçamento Total' }];
    const sankeyLinks = [];

    // Add Top 5 Nodes & Links
    top5Budget.forEach(cc => {
      sankeyNodes.push({ name: cc.name });
      // Source is 0
      sankeyLinks.push({ source: 0, target: sankeyNodes.length - 1, value: cc.budget });
    });

    // Add "Others" Node
    if (othersBudget > 0) {
      sankeyNodes.push({ name: 'Outros' });
      sankeyLinks.push({ source: 0, target: sankeyNodes.length - 1, value: othersBudget });
    }

    return {
      heatmap: heatmapData, // For Heatmap (contains months)
      scatter: scatterData, // For Scatter (matriz risco)
      suppliers: suppliersData, // For Top Suppliers
      suppliersRisk: suppliersRisk, // For Treemap (Risk Hierarchy Supplier)
      sankey: { nodes: sankeyNodes, links: sankeyLinks, total: totalBudget }
    };
  }

  static async getInsights(prisma, year, filters = {}, userId) {
    const scoped = await applyCostCenterScope(prisma, filters, userId);
    filters = scoped.filters;
    const ccPerf = await this.getCostCenterPerformance(prisma, year, filters, userId);

    const alerts = ccPerf.filter(c => c.percent > 100).map(c => ({
      type: 'COST_CENTER',
      name: c.name,
      value: c.actual - c.planned
    }));

    const savings = ccPerf.filter(c => c.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);

    const overview = await this.getBudgetOverview(prisma, year, filters, userId);
    const today = new Date();
    const startOfYear = new Date(`${year}-01-01`);
    const dayOfYear = Math.max(1, Math.ceil((today - startOfYear) / (1000 * 60 * 60 * 24)));
    const totalDays = 365 + (year % 4 === 0 ? 1 : 0);
    const dailyBurnRate = overview.totalSpent / dayOfYear;
    const projectedTotal = dailyBurnRate * totalDays;
    const projectedVariance = projectedTotal - overview.totalBudget;
    let status = 'ON_TRACK';
    if (projectedTotal > overview.totalBudget) status = 'RISK';
    else if (projectedTotal < overview.totalBudget * 0.95) status = 'SAVING';

    return {
      alerts,
      savings,
      forecast: {
        dailyBurnRate,
        projectedTotal,
        projectedVariance,
        status,
        daysPassed: dayOfYear,
        totalDays,
        completionPercent: (dayOfYear / totalDays) * 100
      }
    };
  }

  static async getRecentActivities(prisma, userId) {
    const scope = userId ? await getUserAccessScope(prisma, userId) : null;
    let where = { module: 'FINANCE' };

    if (scope && scope.isAdmin === false) {
      const accessibleUserIds = await getAccessibleUserIds(prisma, userId, scope);
      if (accessibleUserIds && accessibleUserIds.length > 0) {
        where = { ...where, userId: { in: accessibleUserIds } };
      } else {
        where = { ...where, userId: '__NO_ACCESS__' };
      }
    }

    return prisma.auditLog.findMany({
      where,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, avatar: true } }
      }
    });
  }
  static async getDREDetails(prisma, year, monthIndex, filters = {}, userId) {
    const scoped = await applyCostCenterScope(prisma, filters, userId);
    filters = scoped.filters;

    const fiscalYear = await prisma.fiscalYear.findFirst({ where: { year } });
    if (!fiscalYear) return { expenses: [], budgetItems: [] };

    // 1. Get Expenses for the Month
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59);

    const expenseWhere = {
      status: { in: ['APROVADO', 'PAGO'] },
      date: { gte: startDate, lte: endDate }
    };
    if (filters.accountId) expenseWhere.accountId = filters.accountId;
    if (filters.costCenterId) expenseWhere.costCenterId = filters.costCenterId;
    if (filters.costCenterIds) expenseWhere.costCenterId = { in: filters.costCenterIds };
    if (filters.supplierId) expenseWhere.supplierId = filters.supplierId;

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      include: {
        supplier: { select: { name: true } },
        costCenter: { select: { name: true } },
        account: { select: { name: true, code: true } }
      },
      orderBy: { date: 'desc' }
    });

    // 2. Get Budget Items for the Month
    const budgetItemWhere = { budget: { fiscalYearId: fiscalYear.id, status: 'APPROVED' } };
    if (filters.accountId) budgetItemWhere.accountId = filters.accountId;
    if (filters.costCenterId) budgetItemWhere.costCenterId = filters.costCenterId;
    if (filters.costCenterIds) budgetItemWhere.costCenterId = { in: filters.costCenterIds };
    if (filters.supplierId) budgetItemWhere.supplierId = filters.supplierId;

    const rawBudgetItems = await prisma.budgetItem.findMany({
      where: budgetItemWhere,
      include: {
        costCenter: { select: { name: true } },
        account: { select: { name: true, code: true } },
        supplier: { select: { name: true } } // If linked
      }
    });

    const monthCols = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const targetCol = monthCols[monthIndex];

    const budgetItems = rawBudgetItems
      .map(item => ({
        ...item,
        planned: Number(item[targetCol] || 0)
      }))
      .filter(item => item.planned !== 0);

    return { expenses, budgetItems };
  }
}



module.exports = FinanceDashboardService;




