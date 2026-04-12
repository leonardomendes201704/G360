const ContractDetailsController = require('../../src/controllers/contract-details.controller');
const ContractService = require('../../src/services/contract.service');
const NotificationService = require('../../src/services/notification.service');
const fs = require('fs');

jest.mock('../../src/services/contract.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/config/logger', () => ({
    error: jest.fn()
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
    params: { id: 'c1', addendumId: 'a1', attachmentId: 'att1' },
    body: {},
    query: {},
    user: { userId: 'u1' },
    prisma: {
        contractAddendum: {
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn()
        },
        contract: {
            findUnique: jest.fn(),
            update: jest.fn()
        },
        contractAttachment: {
            findMany: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            findFirst: jest.fn(),
            findUnique: jest.fn()
        }
    },
    file: null,
    ...overrides
});

describe('ContractDetailsController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ContractService.getById.mockResolvedValue({});
    });

    describe('_recalculateContract', () => {
         it('should return if contract not found', async () => {
              const prisma = mockRequest().prisma;
              prisma.contract.findUnique.mockResolvedValue(null);
              await ContractDetailsController._recalculateContract(prisma, 'c1');
              expect(prisma.contract.update).not.toHaveBeenCalled();
         });

         it('should gracefully aggregate fields and calculate metrics, mapping value and dates exactly', async () => {
              const prisma = mockRequest().prisma;
              prisma.contract.findUnique.mockResolvedValue({
                   id: 'c1',
                   originalValue: 1000,
                   originalEndDate: new Date('2025-01-01'),
                   addendums: [
                        { valueChange: 200, newEndDate: new Date('2025-06-01') },
                        { valueChange: -50, newEndDate: null }
                   ]
              });
              await ContractDetailsController._recalculateContract(prisma, 'c1');
              expect(prisma.contract.update).toHaveBeenCalledWith({
                   where: { id: 'c1' },
                   data: { value: 1150, endDate: new Date('2025-06-01') }
              });
         });
         
         it('should gracefully handle null originalValue/originalEndDate using basic value/endDate', async () => {
              const prisma = mockRequest().prisma;
              prisma.contract.findUnique.mockResolvedValue({
                   id: 'c1',
                   originalValue: null,
                   value: 500,
                   originalEndDate: null,
                   endDate: new Date('2024-12-31'),
                   addendums: []
              });
              await ContractDetailsController._recalculateContract(prisma, 'c1');
              expect(prisma.contract.update).toHaveBeenCalledWith({
                   where: { id: 'c1' },
                   data: { value: 500, endDate: new Date('2024-12-31') }
              });
         });
    });

    describe('getAddendums', () => {
         it('should retrieve addendums', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.contractAddendum.findMany.mockResolvedValue([{ id: 'a1' }]);
              await ContractDetailsController.getAddendums(req, res);
              expect(res.json).toHaveBeenCalledWith([{ id: 'a1' }]);
         });
    });

    describe('createAddendum', () => {
         it('should 400 if signature date is earlier than contract start date', async () => {
              const req = mockRequest({ body: { signatureDate: '2023-01-01' } });
              const res = mockResponse();
              req.prisma.contract.findUnique.mockResolvedValue({ startDate: new Date('2024-01-01') });
              await ContractDetailsController.createAddendum(req, res);
              expect(res.status).toHaveBeenCalledWith(400);
         });

         it('should create mapping file urls, snapshoting contract context and notifying effectively', async () => {
              const req = mockRequest({ 
                  body: { signatureDate: '2024-06-01', description: 'desc', valueChange: '50', newEndDate: '2025-12-31' },
                  file: { path: '/x.pdf', originalname: 'o.pdf' }
              });
              const res = mockResponse();
              req.prisma.contract.findUnique
                 .mockResolvedValueOnce({ id: 'c1', startDate: new Date('2024-01-01'), originalValue: null, value: 500, originalEndDate: null, endDate: new Date('2024-12-31'), number: 'CTR-01' })
                 .mockResolvedValueOnce({ id: 'c1', costCenter: { department: { managerId: 'm1' } } });
              
              req.prisma.contractAddendum.count.mockResolvedValue(0);
              req.prisma.contractAddendum.create.mockResolvedValue({ id: 'a1' });
              
              const spyRecalculate = jest.spyOn(ContractDetailsController, '_recalculateContract').mockResolvedValue();

              await ContractDetailsController.createAddendum(req, res);

              // Update snapshot
              expect(req.prisma.contract.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { originalValue: 500, originalEndDate: new Date('2024-12-31') } });
              
              // Create addendum
              expect(req.prisma.contractAddendum.create).toHaveBeenCalledWith(expect.objectContaining({
                  data: expect.objectContaining({ contractId: 'c1', number: 'CTR-01-ADT-01', valueChange: 50, newEndDate: expect.any(Date), fileUrl: expect.any(String) })
              }));

              // Notification
              expect(NotificationService.createNotification).toHaveBeenCalled();
              
              spyRecalculate.mockRestore();
              expect(res.status).toHaveBeenCalledWith(201);
         });

         it('should silently handle notification failure mapping simple path logic natively', async () => {
              const req = mockRequest({ body: { signatureDate: '2024-06-01', number: 'OVRD-123' } });
              const res = mockResponse();
              req.prisma.contract.findUnique
                 .mockResolvedValueOnce({ startDate: new Date('2024-01-01'), originalValue: 500, originalEndDate: new Date('2025-01-01') })
                 .mockRejectedValue(new Error('crash notification')); // forces error block
                 
              req.prisma.contractAddendum.create.mockResolvedValue({ id: 'a1' });
              const spyRecalculate = jest.spyOn(ContractDetailsController, '_recalculateContract').mockResolvedValue();

              await ContractDetailsController.createAddendum(req, res);

              // Ensure snapshot update is not fired because the contract already had original mappings
              expect(req.prisma.contract.update).not.toHaveBeenCalled();
              
              expect(require('../../src/config/logger').error).toHaveBeenCalled();
              
              spyRecalculate.mockRestore();
              expect(res.status).toHaveBeenCalledWith(201);
         });
    });

    describe('updateAddendum', () => {
         it('should 404 if missing object natively', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.contractAddendum.findUnique.mockResolvedValue(null);
              await ContractDetailsController.updateAddendum(req, res);
              expect(res.status).toHaveBeenCalledWith(404);
         });

         it('should map body variables accurately executing file override', async () => {
              const req = mockRequest({ body: { signatureDate: '2025-01-01', valueChange: '30', newEndDate: '2026-01-01' }, file: { path: 'z', originalname: 'z.pdf' } });
              const res = mockResponse();
              req.prisma.contractAddendum.findUnique.mockResolvedValue({ id: 'a1', contractId: 'c1' });
              req.prisma.contractAddendum.update.mockResolvedValue({ id: 'a1', contractId: 'c1' });
              const spyRecalculate = jest.spyOn(ContractDetailsController, '_recalculateContract').mockResolvedValue();

              await ContractDetailsController.updateAddendum(req, res);
              
              expect(req.prisma.contractAddendum.update).toHaveBeenCalledWith(expect.objectContaining({
                  data: expect.objectContaining({ valueChange: 30, fileUrl: expect.any(String) })
              }));
              
              spyRecalculate.mockRestore();
              expect(res.json).toHaveBeenCalled();
         });
    });

    describe('deleteAddendum', () => {
         it('should 404 if missing object natively', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.contractAddendum.findUnique.mockResolvedValue(null);
              await ContractDetailsController.deleteAddendum(req, res);
              expect(res.status).toHaveBeenCalledWith(404);
         });

         it('should destroy file mapping properly and recalculate', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.contractAddendum.findUnique.mockResolvedValue({ id: 'a1', contractId: 'c1', fileUrl: 'to/delete' });
              const spyRecalculate = jest.spyOn(ContractDetailsController, '_recalculateContract').mockResolvedValue();

              fs.existsSync.mockReturnValue(true);

              await ContractDetailsController.deleteAddendum(req, res);

              expect(fs.unlinkSync).toHaveBeenCalled();
              expect(req.prisma.contractAddendum.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
              
              spyRecalculate.mockRestore();
              expect(res.status).toHaveBeenCalledWith(204);
         });
    });

    describe('getAttachments', () => {
         it('should resolve finding specific attachments ordered explicitly', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.contractAttachment.findMany.mockResolvedValue([{ id: 'att1' }]);
              await ContractDetailsController.getAttachments(req, res);
              expect(res.json).toHaveBeenCalledWith([{ id: 'att1' }]);
         });
    });

    describe('uploadAttachment', () => {
         it('should block empty file instances natively', async () => {
              const req = mockRequest();
              const res = mockResponse();
              await ContractDetailsController.uploadAttachment(req, res);
              expect(res.status).toHaveBeenCalledWith(400);
         });

         it('should execute deleting old replacement attachment if exists', async () => {
              const req = mockRequest({ file: { path: 'a', originalname: 'a', size: 1, mimetype: 'm' }, query: { type: 'CONTRATO' } });
              const res = mockResponse();
              req.prisma.contractAttachment.findFirst.mockResolvedValue({ id: 'old1', fileUrl: '/x' });
              req.prisma.contractAttachment.create.mockResolvedValue({ id: 'att1' });
              fs.existsSync.mockReturnValue(true);

              await ContractDetailsController.uploadAttachment(req, res);

              expect(fs.unlinkSync).toHaveBeenCalled();
              expect(req.prisma.contractAttachment.delete).toHaveBeenCalledWith({ where: { id: 'old1' } });
              expect(req.prisma.contractAttachment.create).toHaveBeenCalledWith(expect.objectContaining({
                  data: expect.objectContaining({ type: 'CONTRATO' })
              }));
              expect(res.status).toHaveBeenCalledWith(201);
         });
         
         it('should set default fallback type if not specifically passed', async () => {
              const req = mockRequest({ file: { path: 'a', originalname: 'a', size: 1, mimetype: 'm' } });
              const res = mockResponse();
              req.prisma.contractAttachment.create.mockResolvedValue({ id: 'att1' });

              await ContractDetailsController.uploadAttachment(req, res);

              expect(req.prisma.contractAttachment.create).toHaveBeenCalledWith(expect.objectContaining({
                  data: expect.objectContaining({ type: 'OUTROS' })
              }));
         });
    });

    describe('deleteAttachment', () => {
         it('should process correctly destroying item instance mapping logically', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.contractAttachment.findUnique.mockResolvedValue({ id: 'att1', contractId: 'c1', fileUrl: 'v' });
              fs.existsSync.mockReturnValue(true);

              await ContractDetailsController.deleteAttachment(req, res);

              expect(fs.unlinkSync).toHaveBeenCalled();
              expect(req.prisma.contractAttachment.delete).toHaveBeenCalledWith({ where: { id: 'att1' } });
              expect(res.status).toHaveBeenCalledWith(204);
         });

         it('should accept 204 natively if not found', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.contractAttachment.findUnique.mockResolvedValue(null);
              await ContractDetailsController.deleteAttachment(req, res);
              expect(res.status).toHaveBeenCalledWith(204);
         });
    });
});
