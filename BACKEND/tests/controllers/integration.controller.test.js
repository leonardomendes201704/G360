const IntegrationService = require('../../src/services/integration.service');
jest.mock('../../src/services/integration.service');

describe('IntegrationController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { type: 'AZURE' }, user: { userId: 'u1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    const IntegrationController = require('../../src/controllers/integration.controller');

    it('index — returns integrations', async () => {
        IntegrationService.getAll.mockResolvedValue([{ type: 'AZURE' }]);
        await IntegrationController.index(req, res);
        expect(res.json).toHaveBeenCalledWith([{ type: 'AZURE' }]);
    });

    it('update — 200', async () => {
        IntegrationService.update.mockResolvedValue({ id: 'i1' });
        req.body = { config: { clientId: 'abc' } };
        await IntegrationController.update(req, res);
        expect(res.json).toHaveBeenCalledWith({ id: 'i1' });
    });

    it('test — 500 on failure', async () => {
        IntegrationService.testConnection.mockRejectedValue(new Error('Connection failed'));
        await IntegrationController.test(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('getActive — filters enabled only', async () => {
        IntegrationService.getAll.mockResolvedValue([
            { type: 'AZURE', name: 'Azure AD', isEnabled: true, config: { clientId: 'x', tenantIdAzure: 'y', redirectUri: 'z' } },
            { type: 'LDAP', name: 'LDAP', isEnabled: false, config: null }
        ]);
        await IntegrationController.getActive(req, res);
        const result = res.json.mock.calls[0][0];
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('AZURE');
    });
});
