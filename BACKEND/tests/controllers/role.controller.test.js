const RoleController = require('../../src/controllers/role.controller');
const RoleService = require('../../src/services/role.service');
jest.mock('../../src/services/role.service');

describe('RoleController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { id: 'r1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it('index — 200', async () => {
        RoleService.getAll.mockResolvedValue([]);
        await RoleController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('create — 201', async () => {
        RoleService.create.mockResolvedValue({ id: 'r1' });
        req.body = { name: 'Admin', permissions: [] };
        await RoleController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('update — 200', async () => {
        RoleService.update.mockResolvedValue({ id: 'r1' });
        req.body = { name: 'Updated' };
        await RoleController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204', async () => {
        RoleService.delete.mockResolvedValue();
        await RoleController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });
});
