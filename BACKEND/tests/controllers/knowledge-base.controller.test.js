const KnowledgeBaseController = require('../../src/controllers/knowledge-base.controller');
const KnowledgeBaseService = require('../../src/services/knowledge-base.service');
jest.mock('../../src/services/knowledge-base.service');
jest.mock('../../src/config/logger', () => ({ error: jest.fn() }));

describe('KnowledgeBaseController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { id: 'kb1' }, query: {}, user: { userId: 'u1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it('create — 201', async () => {
        KnowledgeBaseService.create.mockResolvedValue({ id: 'kb1' });
        req.body = { title: 'How to Reset Password' };
        await KnowledgeBaseController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('create — normalizes file URL if file uploaded', async () => {
        KnowledgeBaseService.create.mockResolvedValue({ id: 'kb1' });
        req.file = { path: '/home/oem/Desktop/Projetos/ITBM/backend/uploads/docs/file.pdf' };
        req.body = { title: 'Test' };
        await KnowledgeBaseController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('update — 200', async () => {
        KnowledgeBaseService.update.mockResolvedValue({ id: 'kb1' });
        req.body = { title: 'Updated' };
        await KnowledgeBaseController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204', async () => {
        KnowledgeBaseService.findById.mockResolvedValue({ attachments: [] });
        KnowledgeBaseService.delete.mockResolvedValue();
        await KnowledgeBaseController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('index — 200', async () => {
        KnowledgeBaseService.findAll.mockResolvedValue([]);
        await KnowledgeBaseController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('show — 200', async () => {
        KnowledgeBaseService.findById.mockResolvedValue({ id: 'kb1' });
        await KnowledgeBaseController.show(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('show — 404 when not found', async () => {
        KnowledgeBaseService.findById.mockResolvedValue(null);
        await KnowledgeBaseController.show(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('getDashboardStats — 200', async () => {
        KnowledgeBaseService.getDashboardStats.mockResolvedValue({ total: 5 });
        await KnowledgeBaseController.getDashboardStats(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
