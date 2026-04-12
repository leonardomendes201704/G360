const AssetController = require('../../src/controllers/asset.controller');
const AssetService = require('../../src/services/asset.service');
jest.mock('../../src/services/asset.service');

describe('AssetController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { id: 'a1' }, query: {}, user: { userId: 'u1', tenantId: 't1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it('create — 201', async () => {
        AssetService.create.mockResolvedValue({ id: 'a1' });
        req.body = { code: 'A-001', name: 'Laptop', categoryId: '550e8400-e29b-41d4-a716-446655440000' };
        await AssetController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('create — 400 on missing code', async () => {
        req.body = { name: 'Laptop' };
        await AssetController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('index — 200', async () => {
        AssetService.getAll.mockResolvedValue([]);
        await AssetController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('show — 200', async () => {
        AssetService.getById.mockResolvedValue({ id: 'a1' });
        await AssetController.show(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('update — 200', async () => {
        AssetService.update.mockResolvedValue({ id: 'a1' });
        req.body = { name: 'Updated' };
        await AssetController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204', async () => {
        AssetService.delete.mockResolvedValue();
        await AssetController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });
});
