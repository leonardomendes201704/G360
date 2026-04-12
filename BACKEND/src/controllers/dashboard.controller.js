const DashboardService = require('../services/dashboard.service');
class DashboardController {
  static async getFinancialSummary(req, res) {
    try {
      const { year } = req.query;

      // Se não informar ano, usa o atual
      const currentYear = year || new Date().getFullYear();

      const summary = await DashboardService.getFinancialSummary(req.prisma, currentYear);
      return res.status(200).json(summary);

    } catch (error) {
      return res.status(500).json({
        error: 'Erro ao gerar dashboard',
        message: error.message
      });
    }
  }

  static async getSuperAdminStats(req, res) {
    try {
      const stats = await DashboardService.getSuperAdminStats(req.prisma);
      return res.status(200).json(stats);
    } catch (error) {
      return res.status(500).json({
        error: 'Erro ao gerar estatísticas de administração',
        message: error.message
      });
    }
  }

  static async getCollaboratorStats(req, res) {
    try {
      const { userId } = req.user;
      const stats = await DashboardService.getCollaboratorStats(req.prisma, userId);
      return res.status(200).json(stats);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar dados do colaborador', message: error.message });
    }
  }

  static async getManagerStats(req, res) {
    try {
      // Force refresh user data to ensure latest department/costCenter links
      // req.user from token might be stale or partial
      const user = await req.prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          directedDepartments: { select: { id: true } },
          managedCostCenters: { select: { id: true } }
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const stats = await DashboardService.getManagerStats(req.prisma, user);
      return res.status(200).json(stats);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar dados do gestor', message: error.message });
    }
  }
  static async getActivityFeed(req, res) {
    try {
      const { limit = 30, module: entityType, userId: filterUserId } = req.query;
      const where = {};
      if (entityType) where.entityType = entityType.toUpperCase();
      if (filterUserId) where.userId = filterUserId;

      const activities = await req.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit, 10) || 30,
      });

      return res.status(200).json(activities);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar atividades', message: error.message });
    }
  }
  static async getManagerAnalytics(req, res) {
    try {
      const user = await req.prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          directedDepartments: { select: { id: true } },
          managedCostCenters: { select: { id: true } }
        }
      });
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

      const { getUserAccessScope } = require('../utils/access-scope');
      const scope = await getUserAccessScope(req.prisma, user.id);
      const costCenterIds = scope.accessibleCostCenterIds?.length > 0
        ? scope.accessibleCostCenterIds : ['__NO_ACCESS__'];

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // 1. Incident trend — last 30 days (open or created)
      const incidentLogs = await req.prisma.incident.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: 'asc' }
      });

      // Group by day
      const dayMap = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = { date: key, created: 0, resolved: 0 };
      }
      incidentLogs.forEach(inc => {
        const key = new Date(inc.createdAt).toISOString().slice(0, 10);
        if (dayMap[key]) {
          dayMap[key].created++;
          if (inc.status === 'RESOLVED' || inc.status === 'CLOSED') dayMap[key].resolved++;
        }
      });
      const incidentTrend = Object.values(dayMap);

      // 2. Task distribution by status (scoped)
      const taskStats = await req.prisma.task.groupBy({
        by: ['status'],
        where: { OR: [{ assignee: { costCenterId: { in: costCenterIds } } }, { creator: { costCenterId: { in: costCenterIds } } }] },
        _count: { status: true }
      });
      const taskDistribution = taskStats.reduce((acc, t) => { acc[t.status] = t._count.status; return acc; }, {});

      // 3. Risk distribution by severity (numeric)
      let riskDistribution = { low: 0, medium: 0, high: 0, critical: 0 };
      try {
        const risks = await req.prisma.risk.findMany({ select: { severity: true } });
        risks.forEach(r => {
          const s = typeof r.severity === 'number' ? r.severity : 0;
          if (s <= 3) riskDistribution.low++;
          else if (s <= 6) riskDistribution.medium++;
          else if (s <= 9) riskDistribution.high++;
          else riskDistribution.critical++;
        });
      } catch (_) { }

      // 4. Monthly expense trend (last 6 months)
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const expenses = await req.prisma.expense.findMany({
        where: { date: { gte: sixMonthsAgo }, costCenterId: { in: costCenterIds } },
        select: { date: true, amount: true }
      });
      const monthMap = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = { month: key, amount: 0 };
      }
      expenses.forEach(e => {
        const key = new Date(e.date).toISOString().slice(0, 7);
        if (monthMap[key]) monthMap[key].amount += Number(e.amount);
      });
      const expenseTrend = Object.values(monthMap);

      // 5. Project status distribution
      const projectStats = await req.prisma.project.groupBy({
        by: ['status'],
        where: { OR: [{ costCenterId: { in: costCenterIds } }, { managerId: user.id }] },
        _count: { status: true }
      });
      const projectDistribution = projectStats.reduce((acc, p) => { acc[p.status] = p._count.status; return acc; }, {});

      return res.status(200).json({
        incidentTrend,
        taskDistribution,
        riskDistribution,
        expenseTrend,
        projectDistribution,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar analytics', message: error.message });
    }
  }
}

module.exports = DashboardController;