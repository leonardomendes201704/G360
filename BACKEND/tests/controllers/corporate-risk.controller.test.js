// CorporateRiskController uses exports.* pattern (NOT class)
const CorporateRiskService = require('../../src/services/corporate-risk.service');
jest.mock('../../src/services/corporate-risk.service');
jest.mock('../../src/config/logger', () => ({ error: jest.fn() }));

const CorporateRiskController = require('../../src/controllers/corporate-risk.controller');

describe('CorporateRiskController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { id: 'r1' }, query: {}, user: { userId: 'u1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it('creates a risk — 201', async () => {
        CorporateRiskService.create.mockResolvedValue({ id: 'r1' });
        req.body = { title: 'Data breach', probability: 3, impact: 5 };
        await CorporateRiskController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('lists risks — 200', async () => {
        CorporateRiskService.findAll.mockResolvedValue([]);
        await CorporateRiskController.findAll(req, res);
        expect(res.json).toHaveBeenCalledWith([]);
    });

    it('gets single risk — 200', async () => {
        CorporateRiskService.findById.mockResolvedValue({ id: 'r1' });
        await CorporateRiskController.findById(req, res);
        expect(res.json).toHaveBeenCalledWith({ id: 'r1' });
    });

    it('gets single — 404 when not found', async () => {
        CorporateRiskService.findById.mockResolvedValue(null);
        await CorporateRiskController.findById(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('updates a risk', async () => {
        CorporateRiskService.update.mockResolvedValue({ id: 'r1' });
        req.body = { title: 'Updated' };
        await CorporateRiskController.update(req, res);
        expect(res.json).toHaveBeenCalledWith({ id: 'r1' });
    });

    it('deletes a risk — 204', async () => {
        CorporateRiskService.delete.mockResolvedValue();
        await CorporateRiskController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('getHeatmap — 200', async () => {
        CorporateRiskService.getHeatmapMetrics.mockResolvedValue({ data: [] });
        await CorporateRiskController.getHeatmap(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    // Error path tests for branch coverage
    it('create — error with statusCode', async () => {
        const err = new Error('Validation failed'); err.statusCode = 400;
        CorporateRiskService.create.mockRejectedValue(err);
        await CorporateRiskController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('create — error without statusCode falls to 500', async () => {
        CorporateRiskService.create.mockRejectedValue(new Error('DB crash'));
        await CorporateRiskController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('findAll — error path', async () => {
        CorporateRiskService.findAll.mockRejectedValue(new Error('DB error'));
        await CorporateRiskController.findAll(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('findById — error path', async () => {
        const err = new Error('Forbidden'); err.statusCode = 403;
        CorporateRiskService.findById.mockRejectedValue(err);
        await CorporateRiskController.findById(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('update — error path', async () => {
        CorporateRiskService.update.mockRejectedValue(new Error('Not found'));
        await CorporateRiskController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('delete — error with statusCode', async () => {
        const err = new Error('Access denied'); err.statusCode = 403;
        CorporateRiskService.delete.mockRejectedValue(err);
        await CorporateRiskController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('getHeatmap — error path', async () => {
        CorporateRiskService.getHeatmapMetrics.mockRejectedValue(new Error('Error'));
        await CorporateRiskController.getHeatmap(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
