const FiscalYearController = require('../../src/controllers/fiscal-year.controller');
const FiscalYearService = require('../../src/services/fiscal-year.service');
jest.mock('../../src/services/fiscal-year.service');

describe('FiscalYearController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { id: 'fy1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it('create — 201 with valid data', async () => {
        FiscalYearService.create.mockResolvedValue({ id: 'fy1' });
        req.body = { year: 2025, startDate: '2025-01-01', endDate: '2025-12-31' };
        await FiscalYearController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('create — 400 on missing year', async () => {
        req.body = { startDate: '2025-01-01', endDate: '2025-12-31' };
        await FiscalYearController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('index — 200', async () => {
        FiscalYearService.getAll.mockResolvedValue([]);
        await FiscalYearController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('update — 200', async () => {
        FiscalYearService.update.mockResolvedValue({ id: 'fy1' });
        req.body = { year: 2026 };
        await FiscalYearController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204', async () => {
        FiscalYearService.delete.mockResolvedValue();
        await FiscalYearController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });
});
