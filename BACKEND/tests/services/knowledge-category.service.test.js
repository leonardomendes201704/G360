const KnowledgeCategoryService = require('../../src/services/knowledge-category.service');
const { prisma } = require('../../src/config/database');

jest.mock('../../src/config/database', () => ({
    prisma: {
        knowledgeCategory: {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            upsert: jest.fn()
        }
    }
}));

describe('KnowledgeCategoryService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create category with defaults', async () => {
            prisma.knowledgeCategory.create.mockResolvedValue({ id: 1, color: '#6366f1' });

            const result = await KnowledgeCategoryService.create(prisma, { name: 'Test' });

            expect(prisma.knowledgeCategory.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: 'Test',
                    color: '#6366f1'
                })
            });
        });
    });

    describe('delete', () => {
        it('should soft delete if particles exist', async () => {
            prisma.knowledgeCategory.findUnique.mockResolvedValue({
                id: 1,
                articles: [{ id: 10 }]
            });
            prisma.knowledgeCategory.update.mockResolvedValue({ id: 1, isActive: false });

            await KnowledgeCategoryService.delete(prisma, 1);

            expect(prisma.knowledgeCategory.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { isActive: false }
            });
        });

        it('should hard delete if no articles', async () => {
            prisma.knowledgeCategory.findUnique.mockResolvedValue({
                id: 1,
                articles: []
            });

            await KnowledgeCategoryService.delete(prisma, 1);

            expect(prisma.knowledgeCategory.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });
    });
});
