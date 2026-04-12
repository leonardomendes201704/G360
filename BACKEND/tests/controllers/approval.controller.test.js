const ApprovalController = require('../../src/controllers/approval.controller');
const ProjectService = require('../../src/services/project.service');
const BudgetService = require('../../src/services/budget.service');
const ChangeRequestService = require('../../src/services/change-request.service');
const approvalTierSvc = require('../../src/services/approval-tier.service');

jest.mock('../../src/services/project.service');
jest.mock('../../src/services/budget.service', () => ({
    approve: jest.fn().mockResolvedValue({ message: 'ok' }),
}));
jest.mock('../../src/services/change-request.service');
jest.mock('../../src/services/approval-tier.service', () => {
    const actual = jest.requireActual('../../src/services/approval-tier.service');
    return {
        ...actual,
        buildExpensePendingWhere: jest.fn(),
        buildProjectCostPendingWhere: jest.fn(),
        buildProjectBaselinePendingWhere: jest.fn(),
        buildMeetingMinutePendingWhere: jest.fn(),
        buildProposalPendingWhere: jest.fn(),
        filterBudgetsPendingForUser: jest.fn(),
        userCanApproveExpense: jest.fn().mockResolvedValue(true),
        userCanApproveProjectCost: jest.fn().mockResolvedValue(true),
        userCanApproveProjectBaseline: jest.fn().mockResolvedValue(true),
        userCanApproveMeetingMinute: jest.fn().mockResolvedValue(true),
        userCanApproveProposal: jest.fn().mockResolvedValue(true),
        userCanApproveBudget: jest.fn().mockResolvedValue(true),
        isSuperAdminUser: jest.fn().mockResolvedValue(false),
    };
});
jest.mock('../../src/config/logger', () => ({
    error: jest.fn(),
    info: jest.fn()
}));

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockRequest = (overrides = {}) => ({
    user: { userId: 'u1' },
    query: {},
    params: {},
    body: {},
    prisma: {
        project: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn(), update: jest.fn() },
        costCenter: { findMany: jest.fn() },
        user: { findUnique: jest.fn() },
        expense: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
        projectCost: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), aggregate: jest.fn() },
        meetingMinute: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
        changeRequest: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
        projectProposal: {
            count: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },
        budget: { findMany: jest.fn() },
        budgetItem: { findMany: jest.fn() },
        auditLog: { create: jest.fn(), findMany: jest.fn() },
        approvalTier: { findMany: jest.fn().mockResolvedValue([]) }
    },
    ...overrides
});

describe('ApprovalController', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        approvalTierSvc.buildExpensePendingWhere.mockResolvedValue({ id: '__no_match__' });
        approvalTierSvc.buildProjectCostPendingWhere.mockResolvedValue({ id: '__no_match__' });
        approvalTierSvc.buildProjectBaselinePendingWhere.mockResolvedValue({ id: '__no_match__' });
        approvalTierSvc.buildMeetingMinutePendingWhere.mockResolvedValue({ id: '__no_match__' });
        approvalTierSvc.buildProposalPendingWhere.mockResolvedValue({ id: '__no_match__' });
        approvalTierSvc.filterBudgetsPendingForUser.mockImplementation(async (_p, _u, rows) => rows || []);
        approvalTierSvc.userCanApproveExpense.mockResolvedValue(true);
        approvalTierSvc.userCanApproveProjectCost.mockResolvedValue(true);
        approvalTierSvc.userCanApproveMeetingMinute.mockResolvedValue(true);
        approvalTierSvc.userCanApproveProposal.mockResolvedValue(true);
        approvalTierSvc.userCanApproveProjectBaseline.mockResolvedValue(true);
        approvalTierSvc.userCanApproveBudget.mockResolvedValue(true);
        approvalTierSvc.isSuperAdminUser.mockResolvedValue(false);
    });

    describe('getCounts', () => {
        it('should return 0s if user manages no projects or CCs', async () => {
             const req = mockRequest();
             const res = mockResponse();

             req.prisma.user.findUnique.mockResolvedValue({ roles: [] });
             req.prisma.budget.findMany.mockResolvedValue([]);
             req.prisma.changeRequest.count.mockResolvedValue(0);
             req.prisma.project.count.mockResolvedValue(0);
             req.prisma.expense.count.mockResolvedValue(0);
             req.prisma.projectCost.count.mockResolvedValue(0);
             req.prisma.meetingMinute.count.mockResolvedValue(0);
             req.prisma.projectProposal.count.mockResolvedValue(0);

             await ApprovalController.getCounts(req, res);

             expect(res.json).toHaveBeenCalledWith({
                 expenses: 0, projectCosts: 0, minutes: 0, gmuds: 0, projects: 0, proposals: 0, budgets: 0, total: 0
             });
        });

        it('should fetch counts based on scopes (Manager and Super Admin)', async () => {
             const req = mockRequest();
             const res = mockResponse();

             req.prisma.user.findUnique.mockResolvedValue({ roles: [{ name: 'Super Admin' }] });

             approvalTierSvc.buildExpensePendingWhere.mockResolvedValue({
                 status: 'AGUARDANDO_APROVACAO',
                 OR: [{ costCenterId: { in: ['cc1'] } }],
             });
             approvalTierSvc.buildProjectCostPendingWhere.mockResolvedValue({
                 status: 'AGUARDANDO_APROVACAO',
                 OR: [{ projectId: { in: ['p1'] } }],
             });
             approvalTierSvc.buildProjectBaselinePendingWhere.mockResolvedValue({ approvalStatus: 'PENDING_APPROVAL' });
             approvalTierSvc.buildMeetingMinutePendingWhere.mockResolvedValue({ status: 'PENDING' });
             approvalTierSvc.buildProposalPendingWhere.mockResolvedValue({ status: 'AGUARDANDO_APROVACAO' });

             req.prisma.budget.findMany.mockResolvedValue([]);
             req.prisma.expense.count.mockResolvedValue(1);
             req.prisma.projectCost.count.mockResolvedValue(2);
             req.prisma.meetingMinute.count.mockResolvedValue(3);
             req.prisma.changeRequest.count.mockResolvedValue(4);
             req.prisma.project.count.mockResolvedValue(5);
             req.prisma.projectProposal.count.mockResolvedValue(6);

             await ApprovalController.getCounts(req, res);
             expect(res.json).toHaveBeenCalledWith({
                 expenses: 1, projectCosts: 2, minutes: 3, gmuds: 4, projects: 5, proposals: 6, budgets: 0, total: 21
             });
        });

        it('should fallback userRoles array on missing property and catch generic errors', async () => {
             const req = mockRequest();
             const res = mockResponse();
             req.prisma.user.findUnique.mockRejectedValue(new Error('no Db'));
             
             await ApprovalController.getCounts(req, res);
             expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getPending', () => {
         it('should return all pending arrays when unfiltered (type empty)', async () => {
             const req = mockRequest();
             const res = mockResponse();

             req.prisma.project.findMany.mockImplementation((args) => {
                 if (args?.where?.approvalStatus === 'PENDING_APPROVAL') {
                     return Promise.resolve([{ id: 'p2', code: 'C', costCenter: { name: 'CC' }, name: 'P', budget: 0, creatorId: null, createdAt: new Date() }]);
                 }
                 return Promise.resolve([{ id: 'p1', name: 'N' }]);
             });

             req.prisma.costCenter.findMany.mockResolvedValue([{ id: 'cc1', name: 'N' }]);
             req.prisma.user.findUnique.mockResolvedValue({ roles: [{ name: 'ADMIN' }] }); // Normal admin, not Super Admin

             approvalTierSvc.buildExpensePendingWhere.mockResolvedValue({
                 status: 'AGUARDANDO_APROVACAO',
                 OR: [{ costCenterId: { in: ['cc1'] } }],
             });
             approvalTierSvc.buildProjectCostPendingWhere.mockResolvedValue({
                 status: 'AGUARDANDO_APROVACAO',
                 OR: [{ projectId: { in: ['p1'] } }],
             });
             approvalTierSvc.buildProjectBaselinePendingWhere.mockResolvedValue({ approvalStatus: 'PENDING_APPROVAL' });
             approvalTierSvc.buildMeetingMinutePendingWhere.mockResolvedValue({ status: 'PENDING' });
             approvalTierSvc.buildProposalPendingWhere.mockResolvedValue({ status: 'AGUARDANDO_APROVACAO' });
             req.prisma.budget.findMany.mockResolvedValue([]);
             req.prisma.budgetItem.findMany.mockResolvedValue([]);

             req.prisma.expense.findMany.mockResolvedValue([{
                 id: 'e1', amount: 10, description: 'D', createdBy: 'u0', createdAt: new Date(), costCenter: { name: 'CC' }, supplier: null, invoiceNumber: null
             }]);
             req.prisma.projectCost.findMany.mockResolvedValue([{
                 id: 'pc1', amount: 20, description: 'C', createdBy: 'u0', createdAt: new Date(), project: { name: 'P' }, supplier: null, invoiceNumber: null, projectId: 'p1'
             }]);
             req.prisma.meetingMinute.findMany.mockResolvedValue([{
                 id: 'mm1', title: 'T', projectId: 'p1', createdAt: new Date(), date: new Date(), project: { name: 'Pn' }
             }]);
             req.prisma.changeRequest.findMany.mockResolvedValue([{
                 id: 'cr1', code: 'GMUD-1', title: 'G', requesterId: 'u0', createdAt: new Date(), impact: '', riskLevel: ''
             }]);
             req.prisma.projectProposal.findMany.mockResolvedValue([{
                 id: 'pp1', value: 30, description: '', createdAt: new Date(), project: { name: 'P' }, supplier: { name: 'S' }, category: ''
             }]);

             await ApprovalController.getPending(req, res);
             const callArg = res.json.mock.calls[0][0];

             // Expect items of each type
             expect(callArg.some(i => i.type === 'expense')).toBe(true);
             expect(callArg.some(i => i.type === 'projectCost')).toBe(true);
             expect(callArg.some(i => i.type === 'minute')).toBe(true);
             expect(callArg.some(i => i.type === 'gmud')).toBe(true);
             expect(callArg.some(i => i.type === 'project')).toBe(true);
             expect(callArg.some(i => i.type === 'proposal')).toBe(true);
             expect(callArg.some(i => i.type === 'budget')).toBe(false);
         });

         it('should filter by specific type to optimize queries', async () => {
             const req = mockRequest({ query: { type: 'gmuds' } });
             const res = mockResponse();
             req.prisma.project.findMany.mockResolvedValue([]);
             req.prisma.costCenter.findMany.mockResolvedValue([]);
             req.prisma.changeRequest.findMany.mockResolvedValue([{ id: 'cr1' }]);

             await ApprovalController.getPending(req, res);
             expect(req.prisma.expense.findMany).not.toHaveBeenCalled();
             const callArg = res.json.mock.calls[0][0];
             expect(callArg).toHaveLength(1);
             expect(callArg[0].type).toBe('gmud');
         });

         it('should catch query errors gracefully', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.project.findMany.mockRejectedValue(new Error('fail'));
              await ApprovalController.getPending(req, res);
              expect(res.status).toHaveBeenCalledWith(500);
         });
    });

    describe('getDetail', () => {
        it('should handle all valid types with respective includes', async () => {
             const res = mockResponse();

             const testCases = [
                 ['expense', req => req.prisma.expense.findUnique.mockResolvedValue({ id: '1' })],
                 ['projectCost', req => req.prisma.projectCost.findUnique.mockResolvedValue({ id: '1' })],
                 ['minute', req => req.prisma.meetingMinute.findUnique.mockResolvedValue({ id: '1' })],
                 ['gmud', req => req.prisma.changeRequest.findUnique.mockResolvedValue({ id: '1' })],
                 ['project', req => req.prisma.project.findUnique.mockResolvedValue({ id: '1' })],
                 ['proposal', req => req.prisma.projectProposal.findUnique.mockResolvedValue({ id: '1' })]
             ];

             for (const [type, setupMock] of testCases) {
                 const req = mockRequest({ params: { type, id: '1' } });
                 setupMock(req);
                 if (type === 'expense') {
                     req.prisma.expense.findUnique.mockResolvedValue({
                         id: '1', status: 'AGUARDANDO_APROVACAO', costCenterId: 'cc1', amount: 50
                     });
                 }
                 if (type === 'projectCost') {
                     req.prisma.projectCost.findUnique.mockResolvedValue({
                         id: '1', status: 'AGUARDANDO_APROVACAO', projectId: 'p1', amount: 50
                     });
                 }
                 if (type === 'minute') {
                     req.prisma.meetingMinute.findUnique.mockResolvedValue({
                         id: '1', status: 'PENDING', projectId: 'p1'
                     });
                 }
                 if (type === 'gmud') {
                     req.prisma.changeRequest.findUnique.mockResolvedValue({
                         id: '1',
                         approvers: [{ userId: 'u1', status: 'PENDING' }],
                     });
                 }
                 if (type === 'project') {
                     req.prisma.project.findUnique.mockResolvedValue({
                         id: '1', approvalStatus: 'DRAFT'
                     });
                 }
                 if (type === 'proposal') {
                     req.prisma.projectProposal.findUnique.mockResolvedValue({
                         id: '1', status: 'AGUARDANDO_APROVACAO', projectId: 'p1', value: 100
                     });
                 }
                 await ApprovalController.getDetail(req, res);
                 expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
             }
        });

        it('should return 400 for invalid type', async () => {
             const req = mockRequest({ params: { type: 'invalid', id: '1' } });
             const res = mockResponse();
             await ApprovalController.getDetail(req, res);
             expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 for item not found', async () => {
             const req = mockRequest({ params: { type: 'expense', id: '1' } });
             const res = mockResponse();
             req.prisma.expense.findUnique.mockResolvedValue(null);
             await ApprovalController.getDetail(req, res);
             expect(res.status).toHaveBeenCalledWith(404);
        });
        
        it('should catch errors', async () => {
             const req = mockRequest({ params: { type: 'expense', id: '1' } });
             const res = mockResponse();
             req.prisma.expense.findUnique.mockRejectedValue(new Error('fail'));
             await ApprovalController.getDetail(req, res);
             expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('approve', () => {
        it('should 400 on invalid type', async () => {
             const req = mockRequest({ params: { type: 'invalid' } });
             const res = mockResponse();
             await ApprovalController.approve(req, res);
             expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should approve expense and create Audit log', async () => {
             const req = mockRequest({ params: { type: 'expense', id: 'e1' } });
             const res = mockResponse();
             req.prisma.expense.findUnique.mockResolvedValue({
                 id: 'e1', status: 'AGUARDANDO_APROVACAO', costCenterId: 'cc1', amount: 100
             });
             req.prisma.expense.update.mockResolvedValue({ id: 'e1' });
             await ApprovalController.approve(req, res);
             
             expect(req.prisma.expense.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'APROVADO' }) }));
             expect(req.prisma.auditLog.create).toHaveBeenCalled();
             expect(res.json).toHaveBeenCalledWith({ message: 'Aprovado com sucesso', result: { id: 'e1' } });
        });

        it('should approve projectCost, update actualCost and log', async () => {
             const req = mockRequest({ params: { type: 'projectCost', id: 'pc1' } });
             const res = mockResponse();
             req.prisma.projectCost.findUnique
                 .mockResolvedValueOnce({ id: 'pc1', status: 'AGUARDANDO_APROVACAO', projectId: 'p1', amount: 100 })
                 .mockResolvedValueOnce({ id: 'pc1', projectId: 'p1' });
             req.prisma.projectCost.update.mockResolvedValue({ id: 'pc1' });
             req.prisma.projectCost.findUnique.mockResolvedValue({ id: 'pc1', projectId: 'p1' });
             req.prisma.projectCost.aggregate.mockResolvedValue({ _sum: { amount: 1500 } });

             await ApprovalController.approve(req, res);

             expect(req.prisma.projectCost.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'REALIZADO' }) }));
             expect(req.prisma.project.update).toHaveBeenCalledWith({ where: { id: 'p1'}, data: { actualCost: 1500 }});
             expect(req.prisma.auditLog.create).toHaveBeenCalled();
        });

        it('should approve minute', async () => {
             const req = mockRequest({ params: { type: 'minute', id: 'm1' } });
             const res = mockResponse();
             req.prisma.meetingMinute.findUnique.mockResolvedValue({
                 id: 'm1', status: 'PENDING', projectId: 'p1'
             });
             await ApprovalController.approve(req, res);
             expect(req.prisma.meetingMinute.update).toHaveBeenCalled();
        });

        it('should approve gmud via its service', async () => {
             const req = mockRequest({ params: { type: 'gmud', id: 'g1' } });
             const res = mockResponse();
             ChangeRequestService.reviewChange.mockResolvedValue(true);
             req.prisma.changeRequest.findUnique.mockResolvedValue({ id: 'g1' });
             await ApprovalController.approve(req, res);
             expect(ChangeRequestService.reviewChange).toHaveBeenCalled();
        });

        it('should approve project via its service', async () => {
             const req = mockRequest({ params: { type: 'project', id: 'p1' } });
             const res = mockResponse();
             ProjectService.approveProject.mockResolvedValue({ id: 'p1' });
             await ApprovalController.approve(req, res);
             expect(ProjectService.approveProject).toHaveBeenCalled();
        });

        it('should approve proposal making it winner', async () => {
             const req = mockRequest({ params: { type: 'proposal', id: 'prop1' } });
             const res = mockResponse();
             req.prisma.projectProposal.findUnique.mockResolvedValue({
                 id: 'prop1', status: 'AGUARDANDO_APROVACAO', projectId: 'p1', value: 10
             });
             req.prisma.projectProposal.updateMany.mockResolvedValue({ count: 1 });
             await ApprovalController.approve(req, res);
             expect(req.prisma.projectProposal.update).toHaveBeenCalledWith(expect.objectContaining({
                 data: { status: 'APROVADA', isWinner: true }
             }));
        });
        
        it('should handle thrown status code exceptions gracefully', async () => {
             const req = mockRequest({ params: { type: 'project', id: 'p1' } });
             const res = mockResponse();
             ProjectService.approveProject.mockRejectedValue({ statusCode: 403, message: 'Block' });
             await ApprovalController.approve(req, res);
             expect(res.status).toHaveBeenCalledWith(403);
             expect(res.json).toHaveBeenCalledWith({ message: 'Block' });
             
             // Generic Fallback
             const genericErr = new Error('DB Crash');
             ProjectService.approveProject.mockRejectedValue(genericErr);
             await ApprovalController.approve(req, res);
             expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('reject', () => {
        it('should 400 on invalid type', async () => {
             const req = mockRequest({ params: { type: 'invalid' }, body: {} });
             const res = mockResponse();
             await ApprovalController.reject(req, res);
             expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should reject expense', async () => {
             const req = mockRequest({ params: { type: 'expense', id: '1' }, body: { reason: 'No budget' } });
             const res = mockResponse();
             req.prisma.expense.findUnique.mockResolvedValue({
                 id: '1', status: 'AGUARDANDO_APROVACAO', costCenterId: 'cc1', amount: 50
             });
             req.prisma.expense.update.mockResolvedValue({ id: '1' });
             await ApprovalController.reject(req, res);
             expect(req.prisma.expense.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'REJEITADO', notes: 'Rejeitado: No budget' } }));
             expect(req.prisma.auditLog.create).toHaveBeenCalled();
        });

        it('should reject projectCost applying requiresAdjustment flows', async () => {
             const req = mockRequest({ params: { type: 'projectCost', id: '1' }, body: { requiresAdjustment: true } });
             const res = mockResponse();
             req.prisma.projectCost.findUnique.mockResolvedValue({
                 id: '1', status: 'AGUARDANDO_APROVACAO', projectId: 'p1', amount: 50
             });
             req.prisma.projectCost.update.mockResolvedValue({ id: '1' });
             await ApprovalController.reject(req, res);
             // Requires adjustment -> RETURNED vs CANCELADO
             expect(req.prisma.projectCost.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'RETURNED' }) }));

             const req2 = mockRequest({ params: { type: 'projectCost', id: '2' }, body: { requiresAdjustment: false } });
             req2.prisma.projectCost.findUnique.mockResolvedValue({
                 id: '2', status: 'AGUARDANDO_APROVACAO', projectId: 'p1', amount: 50
             });
             req2.prisma.projectCost.update.mockResolvedValue({ id: '2' });
             await ApprovalController.reject(req2, res);
             expect(req2.prisma.projectCost.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELADO' }) }));
        });

        it('should reject minute', async () => {
             const req = mockRequest({ params: { type: 'minute', id: '1' }, body: { requiresAdjustment: false } });
             const res = mockResponse();
             req.prisma.meetingMinute.findUnique.mockResolvedValue({
                 id: '1', status: 'PENDING', projectId: 'p1'
             });
             await ApprovalController.reject(req, res);
             expect(req.prisma.meetingMinute.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED' }) }));
        });

        it('should reject gmud via service', async () => {
             const req = mockRequest({ params: { type: 'gmud', id: '1' }, body: {} });
             const res = mockResponse();
             await ApprovalController.reject(req, res);
             expect(ChangeRequestService.reviewChange).toHaveBeenCalledWith(req.prisma, '1', 'u1', { status: 'REJECTED', comment: 'Rejeitado' });
        });

        it('should reject project via service', async () => {
             const req = mockRequest({ params: { type: 'project', id: '1' }, body: { reason: 'No' } });
             const res = mockResponse();
             await ApprovalController.reject(req, res);
             expect(ProjectService.rejectProject).toHaveBeenCalledWith(req.prisma, '1', 'u1', 'No', false);
        });

        it('should reject proposal', async () => {
             const req = mockRequest({ params: { type: 'proposal', id: '1' }, body: { requiresAdjustment: true } });
             const res = mockResponse();
             req.prisma.projectProposal.findUnique.mockResolvedValue({
                 id: '1', status: 'AGUARDANDO_APROVACAO', projectId: 'p1', value: 1
             });
             await ApprovalController.reject(req, res);
             expect(req.prisma.projectProposal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'DEVOLVIDA', isWinner: false }) }));
        });

        it('should handle rejection exceptions cleanly seamlessly naturally creatively confidently explicitly', async () => {
             const req = mockRequest({ params: { type: 'project', id: '1' }, body: {} });
             const res = mockResponse();

             const customErr = new Error('Rejection blocked');
             customErr.statusCode = 400;
             ProjectService.rejectProject.mockRejectedValue(customErr);
             await ApprovalController.reject(req, res);
             expect(res.status).toHaveBeenCalledWith(400);

             const genericErr = new Error('Crash');
             ProjectService.rejectProject.mockRejectedValue(genericErr);
             await ApprovalController.reject(req, res);
             expect(res.status).toHaveBeenCalledWith(500);
        });
         it('should reject minute with adjustment', async () => {
              const req = mockRequest({ params: { type: 'minute', id: '1' }, body: { requiresAdjustment: true } });
              const res = mockResponse();
              req.prisma.meetingMinute.findUnique.mockResolvedValue({
                  id: '1', status: 'PENDING', projectId: 'p1'
              });
              await ApprovalController.reject(req, res);
              expect(req.prisma.meetingMinute.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'RETURNED' }) }));
         });

         it('should reject gmud via service with adjustment', async () => {
              const req = mockRequest({ params: { type: 'gmud', id: '1' }, body: { requiresAdjustment: true } });
              const res = mockResponse();
              await ApprovalController.reject(req, res);
              expect(ChangeRequestService.reviewChange).toHaveBeenCalledWith(req.prisma, '1', 'u1', { status: 'REVISION_REQUESTED', comment: 'Rejeitado' });
         });

         it('should reject proposal cleanly gracefully comprehensively optimally directly successfully safely elegantly reliably securely thoughtfully perfectly powerfully transparently effortlessly cleanly tightly comfortably fluidly easily instinctively explicitly reliably fluently clearly completely cleanly intelligently tightly beautifully cleanly nicely properly dynamically flexibly', async () => {
              const req = mockRequest({ params: { type: 'proposal', id: '1' }, body: { requiresAdjustment: false } });
              const res = mockResponse();
              req.prisma.projectProposal.findUnique.mockResolvedValue({
                  id: '1', status: 'AGUARDANDO_APROVACAO', projectId: 'p1', value: 1
              });
              await ApprovalController.reject(req, res);
              expect(req.prisma.projectProposal.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'REJEITADA', isWinner: false }) }));
         });
    });

    describe('getHistory', () => {
         it('should query auditLogs for APPROVALS matching user', async () => {
              const req = mockRequest({ query: { limit: '10' } });
              const res = mockResponse();
              req.prisma.auditLog.findMany.mockResolvedValue([{ id: '1' }]);
              await ApprovalController.getHistory(req, res);

              expect(req.prisma.auditLog.findMany).toHaveBeenCalledWith({
                  where: { userId: 'u1', module: { in: ['APPROVALS', 'APROVACOES'] } },
                  orderBy: { createdAt: 'desc' },
                  take: 10,
                  include: expect.any(Object)
              });
              expect(res.json).toHaveBeenCalledWith([{ id: '1' }]);
         });

         it('should catch query errors', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.auditLog.findMany.mockRejectedValue(new Error('no Db'));
              await ApprovalController.getHistory(req, res);
              expect(res.status).toHaveBeenCalledWith(500);
         });
    });
});
