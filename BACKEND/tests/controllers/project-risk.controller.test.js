jest.mock('../../src/services/project.service');
jest.mock('../../src/services/notification.service');

const ProjectService = require('../../src/services/project.service');
const ProjectRiskController = require('../../src/controllers/project/project-risk.controller');

describe('ProjectRiskController', () => {
    let req, res;
    beforeEach(() => {
        req = {
            params: { id: 'p1', riskId: 'r1' },
            body: { description: 'Data loss risk', impact: 'HIGH', probability: 'MEDIUM', mitigation: 'Backup strategy' },
            user: { userId: 'u1', tenantId: 't1' },
            prisma: {
                projectRisk: {
                    findMany: jest.fn().mockResolvedValue([]),
                    create: jest.fn().mockResolvedValue({ id: 'r1', description: 'Data loss risk', impact: 'HIGH' }),
                    update: jest.fn().mockResolvedValue({ id: 'r1' }),
                    delete: jest.fn().mockResolvedValue(),
                    findUnique: jest.fn().mockResolvedValue({ id: 'r1', projectId: 'p1' })
                },
                auditLog: { create: jest.fn().mockResolvedValue({}) },
                project: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', name: 'Test', managerId: 'u2' }) }
            }
        };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
        ProjectService.getById.mockResolvedValue({ id: 'p1' });
    });

    it('getRisks — returns list', async () => {
        await ProjectRiskController.getRisks(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('createRisk — 201', async () => {
        await ProjectRiskController.createRisk(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('updateRisk — 200', async () => {
        await ProjectRiskController.updateRisk(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('updateRisk — 404 if not found', async () => {
        req.prisma.projectRisk.findUnique.mockResolvedValue(null);
        await ProjectRiskController.updateRisk(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deleteRisk — 204', async () => {
        await ProjectRiskController.deleteRisk(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('deleteRisk — 404 if not found', async () => {
        req.prisma.projectRisk.findUnique.mockResolvedValue(null);
        await ProjectRiskController.deleteRisk(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});
