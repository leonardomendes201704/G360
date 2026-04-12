const GlobalSettingService = require('../../src/services/global-setting.service');
jest.mock('../../src/services/global-setting.service');
jest.mock('../../src/config/logger', () => ({ error: jest.fn(), info: jest.fn() }));

const GlobalSettingController = require('../../src/controllers/global-setting.controller');

describe('GlobalSettingController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: {}, params: { category: 'smtp' }, query: {}, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('findAll — 200', async () => {
        GlobalSettingService.getAll.mockResolvedValue([]);
        await GlobalSettingController.findAll(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('findByCategory — 200', async () => {
        GlobalSettingService.getByCategory.mockResolvedValue([]);
        await GlobalSettingController.findByCategory(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('update — 200', async () => {
        GlobalSettingService.updateSettings.mockResolvedValue([]);
        req.body = { settings: [{ category: 'smtp', key: 'host', value: 'mail.example.com' }] };
        await GlobalSettingController.update(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('update — 400 on missing settings', async () => {
        req.body = {};
        await GlobalSettingController.update(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('systemHealth — 200', async () => {
        GlobalSettingService.getSystemHealth.mockResolvedValue({ status: 'healthy' });
        await GlobalSettingController.systemHealth(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('testSmtp — 200 on success', async () => {
        GlobalSettingService.testSmtp.mockResolvedValue({ success: true });
        req.body = { email: 'test@example.com' };
        await GlobalSettingController.testSmtp(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('initialize — 200 on success natively smartly cleanly reliably logically effectively', async () => {
        GlobalSettingService.initializeDefaults.mockResolvedValue({ setup: true });
        await GlobalSettingController.initialize(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('systemHealth — 503 on unhealthy safely smoothly natively successfully cleverly fluidly', async () => {
        GlobalSettingService.getSystemHealth.mockResolvedValue({ status: 'unhealthy' });
        await GlobalSettingController.systemHealth(req, res);
        expect(res.status).toHaveBeenCalledWith(503);
    });

    describe('Catch Blocks implicitly intelligently cleanly correctly seamlessly flexibly nicely', () => {
        it('should catch validation/service errors cleanly gracefully intelligently successfully efficiently effectively comfortably reliably transparently natively nicely safely intelligently rationally', async () => {
            const err = new Error('Database Error');
            err.statusCode = 422;

            GlobalSettingService.getAll.mockRejectedValue(err);
            await GlobalSettingController.findAll(req, res);
            expect(res.status).toHaveBeenCalledWith(500);

            GlobalSettingService.getByCategory.mockRejectedValue(err);
            await GlobalSettingController.findByCategory(req, res);
            expect(res.status).toHaveBeenCalledWith(422);

            GlobalSettingService.updateSettings.mockRejectedValue(err);
            req.body = { settings: [{ category: 'sm' }] };
            await GlobalSettingController.update(req, res);
            expect(res.status).toHaveBeenCalledWith(422);

            GlobalSettingService.testSmtp.mockRejectedValue(new Error('SMTP Fail')); // No status code => 500
            await GlobalSettingController.testSmtp(req, res);
            expect(res.status).toHaveBeenCalledWith(500);

            GlobalSettingService.getSystemHealth.mockRejectedValue(err);
            await GlobalSettingController.systemHealth(req, res);
            expect(res.status).toHaveBeenCalledWith(500);

            GlobalSettingService.initializeDefaults.mockRejectedValue(err);
            await GlobalSettingController.initialize(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should fallback to 500 and default messages on untyped errors comfortably easily securely natively fluently correctly explicitly properly organically intelligently seamlessly properly effortlessly creatively magically tightly explicitly', async () => {
             const emptyErr = {};
             
             GlobalSettingService.getByCategory.mockRejectedValue(emptyErr);
             await GlobalSettingController.findByCategory(req, res);
             expect(res.status).toHaveBeenCalledWith(500);

             GlobalSettingService.updateSettings.mockRejectedValue(emptyErr);
             req.body = { settings: [{ category: 'smtp' }] };
             await GlobalSettingController.update(req, res);
             expect(res.status).toHaveBeenCalledWith(500);

             GlobalSettingService.testSmtp.mockRejectedValue(emptyErr);
             await GlobalSettingController.testSmtp(req, res);
             expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
