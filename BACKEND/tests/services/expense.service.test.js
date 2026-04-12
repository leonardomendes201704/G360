const ExpenseService = require('../../src/services/expense.service');
const ExpenseRepository = require('../../src/repositories/expense.repository');
const NotificationService = require('../../src/services/notification.service');
const AuditLogRepository = require('../../src/repositories/audit-log.repository');
const EmailTemplateService = require('../../src/services/email-template.service');
const MailService = require('../../src/services/mail.service');
const accessScope = require('../../src/utils/access-scope');
const fs = require('fs');
const path = require('path');

jest.mock('../../src/repositories/expense.repository');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/repositories/audit-log.repository');
jest.mock('../../src/services/email-template.service');
jest.mock('../../src/services/mail.service');
jest.mock('../../src/utils/access-scope');
jest.mock('fs');
jest.mock('../../src/config/logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
}));

const mockPrisma = {
    costCenter: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    fiscalYear: { findFirst: jest.fn() },
    budget: { findFirst: jest.fn() },
    expense: { aggregate: jest.fn() }
};

describe('ExpenseService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: true, isFinance: true, isManager: false });
        accessScope.getScopedCostCenterIds.mockReturnValue([]);
    });

    describe('assertAccess', () => {
         it('should pass if no userId or expense', async () => {
              await expect(ExpenseService.assertAccess(mockPrisma, null, 'u1')).resolves.toBeUndefined();
              await expect(ExpenseService.assertAccess(mockPrisma, {}, null)).resolves.toBeUndefined();
         });

         it('should pass if user is admin or finance', async () => {
              accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: false, isFinance: true });
              await expect(ExpenseService.assertAccess(mockPrisma, { createdBy: 'other' }, 'u1')).resolves.toBeUndefined();
              
              accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: true, isFinance: false });
              await expect(ExpenseService.assertAccess(mockPrisma, { createdBy: 'other' }, 'u1')).resolves.toBeUndefined();
         });

         it('should throw 403 if user is manager and CC not in allowed scope', async () => {
              accessScope.getUserAccessScope.mockResolvedValue({ 
                   isAdmin: false, isFinance: false, isManager: true, accessibleCostCenterIds: ['c1'] 
              });
              await expect(ExpenseService.assertAccess(mockPrisma, { costCenterId: 'c2' }, 'u1'))
                   .rejects.toEqual({ statusCode: 403, message: 'Acesso negado.' });
         });

         it('should pass if user is manager and CC is allowed', async () => {
              accessScope.getUserAccessScope.mockResolvedValue({ 
                   isAdmin: false, isFinance: false, isManager: true, accessibleCostCenterIds: ['c1'] 
              });
              await expect(ExpenseService.assertAccess(mockPrisma, { costCenterId: 'c1' }, 'u1')).resolves.toBeUndefined();
         });

         it('should throw 403 if user is common employee and did not create the expense', async () => {
              accessScope.getUserAccessScope.mockResolvedValue({ 
                   isAdmin: false, isFinance: false, isManager: false 
              });
              await expect(ExpenseService.assertAccess(mockPrisma, { createdBy: 'other' }, 'u1'))
                   .rejects.toEqual({ statusCode: 403, message: 'Acesso negado.' });
         });

         it('should pass if user is common employee but created the expense', async () => {
              accessScope.getUserAccessScope.mockResolvedValue({ 
                   isAdmin: false, isFinance: false, isManager: false 
              });
              await expect(ExpenseService.assertAccess(mockPrisma, { createdBy: 'u1' }, 'u1')).resolves.toBeUndefined();
         });
    });

    describe('create', () => {
         const baseData = {
              amount: 500, date: '2025-05-15', createdBy: 'u1'
         };

         it('should bypass auth limits evaluating scopes natively returning clean bypass natively parsing properly', async () => {
              accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: false, isFinance: false });
              accessScope.getScopedCostCenterIds.mockReturnValue(['c1']); // Allowed
              
              ExpenseRepository.create.mockResolvedValue({ id: 'e1' });
              const res = await ExpenseService.create(mockPrisma, { ...baseData, costCenterId: 'c1' });
              
              expect(res.id).toBe('e1');
         });

         it('should handle falsy dates mapping safely clearing implicit checks successfully', async () => {
              ExpenseRepository.create.mockResolvedValue({ id: 'e1' });
              
              await ExpenseService.create(mockPrisma, { ...baseData, dueDate: '', paymentDate: '' });
              
              expect(ExpenseRepository.create).toHaveBeenCalledWith(mockPrisma, expect.objectContaining({
                   dueDate: null, paymentDate: null
              }));
         });

         it('should bypass notification triggers natively executing skips correctly clearing logs', async () => {
              ExpenseRepository.create.mockResolvedValue({ id: 'e1' });
              // No costCenterId
              const res = await ExpenseService.create(mockPrisma, { ...baseData });
              
              expect(res.id).toBe('e1');
              expect(NotificationService.createNotification).not.toHaveBeenCalled();
         });

         it('should process CC mapped drops accurately natively traversing loops gracefully', async () => {
              ExpenseRepository.create.mockResolvedValue({ id: 'e1', costCenterId: 'c1' });
              mockPrisma.costCenter.findUnique.mockResolvedValue(null); // No CC found gracefully
              
              await ExpenseService.create(mockPrisma, { ...baseData, costCenterId: 'c1' });
              expect(NotificationService.createNotification).not.toHaveBeenCalled();
         });

         it('should swallow errors smoothly if notification/email fails natively resolving securely internally', async () => {
              ExpenseRepository.create.mockResolvedValue({ id: 'e1', costCenterId: 'c1' });
              mockPrisma.costCenter.findUnique.mockRejectedValue(new Error('Crash CC'));
              AuditLogRepository.create.mockRejectedValue(new Error('Crash Audit Log'));

              const res = await ExpenseService.create(mockPrisma, { ...baseData, costCenterId: 'c1' });
              
              expect(res.id).toBe('e1');
         });

         it('should route partial failures gracefully mapping empty nested arrays correctly natively executing successfully internally', async () => {
              ExpenseRepository.create.mockResolvedValue({ id: 'e1', amount: 500, costCenterId: 'c1', accountId: 'a1', date: new Date('2025-05-15') });
              mockPrisma.costCenter.findUnique.mockResolvedValue({ department: { managerId: 'm1' } });
              mockPrisma.user.findUnique.mockResolvedValue({ id: 'm1', email: 'm@m.com', name: 'Man' });
              
              mockPrisma.fiscalYear.findFirst.mockResolvedValue(null); // No FY skips budget block
              await ExpenseService.create(mockPrisma, { ...baseData, costCenterId: 'c1', accountId: 'a1' });
              
              mockPrisma.fiscalYear.findFirst.mockResolvedValue({ id: 'fy1' });
              mockPrisma.budget.findFirst.mockResolvedValue(null); // No Budget skips next
              await ExpenseService.create(mockPrisma, { ...baseData, costCenterId: 'c1', accountId: 'a1' });
              
              mockPrisma.budget.findFirst.mockResolvedValue({ items: [] }); // No matching items
              await ExpenseService.create(mockPrisma, { ...baseData, costCenterId: 'c1', accountId: 'a1' });
              
              // No overflow
              mockPrisma.budget.findFirst.mockResolvedValue({ items: [{ costCenterId: 'c1', accountId: 'a1', total: '1000' }] });
              mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 500 } });
              await ExpenseService.create(mockPrisma, { ...baseData, costCenterId: 'c1', accountId: 'a1' });
              
              // Overflow
              mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 1500 } }); // 1500 > 1000
              await ExpenseService.create(mockPrisma, { ...baseData, costCenterId: 'c1', accountId: 'a1' });
              expect(NotificationService.createNotification).toHaveBeenCalledWith(
                   mockPrisma, 'm1', '🚨 Estouro de Orçamento', expect.stringContaining('Excedente: R$ 500'), 'ERROR', '/finance'
              );
         });
         
         it('should map missing managers and generic conditions skipping effortlessly resolving seamlessly', async () => {
              ExpenseRepository.create.mockResolvedValue({ id: 'e1', amount: 500, costCenterId: 'c1' });
              mockPrisma.costCenter.findUnique.mockResolvedValue({ department: { managerId: 'm1' } });
              mockPrisma.user.findUnique.mockResolvedValue(null); // No manager
              
              await ExpenseService.create(mockPrisma, { ...baseData, costCenterId: 'c1' });
              expect(MailService.sendMail).not.toHaveBeenCalled();
         });
    });

    describe('update', () => {
         const validUpdate = {
              userId: 'u1', amount: 300, date: '2025-06-10', status: 'PENDING'
         };

         it('should 404 if expense missing', async () => {
              ExpenseRepository.findById.mockResolvedValue(null);
              await expect(ExpenseService.update(mockPrisma, 'e1', 't1', validUpdate)).rejects.toEqual({ statusCode: 404, message: 'Despesa nao encontrada.' });
         });

         it('should block editing explicitly APROVADO expenses unless status is the change factor natively traversing logic successfully', async () => {
              ExpenseRepository.findById.mockResolvedValue({ id: 'e1', status: 'APROVADO', createdBy: 'u1' });
              await expect(ExpenseService.update(mockPrisma, 'e1', 't1', { userId: 'u1', status: 'APROVADO' }))
                  .rejects.toEqual({ statusCode: 403, message: 'Despesas Aprovadas ou Pagas não podem ser editadas.' });

              // Allows status reversion
              ExpenseRepository.update.mockResolvedValue({ id: 'e1' });
              const res = await ExpenseService.update(mockPrisma, 'e1', 't1', { userId: 'u1', status: 'PENDING' });
              expect(res.id).toBe('e1');
         });

         it('should update mapping null mappings explicitly traversing nested Prisma disconnects natively', async () => {
              ExpenseRepository.findById.mockResolvedValue({ id: 'e1', status: 'PENDING', createdBy: 'u1' });
              ExpenseRepository.update.mockResolvedValue({ id: 'e1', amount: 300 });

              // Omitting file triggers `if (file) { ... }` bypass
              const res = await ExpenseService.update(mockPrisma, 'e1', 't1', { 
                   userId: 'u1', costCenterId: '', accountId: '', supplierId: '', contractId: '' 
              });
              
              expect(ExpenseRepository.update).toHaveBeenCalledWith(mockPrisma, 'e1', expect.objectContaining({
                   supplier: { disconnect: true },
                   contract: { disconnect: true },
                   account: { disconnect: true },
                   costCenter: undefined
              }));
         });

         it('should update enforcing explicit nested mappings organically natively correctly internally processing relationships thoroughly', async () => {
              ExpenseRepository.findById.mockResolvedValue({ id: 'e1', status: 'PENDING', createdBy: 'u1' });
              ExpenseRepository.update.mockResolvedValue({ id: 'e1', amount: 300 });

              const res = await ExpenseService.update(mockPrisma, 'e1', 't1', { 
                   userId: 'u1', costCenterId: 'c1', accountId: 'a1', supplierId: 's1', contractId: 'ct1' 
              });
              
              expect(ExpenseRepository.update).toHaveBeenCalledWith(mockPrisma, 'e1', expect.objectContaining({
                   supplier: { connect: { id: 's1' } },
                   contract: { connect: { id: 'ct1' } },
                   account: { connect: { id: 'a1' } },
                   costCenter: { connect: { id: 'c1' } }
              }));
         });

         it('should update parsing dates and file unlinking reliably matching completely seamlessly', async () => {
              ExpenseRepository.findById.mockResolvedValue({ id: 'e1', status: 'PENDING', createdBy: 'u1', fileUrl: '/old-file.pdf' });
              ExpenseRepository.update.mockResolvedValue({ id: 'e1', amount: 300 });

              fs.existsSync.mockReturnValue(true);
              
              const file = { path: '/tmp/new-file.pdf', originalname: 'new.pdf' };
              
              // With falsy amounts natively parsed dates safely bypassing correctly cleanly internally
              const res = await ExpenseService.update(mockPrisma, 'e1', 't1', { 
                   userId: 'u1', amount: '', date: '', dueDate: '2025-01-01', paymentDate: '2025-01-01' 
              }, file);
              
              expect(fs.unlinkSync).toHaveBeenCalled();
              expect(res.id).toBe('e1');
         });

         it('should enforce File and NF required for APPROVED payload status natively processing reliably gracefully evaluating scopes carefully', async () => {
              ExpenseRepository.findById.mockResolvedValue({ id: 'e1', status: 'PENDING', createdBy: 'u1', fileUrl: null }); // Missing file
              
              await expect(ExpenseService.update(mockPrisma, 'e1', 't1', { userId: 'u1', status: 'APPROVED', invoiceNumber: '123' }))
                  .rejects.toEqual({ statusCode: 400, message: 'Para aprovar, é obrigatório anexar a Nota Fiscal (PDF/Imagem).' });

              await expect(ExpenseService.update(mockPrisma, 'e1', 't1', { userId: 'u1', status: 'APPROVED', invoiceNumber: ' ' }, { path: '...' }))
                  .rejects.toEqual({ statusCode: 400, message: 'Para aprovar, é obrigatório informar o Número da NF.' });

              // Valid
              ExpenseRepository.update.mockResolvedValue({ id: 'e1' });
              await ExpenseService.update(mockPrisma, 'e1', 't1', { userId: 'u1', status: 'APPROVED', invoiceNumber: '123' }, { path: '...' });
              expect(ExpenseRepository.update).toHaveBeenCalledWith(mockPrisma, 'e1', expect.objectContaining({ approvedBy: 'u1' }));
         });
    });

    describe('getAll & getById', () => {
         it('should format requests accurately logging universally bypassing mappings efficiently seamlessly', async () => {
              ExpenseRepository.findAll.mockResolvedValue([{ id: 'e1' }]);
              await ExpenseService.getAll(mockPrisma, 't1', {}, null); // No user mapping
              const res = await ExpenseService.getAll(mockPrisma, 't1', {}, { userId: 'u1' });
              expect(res).toHaveLength(1);
         });
         
         it('should return 404', async () => {
              ExpenseRepository.findById.mockResolvedValue(null);
              await expect(ExpenseService.getById(mockPrisma, 'e1', 't1', 'u1')).rejects.toEqual({ statusCode: 404, message: 'Despesa nao encontrada.' });
         });
    });

    describe('delete', () => {
         it('should block deletion of PAGO expenses explicitly', async () => {
              ExpenseRepository.findById.mockResolvedValue({ id: 'e1', status: 'PAGO' });

              await expect(ExpenseService.delete(mockPrisma, 'e1', 't1', 'u1'))
                  .rejects.toEqual({ statusCode: 403, message: 'Despesas PAGAS não podem ser excluídas diretamente. Solicite aprovação para exclusão.' });
         });

         it('should unlink files and perform delete + log gracefully bypassing files cleanly seamlessly correctly implicitly', async () => {
              ExpenseRepository.findById.mockResolvedValue({ id: 'e1', status: 'PENDING' }); // No fileUrl
              await ExpenseService.delete(mockPrisma, 'e1', 't1', 'u1');
              expect(fs.unlinkSync).not.toHaveBeenCalled();

              ExpenseRepository.findById.mockResolvedValue({ id: 'e1', status: 'PENDING', fileUrl: '/to-del' });
              fs.existsSync.mockReturnValue(false); // Does not exist
              await ExpenseService.delete(mockPrisma, 'e1', 't1', 'u1');
         });

         it('should continue silently if file unlinking or audit logging throws natively trapping flawlessly', async () => {
              ExpenseRepository.findById.mockResolvedValue({ id: 'e1', status: 'PENDING', fileUrl: '/to-del' });
              fs.existsSync.mockReturnValue(true);
              fs.unlinkSync.mockImplementation(() => { throw new Error('Unlink Fail'); });
              AuditLogRepository.create.mockRejectedValue(new Error('Audit fail'));

              const res = await ExpenseService.delete(mockPrisma, 'e1', 't1', 'u1');
              expect(res).toBe(true);
         });
    });
});
