const AssetService = require('../../src/services/asset.service');
const AssetRepository = require('../../src/repositories/asset.repository');
const AssetCategoryRepository = require('../../src/repositories/asset-category.repository');
const SupplierRepository = require('../../src/repositories/supplier.repository');
const NotificationService = require('../../src/services/notification.service');
const AuditLogRepository = require('../../src/repositories/audit-log.repository');
const CostCenterRepository = require('../../src/repositories/cost-center.repository');
const ContractRepository = require('../../src/repositories/contract.repository');
const { getUserAccessScope } = require('../../src/utils/access-scope');

// Mocks
jest.mock('../../src/repositories/asset.repository');
jest.mock('../../src/repositories/asset-category.repository');
jest.mock('../../src/repositories/supplier.repository');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/repositories/audit-log.repository');
jest.mock('../../src/repositories/cost-center.repository');
jest.mock('../../src/repositories/contract.repository');
jest.mock('../../src/utils/access-scope');

// Mock Prisma
jest.mock('../../src/config/database', () => ({
    prisma: {
        user: { findMany: jest.fn() }
    }
}));

const { prisma } = require('../../src/config/database');

describe('AssetService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default RBAC: Admin
        getUserAccessScope.mockResolvedValue({ isAdmin: true, accessibleCostCenterIds: [] });
    });

    describe('create', () => {
        const validAssetData = {
            code: 'ASSET-001',
            name: 'Notebook Dell',
            categoryId: 'cat-1',
            supplierId: 'supplier-1',
            status: 'ATIVO',
            acquisitionDate: '2025-01-15',
            acquisitionValue: 5000
        };

        const mockCategory = { id: 'cat-1', name: 'Hardware' };
        const mockSupplier = { id: 'supplier-1', name: 'Dell' };

        it('should create an asset successfully', async () => {
            AssetRepository.findByCode.mockResolvedValue(null);
            AssetCategoryRepository.findById.mockResolvedValue(mockCategory);
            SupplierRepository.findById.mockResolvedValue(mockSupplier);
            prisma.user.findMany.mockResolvedValue([]);
            const createdAsset = { id: 'asset-1', ...validAssetData };
            AssetRepository.create.mockResolvedValue(createdAsset);

            const result = await AssetService.create(prisma, validAssetData);

            expect(result.id).toBe('asset-1');
            expect(AssetRepository.create).toHaveBeenCalledWith(prisma, expect.objectContaining({
                code: 'ASSET-001',
                acquisitionDate: expect.any(Date)
            }));
        });

        it('should throw 409 error if asset code already exists', async () => {
            AssetRepository.findByCode.mockResolvedValue({ id: 'existing-asset' });
            await expect(AssetService.create(prisma, validAssetData))
                .rejects
                .toMatchObject({ statusCode: 409 });
        });

        it('should throw 404 error if category not found', async () => {
            AssetRepository.findByCode.mockResolvedValue(null);
            AssetCategoryRepository.findById.mockResolvedValue(null);
            await expect(AssetService.create(prisma, validAssetData))
                .rejects
                .toMatchObject({ statusCode: 404 });
        });

        it('should throw 404 error if supplier is provided but not found', async () => {
            AssetRepository.findByCode.mockResolvedValue(null);
            AssetCategoryRepository.findById.mockResolvedValue(mockCategory);
            SupplierRepository.findById.mockResolvedValue(null);
            await expect(AssetService.create(prisma, validAssetData))
                .rejects
                .toMatchObject({ statusCode: 404 });
        });

        it('should check RBAC on create', async () => {
            console.log('--- START RBAC TEST ---');
            AssetRepository.findByCode.mockResolvedValue(null);
            AssetCategoryRepository.findById.mockResolvedValue(mockCategory);
            SupplierRepository.findById.mockResolvedValue(mockSupplier);
            CostCenterRepository.findById.mockResolvedValue({ id: 'cc-1', code: 'CC01' });

            // Explicitly set the mock return value
            getUserAccessScope.mockResolvedValue({ isAdmin: false, accessibleCostCenterIds: ['other-cc'] });

            try {
                await AssetService.create(prisma, { ...validAssetData, userId: 'user-1', costCenterId: 'cc-1' });
            } catch (e) {
                console.log('DEBUG_ERROR_CAUGHT:', e);
                if (e.statusCode === 403) return; // Pass
                throw e; // Fail with unknown error
            }
            throw new Error('Should have thrown 403 but succeeded');
        });

        it('should convert acquisitionDate to Date object', async () => {
            AssetRepository.findByCode.mockResolvedValue(null);
            AssetCategoryRepository.findById.mockResolvedValue(mockCategory);
            SupplierRepository.findById.mockResolvedValue(mockSupplier);
            prisma.user.findMany.mockResolvedValue([]);
            AssetRepository.create.mockResolvedValue({ id: 'asset-1' });

            await AssetService.create(prisma, validAssetData);

            expect(AssetRepository.create).toHaveBeenCalledWith(prisma, expect.objectContaining({
                acquisitionDate: expect.any(Date)
            }));
        });

        it('should notify admins after asset creation', async () => {
            AssetRepository.findByCode.mockResolvedValue(null);
            AssetCategoryRepository.findById.mockResolvedValue(mockCategory);
            SupplierRepository.findById.mockResolvedValue(mockSupplier);
            prisma.user.findMany.mockResolvedValue([
                { id: 'admin-1', name: 'Admin User' }
            ]);
            AssetRepository.create.mockResolvedValue({ id: 'asset-1', name: 'Notebook Dell', code: 'ASSET-001' });

            await AssetService.create(prisma, validAssetData);

            expect(NotificationService.createNotification).toHaveBeenCalledWith(
                prisma,
                'admin-1',
                'Novo Ativo Cadastrado',
                expect.stringContaining('Notebook Dell'),
                'INFO',
                `/assets`
            );
        });

        it('should create audit log after asset creation', async () => {
            AssetRepository.findByCode.mockResolvedValue(null);
            AssetCategoryRepository.findById.mockResolvedValue(mockCategory);
            SupplierRepository.findById.mockResolvedValue(mockSupplier);
            prisma.user.findMany.mockResolvedValue([]);
            AssetRepository.create.mockResolvedValue({ id: 'asset-1', ...validAssetData });

            await AssetService.create(prisma, { ...validAssetData, createdBy: 'user-123' });

            expect(AuditLogRepository.create).toHaveBeenCalledWith(prisma, expect.objectContaining({
                userId: 'user-123',
                action: 'registrou ativo',
                module: 'ASSETS',
                entityType: 'ASSET'
            }));
        });
    });

    describe('getById', () => {
        it('should return asset when found', async () => {
            const mockAsset = { id: 'asset-1', name: 'Notebook' };
            AssetRepository.findById.mockResolvedValue(mockAsset);

            const result = await AssetService.getById(prisma, 'asset-1');

            expect(result).toEqual(mockAsset);
        });

        it('should throw 404 error if asset not found', async () => {
            AssetRepository.findById.mockResolvedValue(null);
            await expect(AssetService.getById(prisma, 'nonexistent'))
                .rejects
                .toMatchObject({ statusCode: 404 });
        });

        it('should throw 403 if user has no access', async () => {
            AssetRepository.findById.mockResolvedValue({ id: 'asset-1', costCenterId: 'cc-1' });
            getUserAccessScope.mockResolvedValue({ isAdmin: false, accessibleCostCenterIds: ['other-cc'] });

            await expect(AssetService.getById(prisma, 'asset-1', 'user-1'))
                .rejects
                .toMatchObject({ statusCode: 403 });
        });
    });

    describe('update', () => {
        const existingAsset = {
            id: 'asset-1',
            name: 'Original Asset',
            code: 'ASSET-001'
        };

        it('should update asset successfully', async () => {
            AssetRepository.findById.mockResolvedValue(existingAsset);
            AssetRepository.update.mockResolvedValue({ ...existingAsset, name: 'Updated Asset' });

            const result = await AssetService.update(prisma, 'asset-1', { name: 'Updated Asset' });

            expect(result.name).toBe('Updated Asset');
        });

        it('should strip relation fields before update', async () => {
            AssetRepository.findById.mockResolvedValue(existingAsset);
            AssetRepository.update.mockResolvedValue(existingAsset);

            const dataWithRelations = {
                name: 'Updated',
                category: { id: 'cat-1' },
                supplier: { id: 'sup-1' },
                contract: { id: 'contract-1' },
                maintenances: [],
                changes: []
            };

            await AssetService.update(prisma, 'asset-1', dataWithRelations);

            const updateCall = AssetRepository.update.mock.calls[0][1];
            expect(updateCall.category).toBeUndefined();
            expect(updateCall.supplier).toBeUndefined();
            expect(updateCall.contract).toBeUndefined();
            expect(updateCall.maintenances).toBeUndefined();
        });

        it('should convert acquisitionDate to Date object on update', async () => {
            AssetRepository.findById.mockResolvedValue(existingAsset);
            AssetRepository.update.mockResolvedValue(existingAsset);

            await AssetService.update(prisma, 'asset-1', { acquisitionDate: '2025-06-15' });

            expect(AssetRepository.update).toHaveBeenCalledWith(prisma, 'asset-1', expect.objectContaining({
                acquisitionDate: expect.any(Date)
            }));
        });
    });

    describe('delete', () => {
        const existingAsset = { id: 'asset-1', name: 'Asset to Delete', code: 'ASSET-001' };

        it('should delete asset successfully', async () => {
            AssetRepository.findById.mockResolvedValue(existingAsset);
            AssetRepository.delete.mockResolvedValue(true);
            prisma.user.findMany.mockResolvedValue([]);

            const result = await AssetService.delete(prisma, 'asset-1');

            expect(result).toBe(true);
            expect(AssetRepository.delete).toHaveBeenCalledWith(prisma, 'asset-1');
        });

        it('should notify admins after asset deletion', async () => {
            AssetRepository.findById.mockResolvedValue(existingAsset);
            AssetRepository.delete.mockResolvedValue(true);
            prisma.user.findMany.mockResolvedValue([
                { id: 'admin-1', name: 'Admin' }
            ]);

            await AssetService.delete(prisma, 'asset-1');

            expect(NotificationService.createNotification).toHaveBeenCalledWith(
                prisma,
                'admin-1',
                'Ativo Removido',
                expect.stringContaining('Asset to Delete'),
                'WARNING',
                `/assets`
            );
        });

        it('should create audit log after asset deletion', async () => {
            AssetRepository.findById.mockResolvedValue(existingAsset);
            AssetRepository.delete.mockResolvedValue(true);
            prisma.user.findMany.mockResolvedValue([]);

            await AssetService.delete(prisma, 'asset-1');

            expect(AuditLogRepository.create).toHaveBeenCalledWith(prisma, expect.objectContaining({
                action: 'baixou ativo',
                module: 'ASSETS',
                entityType: 'ASSET',
                oldData: existingAsset
            }));
        });
    });
});
