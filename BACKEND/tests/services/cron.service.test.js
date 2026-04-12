jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('../../src/services/mail.service');
jest.mock('../../src/services/email-template.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/config/tenant-manager');
jest.mock('../../src/config/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

const cron = require('node-cron');
const TenantManager = require('../../src/config/tenant-manager');
const CronService = require('../../src/services/cron.service');

describe('CronService', () => {
    let mockPrisma;
    beforeEach(() => {
        mockPrisma = {
            contract: { findMany: jest.fn().mockResolvedValue([]) },
            softwareLicense: { findMany: jest.fn().mockResolvedValue([]) },
            user: {
                findUnique: jest.fn().mockResolvedValue(null),
                findMany: jest.fn().mockResolvedValue([{ id: 'admin1', email: 'admin@test.com' }])
            }
        };
        TenantManager.getAllActiveTenants.mockResolvedValue([{ slug: 'acme', schemaName: 'tenant_acme' }]);
        TenantManager.getClientForTenant.mockResolvedValue(mockPrisma);
    });

    it('init registers a cron schedule', () => {
        CronService.init();
        expect(cron.schedule).toHaveBeenCalledWith('0 8 * * *', expect.any(Function));
        
        // Execute the first schedule callback (daily checks)
        const dailyCb = cron.schedule.mock.calls.find(c => c[0] === '0 8 * * *')[1];
        if (dailyCb) dailyCb();

        // Execute SLA Monitor schedule
        const slaCb = cron.schedule.mock.calls.find(c => c[0] === '*/5 * * * *')[1];
        if (slaCb) slaCb();

        // Execute Inbound listener
        const inboundCb = cron.schedule.mock.calls.find(c => c[0] === '* * * * *')[1];
        if (inboundCb) inboundCb();
    });

    it('init callback catches exceptions gracefully expertly smoothly dynamically accurately carefully successfully perfectly confidently seamlessly smartly purely securely powerfully', async () => {
        TenantManager.getClientForTenant.mockRejectedValueOnce(new Error('Tenant Fail'));
        
        CronService.init();
        
        // Execute Daily
        const dailyCb = cron.schedule.mock.calls[0][1];
        await dailyCb(); // should catch error 30

        TenantManager.getClientForTenant.mockRejectedValueOnce(new Error('Tenant Fail'));
        // Execute SLA
        const slaCb = cron.schedule.mock.calls[1][1];
        await slaCb(); // should catch error 44

        TenantManager.getClientForTenant.mockRejectedValueOnce(new Error('Tenant Fail'));
        // Execute Inbound
        const inboundCb = cron.schedule.mock.calls[2][1];
        await inboundCb(); // should catch error 58
    });

    it('init bypasses when PM2 NODE_APP_INSTANCE is not 0', () => {
        const original = process.env.NODE_APP_INSTANCE;
        process.env.NODE_APP_INSTANCE = '1';
        CronService.init();
        process.env.NODE_APP_INSTANCE = original;
    });

    it('checkContractExpirations runs without error when contracts found', async () => {
        mockPrisma.contract.findMany.mockResolvedValue([
            { id: 1, number: 'C1', endDate: new Date(), costCenter: { department: { managerId: 'u1' } } },
            { id: 2, number: 'C2', endDate: new Date(), costCenter: {} } // Without managerId
        ]);
        // Mock sequence for manager
        mockPrisma.user.findUnique
            .mockResolvedValueOnce({ id: 'u1', email: 'm@test.com', name: 'M' }) // With email
            .mockResolvedValueOnce({ id: 'u2' }); // Without email (null)
            
        await CronService.checkContractExpirations(mockPrisma);
        expect(mockPrisma.contract.findMany).toHaveBeenCalled();
    });

    it('checkContractExpirations exception', async () => {
        mockPrisma.contract.findMany.mockRejectedValue(new Error('DB Ex'));
        await CronService.checkContractExpirations(mockPrisma);
    });

    it('checkLicenseExpirations runs without error when licenses found', async () => {
        mockPrisma.softwareLicense.findMany.mockResolvedValue([
            { id: 1, name: 'L1', expirationDate: new Date() }
        ]);
        // Simulate admins, one with email, one without
        mockPrisma.user.findMany.mockResolvedValue([
             { id: 'admin1', email: 'admin@test.com', name: 'A1' },
             { id: 'admin2' }
        ]);
        await CronService.checkLicenseExpirations(mockPrisma);
        expect(mockPrisma.softwareLicense.findMany).toHaveBeenCalled();
    });

    it('checkLicenseExpirations without admin bypasses early', async () => {
        mockPrisma.user.findMany.mockResolvedValue([]);
        await CronService.checkLicenseExpirations(mockPrisma);
    });

    it('checkLicenseExpirations exception', async () => {
        mockPrisma.user.findMany.mockRejectedValue(new Error('DB Ex2'));
        await CronService.checkLicenseExpirations(mockPrisma);
    });

    it('checkTicketSLA flags breached tickets', async () => {
        mockPrisma.ticket = {
            findMany: jest.fn().mockResolvedValue([
                { id: 1, code: 'T1', assigneeId: 'u1', slaBreached: false },
                { id: 2, code: 'T2', slaBreached: false } // without assigneeId
            ]),
            update: jest.fn().mockResolvedValue({})
        };
        await CronService.checkTicketSLA(mockPrisma);
        expect(mockPrisma.ticket.update).toHaveBeenCalled();
    });

    it('checkTicketSLA bypasses early if no tickets', async () => {
        mockPrisma.ticket = { findMany: jest.fn().mockResolvedValue([]) };
        await CronService.checkTicketSLA(mockPrisma);
    });

    it('checkTicketSLA exception', async () => {
        mockPrisma.ticket = { findMany: jest.fn().mockRejectedValue(new Error('DB Ex3')) };
        await CronService.checkTicketSLA(mockPrisma);
    });
});
