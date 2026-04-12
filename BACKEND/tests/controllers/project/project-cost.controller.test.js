const ProjectCostController = require('../../../src/controllers/project/project-cost.controller');
const ProjectService = require('../../../src/services/project.service');
const fs = require('fs');
const path = require('path');

jest.mock('../../../src/services/project.service');
jest.mock('../../../src/config/logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
}));
jest.mock('fs');

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

const mockRequest = (overrides = {}) => ({
    params: { id: 'p1', costId: 'c1' },
    body: {},
    user: { userId: 'u1', tenantId: 't1' },
    prisma: {
        projectCost: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            aggregate: jest.fn()
        },
        project: {
            findUnique: jest.fn(),
            update: jest.fn()
        },
        projectProposal: {
            findFirst: jest.fn()
        },
        auditLog: {
            create: jest.fn()
        }
    },
    ...overrides
});

describe('ProjectCostController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ProjectService.getById.mockResolvedValue({});
    });

    describe('getCosts', () => {
        it('should return costs', async () => {
             const req = mockRequest();
             const res = mockResponse();
             req.prisma.projectCost.findMany.mockResolvedValue([{ id: 'c1' }]);

             await ProjectCostController.getCosts(req, res);
             
             expect(req.prisma.projectCost.findMany).toHaveBeenCalledWith({
                 where: { projectId: 'p1' }, include: { supplier: true }, orderBy: { date: 'desc' }
             });
             expect(res.json).toHaveBeenCalledWith([{ id: 'c1' }]);
        });
    });

    describe('createCost', () => {
        const validBody = {
            description: 'Cost', type: 'OPEX', amount: 100, date: '2025-05-10',
            supplierId: 's1', invoiceNumber: '123', dueDate: '2025-05-20', paymentDate: '2025-05-25', notes: 'Notes'
        };

        it('should 404 if project missing', async () => {
             const req = mockRequest();
             const res = mockResponse();
             req.prisma.project.findUnique.mockResolvedValue(null);

             await ProjectCostController.createCost(req, res);
             expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should 403 if project not APPROVED', async () => {
             const req = mockRequest();
             const res = mockResponse();
             req.prisma.project.findUnique.mockResolvedValue({ approvalStatus: 'DRAFT' });

             await ProjectCostController.createCost(req, res);
             expect(res.status).toHaveBeenCalledWith(403);
             expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('precisa estar APROVADO') }));
        });

        it('should 403 if no winning proposal', async () => {
             const req = mockRequest();
             const res = mockResponse();
             req.prisma.project.findUnique.mockResolvedValue({ approvalStatus: 'APPROVED' });
             req.prisma.projectProposal.findFirst.mockResolvedValue(null);

             await ProjectCostController.createCost(req, res);
             expect(res.status).toHaveBeenCalledWith(403);
             expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('proposta aprovada') }));
        });

        it('should 400 if missing fields', async () => {
             const req = mockRequest({ body: {} });
             const res = mockResponse();
             req.prisma.project.findUnique.mockResolvedValue({ approvalStatus: 'APPROVED' });
             req.prisma.projectProposal.findFirst.mockResolvedValue({ id: 'prop1' });

             await ProjectCostController.createCost(req, res);
             expect(res.status).toHaveBeenCalledWith(400);
             expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ missingFields: expect.arrayContaining(['Descrição', 'Tipo/Categoria', 'Valor', 'Data', 'Anexo (documento comprobatório)']) }));
        });

        it('should create cost building urls, trigger audit and metrics correctly', async () => {
             const req = mockRequest({ body: validBody, file: { path: '/tmp/f.pdf', originalname: 'doc.pdf' } });
             const res = mockResponse();
             
             req.prisma.project.findUnique.mockResolvedValue({ approvalStatus: 'APPROVED' });
             req.prisma.projectProposal.findFirst.mockResolvedValue({ id: 'prop1' });
             req.prisma.projectCost.create.mockResolvedValue({ id: 'c1', description: 'desc', amount: 100 });
             req.prisma.projectCost.aggregate.mockResolvedValue({ _sum: { amount: 500 } });

             await ProjectCostController.createCost(req, res);

             expect(req.prisma.projectCost.create).toHaveBeenCalledWith(expect.objectContaining({
                 data: expect.objectContaining({ status: 'PREVISTO', amount: 100, fileUrl: expect.any(String), dueDate: expect.any(Date), paymentDate: expect.any(Date) })
             }));
             expect(req.prisma.projectCost.aggregate).toHaveBeenCalled();
             expect(req.prisma.project.update).toHaveBeenCalledWith(expect.objectContaining({ data: { actualCost: 500 } }));
             expect(req.prisma.auditLog.create).toHaveBeenCalled();
             expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should catch error on _updateProjectActualCost and swallow', async () => {
             const req = mockRequest({ body: validBody, file: { path: '/tmp/f.pdf', originalname: 'doc.pdf' } });
             const res = mockResponse();
             req.prisma.project.findUnique.mockResolvedValue({ approvalStatus: 'APPROVED' });
             req.prisma.projectProposal.findFirst.mockResolvedValue({ id: 'prop1' });
             req.prisma.projectCost.create.mockResolvedValue({ id: 'c1', description: 'desc', amount: 100 });

             req.prisma.projectCost.aggregate.mockRejectedValue(new Error('crash'));

             await ProjectCostController.createCost(req, res);

             expect(res.status).toHaveBeenCalledWith(201);
             expect(require('../../../src/config/logger').error).toHaveBeenCalled();
        });
    });

    describe('updateCost', () => {
         it('should 404 if missing cost', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.projectCost.findUnique.mockResolvedValue(null);
              await ProjectCostController.updateCost(req, res);
              expect(res.status).toHaveBeenCalledWith(404);
         });

         it('should 403 if restricted status', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.projectCost.findUnique.mockResolvedValue({ status: 'REALIZADO' });
              await ProjectCostController.updateCost(req, res);
              expect(res.status).toHaveBeenCalledWith(403);
         });

         it('should process selective updates and resolve metrics', async () => {
              const req = mockRequest({ body: { description: 'New', amount: 50, type: 'CAPEX', date: '2025-01-01', status: 'AGUARDANDO_APROVACAO', supplierId: 's1', invoiceNumber: '1', dueDate: '2025-02-01', paymentDate: '2025-02-02', notes: 'OK' }, file: { path: '/tmp/f.pdf', originalname: 'new' } });
              const res = mockResponse();
              req.prisma.projectCost.findUnique.mockResolvedValue({ status: 'PREVISTO' });
              req.prisma.projectCost.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
              req.prisma.projectCost.update.mockResolvedValue({ id: 'c1' });

              await ProjectCostController.updateCost(req, res);

              expect(req.prisma.projectCost.update).toHaveBeenCalledWith(expect.objectContaining({
                  data: expect.objectContaining({ description: 'New', amount: 50, invoiceNumber: '1', paymentDate: expect.any(Date), fileUrl: expect.any(String) })
              }));
              expect(req.prisma.project.update).toHaveBeenCalled();
              expect(res.json).toHaveBeenCalled();
         });
    });

    describe('deleteCost', () => {
         it('should 404 if missing', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.projectCost.findUnique.mockResolvedValue(null);
              await ProjectCostController.deleteCost(req, res);
              expect(res.status).toHaveBeenCalledWith(404);
         });

         it('should 403 if restricted status', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.projectCost.findUnique.mockResolvedValue({ status: 'PAGO' });
              await ProjectCostController.deleteCost(req, res);
              expect(res.status).toHaveBeenCalledWith(403);
         });

         it('should unlink file and delete cost', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.projectCost.findUnique.mockResolvedValue({ status: 'PREVISTO', fileUrl: '/doc.pdf' });
              req.prisma.projectCost.aggregate.mockResolvedValue({ _sum: { amount: null } });

              fs.existsSync.mockReturnValue(true);

              await ProjectCostController.deleteCost(req, res);

              expect(fs.unlinkSync).toHaveBeenCalled();
              expect(req.prisma.projectCost.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
              expect(req.prisma.project.update).toHaveBeenCalledWith(expect.objectContaining({ data: { actualCost: 0 } })); // Tests the null coalesce inside metrics
              expect(res.status).toHaveBeenCalledWith(204);
         });
    });

    describe('submitCostForApproval', () => {
         it('should 404 if missing', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.projectCost.findUnique.mockResolvedValue(null);
              await ProjectCostController.submitCostForApproval(req, res);
              expect(res.status).toHaveBeenCalledWith(404);
         });

         it('should 400 if invalid status', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.projectCost.findUnique.mockResolvedValue({ status: 'REALIZADO' });
              await ProjectCostController.submitCostForApproval(req, res);
              expect(res.status).toHaveBeenCalledWith(400);
         });

         it('should 400 if no file provided and no existing file', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.projectCost.findUnique.mockResolvedValue({ status: 'PREVISTO', fileUrl: null });
              await ProjectCostController.submitCostForApproval(req, res);
              expect(res.status).toHaveBeenCalledWith(400);
         });

         it('should accept valid submit mapping dates and assigning pending state', async () => {
              const req = mockRequest({ body: { invoiceValue: 100, dueDate: '2025-01-01', notes: 'x', invoiceNumber: '111' }, file: { path: '/tmp/f.pdf', originalname: 'new.pdf' } });
              const res = mockResponse();
              req.prisma.projectCost.findUnique.mockResolvedValue({ status: 'PREVISTO', fileUrl: null });
              req.prisma.projectCost.update.mockResolvedValue({ id: 'c1' });

              await ProjectCostController.submitCostForApproval(req, res);

              expect(req.prisma.projectCost.update).toHaveBeenCalledWith(expect.objectContaining({
                  data: expect.objectContaining({
                      status: 'AGUARDANDO_APROVACAO', invoiceNumber: '111', invoiceValue: 100, requiresAdjustment: false, fileUrl: expect.any(String)
                  })
              }));
              expect(res.json).toHaveBeenCalled();
         });
    });

    describe('approveCost', () => {
         it('should 404 if missing', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.projectCost.findUnique.mockResolvedValue(null);
              await ProjectCostController.approveCost(req, res);
              expect(res.status).toHaveBeenCalledWith(404);
         });

         it('should 400 if not pending', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.projectCost.findUnique.mockResolvedValue({ status: 'PREVISTO' });
              await ProjectCostController.approveCost(req, res);
              expect(res.status).toHaveBeenCalledWith(400);
         });

         it('should approve setting REALIZADO and calculating metrics', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.projectCost.findUnique.mockResolvedValue({ status: 'AGUARDANDO_APROVACAO' });
              req.prisma.projectCost.update.mockResolvedValue({ id: 'c1' });
              req.prisma.projectCost.aggregate.mockResolvedValue({ _sum: { amount: 100 } });

              await ProjectCostController.approveCost(req, res);

              expect(req.prisma.projectCost.update).toHaveBeenCalledWith(expect.objectContaining({
                  data: expect.objectContaining({ status: 'REALIZADO', approvedBy: 'u1', paymentDate: expect.any(Date) })
              }));
              expect(req.prisma.project.update).toHaveBeenCalled();
              expect(res.json).toHaveBeenCalled();
         });
    });

    describe('rejectCost', () => {
         it('should reset cost status mapping notes for rejection', async () => {
              const req = mockRequest({ body: { reason: 'No budget' } });
              const res = mockResponse();
              req.prisma.projectCost.update.mockResolvedValue({ id: 'c1' });

              await ProjectCostController.rejectCost(req, res);

              expect(req.prisma.projectCost.update).toHaveBeenCalledWith(expect.objectContaining({
                  data: { status: 'PREVISTO', notes: 'Rejeitado: No budget' }
              }));
              expect(res.json).toHaveBeenCalled();
         });
         
         it('should reset cost status dropping empty reason natively', async () => {
              const req = mockRequest({ body: {} });
              const res = mockResponse();
              req.prisma.projectCost.update.mockResolvedValue({ id: 'c1' });

              await ProjectCostController.rejectCost(req, res);

              expect(req.prisma.projectCost.update).toHaveBeenCalledWith(expect.objectContaining({
                  data: { status: 'PREVISTO', notes: null }
              }));
              expect(res.json).toHaveBeenCalled();
         });
    });
});
