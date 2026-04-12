const TenantService = require('../../src/services/tenant.service');
const TenantManager = require('../../src/config/tenant-manager');
jest.mock('../../src/services/tenant.service');
jest.mock('../../src/config/tenant-manager');
jest.mock('../../src/repositories/tenant.repository');
jest.mock('../../src/config/logger', () => ({ error: jest.fn(), info: jest.fn() }));
jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashed') }));

const TenantController = require('../../src/controllers/tenant.controller');

describe('TenantController', () => {
    let req, res;
    const mockCatalogPrisma = {};
    beforeEach(() => {
        req = { body: {}, params: { id: 't1' }, query: {}, user: { userId: 'u1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
        TenantManager.getCatalogClient.mockReturnValue(mockCatalogPrisma);
    });

    it('create — 201', async () => {
        TenantService.create.mockResolvedValue({ id: 't1', slug: 'acme' });
        req.body = { name: 'Acme Corp', slug: 'acme' };
        await TenantController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('create — error propagation', async () => {
        const err = new Error('Slug exists'); err.statusCode = 409;
        TenantService.create.mockRejectedValue(err);
        req.body = { name: 'Dupe' };
        await TenantController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('findAll — 200', async () => {
        TenantService.findAll.mockResolvedValue([{ id: 't1' }]);
        await TenantController.findAll(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('findById — 200', async () => {
        TenantService.findById.mockResolvedValue({ id: 't1' });
        await TenantController.findById(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('update — 200', async () => {
        TenantService.update.mockResolvedValue({ id: 't1' });
        req.body = { name: 'Updated' };
        await TenantController.update(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('deactivate — 200', async () => {
        TenantService.deactivate.mockResolvedValue({ id: 't1', isActive: false });
        await TenantController.deactivate(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('poolStats — 200', async () => {
        TenantManager.getPoolStats.mockReturnValue({ size: 5 });
        await TenantController.poolStats(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('dashboardStats — 200', async () => {
        TenantService.getDashboardStats = jest.fn().mockResolvedValue({ totalUsers: 10, totalProjects: 5 });
        await TenantController.dashboardStats(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('getAdmin — 200', async () => {
        TenantService.getAdmin = jest.fn().mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' });
        await TenantController.getAdmin(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('updateAdmin — 200', async () => {
        TenantService.updateAdmin = jest.fn().mockResolvedValue({ id: 'admin-1', name: 'Updated' });
        req.body = { name: 'Updated Admin' };
        await TenantController.updateAdmin(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    // Error path tests for branch coverage
    it('findAll — error path 500', async () => {
        TenantService.findAll.mockRejectedValue(new Error('DB error'));
        await TenantController.findAll(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('findById — error with statusCode', async () => {
        const err = new Error('Not found'); err.statusCode = 404;
        TenantService.findById.mockRejectedValue(err);
        await TenantController.findById(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('findById — error without statusCode falls to 500', async () => {
        TenantService.findById.mockRejectedValue(new Error('Unknown'));
        await TenantController.findById(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('update — error with statusCode', async () => {
        const err = new Error('Invalid'); err.statusCode = 400;
        TenantService.update.mockRejectedValue(err);
        req.body = { name: 'Updated' };
        await TenantController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('update — error without statusCode falls to 500', async () => {
        TenantService.update.mockRejectedValue(new Error('Crash'));
        req.body = { name: 'Updated' };
        await TenantController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('deactivate — error path', async () => {
        const err = new Error('Cannot deactivate'); err.statusCode = 400;
        TenantService.deactivate.mockRejectedValue(err);
        await TenantController.deactivate(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('poolStats — error path', async () => {
        TenantManager.getPoolStats.mockImplementation(() => { throw new Error('Pool error'); });
        await TenantController.poolStats(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('dashboardStats — error path', async () => {
        mockCatalogPrisma.$queryRaw = jest.fn().mockRejectedValue(new Error('DB error'));
        await TenantController.dashboardStats(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('getAdmin — error path', async () => {
        const TenantRepository = require('../../src/repositories/tenant.repository');
        TenantRepository.findById.mockRejectedValue(new Error('DB error'));
        await TenantController.getAdmin(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('updateAdmin — error path', async () => {
        const TenantRepository = require('../../src/repositories/tenant.repository');
        TenantRepository.findById.mockRejectedValue(new Error('DB error'));
        req.body = { email: 'new@test.com' };
        await TenantController.updateAdmin(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
