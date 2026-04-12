const ChangeTemplateService = require('../../src/services/change-template.service');
const { prisma } = require('../../src/config/database');
const accessScope = require('../../src/utils/access-scope');

jest.mock('../../src/config/database', () => ({
    prisma: {
        changeTemplate: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn() // delete uses update (soft delete)
        }
    }
}));

jest.mock('../../src/utils/access-scope', () => ({
    getUserAccessScope: jest.fn(),
    getAccessibleUserIds: jest.fn()
}));

describe('ChangeTemplateService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAll', () => {
        it('should return all active templates', async () => {
            prisma.changeTemplate.findMany.mockResolvedValue([{ id: 1 }]);
            // No userId passed -> no RBAC
            const result = await ChangeTemplateService.getAll(prisma);
            expect(result).toHaveLength(1);
        });
    });

    describe('create', () => {
        it('should create template', async () => {
            prisma.changeTemplate.create.mockResolvedValue({ id: 1, name: 'T1' });
            const result = await ChangeTemplateService.create(prisma, 1, { name: 'T1' });
            expect(result).toEqual({ id: 1, name: 'T1' });
        });
    });

    describe('applyTemplate', () => {
        it('should return GMO object with calculated dates', async () => {
            prisma.changeTemplate.findUnique.mockResolvedValue({
                id: 1, name: 'Template', defaultDuration: 60, autoApprove: true
            });
            // Mock update for increment usage
            prisma.changeTemplate.update.mockResolvedValue({});
            // Mock RBAC bypass if checking getById
            // If getById checks access, we need to mock it or ensure logic allows
            // Access logic: if scope.isAdmin false, checks owner. 
            // Let's assume passed user is owner or admin
            accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: true });

            const result = await ChangeTemplateService.applyTemplate(prisma, 1, 1);

            expect(result.title).toContain('[Template] Template');
            expect(result.status).toBe('APPROVED');
            expect(result.scheduledEnd).toBeDefined();
        });
    });
});
