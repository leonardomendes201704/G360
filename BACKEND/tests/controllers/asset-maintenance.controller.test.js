const AssetMaintenanceController = require('../../src/controllers/asset-maintenance.controller');
const AssetMaintenanceService = require('../../src/services/asset-maintenance.service');
jest.mock('../../src/services/asset-maintenance.service');

describe('AssetMaintenanceController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { id: 'a1', maintenanceId: 'm1' }, user: { userId: 'u1', tenantId: 't1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it('create — 201', async () => {
        AssetMaintenanceService.create.mockResolvedValue({ id: 'm1' });
        req.body = { type: 'PREVENTIVA', description: 'Cleaning', startDate: '2025-03-01' };
        await AssetMaintenanceController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('create — error on missing type', async () => {
        req.body = { description: 'Test' };
        await AssetMaintenanceController.create(req, res);
        const status = res.status.mock.calls[0][0];
        expect(status).toBeGreaterThanOrEqual(400);
    });

    it('index — 200', async () => {
        AssetMaintenanceService.getAll.mockResolvedValue([]);
        await AssetMaintenanceController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('update — 200', async () => {
        AssetMaintenanceService.update.mockResolvedValue({ id: 'm1' });
        req.body = { description: 'Updated' };
        await AssetMaintenanceController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204', async () => {
        AssetMaintenanceService.delete.mockResolvedValue();
        await AssetMaintenanceController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });
});
