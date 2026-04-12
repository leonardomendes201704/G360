const TaskCommentController = require('../../src/controllers/task-comment.controller');
const TaskService = require('../../src/services/task.service');
jest.mock('../../src/services/task.service');

describe('TaskCommentController', () => {
    let req, res;
    beforeEach(() => {
        req = {
            body: { content: 'Great progress!' },
            params: { taskId: 't1', id: 'c1' },
            user: { userId: 'u1' },
            prisma: {
                taskComment: {
                    create: jest.fn().mockResolvedValue({ id: 'c1', content: 'Great progress!' }),
                    findMany: jest.fn().mockResolvedValue([]),
                    findUnique: jest.fn().mockResolvedValue({ id: 'c1', userId: 'u1', taskId: 't1' }),
                    delete: jest.fn().mockResolvedValue()
                }
            }
        };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
        TaskService.getById.mockResolvedValue({ id: 't1' });
    });

    it('create — 201', async () => {
        await TaskCommentController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('create — 400 on empty content', async () => {
        req.body = {};
        await TaskCommentController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('index — 200', async () => {
        await TaskCommentController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204 own comment', async () => {
        await TaskCommentController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('delete — 403 other user comment', async () => {
        req.prisma.taskComment.findUnique.mockResolvedValue({ id: 'c1', userId: 'other', taskId: 't1' });
        await TaskCommentController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('delete — 404 comment not found', async () => {
        req.prisma.taskComment.findUnique.mockResolvedValue(null);
        await TaskCommentController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});
