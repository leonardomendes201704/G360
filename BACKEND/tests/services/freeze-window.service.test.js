const FreezeWindowService = require('../../src/services/freeze-window.service');
const FreezeWindowRepository = require('../../src/repositories/freeze-window.repository');

jest.mock('../../src/repositories/freeze-window.repository');

describe('FreezeWindowService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    const prisma = {};

    describe('create', () => {
        it('should throw error if start date > end date', async () => {
            const data = {
                startDate: '2024-01-02',
                endDate: '2024-01-01'
            };
            await expect(FreezeWindowService.create(prisma, data))
                .rejects.toMatchObject({ statusCode: 400 });
        });

        it('should create freeze window if dates are valid', async () => {
            const data = {
                startDate: '2024-01-01',
                endDate: '2024-01-02',
                reason: 'Test'
            };
            FreezeWindowRepository.create.mockResolvedValue({ id: 1, ...data });

            const result = await FreezeWindowService.create(prisma, data);
            expect(result).toEqual({ id: 1, ...data });
        });
    });

    describe('update', () => {
        it('should validate dates on update', async () => {
            const data = {
                startDate: '2024-02-02',
                endDate: '2024-02-01'
            };
            await expect(FreezeWindowService.update(prisma, 1, data))
                .rejects.toMatchObject({ statusCode: 400 });
        });

        it('should update successfully', async () => {
            const data = { reason: 'Updated' };
            FreezeWindowRepository.update.mockResolvedValue({ id: 1, ...data });

            const result = await FreezeWindowService.update(prisma, 1, data);
            expect(result).toEqual({ id: 1, ...data });
        });
    });

    describe('checkFreeze', () => {
        it('should call repository findOverlapping', async () => {
            await FreezeWindowService.checkFreeze(prisma, '2024-01-01', '2024-01-02');
            expect(FreezeWindowRepository.findOverlapping).toHaveBeenCalledWith(prisma, '2024-01-01', '2024-01-02');
        });
    });
});
