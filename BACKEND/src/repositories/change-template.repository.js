class ChangeTemplateRepository {
    static async create(prisma, data) {
        return prisma.changeTemplate.create({ data });
    }

    static async update(prisma, id, data) {
        return prisma.changeTemplate.update({ where: { id }, data });
    }

    static async findById(prisma, id) {
        return prisma.changeTemplate.findUnique({ where: { id } });
    }

    static async findMany(prisma, where = {}, orderBy = [{ usageCount: 'desc' }, { name: 'asc' }]) {
        return prisma.changeTemplate.findMany({ where, orderBy });
    }

    static async incrementUsage(prisma, id) {
        return prisma.changeTemplate.update({
            where: { id },
            data: { usageCount: { increment: 1 } }
        });
    }
}

module.exports = ChangeTemplateRepository;
