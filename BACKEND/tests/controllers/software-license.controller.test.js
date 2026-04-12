const SoftwareLicenseController = require('../../src/controllers/software-license.controller');
const SoftwareLicenseService = require('../../src/services/software-license.service');
jest.mock('../../src/services/software-license.service');

describe('SoftwareLicenseController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { id: 'sl1' }, user: { userId: 'u1', tenantId: 't1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it('create — 201', async () => {
        SoftwareLicenseService.create.mockResolvedValue({ id: 'sl1' });
        req.body = { name: 'Office 365', vendor: 'Microsoft', licenseType: 'ASSINATURA' };
        await SoftwareLicenseController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('create — 400 on invalid type', async () => {
        req.body = { name: 'Test', vendor: 'V', licenseType: 'INVALID' };
        await SoftwareLicenseController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('index — 200', async () => {
        SoftwareLicenseService.getAll.mockResolvedValue([]);
        await SoftwareLicenseController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('show — 200', async () => {
        SoftwareLicenseService.getById.mockResolvedValue({ id: 'sl1' });
        await SoftwareLicenseController.show(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('update — 200', async () => {
        SoftwareLicenseService.update.mockResolvedValue({ id: 'sl1' });
        req.body = { name: 'Updated' };
        await SoftwareLicenseController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204', async () => {
        SoftwareLicenseService.delete.mockResolvedValue();
        await SoftwareLicenseController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });
});
