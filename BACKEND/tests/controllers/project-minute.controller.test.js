jest.mock('../../src/services/project.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/config/logger', () => ({ error: jest.fn(), info: jest.fn() }));

const ProjectService = require('../../src/services/project.service');
const ProjectMinuteController = require('../../src/controllers/project/project-minute.controller');

describe('ProjectMinuteController', () => {
    let req, res;
    beforeEach(() => {
        req = {
            params: { id: 'p1', minuteId: 'm1' },
            body: { title: 'Sprint Planning', date: '2025-06-15', location: 'Room A', duration: '60', participants: 'Team A', topics: '[]', actions: '[]' },
            user: { userId: 'u1', tenantId: 't1' },
            file: { originalname: 'minute.pdf', path: '/tmp/minute.pdf', size: 2048 },
            prisma: {
                meetingMinute: {
                    findMany: jest.fn().mockResolvedValue([]),
                    create: jest.fn().mockResolvedValue({ id: 'm1' }),
                    update: jest.fn().mockResolvedValue({ id: 'm1' }),
                    findUnique: jest.fn().mockResolvedValue({ id: 'm1', fileUrl: '/uploads/old.pdf' }),
                    delete: jest.fn().mockResolvedValue()
                },
                auditLog: { create: jest.fn().mockResolvedValue({}) },
                project: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', name: 'Test', managerId: 'u2' }) }
            }
        };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
        ProjectService.getById.mockResolvedValue({ id: 'p1' });
    });

    it('getMinutes — returns list', async () => {
        await ProjectMinuteController.getMinutes(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('uploadMinute — 201 with file', async () => {
        await ProjectMinuteController.uploadMinute(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('uploadMinute — 400 without file', async () => {
        req.file = undefined;
        await ProjectMinuteController.uploadMinute(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('deleteMinute — 204', async () => {
        jest.spyOn(require('fs'), 'existsSync').mockReturnValue(false);
        await ProjectMinuteController.deleteMinute(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('updateMinute — 200', async () => {
        req.body = { title: 'Updated Sprint Planning', participants: 'Team B' };
        await ProjectMinuteController.updateMinute(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('submitMinute — submits for approval', async () => {
        req.prisma.meetingMinute.findUnique.mockResolvedValue({ id: 'm1', projectId: 'p1', status: 'DRAFT' });
        await ProjectMinuteController.submitMinute(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('approveMinute — approves', async () => {
        req.prisma.meetingMinute.findUnique.mockResolvedValue({ id: 'm1', projectId: 'p1', status: 'PENDING' });
        await ProjectMinuteController.approveMinute(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('rejectMinute — rejects', async () => {
        req.body = { reason: 'Missing details' };
        req.prisma.meetingMinute.findUnique.mockResolvedValue({ id: 'm1', projectId: 'p1', status: 'PENDING' });
        await ProjectMinuteController.rejectMinute(req, res);
        expect(res.json).toHaveBeenCalled();
    });
});
