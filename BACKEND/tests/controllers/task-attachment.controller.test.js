const TaskAttachmentController = require('../../src/controllers/task-attachment.controller');
const TaskService = require('../../src/services/task.service');
jest.mock('../../src/services/task.service');
jest.mock('../../src/config/logger', () => ({ error: jest.fn() }));

describe('TaskAttachmentController', () => {
    let req, res;
    beforeEach(() => {
        req = {
            params: { taskId: 't1', id: 'att1' },
            user: { userId: 'u1' },
            file: { originalname: 'doc.pdf', path: '/tmp/doc.pdf', size: 1024, mimetype: 'application/pdf' },
            prisma: {
                taskAttachment: {
                    create: jest.fn().mockResolvedValue({ id: 'att1' }),
                    findMany: jest.fn().mockResolvedValue([]),
                    findUnique: jest.fn().mockResolvedValue({ id: 'att1', fileUrl: '/uploads/doc.pdf', taskId: 't1' }),
                    delete: jest.fn().mockResolvedValue()
                }
            }
        };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
        TaskService.getById.mockResolvedValue({ id: 't1' });
    });

    it('create — 201 with file', async () => {
        await TaskAttachmentController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('create — 400 without file', async () => {
        req.file = undefined;
        await TaskAttachmentController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('index — 200', async () => {
        await TaskAttachmentController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204', async () => {
        jest.spyOn(require('fs'), 'existsSync').mockReturnValue(false);
        await TaskAttachmentController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('delete — 404 when not found', async () => {
        req.prisma.taskAttachment.findUnique.mockResolvedValue(null);
        await TaskAttachmentController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});
