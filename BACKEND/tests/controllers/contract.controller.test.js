const request = require('supertest');
const ContractService = require('../../src/services/contract.service');

// 1. Mock ContractService methods
jest.mock('../../src/services/contract.service', () => ({
    create: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
}));

// 2. Mock ContractDetailsController
jest.mock('../../src/controllers/contract-details.controller', () => ({
    getAttachments: (req, res) => res.send('mock'),
    uploadAttachment: (req, res) => res.send('mock'),
    deleteAttachment: (req, res) => res.send('mock'),
    getAddendums: (req, res) => res.send('mock'),
    createAddendum: (req, res) => res.send('mock'),
    updateAddendum: (req, res) => res.send('mock'),
    deleteAddendum: (req, res) => res.send('mock')
}));

// 3. Mock TenantManager
jest.mock('../../src/config/tenant-manager');

// 4. Mock Auth Middleware
jest.mock('../../src/middlewares/auth.middleware', () => (req, res, next) => {
    req.user = { userId: 'user-123', email: 'test@example.com', roles: ['CONTRACTS'] };
    next();
});

// 5. Mock Permission Middleware
jest.mock('../../src/middlewares/permission.middleware', () => ({
    authorize: () => (req, res, next) => next(),
    authorizeSuperAdmin: (req, res, next) => next()
}));

// 6. Mock Audit Middleware
jest.mock('../../src/middlewares/audit.middleware', () => ({
    audit: () => (req, res, next) => next()
}));

// 7. Mock Upload Middleware (createUpload returns a function)
jest.mock('../../src/config/upload', () => () => (req, res, next) => {
    req.file = { path: 'mock-path', originalname: 'test.pdf' };
    next();
});

// 8. Mock Routes Index
jest.mock('../../src/routes', () => {
    const express = require('express');
    const router = express.Router();
    router.use('/contracts', require('../../src/routes/contract.routes'));
    return router;
});

const createApp = require('../helpers/test-app');
const app = createApp();

describe('Contract Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/contracts', () => {
        it('should list contracts', async () => {
            const contracts = [{ id: 1, number: 'CTR-001' }];
            ContractService.getAll.mockResolvedValue(contracts);

            const res = await request(app).get('/api/contracts');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(contracts);
        });
    });

    describe('GET /api/contracts/:id', () => {
        it('should return contract details', async () => {
            ContractService.getById.mockResolvedValue({ id: 1, number: 'CTR-001' });
            const res = await request(app).get('/api/contracts/1');
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(1);
        });
    });

    describe('POST /api/contracts', () => {
        it('should create a contract', async () => {
            const payload = {
                number: 'CTR-001',
                description: 'Test Contract',
                supplierId: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
                type: 'SERVICE',
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                value: 12000,
                monthlyValue: 1000
            };
            const created = { id: 1, ...payload };
            ContractService.create.mockResolvedValue(created);

            const res = await request(app).post('/api/contracts').send(payload);

            expect(res.status).toBe(201);
            expect(res.body).toEqual(created);
        });

        it('should validate inputs', async () => {
            // Missing required fields
            const res = await request(app).post('/api/contracts').send({});
            expect(res.status).toBe(422);
        });
    });

    describe('PUT /api/contracts/:id', () => {
        it('should update contract', async () => {
            ContractService.update.mockResolvedValue({ id: 1, description: 'Updated' });
            // Must provide value or monthlyValue because validation logic requires it if not present
            const res = await request(app).put('/api/contracts/1').send({ description: 'Updated', value: 1000 });
            expect(res.status).toBe(200);
            expect(res.body.description).toBe('Updated');
        });
    });

    describe('DELETE /api/contracts/:id', () => {
        it('should delete contract', async () => {
            ContractService.delete.mockResolvedValue(true);
            const res = await request(app).delete('/api/contracts/1');
            expect(res.status).toBe(204);
        });
    });
});
