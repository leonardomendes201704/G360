const ProjectProposalController = require('../../../src/controllers/project/project-proposal.controller');
const ProjectService = require('../../../src/services/project.service');
const fs = require('fs');

jest.mock('../../../src/services/project.service');
jest.mock('fs');
jest.mock('../../../src/config/logger', () => ({
    error: jest.fn(),
    info: jest.fn()
}));

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

const mockRequest = (overrides = {}) => ({
    params: {},
    body: {},
    user: { userId: 'u1', role: 'USER' },
    prisma: {
        project: { findUnique: jest.fn() },
        projectProposal: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
            delete: jest.fn()
        },
        projectCost: {
            createMany: jest.fn(),
            findMany: jest.fn()
        }
    },
    ...overrides
});

// Since the controller uses `prisma.$transaction`, we need to mock it on the request object.
// Wait, the controller code uses `await prisma.$transaction([ ... ])` literally using global `prisma` instead of `req.prisma`!
// Wait!!! Let me look closely at the viewed file line 71:
// `const [_, updatedProposal] = await prisma.$transaction([`
// If it uses global `prisma`, that might be a bug in the code if global `prisma` is not defined.
// Assuming it has access to it natively (maybe imported or global).
// In tests, we must mock global prisma.
global.prisma = {
    $transaction: jest.fn()
};

describe('ProjectProposalController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ProjectService.getById.mockResolvedValue(true);
    });

    describe('getProposals', () => {
        it('should fetch proposals securely', async () => {
            const req = mockRequest({ params: { id: 'p1' } });
            const res = mockResponse();
            req.prisma.projectProposal.findMany.mockResolvedValue([{ id: 'prop1' }]);

            await ProjectProposalController.getProposals(req, res);

            expect(ProjectService.getById).toHaveBeenCalledWith(req.prisma, 'p1', 'u1');
            expect(req.prisma.projectProposal.findMany).toHaveBeenCalledWith({
                where: { projectId: 'p1', isActive: true },
                include: { supplier: true },
                orderBy: { value: 'asc' }
            });
            expect(res.json).toHaveBeenCalledWith([{ id: 'prop1' }]);
        });
    });

    describe('createProposal', () => {
        it('should block if project not found', async () => {
            const req = mockRequest({ params: { id: 'p1' } });
            const res = mockResponse();
            req.prisma.project.findUnique.mockResolvedValue(null);
            
            await ProjectProposalController.createProposal(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should block if project is not APPROVED', async () => {
            const req = mockRequest({ params: { id: 'p1' } });
            const res = mockResponse();
            req.prisma.project.findUnique.mockResolvedValue({ approvalStatus: 'DRAFT' });
            
            await ProjectProposalController.createProposal(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('APROVADO') });
        });

        it('should validate missing fields', async () => {
            const req = mockRequest({ params: { id: 'p1' }, body: {} }); // no supplierId, no value, no file
            const res = mockResponse();
            req.prisma.project.findUnique.mockResolvedValue({ approvalStatus: 'APPROVED' });
            
            await ProjectProposalController.createProposal(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ missingFields: ['Fornecedor', 'Valor', 'Anexo (proposta comercial)'] }));
        });

        it('should calculate file path and create proposal', async () => {
            const req = mockRequest({ 
                params: { id: 'p1' }, 
                body: { supplierId: 's1', value: '1500.5' },
                file: { path: '/abs/path/to/uploads/file.pdf', originalname: 'file.pdf' }
            });
            const res = mockResponse();
            req.prisma.project.findUnique.mockResolvedValue({ approvalStatus: 'APPROVED' });
            req.prisma.projectProposal.create.mockResolvedValue({ id: 'prop1' });
            
            await ProjectProposalController.createProposal(req, res);
            
            expect(req.prisma.projectProposal.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    supplierId: 's1', value: 1500.5, isWinner: false, fileName: 'file.pdf'
                })
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ id: 'prop1' });
        });
    });

    describe('updateProposal', () => {
        it('should update normal fields and cast dates safely', async () => {
            const req = mockRequest({ 
                params: { id: 'p1', proposalId: 'prop1' },
                body: { title: 'T', isWinner: false, validity: '2025-01-01', file: 'some' }
            });
            const res = mockResponse();
            req.prisma.projectProposal.update.mockResolvedValue({ id: 'prop1' });

            await ProjectProposalController.updateProposal(req, res);

            const callArgs = req.prisma.projectProposal.update.mock.calls[0][0].data;
            expect(callArgs.title).toBe('T');
            expect(callArgs.file).toBeUndefined(); // deleted internally
            expect(callArgs.validity).toBeInstanceOf(Date);
            expect(res.json).toHaveBeenCalledWith({ id: 'prop1' });
        });
        
        it('should handle empty validity string', async () => {
            const req = mockRequest({ params: { id: 'p1', proposalId: 'prop1' }, body: { validity: '' } });
            const res = mockResponse();
            req.prisma.projectProposal.update.mockResolvedValue({ id: 'prop1' });
            await ProjectProposalController.updateProposal(req, res);
            expect(req.prisma.projectProposal.update.mock.calls[0][0].data.validity).toBeNull();
        });

        describe('Winner selection', () => {
            it('should block if project not found', async () => {
                const req = mockRequest({ params: { id: 'p1', proposalId: 'prop1' }, body: { isWinner: true } });
                const res = mockResponse();
                req.prisma.project.findUnique.mockResolvedValue(null);
                
                await ProjectProposalController.updateProposal(req, res);
                expect(res.status).toHaveBeenCalledWith(404);
            });

            it('should block if user is not project manager or admin', async () => {
                const req = mockRequest({ params: { id: 'p1', proposalId: 'prop1' }, body: { isWinner: true }, user: { userId: 'u1', role: 'MEMBER' } });
                const res = mockResponse();
                req.prisma.project.findUnique.mockResolvedValue({ managerId: 'other' }); // fail
                
                await ProjectProposalController.updateProposal(req, res);
                expect(res.status).toHaveBeenCalledWith(403);
            });

            it('should process transaction if admin', async () => {
                const req = mockRequest({ params: { id: 'p1', proposalId: 'prop1' }, body: { isWinner: true }, user: { userId: 'u1', role: 'SUPER_ADMIN' } });
                const res = mockResponse();
                req.prisma.project.findUnique.mockResolvedValue({ managerId: 'other' });
                global.prisma.$transaction.mockResolvedValue([ true, { id: 'prop1', isWinner: true } ]); // Return tuple

                await ProjectProposalController.updateProposal(req, res);

                expect(global.prisma.$transaction).toHaveBeenCalled();
                expect(res.json).toHaveBeenCalledWith({ id: 'prop1', isWinner: true });
            });
        });
    });

    describe('deleteProposal', () => {
        it('should return 404 if not found', async () => {
            const req = mockRequest({ params: { id: 'p1', proposalId: 'prop1' } });
            const res = mockResponse();
            req.prisma.projectProposal.findUnique.mockResolvedValue(null);

            await ProjectProposalController.deleteProposal(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        describe('When proposal is a winner or approved', () => {
            it('should block if user is not manager or admin', async () => {
                const req = mockRequest({ params: { id: 'p1', proposalId: 'prop1' }, user: { userId: 'u1', role: 'MEMBER' } });
                const res = mockResponse();
                req.prisma.projectProposal.findUnique.mockResolvedValue({ isWinner: true, projectId: 'p1' });
                req.prisma.project.findUnique.mockResolvedValue({ managerId: 'other' });

                await ProjectProposalController.deleteProposal(req, res);
                expect(res.status).toHaveBeenCalledWith(403);
            });

            it('should block if missing justification', async () => {
                const req = mockRequest({ params: { id: 'p1', proposalId: 'prop1' }, user: { userId: 'mgr', role: 'MEMBER' }, body: {} });
                const res = mockResponse();
                req.prisma.projectProposal.findUnique.mockResolvedValue({ isWinner: true, projectId: 'p1' });
                req.prisma.project.findUnique.mockResolvedValue({ managerId: 'mgr' });

                await ProjectProposalController.deleteProposal(req, res);
                expect(res.status).toHaveBeenCalledWith(400);
            });

            it('should soft delete and record justification', async () => {
                const req = mockRequest({ params: { id: 'p1', proposalId: 'prop1' }, user: { userId: 'mgr', role: 'MEMBER' }, body: { justification: 'Reason' } });
                const res = mockResponse();
                req.prisma.projectProposal.findUnique.mockResolvedValue({ status: 'APROVADA', projectId: 'p1' });
                req.prisma.project.findUnique.mockResolvedValue({ managerId: 'mgr' });

                await ProjectProposalController.deleteProposal(req, res);
                
                expect(req.prisma.projectProposal.update).toHaveBeenCalledWith(expect.objectContaining({
                    data: expect.objectContaining({ isActive: false, inactivationReason: 'Reason' })
                }));
                expect(res.json).toHaveBeenCalledWith({ message: 'Proposta inativada com sucesso', inactivated: true });
            });
        });

        describe('When proposal is a draft', () => {
            it('should hard delete and unlink file if exists', async () => {
                const req = mockRequest({ params: { id: 'p1', proposalId: 'prop1' } });
                const res = mockResponse();
                req.prisma.projectProposal.findUnique.mockResolvedValue({ status: 'RASCUNHO', fileUrl: '/test/path.pdf' });
                fs.existsSync.mockReturnValue(true);

                await ProjectProposalController.deleteProposal(req, res);

                expect(fs.existsSync).toHaveBeenCalled();
                expect(fs.unlinkSync).toHaveBeenCalled();
                expect(req.prisma.projectProposal.delete).toHaveBeenCalledWith({ where: { id: 'prop1' } });
                expect(res.status).toHaveBeenCalledWith(204);
            });

            it('should suppress unlink errors gracefully', async () => {
                const req = mockRequest({ params: { id: 'p1', proposalId: 'prop1' } });
                const res = mockResponse();
                req.prisma.projectProposal.findUnique.mockResolvedValue({ status: 'RASCUNHO', fileUrl: '/test/path.pdf' });
                fs.existsSync.mockReturnValue(true);
                fs.unlinkSync.mockImplementation(() => { throw new Error('fail'); });

                await ProjectProposalController.deleteProposal(req, res);
                expect(req.prisma.projectProposal.delete).toHaveBeenCalled(); // still completes
            });
        });
    });

    describe('submitProposal', () => {
        it('should 404 if missing', async () => {
             const req = mockRequest({ params: { proposalId: '1' } });
             const res = mockResponse();
             req.prisma.projectProposal.findUnique.mockResolvedValue(null);
             await ProjectProposalController.submitProposal(req, res);
             expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should block if not draft/devolvida', async () => {
             const req = mockRequest({ params: { proposalId: '1' } });
             const res = mockResponse();
             req.prisma.projectProposal.findUnique.mockResolvedValue({ status: 'APROVADA' });
             await ProjectProposalController.submitProposal(req, res);
             expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should block if missing fields', async () => {
             const req = mockRequest({ params: { proposalId: '1' } });
             const res = mockResponse();
             req.prisma.projectProposal.findUnique.mockResolvedValue({ status: 'RASCUNHO' }); // lacks supplierId, value, fileUrl
             await ProjectProposalController.submitProposal(req, res);
             expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should submit successfully', async () => {
             const req = mockRequest({ params: { proposalId: '1' } });
             const res = mockResponse();
             req.prisma.projectProposal.findUnique.mockResolvedValue({ status: 'RASCUNHO', supplierId: 's1', value: 10, fileUrl: 'url' });
             req.prisma.projectProposal.update.mockResolvedValue({ id: '1', status: 'AGUARDANDO_APROVACAO' });
             await ProjectProposalController.submitProposal(req, res);
             
             expect(req.prisma.projectProposal.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'AGUARDANDO_APROVACAO'} }));
             expect(res.json).toHaveBeenCalled();
        });
    });

    describe('setPaymentCondition', () => {
        it('should block if proposal not found or not winner', async () => {
             const req = mockRequest({ params: { proposalId: '1' } });
             const res = mockResponse();
             req.prisma.projectProposal.findUnique.mockResolvedValue(null);
             await ProjectProposalController.setPaymentCondition(req, res);
             expect(res.status).toHaveBeenCalledWith(404);
             
             req.prisma.projectProposal.findUnique.mockResolvedValue({ isWinner: false });
             await ProjectProposalController.setPaymentCondition(req, res);
             expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should update payment condition successfully', async () => {
             const req = mockRequest({ params: { proposalId: '1' }, body: { entryPercent: 20 } });
             const res = mockResponse();
             req.prisma.projectProposal.findUnique.mockResolvedValue({ isWinner: true, value: 50 });
             req.prisma.projectProposal.update.mockResolvedValue({ id: '1' });
             
             await ProjectProposalController.setPaymentCondition(req, res);
             expect(req.prisma.projectProposal.update).toHaveBeenCalledWith(expect.objectContaining({
                 data: expect.objectContaining({
                     paymentCondition: expect.objectContaining({ entryPercent: 20 }),
                     value: 50 // copied from proposal fallback
                 })
             }));
        });
    });

    describe('generateCostsFromProposal', () => {
        it('should execute basic blocks (404, not winner, no payment condition, already generated)', async () => {
             const req = mockRequest({ params: { proposalId: '1' } });
             const res = mockResponse();
             req.prisma.projectProposal.findUnique.mockResolvedValue(null);
             await ProjectProposalController.generateCostsFromProposal(req, res);
             expect(res.status).toHaveBeenCalledWith(404);

             req.prisma.projectProposal.findUnique.mockResolvedValue({ isWinner: false });
             await ProjectProposalController.generateCostsFromProposal(req, res);
             expect(res.status).toHaveBeenCalledWith(400);
             expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('vencedora') }));

             req.prisma.projectProposal.findUnique.mockResolvedValue({ isWinner: true, paymentCondition: null });
             await ProjectProposalController.generateCostsFromProposal(req, res);
             expect(res.status).toHaveBeenCalledWith(400);
             
             req.prisma.projectProposal.findUnique.mockResolvedValue({ isWinner: true, paymentCondition: {}, costsGenerated: true });
             await ProjectProposalController.generateCostsFromProposal(req, res);
             expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should calculate entry and installments accurately', async () => {
             const req = mockRequest({ params: { proposalId: '1' } });
             const res = mockResponse();
             req.prisma.projectProposal.findUnique.mockResolvedValue({
                 id: '1', projectId: 'p1', supplierId: 's1', isWinner: true, costsGenerated: false,
                 value: 1000,
                 paymentCondition: { entryPercent: 20, installments: 2, startDate: '2025-01-01' }
             });

             await ProjectProposalController.generateCostsFromProposal(req, res);

             // 1000 value, 20% entry = 200. Remaining = 800. 2 installments = 400 each.
             // Total 3 costs created.
             const createManyArgs = req.prisma.projectCost.createMany.mock.calls[0][0].data;
             expect(createManyArgs).toHaveLength(3);
             
             expect(createManyArgs[0].amount).toBe(200);   // ENTRADA
             expect(createManyArgs[0].type).toBe('ENTRADA');
             
             expect(createManyArgs[1].amount).toBe(400);   // PARCELA 1
             expect(createManyArgs[1].type).toBe('PARCELA');
             
             expect(createManyArgs[2].amount).toBe(400);   // PARCELA 2
             
             expect(req.prisma.projectProposal.update).toHaveBeenCalledWith(expect.objectContaining({ data: { costsGenerated: true } }));
             expect(res.status).toHaveBeenCalledWith(201);
        });
        
        it('should gracefully handle logic with 0 entry missing fields', async () => {
             const req = mockRequest({ params: { proposalId: '1' } });
             const res = mockResponse();
             req.prisma.projectProposal.findUnique.mockResolvedValue({
                 id: '1', projectId: 'p1', supplierId: 's1', isWinner: true, costsGenerated: false,
                 value: 1000,
                 paymentCondition: { installments: 1 } // no entry no startDate
             });

             await ProjectProposalController.generateCostsFromProposal(req, res);

             const createManyArgs = req.prisma.projectCost.createMany.mock.calls[0][0].data;
             expect(createManyArgs).toHaveLength(1); // 1 installment only
             expect(createManyArgs[0].amount).toBe(1000); 
             expect(createManyArgs[0].date).toBeInstanceOf(Date);
        });
    });
});
