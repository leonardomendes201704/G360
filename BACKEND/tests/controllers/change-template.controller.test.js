const ChangeTemplateController = require('../../src/controllers/change-template.controller');
const ChangeTemplateService = require('../../src/services/change-template.service');
jest.mock('../../src/services/change-template.service');

describe('ChangeTemplateController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { id: 'ct1' }, user: { userId: 'u1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    });

    it('index — 200', async () => {
        ChangeTemplateService.getAll.mockResolvedValue([]);
        await ChangeTemplateController.index(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('show — 200', async () => {
        ChangeTemplateService.getById.mockResolvedValue({ id: 'ct1' });
        await ChangeTemplateController.show(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('create — 201', async () => {
        ChangeTemplateService.create.mockResolvedValue({ id: 'ct1' });
        req.body = { name: 'DB Migration Template' };
        await ChangeTemplateController.create(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('update — 200', async () => {
        ChangeTemplateService.update.mockResolvedValue({ id: 'ct1' });
        req.body = { name: 'Updated' };
        await ChangeTemplateController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('delete — 204', async () => {
        ChangeTemplateService.delete.mockResolvedValue();
        await ChangeTemplateController.delete(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('apply — 200', async () => {
        ChangeTemplateService.applyTemplate.mockResolvedValue({ title: 'From Template' });
        await ChangeTemplateController.apply(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
