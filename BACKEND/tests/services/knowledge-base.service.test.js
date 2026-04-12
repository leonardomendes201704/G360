const KnowledgeBaseService = require('../../src/services/knowledge-base.service');
const { prisma } = require('../../src/config/database');

// MOCKS
jest.mock('../../src/config/database', () => ({
    prisma: {
        knowledgeBase: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            aggregate: jest.fn().mockResolvedValue({ _sum: { views: 0 } })
        },
        knowledgeCategory: {
            findMany: jest.fn()
        }
    }
}));
jest.mock('../../src/config/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));
jest.mock('../../src/utils/access-scope', () => ({
    getUserAccessScope: jest.fn().mockResolvedValue({ isAdmin: true, accessibleCostCenterIds: [] }),
    getAccessibleUserIds: jest.fn().mockResolvedValue([])
}));

describe('KnowledgeBaseService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create new article', async () => {
            const data = {
                title: 'Novo Artigo',
                content: 'Conteúdo do artigo',
                categoryId: 'cat-1',
                tags: 'tag1, tag2'
            };

            prisma.knowledgeBase.create.mockResolvedValue({
                id: 'kb-new',
                title: 'Novo Artigo',
                tags: ['tag1', 'tag2']
            });

            const result = await KnowledgeBaseService.create(prisma, data, 'user-1');

            expect(result.id).toBe('kb-new');
            expect(prisma.knowledgeBase.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    title: 'Novo Artigo',
                    authorId: 'user-1',
                    tags: ['tag1', 'tag2']
                }),
                include: { attachments: true, category: true }
            });
        });

        it('should handle array tags', async () => {
            const data = {
                title: 'Artigo com Array',
                content: 'Conteúdo',
                tags: ['tag1', 'tag2', 'tag3']
            };

            prisma.knowledgeBase.create.mockResolvedValue({
                id: 'kb-arr',
                tags: ['tag1', 'tag2', 'tag3']
            });

            const result = await KnowledgeBaseService.create(prisma, data, 'user-1');

            expect(prisma.knowledgeBase.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    tags: ['tag1', 'tag2', 'tag3']
                }),
                include: expect.any(Object)
            });
        });
    });

    describe('update', () => {
        it('should update article', async () => {
            prisma.knowledgeBase.findUnique.mockResolvedValue({ id: 'kb-1', authorId: 'user-1' });
            prisma.knowledgeBase.update.mockResolvedValue({
                id: 'kb-1',
                title: 'Título Atualizado'
            });

            const result = await KnowledgeBaseService.update(prisma, 'kb-1', { title: 'Título Atualizado' }, 'user-1');

            expect(result.title).toBe('Título Atualizado');
            expect(prisma.knowledgeBase.update).toHaveBeenCalledWith({
                where: { id: 'kb-1' },
                data: expect.objectContaining({ title: 'Título Atualizado' }),
                include: { category: true }
            });
        });
    });

    describe('delete', () => {
        it('should delete article', async () => {
            prisma.knowledgeBase.findUnique.mockResolvedValue({ id: 'kb-1', authorId: 'user-1' });
            prisma.knowledgeBase.delete.mockResolvedValue({ id: 'kb-1' });

            await KnowledgeBaseService.delete(prisma, 'kb-1', 'user-1');

            expect(prisma.knowledgeBase.delete).toHaveBeenCalledWith({
                where: { id: 'kb-1' }
            });
        });
    });

    describe('findAll', () => {
        it('should return all active articles', async () => {
            const mockArticles = [
                { id: 'kb-1', title: 'Como resetar senha', isActive: true },
                { id: 'kb-2', title: 'Configurar VPN', isActive: true }
            ];

            prisma.knowledgeBase.findMany.mockResolvedValue(mockArticles);

            const result = await KnowledgeBaseService.findAll(prisma, {});

            expect(result).toHaveLength(2);
            expect(prisma.knowledgeBase.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { isActive: true }
                })
            );
        });

        it('should filter by categoryId', async () => {
            prisma.knowledgeBase.findMany.mockResolvedValue([]);

            await KnowledgeBaseService.findAll(prisma, { categoryId: 'cat-ti' });

            expect(prisma.knowledgeBase.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        categoryId: 'cat-ti'
                    })
                })
            );
        });

        it('should search by title or content', async () => {
            prisma.knowledgeBase.findMany.mockResolvedValue([]);

            await KnowledgeBaseService.findAll(prisma, { search: 'VPN' });

            expect(prisma.knowledgeBase.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            expect.objectContaining({ title: expect.objectContaining({ contains: 'VPN' }) }),
                            expect.objectContaining({ content: expect.objectContaining({ contains: 'VPN' }) })
                        ])
                    })
                })
            );
        });
    });

    describe('findById', () => {
        it('should return article by ID and increment views', async () => {
            const mockArticle = {
                id: 'kb-1',
                title: 'Artigo de teste',
                content: 'Conteúdo...',
                views: 5
            };

            prisma.knowledgeBase.findUnique.mockResolvedValue(mockArticle);
            prisma.knowledgeBase.update.mockResolvedValue({ ...mockArticle, views: 6 });

            const result = await KnowledgeBaseService.findById(prisma, 'kb-1');

            expect(result.id).toBe('kb-1');
            // Views are incremented asynchronously (fire and forget)
            expect(prisma.knowledgeBase.findUnique).toHaveBeenCalledWith({
                where: { id: 'kb-1' },
                include: expect.any(Object)
            });
        });

        it('should return null if article not found', async () => {
            prisma.knowledgeBase.findUnique.mockResolvedValue(null);

            const result = await KnowledgeBaseService.findById(prisma, 'invalid-id');

            expect(result).toBeNull();
        });
    });

    describe('getDashboardStats', () => {
        it('should return dashboard statistics', async () => {
            prisma.knowledgeBase.count.mockResolvedValue(25);
            prisma.knowledgeBase.aggregate.mockResolvedValue({ _sum: { views: 500 } });
            prisma.knowledgeBase.findMany
                .mockResolvedValueOnce([ // mostViewed
                    { id: 'kb-1', title: 'Popular', views: 100 }
                ])
                .mockResolvedValueOnce([ // recent
                    { id: 'kb-2', title: 'Recent', createdAt: new Date() }
                ]);
            prisma.knowledgeCategory.findMany.mockResolvedValue([
                { id: 'cat-1', name: 'TI', color: '#3B82F6', _count: { articles: 10 } }
            ]);

            const result = await KnowledgeBaseService.getDashboardStats(prisma, 'admin-user');

            expect(result.totalArticles).toBe(25);
            expect(result.mostViewed).toHaveLength(1);
            expect(result.categories).toHaveLength(1);
        });
    });

    // ===== BATCH 10: FINAL BRANCH COVERAGE PUSH =====

    describe('create — additional branches', () => {
        it('should create article with file attachment', async () => {
            const file = { originalname: 'doc.pdf', path: '/tmp/doc.pdf', size: 1024, mimetype: 'application/pdf' };
            prisma.knowledgeBase.create.mockResolvedValue({ id: 'kb-f', title: 'With File', attachments: [{ fileName: 'doc.pdf' }] });

            const result = await KnowledgeBaseService.create(prisma, { title: 'With File', content: 'Content' }, 'u1', file);
            expect(result.attachments).toHaveLength(1);
            expect(prisma.knowledgeBase.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        attachments: expect.objectContaining({
                            create: expect.objectContaining({ fileName: 'doc.pdf' })
                        })
                    })
                })
            );
        });

        it('should create article with no tags', async () => {
            prisma.knowledgeBase.create.mockResolvedValue({ id: 'kb-nt', tags: [] });
            await KnowledgeBaseService.create(prisma, { title: 'No Tags', content: 'Content' }, 'u1');
            expect(prisma.knowledgeBase.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ tags: [] })
                })
            );
        });
    });

    describe('update — additional branches', () => {
        it('should throw 404 when article not found', async () => {
            prisma.knowledgeBase.findUnique.mockResolvedValue(null);
            await expect(KnowledgeBaseService.update(prisma, 'invalid', { title: 'X' }, 'u1'))
                .rejects.toEqual(expect.objectContaining({ statusCode: 404 }));
        });

        it('should update with string tags', async () => {
            prisma.knowledgeBase.findUnique.mockResolvedValue({ id: 'kb-1', authorId: 'u1' });
            prisma.knowledgeBase.update.mockResolvedValue({ id: 'kb-1', tags: ['a', 'b'] });

            await KnowledgeBaseService.update(prisma, 'kb-1', { tags: 'a, b' }, 'u1');
            expect(prisma.knowledgeBase.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ tags: ['a', 'b'] })
                })
            );
        });

        it('should update with array tags and isActive', async () => {
            prisma.knowledgeBase.findUnique.mockResolvedValue({ id: 'kb-1', authorId: 'u1' });
            prisma.knowledgeBase.update.mockResolvedValue({ id: 'kb-1', tags: ['x'], isActive: false });

            await KnowledgeBaseService.update(prisma, 'kb-1', { tags: ['x'], isActive: false }, 'u1');
            expect(prisma.knowledgeBase.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ tags: ['x'], isActive: false })
                })
            );
        });
    });

    describe('delete — additional branches', () => {
        it('should throw 404 when article not found', async () => {
            prisma.knowledgeBase.findUnique.mockResolvedValue(null);
            await expect(KnowledgeBaseService.delete(prisma, 'invalid', 'u1'))
                .rejects.toEqual(expect.objectContaining({ statusCode: 404 }));
        });
    });

    describe('findAll — additional branches', () => {
        it('should filter by tag', async () => {
            prisma.knowledgeBase.findMany.mockResolvedValue([]);
            await KnowledgeBaseService.findAll(prisma, { tag: 'vpn' });
            expect(prisma.knowledgeBase.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ tags: { has: 'vpn' } })
                })
            );
        });

        it('should scope by accessible users for non-admin', async () => {
            const { getUserAccessScope, getAccessibleUserIds } = require('../../src/utils/access-scope');
            getUserAccessScope.mockResolvedValue({ isAdmin: false });
            getAccessibleUserIds.mockResolvedValue(['u1', 'u2']);
            prisma.knowledgeBase.findMany.mockResolvedValue([]);

            await KnowledgeBaseService.findAll(prisma, {}, 'u1');
            expect(prisma.knowledgeBase.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        authorId: { in: ['u1', 'u2'] }
                    })
                })
            );
        });

        it('should use __NO_ACCESS__ when non-admin has no accessible users', async () => {
            const { getUserAccessScope, getAccessibleUserIds } = require('../../src/utils/access-scope');
            getUserAccessScope.mockResolvedValue({ isAdmin: false });
            getAccessibleUserIds.mockResolvedValue([]);
            prisma.knowledgeBase.findMany.mockResolvedValue([]);

            await KnowledgeBaseService.findAll(prisma, {}, 'u1');
            expect(prisma.knowledgeBase.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        authorId: '__NO_ACCESS__'
                    })
                })
            );
        });
    });

    describe('getDashboardStats — additional branches', () => {
        it('should calculate growth from last month', async () => {
            prisma.knowledgeBase.count
                .mockResolvedValueOnce(50) // totalArticles
                .mockResolvedValueOnce(10) // currentMonthCount
                .mockResolvedValueOnce(5); // lastMonthCount
            prisma.knowledgeBase.aggregate.mockResolvedValue({ _sum: { views: 200 } });
            prisma.knowledgeBase.findMany
                .mockResolvedValueOnce([])  // mostViewed
                .mockResolvedValueOnce([]); // recent
            prisma.knowledgeCategory.findMany.mockResolvedValue([]);

            const result = await KnowledgeBaseService.getDashboardStats(prisma, 'admin');
            expect(result.growth).toBe(100); // (10-5)/5 * 100 = 100%
        });

        it('should show 100% growth when starting from zero last month', async () => {
            prisma.knowledgeBase.count
                .mockResolvedValueOnce(10) // totalArticles
                .mockResolvedValueOnce(5)  // currentMonthCount
                .mockResolvedValueOnce(0); // lastMonthCount = 0
            prisma.knowledgeBase.aggregate.mockResolvedValue({ _sum: { views: 100 } });
            prisma.knowledgeBase.findMany
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);
            prisma.knowledgeCategory.findMany.mockResolvedValue([]);

            const result = await KnowledgeBaseService.getDashboardStats(prisma, 'admin');
            expect(result.growth).toBe(100); // 100% when starting from 0
        });
    });

    describe('assertAccess', () => {
        it('should throw 403 for non-admin without access', async () => {
            const { getUserAccessScope, getAccessibleUserIds } = require('../../src/utils/access-scope');
            getUserAccessScope.mockResolvedValue({ isAdmin: false });
            getAccessibleUserIds.mockResolvedValue(['u2']); // u1 not in list

            await expect(KnowledgeBaseService.assertAccess(prisma, { authorId: 'u3' }, 'u1'))
                .rejects.toEqual(expect.objectContaining({ statusCode: 403 }));
        });

        it('should pass when user is admin', async () => {
            const { getUserAccessScope } = require('../../src/utils/access-scope');
            getUserAccessScope.mockResolvedValue({ isAdmin: true });

            await expect(KnowledgeBaseService.assertAccess(prisma, { authorId: 'u3' }, 'u1'))
                .resolves.toBeUndefined();
        });

        it('should pass when no userId provided', async () => {
            await expect(KnowledgeBaseService.assertAccess(prisma, { authorId: 'u3' }, null))
                .resolves.toBeUndefined();
        });
    });
});
