/**
 * Reusable mock Prisma factory for tests.
 * Creates a mock with all G360 models and their common methods.
 */
function createMockPrisma() {
    const methods = () => ({
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'mock-id', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'mock-id', ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: {} }),
        groupBy: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve({ id: 'mock-id', ...create })),
    });

    const models = [
        'user', 'role', 'permission',
        'project', 'projectMember', 'projectTask', 'projectProposal',
        'task', 'risk',
        'budget', 'budgetItem', 'budgetScenario', 'budgetScenarioItem',
        'expense', 'fiscalYear', 'accountingAccount',
        'costCenter', 'department',
        'contract', 'contractAddendum', 'contractAttachment',
        'supplier',
        'changeRequest', 'changeTemplate', 'changeApprover', 'freezeWindow',
        'incident', 'incidentCategory', 'incidentComment', 'incidentHistory', 'incidentAttachment',
        'asset', 'assetCategory', 'assetMaintenance',
        'softwareLicense',
        'corporateRisk',
        'notification',
        'auditLog',
        'knowledgeBase', 'knowledgeCategory',
        'integration',
        'refreshToken',
        'meetingMinute',
        'loginAttempt',
    ];

    const mock = {};
    models.forEach(model => { mock[model] = methods(); });

    // Add $transaction support
    mock.$transaction = jest.fn(async (fn) => {
        if (typeof fn === 'function') return fn(mock);
        return Promise.all(fn);
    });

    return mock;
}

module.exports = { createMockPrisma };
