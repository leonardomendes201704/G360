const request = require('supertest');
const UserService = require('../../src/services/user.service');
const TenantManager = require('../../src/config/tenant-manager');
const TenantRepository = require('../../src/repositories/tenant.repository');

// 1. Mock UserService methods
jest.mock('../../src/services/user.service', () => ({
    createUser: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    toggleStatus: jest.fn(),
    importUsers: jest.fn(),
    findByEmail: jest.fn()
}));

// 2. Mock TenantManager & Repository
jest.mock('../../src/config/tenant-manager', () => ({
    getCatalogClient: jest.fn()
}));
jest.mock('../../src/repositories/tenant.repository', () => ({
    findBySlug: jest.fn()
}));

// 3. Mock Auth Middleware
jest.mock('../../src/middlewares/auth.middleware', () => (req, res, next) => {
    req.user = { userId: 'user-123', email: 'test@example.com', roles: ['CONFIG'] };
    req.tenantInfo = { slug: 'default', id: 'tenant-1' };
    next();
});

// 4. Mock Permission Middleware
jest.mock('../../src/middlewares/permission.middleware', () => ({
    authorize: () => (req, res, next) => next(),
    authorizeSuperAdmin: (req, res, next) => next()
}));

// 5. Mock Audit Middleware
jest.mock('../../src/middlewares/audit.middleware', () => ({
    audit: () => (req, res, next) => next()
}));

// 6. Mock Prisma via require (since controller uses req.prisma)
// We already have mocked prisma in test-app.js, but user.controller might use it directly if not injected
// effectively. However, the controller uses `req.prisma`.

// 7. Mock Routes Index
jest.mock('../../src/routes', () => {
    const express = require('express');
    const router = express.Router();
    router.use('/users', require('../../src/routes/user.routes'));
    return router;
});

const createApp = require('../helpers/test-app');
const app = createApp();

describe('User Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/users', () => {
        it('should list users', async () => {
            const users = [{ id: 1, name: 'User A' }];
            UserService.findAll.mockResolvedValue(users);

            const res = await request(app).get('/api/users');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(users);
        });
    });

    describe('POST /api/users', () => {
        it('should create a user', async () => {
            const payload = {
                name: 'User New',
                email: 'new@example.com',
                password: 'password123',
                roleIds: ['123e4567-e89b-12d3-a456-426614174000'] // valid UUID
            };
            const created = { id: 1, ...payload, password: 'hashed' };
            UserService.createUser.mockResolvedValue(created);

            const res = await request(app).post('/api/users').send(payload);

            expect(res.status).toBe(201);
            expect(res.body).toEqual(created);
        });

        it('should validate inputs', async () => {
            const res = await request(app).post('/api/users').send({});
            expect(res.status).toBe(422); // Middleware returns 422
        });
    });

    describe('PUT /api/users/:id', () => {
        it('should update user', async () => {
            UserService.update.mockResolvedValue({ id: 1, name: 'Updated' });
            const res = await request(app).put('/api/users/1').send({ name: 'Updated' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated');
        });
    });

    describe('DELETE /api/users/:id', () => {
        it('should delete user', async () => {
            UserService.delete.mockResolvedValue(true);
            const res = await request(app).delete('/api/users/1');
            expect(res.status).toBe(204);
        });
    });

    describe('PATCH /api/users/:id/toggle-status', () => {
        it('should toggle status', async () => {
            UserService.toggleStatus.mockResolvedValue({ id: 1, isActive: false });
            const res = await request(app).patch('/api/users/1/toggle-status');
            expect(res.status).toBe(200);
            expect(res.body.isActive).toBe(false);
        });
    });

    describe('POST /api/users/import-azure', () => {
        it('should import users', async () => {
            const payload = { users: [{ name: 'User Azure', email: 'azure@test.com' }] };
            UserService.importUsers.mockResolvedValue({ count: 1 });

            const res = await request(app).post('/api/users/import-azure').send(payload);
            expect(res.status).toBe(200);
            expect(res.body.count).toBe(1);
        });
    });
});
