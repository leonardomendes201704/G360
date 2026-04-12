const ProjectTaskAttachmentController = require('../../src/controllers/project-task-attachment.controller');
const ProjectService = require('../../src/services/project.service');
jest.mock('../../src/services/project.service');
jest.mock('../../src/config/logger', () => ({ error: jest.fn() }));

describe('ProjectTaskAttachmentController', () => {
    let req, res;
    beforeEach(() => {
        req = {
            params: { taskId: 'pt1', id: 'att1' },
            user: { userId: 'u1' },
            file: { originalname: 'plan.xlsx', path: '/tmp/plan.xlsx', size: 2048, mimetype: 'application/vnd.ms-excel' },
            prisma: {
                projectTaskAttachment: {
                    create: jest.fn().mockResolvedValue({ id: 'att1' }),
                    findMany: jest.fn().mockResolvedValue([]),
                    findUnique: jest.fn().mockResolvedValue({ id: 'att1', fileUrl: '/uploads/plan.xlsx', projectTaskId: 'pt1' }),
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
        await ProjectTaskAttachmentController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('create — 400 without file', async () => {
        req.file = undefined;
        await ProjectTaskAttachmentController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('create — 404 task not found', async () => {
        req.prisma.projectTask.findUnique.mockResolvedValue(null);
        await ProjectTaskAttachmentController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('index — 200', async () => {
        await ProjectTaskAttachmentController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204', async () => {
        jest.spyOn(require('fs'), 'existsSync').mockReturnValue(false);
        await ProjectTaskAttachmentController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('delete — 404 not found', async () => {
        req.prisma.projectTaskAttachment.findUnique.mockResolvedValue(null);
        await ProjectTaskAttachmentController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});
