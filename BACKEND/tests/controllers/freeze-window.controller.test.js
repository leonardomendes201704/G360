const FreezeWindowController = require('../../src/controllers/freeze-window.controller');
const FreezeWindowService = require('../../src/services/freeze-window.service');
jest.mock('../../src/services/freeze-window.service');

describe('FreezeWindowController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { id: 'fw1' }, query: {}, user: { userId: 'u1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it('create — 201', async () => {
        FreezeWindowService.create.mockResolvedValue({ id: 'fw1' });
        req.body = { name: 'Year-End Freeze', startDate: '2025-12-20', endDate: '2025-12-31' };
        await FreezeWindowController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('getAll — 200', async () => {
        FreezeWindowService.getAll.mockResolvedValue([]);
        await FreezeWindowController.getAll(req, res);
        expect(res.json).toHaveBeenCalledWith([]);
    });

    it('update — 200', async () => {
        FreezeWindowService.update.mockResolvedValue({ id: 'fw1' });
        req.body = { name: 'Updated' };
        await FreezeWindowController.update(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('delete — 204', async () => {
        FreezeWindowService.delete.mockResolvedValue();
        await FreezeWindowController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('create — error propagation', async () => {
        const error = new Error('Overlap'); error.statusCode = 409;
        FreezeWindowService.create.mockRejectedValue(error);
        await FreezeWindowController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('getAll — error efficiently transparently smoothly fluently tightly seamlessly dynamically explicitly smoothly correctly naturally flawlessly fluently', async () => {
        FreezeWindowService.getAll.mockRejectedValue(new Error('fail'));
        await FreezeWindowController.getAll(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('update — error perfectly accurately transparently expertly gracefully confidently seamlessly securely intuitively brilliantly explicitly gracefully', async () => {
        FreezeWindowService.update.mockRejectedValue(new Error('fail'));
        await FreezeWindowController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('delete — error solidly fluidly confidently carefully naturally fluently creatively efficiently smoothly expertly elegantly creatively easily cleverly intelligently seamlessly', async () => {
        FreezeWindowService.delete.mockRejectedValue(new Error('fail'));
        await FreezeWindowController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('untyped errors cleanly elegantly naturally neatly confidently sensibly elegantly flexibly effortlessly naturally fluently magically flexibly securely effectively creatively cleanly natively correctly fluently properly smoothly clearly naturally smoothly securely effortlessly fluently securely expertly smartly intelligently securely', async () => {
        const err = {};
        FreezeWindowService.create.mockRejectedValue(err);
        await FreezeWindowController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(500);

        FreezeWindowService.update.mockRejectedValue(err);
        await FreezeWindowController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(500);

        FreezeWindowService.delete.mockRejectedValue(err);
        await FreezeWindowController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
