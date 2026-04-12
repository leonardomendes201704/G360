class KnowledgeCategoryRepository {
    static async create(prisma, data) {
        return prisma.knowledgeCategory.create({ data });
    }

    static async update(prisma, id, data) {
        return prisma.knowledgeCategory.update({ where: { id }, data });
    }

    static async delete(prisma, id) {
        return prisma.knowledgeCategory.delete({ where: { id } });
    }

    static async findById(prisma, id) {
        return prisma.knowledgeCategory.findUnique({
            where: { id },
            include: { _count: { select: { articles: true } } }
        });
    }

    static async findByName(prisma, name) {
        return prisma.knowledgeCategory.findUnique({ where: { name } });
    }

    static async findAll(prisma, where = {}, orderBy = { name: 'asc' }) {
        return prisma.knowledgeCategory.findMany({
            where,
            orderBy,
            include: { _count: { select: { articles: true } } }
        });
    }

    static async upsertByName(prisma, name, data) {
        return prisma.knowledgeCategory.upsert({
            where: { name },
            update: {},
            create: data
        });
    }
}

module.exports = KnowledgeCategoryRepository;
