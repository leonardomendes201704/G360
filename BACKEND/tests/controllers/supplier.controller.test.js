const request = require('supertest');
const SupplierService = require('../../src/services/supplier.service');

// 1. Mock SupplierService methods
jest.mock('../../src/services/supplier.service', () => ({
    create: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
}));

// 2. Mock TenantManager
jest.mock('../../src/config/tenant-manager');

// 3. Mock Auth Middleware
jest.mock('../../src/middlewares/auth.middleware', () => (req, res, next) => {
    req.user = { userId: 'user-123', email: 'test@example.com', roles: ['SUPPLIERS'] };
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

// 6. Configurando rota no Express standalone para o Controller
const express = require('express');
const app = express();
app.use(express.json());

// Injetando os middlewares mockados manulamente para o teste de controller
app.use((req, res, next) => {
    req.user = { userId: 'user-123', email: 'test@example.com', roles: ['SUPPLIERS'] };
    next();
});

// Importando rotas reais do fornecedor e atrelando ao app (já que o mock do controller não usa test-app direito)
const supplierRoutes = require('../../src/routes/supplier.routes');
app.use('/api/suppliers', supplierRoutes);

describe('Supplier Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/suppliers', () => {
        it('should list suppliers', async () => {
            const suppliers = [{ id: 1, name: 'Supplier A' }];
            SupplierService.getAll.mockResolvedValue(suppliers);

            const res = await request(app).get('/api/suppliers');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(suppliers);
        });
    });

    describe('GET /api/suppliers/:id', () => {
        it('should return supplier details', async () => {
            SupplierService.getById.mockResolvedValue({ id: 1, name: 'Supplier A' });
            const res = await request(app).get('/api/suppliers/1');
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(1);
        });
    });

    describe('POST /api/suppliers', () => {
        it('should create a supplier', async () => {
            const payload = {
                name: 'Supplier A',
                document: '12345678901',
                documentType: 'CPF',
                classification: 'ESTRATEGICO'
            };
            const created = { id: 1, ...payload };
            SupplierService.create.mockResolvedValue(created);

            const res = await request(app).post('/api/suppliers').send(payload);

            expect(res.status).toBe(201);
            expect(res.body).toEqual(created);
        });

        it('should validate inputs', async () => {
            const res = await request(app).post('/api/suppliers').send({});
            expect(res.status).toBe(422);
        });
    });

    describe('PUT /api/suppliers/:id', () => {
        it('should update supplier', async () => {
            SupplierService.update.mockResolvedValue({ id: 1, name: 'Updated' });
            const res = await request(app).put('/api/suppliers/1').send({ name: 'Updated' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated');
        });
    });

    describe('DELETE /api/suppliers/:id', () => {
        it('should delete supplier', async () => {
            SupplierService.delete.mockResolvedValue(true);
            const res = await request(app).delete('/api/suppliers/1');
            expect(res.status).toBe(204);
        });
    });
});
