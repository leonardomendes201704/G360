class IncidentRepository {
    static async create(prisma, data) {
        return prisma.incident.create({
            data,
            include: {
                category: true,
                reporter: { select: { id: true, name: true, email: true } },
                assignee: { select: { id: true, name: true, email: true } },
                relatedAsset: { select: { id: true, name: true, code: true } },
            }
        });
    }

    static async findAll(prisma, filters = {}, scope = null) {
        const where = {};

        if (filters.status) {
            // Suporte a múltiplos status separados por vírgula (ex: 'OPEN,IN_PROGRESS,PENDING')
            if (filters.status.includes(',')) {
                where.status = { in: filters.status.split(',').map(s => s.trim()) };
            } else {
                where.status = filters.status;
            }
        }
        if (filters.priority) where.priority = filters.priority;
        if (filters.categoryId) where.categoryId = filters.categoryId;
        if (filters.assigneeId) where.assigneeId = filters.assigneeId;
        if (filters.reporterId) where.reporterId = filters.reporterId;
        if (filters.slaBreached !== undefined) where.slaBreached = filters.slaBreached;

        if (filters.search) {
            where.OR = [
                { code: { contains: filters.search, mode: 'insensitive' } },
                { title: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } }
            ];
        }

        if (filters.dateFrom || filters.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
            if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
        }

        if (scope && scope.isAdmin === false && !scope.skipIncidentCcFilter) {
            const scopeOr = [];
            if (scope.accessibleCostCenterIds && scope.accessibleCostCenterIds.length > 0) {
                scopeOr.push({ reporter: { costCenterId: { in: scope.accessibleCostCenterIds } } });
                scopeOr.push({ assignee: { costCenterId: { in: scope.accessibleCostCenterIds } } });
            }
            if (scope.userId) {
                scopeOr.push({ reporterId: scope.userId });
                scopeOr.push({ assigneeId: scope.userId });
            }

            if (scopeOr.length > 0) {
                if (where.OR) {
                    const existingOr = where.OR;
                    delete where.OR;
                    where.AND = where.AND || [];
                    where.AND.push({ OR: existingOr });
                }
                where.AND = where.AND || [];
                where.AND.push({ OR: scopeOr });
            } else {
                where.id = '__NO_ACCESS__';
            }
        }

        return prisma.incident.findMany({
            where,
            include: {
                category: true,
                reporter: { select: { id: true, name: true, email: true, costCenterId: true } },
                assignee: { select: { id: true, name: true, email: true, costCenterId: true } },
                relatedAsset: { select: { id: true, name: true, code: true } },
                relatedChange: { select: { id: true, code: true, title: true } },
                _count: { select: { comments: true, attachments: true } }
            },
            orderBy: [
                { priority: 'asc' },
                { createdAt: 'desc' }
            ]
        });
    }

    static async findById(prisma, id) {
        return prisma.incident.findUnique({
            where: { id },
            include: {
                category: true,
                reporter: { select: { id: true, name: true, email: true, avatar: true, costCenterId: true } },
                assignee: { select: { id: true, name: true, email: true, avatar: true, costCenterId: true } },
                relatedAsset: true,
                relatedChange: { select: { id: true, code: true, title: true, status: true } },
                comments: {
                    include: { user: { select: { id: true, name: true, avatar: true } } },
                    orderBy: { createdAt: 'desc' }
                },
                attachments: { orderBy: { createdAt: 'desc' } },
                history: {
                    include: { user: { select: { id: true, name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 50
                }
            }
        });
    }

    static async findByCode(prisma, code) {
        return prisma.incident.findUnique({
            where: { code }
        });
    }

    static async update(prisma, id, data) {
        return prisma.incident.update({
            where: { id },
            data,
            include: {
                category: true,
                reporter: { select: { id: true, name: true, email: true } },
                assignee: { select: { id: true, name: true, email: true } }
            }
        });
    }

    static async delete(prisma, id) {
        return prisma.incident.delete({
            where: { id }
        });
    }

    // --- COMMENTS ---
    static async addComment(prisma, incidentId, userId, content, isInternal = false) {
        return prisma.incidentComment.create({
            data: { incidentId, userId, content, isInternal },
            include: { user: { select: { id: true, name: true, avatar: true } } }
        });
    }

    static async getComments(prisma, incidentId) {
        return prisma.incidentComment.findMany({
            where: { incidentId },
            include: { user: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'desc' }
        });
    }

    // --- ATTACHMENTS ---
    static async addAttachment(prisma, data) {
        return prisma.incidentAttachment.create({ data });
    }

    static async getAttachments(prisma, incidentId) {
        return prisma.incidentAttachment.findMany({
            where: { incidentId },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async deleteAttachment(prisma, id) {
        return prisma.incidentAttachment.delete({ where: { id } });
    }

    // --- HISTORY ---
    static async addHistory(prisma, incidentId, userId, action, oldValue = null, newValue = null) {
        return prisma.incidentHistory.create({
            data: { incidentId, userId, action, oldValue, newValue }
        });
    }

    static async getHistory(prisma, incidentId) {
        return prisma.incidentHistory.findMany({
            where: { incidentId },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        });
    }

    // --- CATEGORIES ---
    static async getCategories(prisma, activeOnly = true) {
        const where = activeOnly ? { isActive: true } : {};
        return prisma.incidentCategory.findMany({
            where,
            orderBy: { name: 'asc' }
        });
    }

    static async getCategoryById(prisma, id) {
        return prisma.incidentCategory.findUnique({ where: { id } });
    }

    static async createCategory(prisma, data) {
        return prisma.incidentCategory.create({ data });
    }

    static async updateCategory(prisma, id, data) {
        return prisma.incidentCategory.update({ where: { id }, data });
    }

    // --- STATS ---
    static async getKPIs(prisma) {
        const [open, inProgress, pending, resolved, closed, slaBreached] = await Promise.all([
            prisma.incident.count({ where: { status: 'OPEN' } }),
            prisma.incident.count({ where: { status: 'IN_PROGRESS' } }),
            prisma.incident.count({ where: { status: 'PENDING' } }),
            prisma.incident.count({ where: { status: 'RESOLVED' } }),
            prisma.incident.count({ where: { status: 'CLOSED' } }),
            prisma.incident.count({ where: { slaBreached: true, status: { notIn: ['CLOSED'] } } })
        ]);

        // Resolvidos hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const resolvedToday = await prisma.incident.count({
            where: {
                resolvedAt: { gte: today }
            }
        });

        return {
            open,
            inProgress,
            pending,
            resolved,
            closed,
            slaBreached,
            resolvedToday,
            total: open + inProgress + pending + resolved + closed
        };
    }

    static async getNextCode(prisma) {
        const year = new Date().getFullYear();
        const lastIncident = await prisma.incident.findFirst({
            where: { code: { startsWith: `INC-${year}` } },
            orderBy: { code: 'desc' }
        });

        if (!lastIncident) {
            return `INC-${year}-0001`;
        }

        const lastNumber = parseInt(lastIncident.code.split('-')[2], 10);
        return `INC-${year}-${String(lastNumber + 1).padStart(4, '0')}`;
    }
}

module.exports = IncidentRepository;
