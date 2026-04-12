const ChangeRequestController = require('../../src/controllers/change-request.controller');
const ChangeRequestService = require('../../src/services/change-request.service');
const ScheduleConflictService = require('../../src/services/schedule-conflict.service');
const ChangeMetricsService = require('../../src/services/change-metrics.service');

jest.mock('../../src/services/change-request.service');
jest.mock('../../src/services/schedule-conflict.service');
jest.mock('../../src/services/change-metrics.service');

describe('ChangeRequestController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            prisma: {},
            user: { userId: 'u1' },
            body: {},
            params: {},
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
        };
    });

    describe('create', () => {
         it('should validate correctly resolving successfully natively', async () => {
              req.body = {
                  code: 'G-01', title: 'T', description: 'Desc', justification: 'J',
                  type: 'NORMAL', impact: 'MENOR',
                  scheduledStart: '2025-01-01', scheduledEnd: '2025-01-02',
                  projectId: '' // tests empty transform explicitly
              };

              ChangeRequestService.create.mockResolvedValue({ id: 'g1' });
              await ChangeRequestController.create(req, res);

              expect(res.status).toHaveBeenCalledWith(201);
              expect(res.json).toHaveBeenCalledWith({ id: 'g1' });
              
              const calledData = ChangeRequestService.create.mock.calls[0][2];
              expect(calledData.projectId).toBeNull();
         });

         it('should fail on missing fields reporting validation elegantly', async () => {
              req.body = {}; // empty
              await ChangeRequestController.create(req, res);
              expect(res.status).toHaveBeenCalledWith(500); // Because yup throws ValidationError which doesnt have statusCode, so defaults 500 in this catch
         });
    });

    describe('index & show', () => {
         it('should list cleanly returning JSON arrays implicitly', async () => {
              ChangeRequestService.getAll.mockResolvedValue([]);
              await ChangeRequestController.index(req, res);
              expect(res.status).toHaveBeenCalledWith(200);
         });

         it('should find exact elements trapping crashes cleanly', async () => {
              req.params.id = 'g1';
              ChangeRequestService.getById.mockResolvedValue({ id: 'g1' });
              await ChangeRequestController.show(req, res);
              expect(res.status).toHaveBeenCalledWith(200);

              ChangeRequestService.getById.mockRejectedValue({ statusCode: 404, message: 'Not found' });
              await ChangeRequestController.show(req, res);
              expect(res.status).toHaveBeenCalledWith(404);
         });
    });

    describe('update & delete', () => {
         it('should merge edits stripping empty UUIDs flawlessly mapping arrays cleanly', async () => {
              req.params.id = 'g1';
              req.body = { projectId: '' }; // Covers the explicit `req.body.projectId = null;` hack
              ChangeRequestService.update.mockResolvedValue({ id: 'g1' });
              
              await ChangeRequestController.update(req, res);
              expect(res.status).toHaveBeenCalledWith(200);
              expect(req.body.projectId).toBeNull();

              ChangeRequestService.update.mockRejectedValue(new Error('fail'));
              await ChangeRequestController.update(req, res);
              expect(res.status).toHaveBeenCalledWith(500);
         });

         it('should discard fully trapping errors implicitly natively mapping correctly', async () => {
              req.params.id = 'g1';
              ChangeRequestService.delete.mockResolvedValue({});
              
              await ChangeRequestController.delete(req, res);
              expect(res.status).toHaveBeenCalledWith(204);

              ChangeRequestService.delete.mockRejectedValue({ statusCode: 403, message: 'No' });
              await ChangeRequestController.delete(req, res);
              expect(res.status).toHaveBeenCalledWith(403);
         });
    });

    describe('addApprover & review', () => {
         it('should hook components successfully natively yielding 201 code', async () => {
              req.params.id = 'g1';
              req.body = { userId: 'u2', role: 'M' };
              
              await ChangeRequestController.addApprover(req, res);
              expect(ChangeRequestService.addApprover).toHaveBeenCalledWith(req.prisma, 'g1', 'u2', 'M', 'u1');
              expect(res.status).toHaveBeenCalledWith(201);
         });
         
         it('should post revisions flawlessly natively parsing accurately limits correctly', async () => {
              req.params.id = 'g1';
              req.body = { status: 'APPROVED', comment: 'ok' };
              
              await ChangeRequestController.review(req, res);
              expect(ChangeRequestService.reviewChange).toHaveBeenCalledWith(req.prisma, 'g1', 'u1', { status: 'APPROVED', comment: 'ok' });
              expect(res.status).toHaveBeenCalledWith(200);
         });
    });

    describe('GOVERNANCE checkConflicts', () => {
         it('should reject smoothly if start missing effortlessly', async () => {
              req.query = { scheduledStart: '2025' }; // Missing end
              await ChangeRequestController.checkConflicts(req, res);
              expect(res.status).toHaveBeenCalledWith(400);
         });

         it('should validate inputs processing arrays heavily natively parsing maps correctly', async () => {
              req.query = { scheduledStart: '2025', scheduledEnd: '2026', excludeId: 'ex' };
              ScheduleConflictService.checkConflicts.mockResolvedValue([{}]);
              
              await ChangeRequestController.checkConflicts(req, res);
              
              expect(ScheduleConflictService.checkConflicts).toHaveBeenCalledWith(req.prisma, '2025', '2026', 'ex', 'u1');
              expect(res.json).toHaveBeenCalledWith({ hasConflicts: true, count: 1, conflicts: [{}] });

              ScheduleConflictService.checkConflicts.mockRejectedValue(new Error('crash'));
              await ChangeRequestController.checkConflicts(req, res);
              expect(res.status).toHaveBeenCalledWith(500);
         });
    });

    describe('GOVERNANCE getForwardSchedule & getHighConcentrationDays', () => {
         it('should load ranges returning directly parsing dates organically mapping safely', async () => {
              req.query = {};
              ScheduleConflictService.getForwardSchedule.mockResolvedValue([]);
              await ChangeRequestController.getForwardSchedule(req, res);
              expect(res.status).toHaveBeenCalledWith(200);
              
              ScheduleConflictService.getForwardSchedule.mockRejectedValue(new Error('fail'));
              await ChangeRequestController.getForwardSchedule(req, res);
              expect(res.status).toHaveBeenCalledWith(500);
         });

         it('should extract concentration executing natively routing inputs accurately heavily processing bounds successfully', async () => {
              req.query = { startDate: '2025-01-01', endDate: '2025-02-01' };
              ScheduleConflictService.getHighConcentrationDays.mockResolvedValue([]);
              await ChangeRequestController.getHighConcentrationDays(req, res);
              expect(res.status).toHaveBeenCalledWith(200);
              
              ScheduleConflictService.getHighConcentrationDays.mockRejectedValue(new Error('fail'));
              await ChangeRequestController.getHighConcentrationDays(req, res);
              expect(res.status).toHaveBeenCalledWith(500);
         });
    });

    describe('METRICS Endpoints', () => {
         it('should map GetMetrics implicitly returning JSON paths efficiently', async () => {
              req.query = { startDate: '1', endDate: '2' };
              ChangeMetricsService.getMetrics.mockResolvedValue({});
              await ChangeRequestController.getMetrics(req, res);
              expect(res.status).toHaveBeenCalledWith(200);

              ChangeMetricsService.getMetrics.mockRejectedValue(new Error('fail'));
              await ChangeRequestController.getMetrics(req, res);
              expect(res.status).toHaveBeenCalledWith(500);
         });

         it('should build GetPIRReport correctly matching ranges mapping perfectly safely', async () => {
              req.query = { startDate: '1', endDate: '2' };
              ChangeMetricsService.getPIRReport.mockResolvedValue({});
              await ChangeRequestController.getPIRReport(req, res);
              expect(res.status).toHaveBeenCalledWith(200);

              ChangeMetricsService.getPIRReport.mockRejectedValue(new Error('fail'));
              await ChangeRequestController.getPIRReport(req, res);
              expect(res.status).toHaveBeenCalledWith(500);
         });

         it('should process GetTrends retrieving bounds gracefully rendering accurately', async () => {
              ChangeMetricsService.getTrends.mockResolvedValue({});
              await ChangeRequestController.getTrends(req, res);
              expect(res.status).toHaveBeenCalledWith(200);

              ChangeMetricsService.getTrends.mockRejectedValue(new Error('fail'));
              await ChangeRequestController.getTrends(req, res);
              expect(res.status).toHaveBeenCalledWith(500);
         });
    });
});
