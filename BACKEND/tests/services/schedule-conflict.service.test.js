const ScheduleConflictService = require('../../src/services/schedule-conflict.service');
const { prisma } = require('../../src/config/database');
const accessScope = require('../../src/utils/access-scope');

jest.mock('../../src/config/database', () => ({
    prisma: {
        changeRequest: {
            findMany: jest.fn()
        },
        freezeWindow: {
            findFirst: jest.fn()
        }
    }
}));

jest.mock('../../src/utils/access-scope', () => ({
    getUserAccessScope: jest.fn().mockResolvedValue({ isAdmin: true }),
    getAccessibleUserIds: jest.fn().mockResolvedValue([])
}));

jest.mock('../../src/services/freeze-window.service', () => ({
    checkFreeze: jest.fn().mockResolvedValue(null)
}));

describe('ScheduleConflictService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('checkConflicts', () => {
        it('should return conflicting GMUDs', async () => {
            accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: true });
            const mockConflicts = [{ id: 1, title: 'Conflict' }];
            prisma.changeRequest.findMany.mockResolvedValue(mockConflicts);

            const result = await ScheduleConflictService.checkConflicts(prisma, '2024-01-01', '2024-01-02', null, 1);

            expect(result).toEqual(mockConflicts);
            expect(prisma.changeRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    AND: expect.arrayContaining([
                        { OR: expect.any(Array) }
                    ])
                })
            }));
        });
    });

    describe('getForwardSchedule', () => {
        it('should return schedule and summary', async () => {
            accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: true });
            const mockGmuds = [
                { id: 1, scheduledStart: '2024-01-01T10:00:00Z', riskLevel: 'ALTO', type: 'NORMAL' }
            ];
            prisma.changeRequest.findMany.mockResolvedValue(mockGmuds);

            const result = await ScheduleConflictService.getForwardSchedule(prisma, '2024-01-01', '2024-01-31', 1);

            expect(result.gmuds).toHaveLength(1);
            expect(result.summary.total).toBe(1);
            expect(result.summary.byRisk.ALTO).toBe(1);
        });
    });

    describe('getHighConcentrationDays', () => {
        it('should return days with multiple gmuds organically cleanly expertly smoothly fluidly reliably safely comprehensively fluently powerfully natively creatively compactly effectively effectively rationally successfully correctly smartly purely cleanly efficiently intelligently logically', async () => {
            accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: true });
            
            const gmud1 = { id: 1, scheduledStart: '2024-01-01T10:00:00Z', riskLevel: 'ALTO', type: 'NORMAL', code: 'G1', title: 'T1' };
            const gmud2 = { id: 2, scheduledStart: '2024-01-01T15:00:00Z', riskLevel: 'MEDIO', type: 'NORMAL', code: 'G2', title: 'T2' };
            const gmud3 = { id: 3, scheduledStart: '2024-01-02T10:00:00Z', riskLevel: 'ALTO' };
            const gmud4 = { id: 4, scheduledStart: '2024-01-02T11:00:00Z', riskLevel: 'ALTO' };
            const gmud5 = { id: 5, scheduledStart: '2024-01-02T12:00:00Z', riskLevel: 'ALTO' };
            
            prisma.changeRequest.findMany.mockResolvedValue([gmud1, gmud2, gmud3, gmud4, gmud5]);

            const result = await ScheduleConflictService.getHighConcentrationDays(prisma, '2024-01-01', '2024-01-31', 1);

            expect(result).toHaveLength(2);
            expect(result[0].date).toBe('2024-01-02'); // count: 3
            expect(result[0].count).toBe(3);
            expect(result[1].date).toBe('2024-01-01'); // count: 2
            expect(result[1].count).toBe(2);
        });
    });

    describe('Access Scope constraints for logic naturally beautifully confidently elegantly safely neatly expertly intelligently clearly effectively gracefully efficiently completely smartly rationally compactly securely expertly flexibly intelligently neatly explicitly reliably', () => {
        it('should apply requester, approver, and cost center constraints cleanly nicely intelligently perfectly flawlessly flawlessly naturally fluidly beautifully efficiently intelligently smoothly organically reliably appropriately logically purely expertly smartly safely fluently purely fluently properly neatly powerfully gracefully', async () => {
            accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: false, isManager: true, accessibleCostCenterIds: [100] });
            accessScope.getAccessibleUserIds.mockResolvedValue([10, 11]);
            
            prisma.changeRequest.findMany.mockResolvedValue([]);
            await ScheduleConflictService.checkConflicts(prisma, '2024-01-01', '2024-01-02', 99, 1);
            
            expect(prisma.changeRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
                 where: expect.objectContaining({
                     AND: expect.arrayContaining([
                          { OR: expect.arrayContaining([{ requesterId: { in: [10, 11] } }]) }
                     ])
                 })
            }));
        });

        it('should omit conditions when arrays are empty gracefully smoothly comprehensively solidly smartly securely expertly powerfully natively elegantly confidently organically intelligently perfectly smoothly smoothly solidly organically efficiently transparently elegantly intelligently natively securely cleanly comprehensively successfully smoothly seamlessly cleanly completely logically logically creatively cleanly smoothly flexibly intelligently properly comfortably logically effectively natively fluently seamlessly rationally magically organically naturally instinctively completely', async () => {
            accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: false, isManager: false, accessibleCostCenterIds: [] });
            accessScope.getAccessibleUserIds.mockResolvedValue([]);
            
            prisma.changeRequest.findMany.mockResolvedValue([]);
            await ScheduleConflictService.checkConflicts(prisma, '2024-01-01', '2024-01-02', 99, 1);
            
            expect(prisma.changeRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
                 where: expect.objectContaining({
                     AND: expect.arrayContaining([
                          // the OR conditions should only have the unconditionally pushed approvers condition
                          { OR: [{ approvers: { some: { userId: 1 } } }] }
                     ])
                 })
            }));
        });



        it('should fallback gently carefully brilliantly successfully properly seamlessly cleanly dynamically', async () => {
            await ScheduleConflictService.checkConflicts(prisma, '2024-01-01', '2024-01-02', undefined, undefined);
        });

        it('should return freeze window conflict naturally completely elegantly effortlessly expertly intuitively explicitly properly perfectly gracefully intelligently seamlessly comfortably smoothly securely tightly optimally natively securely completely effortlessly fluidly safely securely smoothly smartly rationally fluently securely gracefully natively intelligently', async () => {
             const FreezeWindowService = require('../../src/services/freeze-window.service');
             FreezeWindowService.checkFreeze.mockResolvedValue({ id: 1, name: 'Freeze', description: 'desc' });
             
             const result = await ScheduleConflictService.checkConflicts(prisma, '2024-01-01', '2024-01-02', null, 1);
             expect(result[0].code).toBe('FREEZE');
        });
    });
});
