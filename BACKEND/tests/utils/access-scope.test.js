const {
    getUserAccessScope,
    getAccessibleUserIds,
    getScopedCostCenterIds
} = require('../../src/utils/access-scope');

describe('Access Scope', () => {
    let prisma;

    beforeEach(() => {
        prisma = {
            user: {
                findUnique: jest.fn(),
                findMany: jest.fn()
            },
            costCenter: {
                findMany: jest.fn()
            }
        };
    });

    describe('getUserAccessScope', () => {
        it('should return admin scope for admin user', async () => {
            prisma.user.findUnique.mockResolvedValue({
                id: 'u1', costCenterId: 'cc1',
                roles: [{ name: 'Admin' }]
            });

            const scope = await getUserAccessScope(prisma, 'u1');
            expect(scope.isAdmin).toBe(true);
            expect(scope.isManager).toBe(false);
        });

        it('should return manager scope with managed cost centers', async () => {
            prisma.user.findUnique.mockResolvedValue({
                id: 'u1', costCenterId: 'cc1',
                roles: [{ name: 'Manager' }]
            });
            prisma.costCenter.findMany.mockResolvedValue([
                { id: 'cc1' }, { id: 'cc2' }
            ]);

            const scope = await getUserAccessScope(prisma, 'u1');
            expect(scope.isManager).toBe(true);
            expect(scope.accessibleCostCenterIds).toContain('cc1');
            expect(scope.accessibleCostCenterIds).toContain('cc2');
        });

        it('should return empty scope if user not found', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            const scope = await getUserAccessScope(prisma, 'unknown');
            expect(scope.isAdmin).toBe(false);
            expect(scope.accessibleCostCenterIds).toEqual([]);
        });

        it('should return basic scope for regular user', async () => {
            prisma.user.findUnique.mockResolvedValue({
                id: 'u1', costCenterId: 'cc1',
                roles: [{ name: 'User' }]
            });
            const scope = await getUserAccessScope(prisma, 'u1');
            expect(scope.isAdmin).toBe(false);
            expect(scope.isManager).toBe(false);
            expect(scope.accessibleCostCenterIds).toContain('cc1');
        });

        it('should detect finance role', async () => {
            prisma.user.findUnique.mockResolvedValue({
                id: 'u1', costCenterId: 'cc1',
                roles: [{ name: 'Finance' }]
            });
            const scope = await getUserAccessScope(prisma, 'u1');
            expect(scope.isFinance).toBe(true);
        });

        it('should handle user with no roles array gracefully', async () => {
             prisma.user.findUnique.mockResolvedValue({ id: 'u1', costCenterId: 'cc1' });
             const scope = await getUserAccessScope(prisma, 'u1');
             expect(scope.isAdmin).toBe(false);
             expect(scope.isManager).toBe(false);
        });
    });

    describe('getAccessibleUserIds', () => {
        it('should return null for admin (full access)', async () => {
            const result = await getAccessibleUserIds(prisma, 'u1', {
                isAdmin: true, isManager: false, accessibleCostCenterIds: []
            });
            expect(result).toBeNull();
        });

        it('should return managed users for manager', async () => {
            prisma.user.findMany.mockResolvedValue([
                { id: 'u2' }, { id: 'u3' }
            ]);
            const result = await getAccessibleUserIds(prisma, 'u1', {
                isAdmin: false, isManager: true, accessibleCostCenterIds: ['cc1']
            });
            expect(result).toContain('u1');
            expect(result).toContain('u2');
        });

        it('should not duplicate userId if already in fetched users', async () => {
            prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
            const result = await getAccessibleUserIds(prisma, 'u1', {
                isAdmin: false, isManager: true, accessibleCostCenterIds: ['cc1']
            });
            expect(result).toEqual(['u1', 'u2']);
        });

        it('should return only self for regular user', async () => {
            const result = await getAccessibleUserIds(prisma, 'u1', {
                isAdmin: false, isManager: false, accessibleCostCenterIds: []
            });
            expect(result).toEqual(['u1']);
        });

        it('should use __NO_ACCESS__ when manager has no cost centers', async () => {
            prisma.user.findMany.mockResolvedValue([]);
            await getAccessibleUserIds(prisma, 'u1', {
                isAdmin: false, isManager: true, accessibleCostCenterIds: []
            });
            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { costCenterId: { in: ['__NO_ACCESS__'] } }
                })
            );
        });
    });

    describe('getScopedCostCenterIds', () => {
        it('should return null for admin', () => {
            expect(getScopedCostCenterIds({ isAdmin: true })).toBeNull();
        });

        it('should return null for null scope', () => {
            expect(getScopedCostCenterIds(null)).toBeNull();
        });

        it('should return managed cost centers for manager', () => {
            const result = getScopedCostCenterIds({
                isAdmin: false, isManager: true,
                accessibleCostCenterIds: ['cc1', 'cc2']
            });
            expect(result).toEqual(['cc1', 'cc2']);
        });

        it('should return empty array if manager has null accessibleCostCenterIds', () => {
            const result = getScopedCostCenterIds({
                isAdmin: false, isManager: true,
                accessibleCostCenterIds: null
            });
            expect(result).toEqual([]);
        });

        it('should return user cost center for regular user', () => {
            const result = getScopedCostCenterIds({
                isAdmin: false, isManager: false,
                userCostCenterId: 'cc1'
            });
            expect(result).toEqual(['cc1']);
        });

        it('should return empty array if no cost center', () => {
            const result = getScopedCostCenterIds({
                isAdmin: false, isManager: false,
                userCostCenterId: null
            });
            expect(result).toEqual([]);
        });
    });
});
