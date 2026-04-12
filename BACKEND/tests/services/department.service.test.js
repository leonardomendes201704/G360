const DepartmentService = require('../../src/services/department.service');
const DepartmentRepository = require('../../src/repositories/department.repository');

jest.mock('../../src/repositories/department.repository');

// Mock Database
const mockPrisma = {};
jest.mock('../../src/config/database', () => ({
    prisma: mockPrisma
}));

describe('DepartmentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create department', async () => {
            DepartmentRepository.findByCode.mockResolvedValue(null);
            DepartmentRepository.create.mockResolvedValue({ id: 'd1', name: 'Dept' });

            const result = await DepartmentService.create(mockPrisma, { name: 'Dept', code: '01' });

            expect(result.id).toBe('d1');
        });

        it('should throw 409 if code exists', async () => {
            DepartmentRepository.findByCode.mockResolvedValue({ id: 'd1' });

            await expect(DepartmentService.create(mockPrisma, { name: 'Dept', code: '01' }))
                .rejects.toHaveProperty('statusCode', 409);
        });
    });

    describe('update', () => {
        it('should update department', async () => {
            DepartmentRepository.findById.mockResolvedValue({ id: 'd1' });
            DepartmentRepository.update.mockResolvedValue({ id: 'd1', name: 'New' });

            const result = await DepartmentService.update(mockPrisma, 'd1', { name: 'New' });
            expect(result.name).toBe('New');
        });

        it('should throw 404 if not found', async () => {
            DepartmentRepository.findById.mockResolvedValue(null);

            await expect(DepartmentService.update(mockPrisma, 'd1', {}))
                .rejects.toHaveProperty('statusCode', 404);
        });
    });

    describe('delete', () => {
        it('should delete department', async () => {
            DepartmentRepository.findById.mockResolvedValue({ id: 'd1' });
            DepartmentRepository.delete.mockResolvedValue(true);

            await DepartmentService.delete(mockPrisma, 'd1');
            expect(DepartmentRepository.delete).toHaveBeenCalledWith(mockPrisma, 'd1');
        });
    });
});
