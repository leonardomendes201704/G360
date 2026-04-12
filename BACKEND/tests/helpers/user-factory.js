/**
 * User factory for permission and RBAC tests.
 * Pre-configured user profiles matching G360 role system.
 */

const uuid = () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const superAdminUser = (overrides = {}) => ({
    userId: uuid(),
    id: uuid(),
    email: 'admin@tenant.com',
    name: 'Admin User',
    tenantSlug: 'test-tenant',
    schemaName: 'test_tenant',
    roles: [{ id: 'r1', name: 'Super Admin', permissions: [] }],
    roleId: 'r1',
    departmentId: null,
    costCenterId: null,
    ...overrides,
});

const managerUser = (overrides = {}) => ({
    userId: uuid(),
    id: uuid(),
    email: 'manager@tenant.com',
    name: 'Manager User',
    tenantSlug: 'test-tenant',
    schemaName: 'test_tenant',
    roles: [{
        id: 'r2', name: 'Gestor',
        permissions: [
            { module: 'PROJECTS', action: 'ALL' },
            { module: 'FINANCE', action: 'READ' },
            { module: 'FINANCE', action: 'WRITE' },
            { module: 'CHANGE', action: 'ALL' },
            { module: 'INCIDENT', action: 'ALL' },
            { module: 'ASSETS', action: 'READ' },
            { module: 'CONFIG', action: 'READ' },
        ]
    }],
    roleId: 'r2',
    departmentId: 'dept-1',
    costCenterId: 'cc-1',
    ...overrides,
});

const collaboratorUser = (overrides = {}) => ({
    userId: uuid(),
    id: uuid(),
    email: 'colab@tenant.com',
    name: 'Collaborator User',
    tenantSlug: 'test-tenant',
    schemaName: 'test_tenant',
    roles: [{
        id: 'r3', name: 'Colaborador',
        permissions: [
            { module: 'PROJECTS', action: 'READ' },
            { module: 'INCIDENT', action: 'READ' },
            { module: 'INCIDENT', action: 'WRITE' },
        ]
    }],
    roleId: 'r3',
    departmentId: 'dept-1',
    costCenterId: 'cc-1',
    ...overrides,
});

const readOnlyUser = (overrides = {}) => ({
    userId: uuid(),
    id: uuid(),
    email: 'viewer@tenant.com',
    name: 'Viewer User',
    tenantSlug: 'test-tenant',
    schemaName: 'test_tenant',
    roles: [{
        id: 'r4', name: 'Visualizador',
        permissions: [
            { module: 'PROJECTS', action: 'READ' },
            { module: 'FINANCE', action: 'READ' },
        ]
    }],
    roleId: 'r4',
    departmentId: null,
    costCenterId: null,
    ...overrides,
});

const noRolesUser = (overrides = {}) => ({
    userId: uuid(),
    id: uuid(),
    email: 'norole@tenant.com',
    name: 'No Role User',
    tenantSlug: 'test-tenant',
    schemaName: 'test_tenant',
    roles: [],
    roleId: null,
    ...overrides,
});

/**
 * Creates a mock Express request with user and prisma.
 */
const mockRequest = (user, prisma, body = {}, params = {}, query = {}) => ({
    user,
    prisma,
    body,
    params,
    query,
    headers: { authorization: 'Bearer mock-token' },
    get: jest.fn((header) => {
        if (header === 'user-agent') return 'jest-test';
        return null;
    }),
    ip: '127.0.0.1',
});

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

module.exports = {
    superAdminUser,
    managerUser,
    collaboratorUser,
    readOnlyUser,
    noRolesUser,
    mockRequest,
    mockResponse,
};
