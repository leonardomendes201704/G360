const ProjectTaskController = require('../../src/controllers/project-task.controller');
const ProjectTaskService = require('../../src/services/project-task.service');
jest.mock('../../src/services/project-task.service');

describe('ProjectTaskController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { id: 'pt1', projectId: 'p1' }, query: {}, user: { userId: 'u1', tenantId: 't1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it('create — 201', async () => {
        ProjectTaskService.create.mockResolvedValue({ id: 'pt1' });
        req.body = { title: 'Task 1' };
        await ProjectTaskController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('update — 200', async () => {
        ProjectTaskService.update.mockResolvedValue({ id: 'pt1' });
        req.body = { title: 'Updated' };
        await ProjectTaskController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('indexByProject — 200', async () => {
        ProjectTaskService.getByProject.mockResolvedValue([]);
        await ProjectTaskController.indexByProject(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204', async () => {
        ProjectTaskService.delete.mockResolvedValue();
        await ProjectTaskController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });
});
