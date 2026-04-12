class CorporateRiskRepository {
    static async create(prisma, data) {
        return prisma.corporateRisk.create({
            data,
            include: {
                owner: { select: { id: true, name: true, email: true } },
                department: true,
                costCenter: true,
                asset: true,
                supplier: true
            }
        });
    }

    static async update(prisma, id, data) {
        return prisma.corporateRisk.update({
            where: { id },
            data,
            include: {
                owner: { select: { id: true, name: true, email: true } },
                department: true,
                costCenter: true,
                asset: true,
                supplier: true
            }
        });
    }

    static async delete(prisma, id) {
        return prisma.corporateRisk.delete({ where: { id } });
    }

    static async findById(prisma, id) {
        return prisma.corporateRisk.findUnique({
            where: { id },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                department: true,
                costCenter: true,
                asset: true,
                supplier: true
            }
        });
    }

    static async findMany(prisma, where = {}, orderBy = { createdAt: 'desc' }, skip, take) {
        const args = {
            where,
            orderBy,
            include: {
                owner: { select: { id: true, name: true, email: true } },
                department: true,
                costCenter: true
            }
        };
        if (skip !== undefined) args.skip = skip;
        if (take !== undefined) args.take = take;
        return prisma.corporateRisk.findMany(args);
    }

    static async count(prisma, where = {}) {
        return prisma.corporateRisk.count({ where });
    }

    static async getNextCode(prisma) {
        const year = new Date().getFullYear();
        const lastRisk = await prisma.corporateRisk.findFirst({
            where: { code: { startsWith: `RISK-${year}` } },
            orderBy: { code: 'desc' }
        });
        if (!lastRisk) return `RISK-${year}-001`;
        const lastNum = parseInt(lastRisk.code.split('-')[2] || '0');
        return `RISK-${year}-${String(lastNum + 1).padStart(3, '0')}`;
    }
}

module.exports = CorporateRiskRepository;
