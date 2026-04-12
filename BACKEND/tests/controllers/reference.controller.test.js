const ReferenceController = require('../../src/controllers/reference.controller');
jest.mock('../../src/config/logger', () => ({ error: jest.fn() }));

describe('ReferenceController', () => {
    let req, res;
    beforeEach(() => {
        req = { prisma: {}, user: { userId: 'u1' } };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    const methods = [
        { name: 'getSuppliers', model: 'supplier' },
        { name: 'getAccounts', model: 'accountingAccount' },
        { name: 'getCostCenters', model: 'costCenter' },
        { name: 'getContracts', model: 'contract' },
        { name: 'getUsers', model: 'user' }
    ];

    methods.forEach(({ name, model }) => {
        it(`${name} — returns lightweight list`, async () => {
            req.prisma[model] = { findMany: jest.fn().mockResolvedValue([{ id: '1', name: 'Test' }]) };
            await ReferenceController[name](req, res);
            expect(res.json).toHaveBeenCalledWith([{ id: '1', name: 'Test' }]);
        });

        it(`${name} — 500 on error`, async () => {
            req.prisma[model] = { findMany: jest.fn().mockRejectedValue(new Error('DB')) };
            await ReferenceController[name](req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
