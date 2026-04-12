// Mock definitions must come before requires that use them
const mockPrisma = {
    user: {
        findUnique: jest.fn()
    },
    department: {
        findMany: jest.fn()
    }
};

jest.mock('../../src/config/database', () => ({
    prisma: mockPrisma
}));

jest.mock('../../src/repositories/cost-center.repository');

const CostCenterRepository = require('../../src/repositories/cost-center.repository');
const CostCenterService = require('../../src/services/cost-center.service');

describe('CostCenterService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a cost center successfully if code is unique', async () => {
            // ARRANGE
            const data = { code: '123', name: 'IT' };
            CostCenterRepository.findByCode.mockResolvedValue(null);
            CostCenterRepository.create.mockResolvedValue({ id: 'cc-1', ...data });

            // ACT
            const result = await CostCenterService.create(mockPrisma, data);

            // ASSERT
            expect(CostCenterRepository.findByCode).toHaveBeenCalledWith(mockPrisma, '123');
            expect(CostCenterRepository.create).toHaveBeenCalledWith(mockPrisma, data);
            expect(result.id).toBe('cc-1');
        });

        it('should throw 409 if code already exists', async () => {
            // ARRANGE
            CostCenterRepository.findByCode.mockResolvedValue({ id: 'existing' });

            // ACT & ASSERT
            // ACT & ASSERT
            await expect(CostCenterService.create(mockPrisma, { code: '123' }))
                .rejects
                .toEqual(expect.objectContaining({
                    statusCode: 409,
                    message: expect.stringContaining('já existe')
                }));
        });
    });

    describe('getAll', () => {
        it('should return all cost centers if no userId provided', async () => {
            // ARRANGE
            CostCenterRepository.findAll.mockResolvedValue([{ id: 'cc-1' }]);

            // ACT
            const result = await CostCenterService.getAll(mockPrisma);

            // ASSERT
            expect(CostCenterRepository.findAll).toHaveBeenCalledWith(mockPrisma);
            expect(result).toHaveLength(1);
        });

        it('should return empty list if user not found', async () => {
            // ARRANGE
            mockPrisma.user.findUnique.mockResolvedValue(null);

            // ACT
            const result = await CostCenterService.getAll(mockPrisma, 'user-999');

            // ASSERT
            expect(result).toEqual([]);
        });

        it('should return all cost centers for Admin', async () => {
            // ARRANGE
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'admin-1',
                email: 'admin@test.com',
                roles: [{ name: 'Super Admin' }]
            });
            CostCenterRepository.findAll.mockResolvedValue([{ id: 'cc-1' }, { id: 'cc-2' }]);

            // ACT
            const result = await CostCenterService.getAll(mockPrisma, 'admin-1');

            // ASSERT
            expect(CostCenterService.getAll).toBeDefined(); // sanity
            expect(CostCenterRepository.findAll).toHaveBeenCalledWith(mockPrisma); // No filter
            expect(result).toHaveLength(2);
        });

        it('should apply filters for Manager/Director', async () => {
            // ARRANGE
            // User is NOT Admin, but is Manager of cc-1 and Director of Department of cc-2
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                email: 'user@test.com',
                roles: [{ name: 'Manager' }],
                costCenterId: 'cc-3' // Member of cc-3
            });

            // Is Director of Dept 100
            mockPrisma.department.findMany.mockResolvedValue([{ id: 'dept-100' }]);

            CostCenterRepository.findAll.mockResolvedValue([{ id: 'cc-1' }]);

            // ACT
            await CostCenterService.getAll(mockPrisma, 'user-1');

            // ASSERT
            expect(CostCenterRepository.findAll).toHaveBeenCalledWith(mockPrisma, expect.objectContaining({
                OR: expect.arrayContaining([
                    { managerId: 'user-1' },
                    { departmentId: { in: ['dept-100'] } },
                    { id: 'cc-3' }
                ])
            }));
        });
    });

    describe('update', () => {
        it('should update successfully if exists', async () => {
            CostCenterRepository.findById.mockResolvedValue({ id: 'cc-1' });
            CostCenterRepository.update.mockResolvedValue({ id: 'cc-1', name: 'Updated' });

            const result = await CostCenterService.update(mockPrisma, 'cc-1', { name: 'Updated' });
            expect(result.name).toBe('Updated');
        });

        it('should throw 404 if not found', async () => {
            CostCenterRepository.findById.mockResolvedValue(null);
            await expect(CostCenterService.update(mockPrisma, 'cc-1', {}))
                .rejects.toHaveProperty('statusCode', 404);
        });
    });

    describe('delete', () => {
        it('should delete successfully if exists', async () => {
            CostCenterRepository.findById.mockResolvedValue({ id: 'cc-1' });
            CostCenterRepository.delete.mockResolvedValue({ id: 'cc-1' });

            await CostCenterService.delete(mockPrisma, 'cc-1');
            expect(CostCenterRepository.delete).toHaveBeenCalledWith(mockPrisma, 'cc-1');
        });

        it('should throw 404 if not found', async () => {
            CostCenterRepository.findById.mockResolvedValue(null);
            await expect(CostCenterService.delete(mockPrisma, 'cc-1'))
                .rejects.toHaveProperty('statusCode', 404);
        });
    });
});
