const AccountService = require('../../src/services/account.service');
const AccountRepository = require('../../src/repositories/account.repository');

jest.mock('../../src/repositories/account.repository');
jest.mock('../../src/config/database', () => ({
    prisma: {
        account: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() }
    }
}));
const { prisma } = require('../../src/config/database');

describe('AccountService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should throw 409 if code already exists', async () => {
            AccountRepository.findByCode.mockResolvedValue({ id: 1 });

            await expect(AccountService.create(prisma, { code: '1.0.0' }))
                .rejects.toMatchObject({ statusCode: 409 });
        });

        it('should throw 400 if parent account not found', async () => {
            AccountRepository.findByCode.mockResolvedValue(null);
            AccountRepository.findById.mockResolvedValue(null);

            await expect(AccountService.create(prisma, { code: '1.1.0', parentId: 99 }))
                .rejects.toMatchObject({ statusCode: 400 });
        });

        it('should create account successfully', async () => {
            AccountRepository.findByCode.mockResolvedValue(null);
            // No parent
            const mockAcct = { id: 1, code: '1.0.0' };
            AccountRepository.create.mockResolvedValue(mockAcct);

            const result = await AccountService.create(prisma, { code: '1.0.0' });
            expect(result).toEqual(mockAcct);
        });
    });

    describe('delete', () => {
        it('should throw 404 if account not found', async () => {
            AccountRepository.findById.mockResolvedValue(null);
            await expect(AccountService.delete(prisma, 1))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should throw 400 if account has dependencies', async () => {
            AccountRepository.findById.mockResolvedValue({ id: 1 });
            AccountRepository.checkDependencies.mockResolvedValue({
                hasDependencies: true,
                budgetItemsCount: 5,
                expensesCount: 0,
                contractsCount: 0
            });

            await expect(AccountService.delete(prisma, 1))
                .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('5 item(ns) de orçamento') });
        });

        it('should delete if no dependencies', async () => {
            AccountRepository.findById.mockResolvedValue({ id: 1 });
            AccountRepository.checkDependencies.mockResolvedValue({ hasDependencies: false });
            AccountRepository.delete.mockResolvedValue(true);

            const result = await AccountService.delete(prisma, 1);
            expect(result).toBe(true);
        });
    });

    describe('getAllForCostCenter', () => {
        it('should return all if no cost center provided', async () => {
            AccountService.getAllForCostCenter(prisma, null);
            expect(AccountRepository.findAll).toHaveBeenCalled();
        });

        it('should call specific repo method if cost center provided', async () => {
            AccountService.getAllForCostCenter(prisma, 10);
            expect(AccountRepository.findAllForCostCenter).toHaveBeenCalledWith(prisma, 10);
        });
    });
});
