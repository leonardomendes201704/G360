const AssetCategoryController = require('../../src/controllers/asset-category.controller');
const AssetCategoryService = require('../../src/services/asset-category.service');
jest.mock('../../src/services/asset-category.service');

describe('AssetCategoryController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { id: 'ac1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it('create — 201', async () => {
        AssetCategoryService.create.mockResolvedValue({ id: 'ac1' });
        req.body = { name: 'Servers', type: 'HARDWARE' };
        await AssetCategoryController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('create — 400 on invalid type', async () => {
        req.body = { name: 'Test', type: 'INVALID' };
        await AssetCategoryController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('index — 200', async () => {
        AssetCategoryService.getAll.mockResolvedValue([]);
        await AssetCategoryController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('update — 200', async () => {
        AssetCategoryService.update.mockResolvedValue({ id: 'ac1' });
        req.body = { name: 'Updated' };
        await AssetCategoryController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204', async () => {
        AssetCategoryService.delete.mockResolvedValue();
        await AssetCategoryController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });
});
