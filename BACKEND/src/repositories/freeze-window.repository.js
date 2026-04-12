class FreezeWindowRepository {
    static async create(prisma, data) {
        return prisma.freezeWindow.create({
            data: {
                name: data.name,
                description: data.description,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                isActive: data.isActive !== undefined ? data.isActive : true,
                createdBy: data.createdBy
            }
        });
    }

    static async findAll(prisma, activeOnly = false) {
        const where = activeOnly ? { isActive: true } : {};
        return prisma.freezeWindow.findMany({
            where,
            orderBy: { startDate: 'desc' }
        });
    }

    static async findOverlapping(prisma, startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        return prisma.freezeWindow.findFirst({
            where: {
                isActive: true,
                OR: [
                    // Case 1: Window starts inside the range
                    {
                        startDate: { gte: start, lte: end }
                    },
                    // Case 2: Window ends inside the range
                    {
                        endDate: { gte: start, lte: end }
                    },
                    // Case 3: Range is completely inside the window
                    {
                        startDate: { lte: start },
                        endDate: { gte: end }
                    }
                ]
            }
        });
    }

    static async update(prisma, id, data) {
        if (data.startDate) data.startDate = new Date(data.startDate);
        if (data.endDate) data.endDate = new Date(data.endDate);

        return prisma.freezeWindow.update({
            where: { id },
            data
        });
    }

    static async delete(prisma, id) {
        return prisma.freezeWindow.delete({
            where: { id }
        });
    }
}

module.exports = FreezeWindowRepository;
