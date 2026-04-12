jest.mock('../../src/services/project.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/config/logger', () => ({ error: jest.fn(), info: jest.fn() }));

const ProjectService = require('../../src/services/project.service');
const ProjectCostController = require('../../src/controllers/project/project-cost.controller');

describe('ProjectCostController', () => {
    let req, res;
    beforeEach(() => {
        req = {
            params: { id: 'p1', costId: 'c1' },
            body: { description: 'Server License', type: 'OPEX', amount: '5000', date: '2025-06-01' },
            user: { userId: 'u1', tenantId: 't1' },
            file: { originalname: 'invoice.pdf', path: '/tmp/invoice.pdf', size: 1024 },
            prisma: {
                projectCost: {
                    findMany: jest.fn().mockResolvedValue([]),
                    create: jest.fn().mockResolvedValue({ id: 'c1' }),
                    update: jest.fn().mockResolvedValue({ id: 'c1' }),
                    delete: jest.fn().mockResolvedValue(),
                    findUnique: jest.fn().mockResolvedValue({ id: 'c1', fileUrl: '/uploads/old.pdf' }),
                    aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 5000 } })
                },
                projectProposal: { findFirst: jest.fn().mockResolvedValue({ id: 'prop1', isWinner: true }) },
                auditLog: { create: jest.fn().mockResolvedValue({}) },
                project: {
                    findUnique: jest.fn().mockResolvedValue({ id: 'p1', name: 'Test', approvalStatus: 'APPROVED' }),
                    update: jest.fn().mockResolvedValue({})
                }
            }
        };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
        ProjectService.getById.mockResolvedValue({ id: 'p1' });
    });

    it('getCosts — returns list', async () => {
        await ProjectCostController.getCosts(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('createCost — 201 with valid data', async () => {
        await ProjectCostController.createCost(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('createCost — 400 on missing fields', async () => {
        req.body = { description: '', type: '', amount: '', date: '' };
        req.file = null;
        await ProjectCostController.createCost(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('createCost — 403 if no winning proposal', async () => {
        req.prisma.projectProposal.findFirst.mockResolvedValue(null);
        await ProjectCostController.createCost(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('createCost — 403 if project not approved', async () => {
        req.prisma.project.findUnique.mockResolvedValue({ id: 'p1', approvalStatus: 'PENDING' });
        await ProjectCostController.createCost(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('deleteCost — 204', async () => {
        jest.spyOn(require('fs'), 'existsSync').mockReturnValue(false);
        await ProjectCostController.deleteCost(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('updateCost — 200', async () => {
        req.body = { description: 'Updated License', type: 'CAPEX', amount: '7000', date: '2025-07-01' };
        await ProjectCostController.updateCost(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('submitCostForApproval — updates status', async () => {
        await ProjectCostController.submitCostForApproval(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('approveCost — approves cost', async () => {
        req.prisma.projectCost.findUnique.mockResolvedValue({ id: 'c1', projectId: 'p1', status: 'PENDING' });
        await ProjectCostController.approveCost(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('rejectCost — rejects cost', async () => {
        req.body = { reason: 'Over budget' };
        req.prisma.projectCost.findUnique.mockResolvedValue({ id: 'c1', projectId: 'p1', status: 'PENDING' });
        await ProjectCostController.rejectCost(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('createCost — 404 if project not found', async () => {
        req.prisma.project.findUnique.mockResolvedValue(null);
        await ProjectCostController.createCost(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});
