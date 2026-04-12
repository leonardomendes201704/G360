const ProjectTaskCommentController = require('../../src/controllers/project-task-comment.controller');
const ProjectService = require('../../src/services/project.service');
jest.mock('../../src/services/project.service');

describe('ProjectTaskCommentController', () => {
    let req, res;
    beforeEach(() => {
        req = {
            body: { content: 'Nice work' },
            params: { taskId: 'pt1', id: 'c1' },
            user: { userId: 'u1' },
            prisma: {
                projectTaskComment: {
                    create: jest.fn().mockResolvedValue({ id: 'c1' }),
                    findMany: jest.fn().mockResolvedValue([]),
                    findUnique: jest.fn().mockResolvedValue({ id: 'c1', userId: 'u1', projectTaskId: 'pt1' }),
                    delete: jest.fn().mockResolvedValue()
                },
                projectTask: {
                    findUnique: jest.fn().mockResolvedValue({ id: 'pt1', projectId: 'p1' })
                }
            }
        };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
        ProjectService.getById.mockResolvedValue({ id: 'p1' });
    });

    it('create — 201', async () => {
        await ProjectTaskCommentController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('index — 200', async () => {
        await ProjectTaskCommentController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204 own comment', async () => {
        await ProjectTaskCommentController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('delete — 403 other user', async () => {
        req.prisma.projectTaskComment.findUnique.mockResolvedValue({ id: 'c1', userId: 'other', projectTaskId: 'pt1' });
        await ProjectTaskCommentController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('delete — 404 not found', async () => {
        req.prisma.projectTaskComment.findUnique.mockResolvedValue(null);
        await ProjectTaskCommentController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});
