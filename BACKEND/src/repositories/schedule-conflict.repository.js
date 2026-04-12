/**
 * Repository for schedule conflict detection queries.
 */
class ScheduleConflictRepository {
    static async findOverlapping(prisma, scheduledStart, scheduledEnd, excludeId = null, where = {}) {
        const baseWhere = {
            ...where,
            status: { notIn: ['CANCELLED', 'COMPLETED', 'FAILED'] },
            OR: [
                { scheduledStart: { lte: scheduledEnd }, scheduledEnd: { gte: scheduledStart } }
            ]
        };
        if (excludeId) baseWhere.id = { not: excludeId };

        return prisma.changeRequest.findMany({
            where: baseWhere,
            orderBy: { scheduledStart: 'asc' },
            include: {
                requester: { select: { id: true, name: true, email: true } }
            }
        });
    }

    static async findInDateRange(prisma, startDate, endDate, where = {}) {
        return prisma.changeRequest.findMany({
            where: {
                ...where,
                status: { notIn: ['CANCELLED'] },
                scheduledStart: { gte: startDate },
                scheduledEnd: { lte: endDate }
            },
            orderBy: { scheduledStart: 'asc' },
            include: {
                requester: { select: { id: true, name: true, email: true } }
            }
        });
    }

    static async findActiveFreezeWindows(prisma, date) {
        return prisma.freezeWindow.findMany({
            where: {
                isActive: true,
                startDate: { lte: date },
                endDate: { gte: date }
            }
        });
    }
}

module.exports = ScheduleConflictRepository;
