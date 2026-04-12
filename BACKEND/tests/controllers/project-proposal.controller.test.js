jest.mock('../../src/services/project.service');
jest.mock('../../src/config/logger', () => ({ error: jest.fn(), info: jest.fn() }));

const ProjectService = require('../../src/services/project.service');
const ProjectProposalController = require('../../src/controllers/project/project-proposal.controller');

describe('ProjectProposalController', () => {
    let req, res;
    beforeEach(() => {
        req = {
            params: { id: 'p1', proposalId: 'prop1' },
            body: { supplierId: 'sup1', value: '50000' },
            user: { userId: 'u1', tenantId: 't1' },
            file: { originalname: 'proposal.pdf', path: '/tmp/proposal.pdf', size: 1024 },
            prisma: {
                projectProposal: {
                    findMany: jest.fn().mockResolvedValue([]),
                    create: jest.fn().mockResolvedValue({ id: 'prop1' }),
                    update: jest.fn().mockResolvedValue({ id: 'prop1' }),
                    findUnique: jest.fn().mockResolvedValue({ id: 'prop1', fileUrl: '/uploads/old.pdf' }),
                    delete: jest.fn().mockResolvedValue()
                },
                project: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', name: 'Test', approvalStatus: 'APPROVED' }) },
                auditLog: { create: jest.fn().mockResolvedValue({}) }
            }
        };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
        ProjectService.getById.mockResolvedValue({ id: 'p1' });
    });

    it('getProposals — returns list', async () => {
        await ProjectProposalController.getProposals(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('createProposal — 201', async () => {
        await ProjectProposalController.createProposal(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('createProposal — 400 on missing fields', async () => {
        req.body = { supplierId: '', value: '' };
        req.file = null;
        await ProjectProposalController.createProposal(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('createProposal — 403 if project not approved', async () => {
        req.prisma.project.findUnique.mockResolvedValue({ id: 'p1', approvalStatus: 'PENDING' });
        await ProjectProposalController.createProposal(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('deleteProposal — 204', async () => {
        jest.spyOn(require('fs'), 'existsSync').mockReturnValue(false);
        await ProjectProposalController.deleteProposal(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('updateProposal — 200', async () => {
        req.body = { value: '75000' };
        await ProjectProposalController.updateProposal(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('submitProposal — marks proposal as winner', async () => {
        req.prisma.projectProposal.updateMany = jest.fn().mockResolvedValue({});
        await ProjectProposalController.submitProposal(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('setPaymentCondition — 200', async () => {
        req.body = { paymentCondition: '30/60/90' };
        await ProjectProposalController.setPaymentCondition(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('generateCostsFromProposal — creates costs from proposal', async () => {
        req.prisma.projectProposal.findUnique.mockResolvedValue({
            id: 'prop1', value: 50000, supplierId: 'sup1',
            supplier: { name: 'AWS' }, paymentCondition: '1x',
            project: { id: 'p1', name: 'Test' }
        });
        req.prisma.projectCost = { create: jest.fn().mockResolvedValue({ id: 'c1' }), aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 50000 } }) };
        req.prisma.project.update = jest.fn().mockResolvedValue({});
        await ProjectProposalController.generateCostsFromProposal(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('createProposal — 404 if project not found', async () => {
        req.prisma.project.findUnique.mockResolvedValue(null);
        await ProjectProposalController.createProposal(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});
