jest.mock('../../src/services/project.service');
jest.mock('../../src/config/logger', () => ({ error: jest.fn(), info: jest.fn() }));

const ProjectService = require('../../src/services/project.service');
const ProjectActivityController = require('../../src/controllers/project/project-activity.controller');

describe('ProjectActivityController', () => {
    let req, res;
    beforeEach(() => {
        req = {
            params: { id: 'p1' },
            user: { userId: 'u1', tenantId: 't1' },
            prisma: {
                auditLog: {
                    findMany: jest.fn().mockResolvedValue([{ id: 'log1', action: 'CREATE' }])
                }
            }
        };
        res = { json: jest.fn() };
        ProjectService.getById.mockResolvedValue({ id: 'p1' });
    });

    it('getActivities — returns audit log entries', async () => {
        await ProjectActivityController.getActivities(req, res);
        expect(req.prisma.auditLog.findMany).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    });
});
