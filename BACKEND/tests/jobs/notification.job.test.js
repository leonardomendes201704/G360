jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('../../src/config/tenant-manager');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/services/email-template.service');
jest.mock('../../src/config/logger', () => ({ info: jest.fn(), error: jest.fn() }));

const cron = require('node-cron');
const TenantManager = require('../../src/config/tenant-manager');
const NotificationJob = require('../../src/jobs/notification.job');

describe('NotificationJob', () => {
    let mockPrisma;
    beforeEach(() => {
        mockPrisma = {
            task: { findMany: jest.fn().mockResolvedValue([]) },
            projectTask: { findMany: jest.fn().mockResolvedValue([]) },
            contract: { findMany: jest.fn().mockResolvedValue([]) },
            softwareLicense: { findMany: jest.fn().mockResolvedValue([]) },
            changeRequest: { findMany: jest.fn().mockResolvedValue([]) }
        };
        TenantManager.getAllActiveTenants.mockResolvedValue([{ slug: 'acme', schemaName: 'tenant_acme' }]);
        TenantManager.getClientForTenant.mockResolvedValue(mockPrisma);
    });

    it('init registers cron schedules', () => {
        NotificationJob.init();
        expect(cron.schedule).toHaveBeenCalled();
    });

    it('forEachTenant — iterates all active tenants', async () => {
        const fn = jest.fn();
        await NotificationJob.forEachTenant('testJob', fn);
        expect(fn).toHaveBeenCalledWith(mockPrisma, expect.objectContaining({ slug: 'acme' }));
    });

    it('forEachTenant — handles tenant errors gracefully', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('Tenant error'));
        await NotificationJob.forEachTenant('failJob', fn);
        // Should not throw — errors are caught per-tenant
    });

    it('checkOverdueTasks — queries task', async () => {
        await NotificationJob.checkOverdueTasks(mockPrisma);
        expect(mockPrisma.task.findMany).toHaveBeenCalled();
    });
});
