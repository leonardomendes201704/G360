jest.mock('../../src/services/project.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/config/logger', () => ({ error: jest.fn(), info: jest.fn() }));

const ProjectService = require('../../src/services/project.service');
const ProjectFollowUpController = require('../../src/controllers/project/project-followup.controller');

describe('ProjectFollowUpController', () => {
    let req, res;
    beforeEach(() => {
        req = {
            params: { id: 'p1', followUpId: 'f1' },
            body: { title: 'Sprint Review', description: 'Review sprint 3', type: 'TASK', priority: 'HIGH', dueDate: '2025-07-01' },
            user: { userId: 'u1', tenantId: 't1' },
            prisma: {
                projectFollowUp: {
                    findMany: jest.fn().mockResolvedValue([]),
                    create: jest.fn().mockResolvedValue({ id: 'f1' }),
                    update: jest.fn().mockResolvedValue({ id: 'f1' }),
                    delete: jest.fn().mockResolvedValue()
                },
                auditLog: { create: jest.fn().mockResolvedValue({}) },
                project: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', name: 'Test', managerId: 'u2' }) }
            }
        };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
        ProjectService.getById.mockResolvedValue({ id: 'p1' });
    });

    it('getFollowUps — returns list', async () => {
        await ProjectFollowUpController.getFollowUps(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('createFollowUp — 201', async () => {
        await ProjectFollowUpController.createFollowUp(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('updateFollowUp — 200', async () => {
        await ProjectFollowUpController.updateFollowUp(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('deleteFollowUp — 204', async () => {
        await ProjectFollowUpController.deleteFollowUp(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });
});
