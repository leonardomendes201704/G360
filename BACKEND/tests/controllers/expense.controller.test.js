const ExpenseController = require('../../src/controllers/expense.controller');
const ExpenseService = require('../../src/services/expense.service');
const NotificationService = require('../../src/services/notification.service');
const yup = require('yup');

jest.mock('../../src/services/expense.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/services/approval-tier.service', () => ({
    notifyExpenseTierApprovers: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/config/logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
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
    body: {},
    params: {},
    query: {},
    user: { userId: 'u1', tenantId: 't1' },
    prisma: {
        budget: { findFirst: jest.fn() },
        expense: { findUnique: jest.fn(), update: jest.fn() }
    },
    ...overrides
});

describe('ExpenseController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ExpenseService.getById.mockResolvedValue({});
        ExpenseService.create.mockResolvedValue({});
        ExpenseService.update.mockResolvedValue({});
        ExpenseService.getAll.mockResolvedValue([]);
        ExpenseService.delete.mockResolvedValue();
    });

    describe('create', () => {
        const validBody = {
            description: 'Test Expense',
            amount: 100,
            date: '2025-05-15',
            type: 'OPEX',
            costCenterId: '123e4567-e89b-12d3-a456-426614174000',
            approvalStatus: 'PLANNED'
        };

        it('should 400 if no approved budget for the given year', async () => {
             const req = mockRequest({ body: validBody });
             const res = mockResponse();
             req.prisma.budget.findFirst.mockResolvedValue(null);

             await ExpenseController.create(req, res);

             expect(res.status).toHaveBeenCalledWith(400);
             expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Não há orçamento aprovado para este ano fiscal') }));
        });

        it('should 400 if validation fails', async () => {
             const req = mockRequest({ body: { ...validBody, amount: 'notanumber' } });
             const res = mockResponse();
             req.prisma.budget.findFirst.mockResolvedValue({ id: 'b1' });

             await ExpenseController.create(req, res);

             expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should append file data and approval status, then return 201', async () => {
             const req = mockRequest({ 
                 body: { ...validBody, accountId: '', supplierId: '', contractId: '', dueDate: '', paymentDate: '' },
                 file: { filename: 'f1.pdf', originalname: 'doc.pdf' }
             });
             const res = mockResponse();
             req.prisma.budget.findFirst.mockResolvedValue({ id: 'b1' });
             ExpenseService.create.mockResolvedValue({ id: 'e1' });

             await ExpenseController.create(req, res);

             expect(ExpenseService.create).toHaveBeenCalledWith(req.prisma, expect.objectContaining({
                  fileUrl: '/uploads/expenses/f1.pdf',
                  fileName: 'doc.pdf',
                  accountId: null,
                  supplierId: null,
                  tenantId: 't1',
                  createdBy: 'u1'
             }));
             expect(res.status).toHaveBeenCalledWith(201);
             expect(res.json).toHaveBeenCalledWith({ id: 'e1' });
        });

        it('should 500 on unexpected errors', async () => {
             const req = mockRequest({ body: validBody });
             const res = mockResponse();
             req.prisma.budget.findFirst.mockRejectedValue(new Error('crash'));

             await ExpenseController.create(req, res);

             expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('update', () => {
        const validBody = { amount: 150, type: 'OPEX', approvalStatus: 'UNPLANNED' };

        it('should 400 if PAGO but missing invoiceNumber and dueDate', async () => {
             const req = mockRequest({ params: { id: 'e1' }, body: { status: 'PAGO' } });
             const res = mockResponse();
             req.prisma.expense.findUnique.mockResolvedValue({ id: 'e1', status: 'APROVADO', costCenter: null });

             await ExpenseController.update(req, res);
             expect(res.status).toHaveBeenCalledWith(400);
             expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Nota Fiscal') }));

             req.body = { status: 'PAGO', invoiceNumber: '123' };
             req.prisma.expense.findUnique.mockResolvedValue({ id: 'e1', status: 'APROVADO', costCenter: null });
             await ExpenseController.update(req, res);
             expect(res.status).toHaveBeenCalledWith(400);
             expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Data de Vencimento') }));
        });

        it('should map fileUrl and approvalStatus and call update service', async () => {
             const req = mockRequest({ 
                  params: { id: 'e1' }, 
                  body: { ...validBody, accountId: '', costCenterId: '', dueDate: '', paymentDate: '', supplierId: '', contractId: '' }, // tests empty string transformers
                  file: { filename: 'f2.pdf', originalname: 'new.pdf' }
             });
             const res = mockResponse();
             req.prisma.expense.findUnique.mockResolvedValue({ id: 'e1', status: 'PREVISTO', costCenter: null });
             ExpenseService.update.mockResolvedValue({ id: 'e1', amount: 150 });

             await ExpenseController.update(req, res);

             expect(res.status).toHaveBeenCalledWith(200);
             // Ensure empty strings transformed to null
             expect(ExpenseService.update).toHaveBeenCalledWith(req.prisma, 'e1', 't1', expect.objectContaining({
                  accountId: null, costCenterId: null, dueDate: null
             }));
        });

        it('should notify approvers when service promotes to AGUARDANDO_APROVACAO without status in body', async () => {
             const { notifyExpenseTierApprovers } = require('../../src/services/approval-tier.service');
             const req = mockRequest({
                  params: { id: 'e1' },
                  body: { approvalStatus: 'UNPLANNED' },
             });
             const res = mockResponse();
             req.prisma.expense.findUnique.mockResolvedValue({
                  id: 'e1',
                  status: 'PREVISTO',
                  amount: 200,
                  costCenter: { managerId: 'm1' },
             });
             ExpenseService.update.mockResolvedValue({
                  id: 'e1',
                  status: 'AGUARDANDO_APROVACAO',
                  amount: 200,
             });

             await ExpenseController.update(req, res);

             expect(res.status).toHaveBeenCalledWith(200);
             expect(NotificationService.createNotification).toHaveBeenCalled();
             expect(notifyExpenseTierApprovers).toHaveBeenCalled();
        });

        it('should 500 on generic update errors or pipe status code', async () => {
             const req = mockRequest({ params: { id: 'e1' }, body: {} });
             const res = mockResponse();
             req.prisma.expense.findUnique.mockResolvedValue({ id: 'e1', status: 'PREVISTO', costCenter: null });
             
             // Piping custom status code
             ExpenseService.update.mockRejectedValue({ statusCode: 403, message: 'Denied' });
             await ExpenseController.update(req, res);
             expect(res.status).toHaveBeenCalledWith(403);
             
             // 500
             ExpenseService.update.mockRejectedValue(new Error('Crash'));
             await ExpenseController.update(req, res);
             expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('index', () => {
        it('should return 200 list', async () => {
             const req = mockRequest();
             const res = mockResponse();
             ExpenseService.getAll.mockResolvedValue([{ id: 'e1' }]);
             await ExpenseController.index(req, res);
             expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should 500 on error', async () => {
             const req = mockRequest();
             const res = mockResponse();
             ExpenseService.getAll.mockRejectedValue(new Error('fail'));
             await ExpenseController.index(req, res);
             expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('show', () => {
        it('should return 200 expense', async () => {
             const req = mockRequest({ params: { id: 'e1' } });
             const res = mockResponse();
             ExpenseService.getById.mockResolvedValue({ id: 'e1' });
             await ExpenseController.show(req, res);
             expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 404 on error', async () => {
             const req = mockRequest({ params: { id: 'e1' } });
             const res = mockResponse();
             ExpenseService.getById.mockRejectedValue(new Error('fail'));
             await ExpenseController.show(req, res);
             expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('delete', () => {
        it('should return 204 on success', async () => {
             const req = mockRequest({ params: { id: 'e1' } });
             const res = mockResponse();
             await ExpenseController.delete(req, res);
             expect(res.status).toHaveBeenCalledWith(204);
        });

        it('should map custom errors or 500', async () => {
             const req = mockRequest({ params: { id: 'e1' } });
             const res = mockResponse();
             ExpenseService.delete.mockRejectedValue({ statusCode: 403, message: 'Nope' });
             await ExpenseController.delete(req, res);
             expect(res.status).toHaveBeenCalledWith(403);

             ExpenseService.delete.mockRejectedValue(new Error('crash'));
             await ExpenseController.delete(req, res);
             expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('submitForApproval', () => {
        it('should 404 if expense missing', async () => {
             const req = mockRequest({ params: { id: 'e1' } });
             const res = mockResponse();
             req.prisma.expense.findUnique.mockResolvedValue(null);
             await ExpenseController.submitForApproval(req, res);
             expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should 400 if expense is not PREVISTO nor RETURNED', async () => {
             const req = mockRequest({ params: { id: 'e1' } });
             const res = mockResponse();
             req.prisma.expense.findUnique.mockResolvedValue({ status: 'PAGO' });
             await ExpenseController.submitForApproval(req, res);
             expect(res.status).toHaveBeenCalledWith(400);
             expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                 error: expect.stringContaining('Previsto ou Devolvida'),
             }));
        });

        it('should update to AGUARDANDO_APROVACAO and notify manager', async () => {
             const req = mockRequest({ params: { id: 'e1' } });
             const res = mockResponse();
             req.prisma.expense.findUnique.mockResolvedValue({ 
                  id: 'e1', status: 'PREVISTO', amount: 100, costCenter: { managerId: 'm1' } 
             });
             req.prisma.expense.update.mockResolvedValue({ id: 'e1', status: 'AGUARDANDO_APROVACAO' });

             await ExpenseController.submitForApproval(req, res);

             expect(req.prisma.expense.update).toHaveBeenCalledWith(expect.objectContaining({ 
                 data: expect.objectContaining({
                     status: 'AGUARDANDO_APROVACAO',
                     rejectionReason: null,
                     requiresAdjustment: false,
                 }),
             }));
             expect(NotificationService.createNotification).toHaveBeenCalled();
             expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should submit from RETURNED clearing rejection fields', async () => {
             const req = mockRequest({ params: { id: 'e1' } });
             const res = mockResponse();
             req.prisma.expense.findUnique.mockResolvedValue({
                 id: 'e1', status: 'RETURNED', amount: 200, costCenter: { managerId: 'm1' },
             });
             req.prisma.expense.update.mockResolvedValue({ id: 'e1', status: 'AGUARDANDO_APROVACAO' });

             await ExpenseController.submitForApproval(req, res);

             expect(req.prisma.expense.update).toHaveBeenCalledWith(expect.objectContaining({
                 data: expect.objectContaining({
                     status: 'AGUARDANDO_APROVACAO',
                     rejectionReason: null,
                     requiresAdjustment: false,
                 }),
             }));
             expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should 500 on error', async () => {
             const req = mockRequest({ params: { id: 'e1' } });
             const res = mockResponse();
             ExpenseService.getById.mockRejectedValue(new Error('fail'));
             await ExpenseController.submitForApproval(req, res);
             expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
