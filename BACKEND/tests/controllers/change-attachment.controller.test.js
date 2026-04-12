const ChangeRequestService = require('../../src/services/change-request.service');
jest.mock('../../src/services/change-request.service');
jest.mock('../../src/config/logger', () => ({ error: jest.fn() }));

const ChangeAttachmentController = require('../../src/controllers/change-attachment.controller');

describe('ChangeAttachmentController', () => {
    let req, res;
    beforeEach(() => {
        req = {
            params: { id: 'gmud1', attachmentId: 'att1' },
            user: { userId: 'u1' },
            file: { originalname: 'plan.pdf', path: '/tmp/plan.pdf', size: 1024, mimetype: 'application/pdf' },
            prisma: {
                changeAttachment: {
                    create: jest.fn().mockResolvedValue({ id: 'att1' }),
                    findMany: jest.fn().mockResolvedValue([]),
                    findUnique: jest.fn().mockResolvedValue({ id: 'att1', fileUrl: '/uploads/plan.pdf' }),
                    delete: jest.fn().mockResolvedValue()
                }
            }
        };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
        ChangeRequestService.getById.mockResolvedValue({ id: 'gmud1' });
    });

    it('create — 201', async () => {
        await ChangeAttachmentController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('create — 400 without file', async () => {
        req.file = undefined;
        await ChangeAttachmentController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('index — 200', async () => {
        await ChangeAttachmentController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204', async () => {
        jest.spyOn(require('fs'), 'existsSync').mockReturnValue(false);
        await ChangeAttachmentController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });
});
