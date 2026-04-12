/**
 * Repository for change request metrics and analytics queries.
 */
class ChangeMetricsRepository {
    static async countByStatus(prisma, where = {}) {
        return prisma.changeRequest.groupBy({
            by: ['status'],
            where,
            _count: true
        });
    }

    static async countByType(prisma, where = {}) {
        return prisma.changeRequest.groupBy({
            by: ['type'],
            where,
            _count: true
        });
    }

    static async countByRiskLevel(prisma, where = {}) {
        return prisma.changeRequest.groupBy({
            by: ['riskLevel'],
            where,
            _count: true
        });
    }

    static async findCompleted(prisma, where = {}) {
        return prisma.changeRequest.findMany({
            where: { ...where, status: 'COMPLETED' },
            select: {
                id: true, scheduledStart: true, scheduledEnd: true,
                actualStart: true, actualEnd: true, pirSuccess: true,
                pirNotes: true, pirDate: true
            }
        });
    }

    static async findByMonth(prisma, startDate, endDate, where = {}) {
        return prisma.changeRequest.findMany({
            where: {
                ...where,
                createdAt: { gte: startDate, lte: endDate }
            },
            select: { id: true, status: true, type: true, createdAt: true }
        });
    }

    static async count(prisma, where = {}) {
        return prisma.changeRequest.count({ where });
    }
}

module.exports = ChangeMetricsRepository;
