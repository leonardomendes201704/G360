const AssetCategoryService = require('../../src/services/asset-category.service');
const AssetCategoryRepository = require('../../src/repositories/asset-category.repository');

jest.mock('../../src/repositories/asset-category.repository');
const { prisma } = require('../../src/config/database');
jest.mock('../../src/config/database', () => ({
    prisma: {}
}));

describe('AssetCategoryService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a category', async () => {
            const mockCategory = { id: 1, name: 'Hardware' };
            AssetCategoryRepository.create.mockResolvedValue(mockCategory);

            const result = await AssetCategoryService.create(prisma, { name: 'Hardware' });
            expect(result).toEqual(mockCategory);
        });
    });

    describe('update', () => {
        it('should throw 404 if category not found', async () => {
            AssetCategoryRepository.findById.mockResolvedValue(null);
            await expect(AssetCategoryService.update(prisma, 1, {}))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should update category', async () => {
            AssetCategoryRepository.findById.mockResolvedValue({ id: 1 });
            AssetCategoryRepository.update.mockResolvedValue({ id: 1, name: 'Updated' });

            const result = await AssetCategoryService.update(prisma, 1, { name: 'Updated' });
            expect(result).toEqual({ id: 1, name: 'Updated' });
        });
    });

    describe('delete', () => {
        it('should throw 404 if category not found', async () => {
            AssetCategoryRepository.findById.mockResolvedValue(null);
            await expect(AssetCategoryService.delete(prisma, 1))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should delete category', async () => {
            AssetCategoryRepository.findById.mockResolvedValue({ id: 1 });
            AssetCategoryRepository.delete.mockResolvedValue(true);

            const result = await AssetCategoryService.delete(prisma, 1);
            expect(result).toBe(true);
        });
    });
});
