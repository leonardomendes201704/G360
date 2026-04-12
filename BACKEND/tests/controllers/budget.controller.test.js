const request = require('supertest');
const BudgetService = require('../../src/services/budget.service');

// 1. Mock BudgetService methods
jest.mock('../../src/services/budget.service', () => ({
    create: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    approve: jest.fn(),
    duplicate: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
    importItems: jest.fn()
}));

// 2. Mock TenantManager
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

// 6. Mock Upload Middleware
jest.mock('../../src/config/upload', () => () => (req, res, next) => {
    req.file = { path: 'mock-path', originalname: 'test.xlsx' };
    next();
});

// 7. Mock Routes Index
jest.mock('../../src/routes', () => {
    const express = require('express');
    const router = express.Router();
    router.use('/budgets', require('../../src/routes/budget.routes'));
    return router;
});

const createApp = require('../helpers/test-app');
const app = createApp();

describe('Budget Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/budgets', () => {
        it('should list budgets', async () => {
            const budgets = [{ id: 1, name: 'Budget 2024' }];
            BudgetService.getAll.mockResolvedValue(budgets);

            const res = await request(app).get('/api/budgets');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(budgets);
        });
    });

    describe('POST /api/budgets', () => {
        it('should create a budget', async () => {
            const payload = {
                name: 'Budget 2024',
                fiscalYearId: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
                type: 'OPEX'
            };
            const created = { id: 1, ...payload };
            BudgetService.create.mockResolvedValue(created);

            const res = await request(app).post('/api/budgets').send(payload);

            expect(res.status).toBe(201);
            expect(res.body).toEqual(created);
            expect(BudgetService.create).toHaveBeenCalled();
        });

        it('should validate inputs', async () => {
            const res = await request(app).post('/api/budgets').send({});
            // The route middleware catches validation error and returns 422
            // Controller logic would return 400, but route middleware runs first.
            expect(res.status).toBe(422);
        });
    });

    describe('GET /api/budgets/:id', () => {
        it('should return budget details', async () => {
            BudgetService.getById.mockResolvedValue({ id: 1, name: 'Budget 2024' });
            const res = await request(app).get('/api/budgets/1');
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(1);
        });
    });

    describe('PUT /api/budgets/:id', () => {
        it('should update budget', async () => {
            BudgetService.update.mockResolvedValue({ id: 1, name: 'Updated' });
            const res = await request(app).put('/api/budgets/1').send({ name: 'Updated' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated');
        });
    });

    describe('DELETE /api/budgets/:id', () => {
        it('should delete budget', async () => {
            BudgetService.delete.mockResolvedValue(true);
            const res = await request(app).delete('/api/budgets/1');
            expect(res.status).toBe(204);
        });
    });

    describe('PATCH /api/budgets/:id/approve', () => {
        it('should approve budget', async () => {
            BudgetService.approve.mockResolvedValue({ id: 1, status: 'APPROVED' });
            const res = await request(app).patch('/api/budgets/1/approve');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('APPROVED');
        });
    });

    describe('POST /api/budgets/:id/duplicate', () => {
        it('should duplicate budget', async () => {
            BudgetService.duplicate.mockResolvedValue({ id: 2, name: 'Copy' });
            const res = await request(app).post('/api/budgets/1/duplicate').send({ newName: 'Copy' });
            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Copy');
        });
    });


    describe('POST /api/budgets/:id/items', () => {
        it('should add item', async () => {
            const payload = { accountId: '123e4567-e89b-12d3-a456-426614174000', jan: 100 }; // Valid UUID
            const created = { id: 1, ...payload };
            BudgetService.addItem.mockResolvedValue(created);

            const res = await request(app).post('/api/budgets/1/items').send(payload);
            expect(res.status).toBe(201);
            expect(res.body).toEqual(created);
        });
    });

    describe('PUT /api/budgets/items/:itemId', () => {
        it('should update item', async () => {
            BudgetService.updateItem.mockResolvedValue({ id: 1, jan: 200 });
            const res = await request(app).put('/api/budgets/items/1').send({ jan: 200 });
            expect(res.status).toBe(200);
            expect(res.body.jan).toBe(200);
        });
    });

    describe('DELETE /api/budgets/items/:itemId', () => {
        it('should delete item', async () => {
            BudgetService.deleteItem.mockResolvedValue(true);
            const res = await request(app).delete('/api/budgets/items/1');
            expect(res.status).toBe(204);
        });
    });

});
