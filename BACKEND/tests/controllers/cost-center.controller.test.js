const request = require('supertest');
const CostCenterService = require('../../src/services/cost-center.service');

// 1. Mock Mock CostCenterService
jest.mock('../../src/services/cost-center.service', () => ({
    create: jest.fn(),
    getAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
}));

// 2. Mock TenantManager (implicitely used if auth middleware sets tenant info)
jest.mock('../../src/config/tenant-manager');

// 3. Mock Auth Middleware
jest.mock('../../src/middlewares/auth.middleware', () => (req, res, next) => {
    req.user = { userId: 'user-123', email: 'test@example.com', roles: ['FINANCE'] };
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

// 6. Mock Logger
jest.mock('../../src/config/logger', () => ({
    info: jest.fn(),
    error: jest.fn()
}));

// 7. Mock Routes Index
jest.mock('../../src/routes', () => {
    const express = require('express');
    const router = express.Router();
    router.use('/cost-centers', require('../../src/routes/cost-center.routes'));
    return router;
});

const createApp = require('../helpers/test-app');
const app = createApp();

describe('Cost Center Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/cost-centers', () => {
        it('should list cost centers', async () => {
            const list = [{ id: 1, name: 'CC-01' }];
            CostCenterService.getAll.mockResolvedValue(list);

            const res = await request(app).get('/api/cost-centers');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(list);
        });
    });

    describe('POST /api/cost-centers', () => {
        it('should create a cost center', async () => {
            const payload = {
                code: 'CC-03',
                name: 'Marketing',
                managerId: '123e4567-e89b-12d3-a456-426614174000' // Valid UUID
            };
            const created = { id: 1, ...payload };
            CostCenterService.create.mockResolvedValue(created);

            const res = await request(app).post('/api/cost-centers').send(payload);

            expect(res.status).toBe(201);
            expect(res.body).toEqual(created);
        });

        it('should validate inputs', async () => {
            const res = await request(app).post('/api/cost-centers').send({});
            expect(res.status).toBe(400); // Controller uses try-catch around yup validation and returns 400
        });
    });

    describe('PUT /api/cost-centers/:id', () => {
        it('should update cost center', async () => {
            CostCenterService.update.mockResolvedValue({ id: 1, name: 'Updated' });
            const res = await request(app).put('/api/cost-centers/1').send({ name: 'Updated' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated');
        });
    });

    describe('DELETE /api/cost-centers/:id', () => {
        it('should delete cost center', async () => {
            CostCenterService.delete.mockResolvedValue(true);
            const res = await request(app).delete('/api/cost-centers/1');
            expect(res.status).toBe(204);
        });
    });
});
