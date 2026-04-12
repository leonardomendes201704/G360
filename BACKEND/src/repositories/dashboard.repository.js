/**
 * Repository for dashboard aggregate queries.
 * Centralizes complex counts and aggregations used by DashboardService.
 */
class DashboardRepository {
    // --- Counts ---
    static async countProjects(prisma, where = {}) {
        return prisma.project.count({ where });
    }

    static async countTasks(prisma, where = {}) {
        return prisma.projectTask.count({ where });
    }

    static async countIncidents(prisma, where = {}) {
        return prisma.incident.count({ where });
    }

    static async countChangeRequests(prisma, where = {}) {
        return prisma.changeRequest.count({ where });
    }

    static async countUsers(prisma, where = {}) {
        return prisma.user.count({ where });
    }

    static async countAssets(prisma, where = {}) {
        return prisma.asset.count({ where });
    }

    static async countContracts(prisma, where = {}) {
        return prisma.contract.count({ where });
    }

    // --- Aggregations ---
    static async sumBudgetExpenses(prisma, where = {}) {
        return prisma.expense.aggregate({
            where,
            _sum: { amount: true }
        });
    }

    static async sumBudgetItems(prisma, where = {}) {
        return prisma.budgetItem.aggregate({
            where,
            _sum: {
                jan: true, feb: true, mar: true, apr: true, may: true, jun: true,
                jul: true, aug: true, sep: true, oct: true, nov: true, dec: true
            }
        });
    }

    // --- Recent items ---
    static async findRecentProjects(prisma, where = {}, take = 5) {
        return prisma.project.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take,
            select: { id: true, name: true, status: true, priority: true, createdAt: true }
        });
    }

    static async findRecentIncidents(prisma, where = {}, take = 5) {
        return prisma.incident.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take,
            select: { id: true, title: true, status: true, priority: true, createdAt: true }
        });
    }
}

module.exports = DashboardRepository;
