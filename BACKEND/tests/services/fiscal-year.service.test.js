const FiscalYearService = require('../../src/services/fiscal-year.service');
const FiscalYearRepository = require('../../src/repositories/fiscal-year.repository');
const { prisma } = require('../../src/config/database');

jest.mock('../../src/repositories/fiscal-year.repository');
jest.mock('../../src/config/database', () => ({
    prisma: {
        budget: {
            count: jest.fn()
        }
    }
}));

describe('FiscalYearService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should throw 409 if year already exists', async () => {
            FiscalYearRepository.findByYear.mockResolvedValue({ id: 1 });
            await expect(FiscalYearService.create(prisma, { year: 2024 }))
                .rejects.toMatchObject({ statusCode: 409 });
        });

        it('should throw 400 if dates invalid (end < start)', async () => {
            FiscalYearRepository.findByYear.mockResolvedValue(null);
            await expect(FiscalYearService.create(prisma, {
                year: 2024,
                startDate: '2024-12-31',
                endDate: '2024-01-01'
            })).rejects.toMatchObject({ statusCode: 400 });
        });

        it('should create successfully', async () => {
            FiscalYearRepository.findByYear.mockResolvedValue(null);
            FiscalYearRepository.create.mockResolvedValue({ id: 1, year: 2024 });

            const result = await FiscalYearService.create(prisma, {
                year: 2024,
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            });

            expect(result).toEqual({ id: 1, year: 2024 });
        });
    });

    describe('update', () => {
        it('should throw 404 if not found', async () => {
            FiscalYearRepository.findById.mockResolvedValue(null);
            await expect(FiscalYearService.update(prisma, 1, {}))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should validate dates on update', async () => {
            FiscalYearRepository.findById.mockResolvedValue({ id: 1 });
            await expect(FiscalYearService.update(prisma, 1, {
                startDate: '2024-12-31',
                endDate: '2024-01-01'
            })).rejects.toMatchObject({ statusCode: 400 });
        });
    });

    describe('delete', () => {
        it('should throw 400 if budgets exist', async () => {
            prisma.budget.count.mockResolvedValue(5);
            await expect(FiscalYearService.delete(prisma, 1))
                .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('vinculados') });
        });

        it('should delete if no budgets', async () => {
            prisma.budget.count.mockResolvedValue(0);
            FiscalYearRepository.delete.mockResolvedValue({ id: 1 });

            const result = await FiscalYearService.delete(prisma, 1);
            expect(result).toEqual({ id: 1 });
        });
    });
});
