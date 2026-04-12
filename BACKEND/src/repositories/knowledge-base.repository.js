class KnowledgeBaseRepository {
    static async create(prisma, data) {
        return prisma.knowledgeBase.create({
            data,
            include: {
                author: { select: { id: true, name: true, email: true } },
                category: true
            }
        });
    }

    static async update(prisma, id, data) {
        return prisma.knowledgeBase.update({
            where: { id },
            data,
            include: {
                author: { select: { id: true, name: true, email: true } },
                category: true
            }
        });
    }

    static async delete(prisma, id) {
        return prisma.knowledgeBase.delete({ where: { id } });
    }

    static async findById(prisma, id) {
        return prisma.knowledgeBase.findUnique({
            where: { id },
            include: {
                author: { select: { id: true, name: true, email: true } },
                category: true
            }
        });
    }

    static async findMany(prisma, where = {}, orderBy = { createdAt: 'desc' }, skip, take) {
        const args = {
            where, orderBy, include: {
                author: { select: { id: true, name: true, email: true } },
                category: true
            }
        };
        if (skip !== undefined) args.skip = skip;
        if (take !== undefined) args.take = take;
        return prisma.knowledgeBase.findMany(args);
    }

    static async count(prisma, where = {}) {
        return prisma.knowledgeBase.count({ where });
    }

    static async incrementViews(prisma, id) {
        return prisma.knowledgeBase.update({
            where: { id },
            data: { views: { increment: 1 } }
        });
    }
}

module.exports = KnowledgeBaseRepository;
