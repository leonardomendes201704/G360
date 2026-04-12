const AccountService = require('../../src/services/account.service');
jest.mock('../../src/services/account.service');
jest.mock('../../src/config/logger', () => ({ error: jest.fn() }));

const AccountController = require('../../src/controllers/account.controller');

describe('AccountController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { id: 'ac1' }, query: {}, user: { userId: 'u1', costCenterId: 'cc1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it('create — 201', async () => {
        AccountService.create.mockResolvedValue({ id: 'ac1' });
        req.body = { code: '101', name: 'Cloud Hosting', type: 'OPEX', costCenterId: '550e8400-e29b-41d4-a716-446655440000' };
        await AccountController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('create — uses user costCenterId as fallback', async () => {
        AccountService.create.mockResolvedValue({ id: 'ac1' });
        req.body = { code: '101', name: 'Cloud Hosting', type: 'OPEX' };
        await AccountController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('create — 400 on validation error', async () => {
        req.body = { code: '101' }; // Missing name and type
        await AccountController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('index — 200', async () => {
        AccountService.getAll.mockResolvedValue([]);
        AccountService.getAllForCostCenter.mockResolvedValue([]);
        await AccountController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('update — 200', async () => {
        AccountService.update.mockResolvedValue({ id: 'ac1' });
        req.body = { name: 'Updated' };
        await AccountController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204', async () => {
        AccountService.delete.mockResolvedValue();
        await AccountController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    // Error path tests for branch coverage
    it('create — service error with statusCode', async () => {
        const err = new Error('Duplicate'); err.statusCode = 409;
        AccountService.create.mockRejectedValue(err);
        req.body = { code: '101', name: 'Test', type: 'OPEX' };
        await AccountController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('create — generic 500 on unknown error', async () => {
        AccountService.create.mockRejectedValue(new Error('Unknown'));
        req.body = { code: '101', name: 'Test', type: 'OPEX' };
        await AccountController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('index — filters by costCenterId from query', async () => {
        req.query = { costCenterId: 'cc-query' };
        req.user.costCenterId = undefined;
        AccountService.getAllForCostCenter.mockResolvedValue([]);
        await AccountController.index(req, res);
        expect(AccountService.getAllForCostCenter).toHaveBeenCalledWith(req.prisma, 'cc-query');
    });

    it('index — uses getAll when no costCenterId', async () => {
        req.user.costCenterId = undefined;
        req.query = {};
        AccountService.getAll.mockResolvedValue([]);
        await AccountController.index(req, res);
        expect(AccountService.getAll).toHaveBeenCalled();
    });

    it('index — error path', async () => {
        AccountService.getAll.mockRejectedValue(new Error('DB error'));
        req.user.costCenterId = undefined;
        req.query = {};
        await AccountController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('update — validation error 400', async () => {
        req.body = { type: 'INVALID_TYPE' };
        await AccountController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('update — service error with statusCode', async () => {
        const err = new Error('Not found'); err.statusCode = 404;
        AccountService.update.mockRejectedValue(err);
        req.body = { name: 'Test' };
        await AccountController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('update — generic 500 on unknown error', async () => {
        AccountService.update.mockRejectedValue(new Error('Crash'));
        req.body = { name: 'Test' };
        await AccountController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('delete — FK constraint error P2003', async () => {
        const err = new Error('FK error'); err.code = 'P2003';
        AccountService.delete.mockRejectedValue(err);
        await AccountController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('delete — FK constraint error 23503 message', async () => {
        AccountService.delete.mockRejectedValue(new Error('violates foreign key constraint 23503'));
        await AccountController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('delete — service error with statusCode', async () => {
        const err = new Error('Has dependencies'); err.statusCode = 400; err.dependencies = ['budget_items'];
        AccountService.delete.mockRejectedValue(err);
        await AccountController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('delete — generic 500 error', async () => {
        AccountService.delete.mockRejectedValue(new Error('Unknown'));
        await AccountController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
