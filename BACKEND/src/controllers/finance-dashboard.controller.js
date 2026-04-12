const FinanceDashboardService = require('../services/finance-dashboard.service');

class FinanceDashboardController {
  static async getBudgetOverview(req, res) {
    const { year, accountId, costCenterId, supplierId } = req.query;
    const filters = { accountId, costCenterId, supplierId };
    const data = await FinanceDashboardService.getBudgetOverview(req.prisma, Number(year), filters, req.user.userId);
    return res.json(data);
  }

  static async getMonthlyEvolution(req, res) {
    const { year, accountId, costCenterId, supplierId } = req.query;
    const filters = { accountId, costCenterId, supplierId };
    const data = await FinanceDashboardService.getMonthlyEvolution(req.prisma, Number(year), filters, req.user.userId);
    return res.json(data);
  }

  static async getCostCenterPerformance(req, res) {
    const { year, accountId, costCenterId, supplierId } = req.query;
    const filters = { accountId, costCenterId, supplierId };
    const data = await FinanceDashboardService.getCostCenterPerformance(req.prisma, Number(year), filters, req.user.userId);
    return res.json(data);
  }

  static async getAccountPerformance(req, res) {
    const { year, accountId, costCenterId, supplierId } = req.query;
    const filters = { accountId, costCenterId, supplierId };
    const data = await FinanceDashboardService.getAccountPerformance(req.prisma, Number(year), filters, req.user.userId);
    return res.json(data);
  }

  static async getAdvancedStats(req, res) {
    const { year, accountId, costCenterId, supplierId } = req.query;
    const filters = { accountId, costCenterId, supplierId };
    const data = await FinanceDashboardService.getAdvancedStats(req.prisma, Number(year) || 2025, filters, req.user.userId);
    return res.json(data);
  }

  static async getInsights(req, res) {
    const { year, accountId, costCenterId, supplierId } = req.query;
    const filters = { accountId, costCenterId, supplierId };
    const data = await FinanceDashboardService.getInsights(req.prisma, Number(year), filters, req.user.userId);
    return res.json(data);
  }

  static async getRecentActivities(req, res) {
    const data = await FinanceDashboardService.getRecentActivities(req.prisma, req.user.userId);
    return res.json(data);
  }

  static async getDREDetails(req, res) {
    const { year, monthIndex, accountId, costCenterId, supplierId } = req.query;
    const filters = { accountId, costCenterId, supplierId };
    const data = await FinanceDashboardService.getDREDetails(req.prisma, Number(year), Number(monthIndex), filters, req.user.userId);
    return res.json(data);
  }
}

module.exports = FinanceDashboardController;
