const TaskController = require('../../src/controllers/task.controller');
const TaskService = require('../../src/services/task.service');
jest.mock('../../src/services/task.service');

describe('TaskController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { id: 't1' }, query: {}, user: { userId: 'u1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it('create — 201', async () => {
        TaskService.create.mockResolvedValue({ id: 't1' });
        req.body = { title: 'My Task' };
        await TaskController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('index — 200', async () => {
        TaskService.getAll.mockResolvedValue([]);
        await TaskController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('show — 200', async () => {
        TaskService.getById.mockResolvedValue({ id: 't1' });
        await TaskController.show(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('update — 200', async () => {
        TaskService.update.mockResolvedValue({ id: 't1' });
        req.body = { title: 'Updated' };
        await TaskController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204', async () => {
        TaskService.delete.mockResolvedValue();
        await TaskController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });
});
