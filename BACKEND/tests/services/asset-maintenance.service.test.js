const AssetMaintenanceService = require('../../src/services/asset-maintenance.service');
const AssetMaintenanceRepository = require('../../src/repositories/asset-maintenance.repository');
const AssetRepository = require('../../src/repositories/asset.repository');
const AssetService = require('../../src/services/asset.service');
const { prisma } = require('../../src/config/database');

jest.mock('../../src/repositories/asset-maintenance.repository');
jest.mock('../../src/repositories/asset.repository');
jest.mock('../../src/services/asset.service');
jest.mock('../../src/config/database', () => ({
    prisma: {
        assetMaintenance: {
            findUnique: jest.fn()
        }
    }
}));

describe('AssetMaintenanceService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should throw 404 if asset not found', async () => {
            AssetService.getById.mockResolvedValue(null);
            await expect(AssetMaintenanceService.create(prisma, 't1', 1, {}, 1))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should throw 400 if end date < start date', async () => {
            AssetService.getById.mockResolvedValue({ id: 1 });
            await expect(AssetMaintenanceService.create(prisma, 't1', 1, {
                startDate: '2024-02-01',
                endDate: '2024-01-01'
            }, 1)).rejects.toMatchObject({ statusCode: 400 });
        });

        it('should create maintenance and update asset status', async () => {
            AssetService.getById.mockResolvedValue({ id: 1 });
            AssetMaintenanceRepository.create.mockResolvedValue({ id: 100 });

            await AssetMaintenanceService.create(prisma, 't1', 1, {
                startDate: '2024-01-01',
                status: 'EM_ANDAMENTO'
            }, 1);

            expect(AssetRepository.update).toHaveBeenCalledWith(prisma, 1, { status: 'MANUTENCAO' });
        });
    });

    describe('update', () => {
        it('should throw 404 if maintenance not found', async () => {
            prisma.assetMaintenance.findUnique.mockResolvedValue(null);
            await expect(AssetMaintenanceService.update(prisma, 1, 't1', {}, 1))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should update successfully', async () => {
            prisma.assetMaintenance.findUnique.mockResolvedValue({ id: 1, assetId: 10 });
            AssetService.getById.mockResolvedValue({ id: 10 });
            AssetMaintenanceRepository.update.mockResolvedValue({ id: 1, description: 'Updated' });

            const result = await AssetMaintenanceService.update(prisma, 1, 't1', { description: 'Updated' }, 1);
            expect(result).toEqual({ id: 1, description: 'Updated' });
        });
    });
});
