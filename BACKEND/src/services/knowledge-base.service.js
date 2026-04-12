const KnowledgeBaseRepository = require('../repositories/knowledge-base.repository');
const { getUserAccessScope, getAccessibleUserIds } = require('../utils/access-scope');
const logger = require('../config/logger');

class KnowledgeBaseService {
    /**
     * Create a new article with optional attachments
      */
    static async create(prisma, data, userId, file = null) {
        const { title, content, categoryId, tags } = data;

        // Handle tags: if it's a string, split it; if array, use as is (assuming JSON parsing handled elsewhere)
        let parsedTags = [];
        if (typeof tags === 'string') {
            parsedTags = tags.split(',').map(t => t.trim());
        } else if (Array.isArray(tags)) {
            parsedTags = tags;
        }

        const article = await prisma.knowledgeBase.create({
            data: {
                title,
                content,
                categoryId: categoryId || null,
                tags: parsedTags,
                authorId: userId,
                // If file exists, create attachment immediately
                attachments: file ? {
                    create: {
                        fileName: file.originalname,
                        fileUrl: file.path,
                        fileSize: file.size,
                        mimeType: file.mimetype,
                        uploadedBy: userId
                    }
                } : undefined
            },
            include: { attachments: true, category: true }
        });

        return article;
    }

    static async update(prisma, id, data, userId) {
        const { title, content, categoryId, tags, isActive } = data;

        const article = await prisma.knowledgeBase.findUnique({ where: { id } });
        if (!article) throw { statusCode: 404, message: 'Artigo nao encontrado.' };
        await this.assertAccess(prisma, article, userId);

        let parsedTags = undefined;
        if (tags) {
            if (typeof tags === 'string') {
                parsedTags = tags.split(',').map(t => t.trim());
            } else if (Array.isArray(tags)) {
                parsedTags = tags;
            }
        }

        return await prisma.knowledgeBase.update({
            where: { id },
            data: {
                title,
                content,
                categoryId: categoryId === undefined ? undefined : (categoryId || null),
                tags: parsedTags,
                isActive: isActive === undefined ? undefined : Boolean(isActive)
            },
            include: { category: true }
        });
    }

    static async delete(prisma, id, userId) {
        const article = await prisma.knowledgeBase.findUnique({ where: { id } });
        if (!article) throw { statusCode: 404, message: 'Artigo nao encontrado.' };
        await this.assertAccess(prisma, article, userId);
        // Attachments will be deleted by Cascade, but we might want to clean up physical files in Controller
        return await prisma.knowledgeBase.delete({ where: { id } });
    }

    static async findAll(prisma, filters = {}, userId) {
        const { search, categoryId, tag } = filters;

        const where = { isActive: true };

        if (userId) {
            const scope = await getUserAccessScope(prisma, userId);
            if (scope.isAdmin === false) {
                const accessibleUserIds = await getAccessibleUserIds(prisma, userId, scope);
                if (!accessibleUserIds || accessibleUserIds.length === 0) {
                    where.authorId = '__NO_ACCESS__';
                } else {
                    where.authorId = { in: accessibleUserIds };
                }
            }
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (tag) {
            where.tags = { has: tag };
        }

        return await prisma.knowledgeBase.findMany({
            where,
            include: {
                author: { select: { name: true } },
                attachments: true,
                category: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async findById(prisma, id, userId) {
        const article = await prisma.knowledgeBase.findUnique({
            where: { id },
            include: {
                author: { select: { name: true } },
                attachments: true,
                category: true
            }
        });

        if (article) {
            await this.assertAccess(prisma, article, userId);
            // Increment views simply without awaiting to not block response
            prisma.knowledgeBase.update({
                where: { id },
                data: { views: { increment: 1 } }
            }).catch(err => logger.error('Error incrementing view count:', err));
        }

        return article;
    }

    static async getDashboardStats(prisma, userId) {
        const where = { isActive: true };
        if (userId) {
            const scope = await getUserAccessScope(prisma, userId);
            if (scope.isAdmin === false) {
                const accessibleUserIds = await getAccessibleUserIds(prisma, userId, scope);
                if (!accessibleUserIds || accessibleUserIds.length === 0) {
                    where.authorId = '__NO_ACCESS__';
                } else {
                    where.authorId = { in: accessibleUserIds };
                }
            }
        }

        // 1. Total Articles
        const totalArticles = await prisma.knowledgeBase.count({ where: { ...where } });

        // Calcule Total Views
        const viewsAgg = await prisma.knowledgeBase.aggregate({
            where: { ...where },
            _sum: { views: true }
        });
        const totalViews = viewsAgg._sum.views || 0;

        // Calculate Monthly Growth (Articles created this month vs last month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const currentMonthCount = await prisma.knowledgeBase.count({
            where: { ...where, createdAt: { gte: startOfMonth } }
        });

        const lastMonthCount = await prisma.knowledgeBase.count({
            where: { ...where, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } }
        });

        let growth = 0;
        if (lastMonthCount > 0) {
            growth = ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100;
        } else if (currentMonthCount > 0) {
            growth = 100; // 100% growth if started from 0
        }

        // 2. Most Viewed (Top 5)
        const mostViewed = await prisma.knowledgeBase.findMany({
            where,
            orderBy: { views: 'desc' },
            take: 5,
            select: { id: true, title: true, views: true, categoryId: true, category: { select: { name: true, color: true } } }
        });

        // 3. Category Distribution - use KnowledgeCategory with count
        const allCategories = await prisma.knowledgeCategory.findMany({
            where: { isActive: true },
            include: {
                _count: {
                    select: { articles: { where } }
                }
            },
            orderBy: { name: 'asc' }
        });

        const categories = allCategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            color: cat.color,
            value: cat._count.articles
        }));

        // 4. Recent Articles
        const recent = await prisma.knowledgeBase.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { author: { select: { name: true } } }
        });

        return {
            totalArticles,
            totalViews,
            growth: Math.round(growth),
            mostViewed,
            categories,
            recent
        };
    }

    static async assertAccess(prisma, article, userId) {
        if (!userId || !article) return;
        const scope = await getUserAccessScope(prisma, userId);
        if (scope.isAdmin) return;

        const accessibleUserIds = await getAccessibleUserIds(prisma, userId, scope);
        if (!accessibleUserIds || !accessibleUserIds.includes(article.authorId)) {
            throw { statusCode: 403, message: 'Acesso negado.' };
        }
    }
}

module.exports = KnowledgeBaseService;
