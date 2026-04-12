const KnowledgeCategoryController = require('../../src/controllers/knowledge-category.controller');
const KnowledgeCategoryService = require('../../src/services/knowledge-category.service');
jest.mock('../../src/services/knowledge-category.service');
jest.mock('../../src/config/logger', () => ({ error: jest.fn() }));

describe('KnowledgeCategoryController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { id: 'kc1' }, query: {}, user: { userId: 'u1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it('create — 201', async () => {
        KnowledgeCategoryService.create.mockResolvedValue({ id: 'kc1' });
        req.body = { name: 'Troubleshooting' };
        await KnowledgeCategoryController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('create — 400 on duplicate (P2002)', async () => {
        const err = new Error('Dup'); err.code = 'P2002';
        KnowledgeCategoryService.create.mockRejectedValue(err);
        req.body = { name: 'Dup' };
        await KnowledgeCategoryController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('update — 200', async () => {
        KnowledgeCategoryService.update.mockResolvedValue({ id: 'kc1' });
        req.body = { name: 'Updated' };
        await KnowledgeCategoryController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204', async () => {
        KnowledgeCategoryService.delete.mockResolvedValue();
        await KnowledgeCategoryController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('index — 200', async () => {
        KnowledgeCategoryService.findAll.mockResolvedValue([]);
        await KnowledgeCategoryController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('show — 200', async () => {
        KnowledgeCategoryService.findById.mockResolvedValue({ id: 'kc1' });
        await KnowledgeCategoryController.show(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('show — 404 when not found', async () => {
        KnowledgeCategoryService.findById.mockResolvedValue(null);
        await KnowledgeCategoryController.show(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('seedDefaults — 200', async () => {
        KnowledgeCategoryService.seedDefaults.mockResolvedValue([]);
        await KnowledgeCategoryController.seedDefaults(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
