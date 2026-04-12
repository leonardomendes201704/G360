const BudgetRepository = require('../../src/repositories/budget.repository');

describe('BudgetRepository', () => {
    let prisma;
    beforeEach(() => {
        prisma = {
            budget: {
                create: jest.fn().mockResolvedValue({ id: 'b1' }),
                findMany: jest.fn().mockResolvedValue([]),
                findUnique: jest.fn().mockResolvedValue({ id: 'b1' }),
                update: jest.fn().mockResolvedValue({ id: 'b1' }),
                delete: jest.fn().mockResolvedValue()
            }
        };
    });

    it('create', async () => {
        const result = await BudgetRepository.create(prisma, { name: 'FY25' });
        expect(result.id).toBe('b1');
    });

    it('findAll — no cost center filter', async () => {
        await BudgetRepository.findAll(prisma);
        expect(prisma.budget.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });

    it('findAll — with cost center filter', async () => {
        await BudgetRepository.findAll(prisma, ['cc1', 'cc2']);
        const call = prisma.budget.findMany.mock.calls[0][0];
        expect(call.where.OR).toBeDefined();
    });

    it('findAll — empty cost center array returns no access', async () => {
        await BudgetRepository.findAll(prisma, []);
        const call = prisma.budget.findMany.mock.calls[0][0];
        expect(call.where.id).toBe('__NO_ACCESS__');
    });

    it('findById', async () => {
        const result = await BudgetRepository.findById(prisma, 'b1');
        expect(result.id).toBe('b1');
    });
});
