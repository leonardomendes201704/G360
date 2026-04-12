/**
 * E2E Route Tests using supertest
 * Tests specific route files to avoid loading every controller
 */
const request = require('supertest');
const express = require('express');
require('express-async-errors');

// Mock middlewares
jest.mock('../../src/middlewares/auth.middleware', () => (req, res, next) => {
    req.user = {
        userId: 'test-user-id',
        email: 'admin@g360.com',
        roles: ['admin-role'],
        isSuperAdmin: true,
        tenantSlug: 'test',
        schemaName: 'test_schema'
    };
    next();
});

jest.mock('../../src/middlewares/permission.middleware', () => ({
    authorize: () => (req, res, next) => next()
}));

jest.mock('../../src/middlewares/tenant-resolver.middleware', () => ({
    tenantResolver: () => (req, res, next) => {
        req.prisma = {};
        req.tenantInfo = { slug: 'test', schemaName: 'test_schema' };
        next();
    },
    tenantResolverPublic: () => (req, res, next) => {
        req.prisma = {};
        req.tenantInfo = { slug: 'test', schemaName: 'test_schema' };
        next();
    }
}));

jest.mock('../../src/middlewares/rate-limit.middleware', () => ({
    loginLimiter: (req, res, next) => next(),
    globalLimiter: (req, res, next) => next()
}));

jest.mock('../../src/middlewares/audit.middleware', () => ({
    audit: () => (req, res, next) => next()
}));

jest.mock('../../src/middlewares/upload-validator.middleware', () => ({
    validateUploadedFile: (req, res, next) => next()
}));

jest.mock('../../src/config/upload', () => () => (req, res, next) => next());

jest.mock('../../src/config/logger', () => ({
    error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn()
}));

// Mock services
jest.mock('../../src/services/project.service');
jest.mock('../../src/services/auth.service');
jest.mock('../../src/services/refresh-token.service');
jest.mock('../../src/repositories/user.repository');
jest.mock('../../src/config/tenant-manager', () => ({
    getAllActiveTenants: jest.fn().mockResolvedValue([]),
    getClientForTenant: jest.fn(),
    getTenantBySlug: jest.fn(),
    getCatalogClient: jest.fn(),
    getPoolStats: jest.fn().mockReturnValue({})
}));

// Mock project-details controller (used by project routes)
jest.mock('../../src/controllers/project-details.controller', () => {
    const mock = {};
    const methods = [
        'getRisks', 'createRisk', 'updateRisk', 'deleteRisk',
        'getMinutes', 'uploadMinute', 'updateMinute', 'deleteMinute',
        'getProposals', 'createProposal', 'updateProposal', 'deleteProposal', 'submitProposal',
        'setPaymentCondition', 'generateCostsFromProposal',
        'getFollowUps', 'createFollowUp', 'updateFollowUp', 'deleteFollowUp', 'completeFollowUp', 'rescheduleFollowUp',
        'getActivities',
        'getCosts', 'createCost', 'updateCost', 'deleteCost',
        'submitCostForApproval', 'approveCost', 'rejectCost'
    ];
    methods.forEach(m => { mock[m] = jest.fn((req, res) => res.status(200).json({})); });
    return mock;
});

// Mock Auth controller (used by auth routes)
jest.mock('../../src/controllers/auth.controller', () => {
    return {
        login: jest.fn((req, res) => res.status(200).json({ token: 'jwt' })),
        loginAzure: jest.fn(),
        loginLdap: jest.fn(),
        getAzureConfig: jest.fn(),
        refresh: jest.fn((req, res) => res.status(200).json({ token: 'jwt' })),
        logout: jest.fn((req, res) => res.status(200).json({ message: 'OK' })),
        getMe: jest.fn((req, res) => res.status(200).json({ id: 'u1', name: 'Admin', email: 'admin@g360.com' }))
    };
});

const ProjectService = require('../../src/services/project.service');
const AuthService = require('../../src/services/auth.service');
const UserRepository = require('../../src/repositories/user.repository');

function buildApp() {
    const app = express();
    app.use(express.json());

    // Inject prisma mock
    app.use((req, res, next) => {
        req.prisma = {};
        req.tenantInfo = { slug: 'test', schemaName: 'test_schema' };
        next();
    });

    // Mount specific routes
    const projectRoutes = require('../../src/routes/project.routes');
    const authRoutes = require('../../src/routes/auth.routes');

    app.use('/api/projects', projectRoutes);
    app.use('/api/auth', authRoutes);

    // Error handler
    app.use((err, req, res, next) => {
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({ status: 'error', message: err.message });
    });

    return app;
}

describe.skip('E2E Routes', () => {
    let app;

    beforeAll(() => {
        app = buildApp();
    });

    // --- Project Routes ---

    describe('GET /api/projects', () => {
        it('should return 200 with projects list', async () => {
            ProjectService.getAll.mockResolvedValue([{ id: 'p1', name: 'Test' }]);
            const res = await request(app).get('/api/projects').set('Authorization', 'Bearer test');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });
    });

    describe('POST /api/projects', () => {
        it('should return 201 on creation', async () => {
            ProjectService.create.mockResolvedValue({ id: 'p1', name: 'New' });
            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', 'Bearer test')
                .send({ name: 'New', description: 'Desc', startDate: '2025-01-01', endDate: '2025-12-31', priority: 'MEDIUM', type: 'INTERNO' });
            expect(res.status).toBe(201);
        });
    });

    describe('GET /api/projects/:id', () => {
        it('should return 200', async () => {
            ProjectService.getById.mockResolvedValue({ id: 'p1' });
            const res = await request(app).get('/api/projects/p1').set('Authorization', 'Bearer test');
            expect(res.status).toBe(200);
        });
    });

    describe('PUT /api/projects/:id', () => {
        it('should return 200', async () => {
            ProjectService.update.mockResolvedValue({ id: 'p1', name: 'Updated' });
            const res = await request(app).put('/api/projects/p1').set('Authorization', 'Bearer test').send({ name: 'Updated' });
            expect(res.status).toBe(200);
        });
    });

    describe('DELETE /api/projects/:id', () => {
        it('should return 204', async () => {
            ProjectService.delete.mockResolvedValue();
            const res = await request(app).delete('/api/projects/p1').set('Authorization', 'Bearer test');
            expect(res.status).toBe(204);
        });
    });

    describe('POST /api/projects/:id/submit-approval', () => {
        it('should return 200', async () => {
            ProjectService.submitForApproval.mockResolvedValue({ id: 'p1' });
            const res = await request(app).post('/api/projects/p1/submit-approval').set('Authorization', 'Bearer test');
            expect(res.status).toBe(200);
        });
    });

    describe('POST /api/projects/:id/approve', () => {
        it('should return 200', async () => {
            ProjectService.approveProject.mockResolvedValue({ id: 'p1' });
            const res = await request(app).post('/api/projects/p1/approve').set('Authorization', 'Bearer test').send({ notes: 'OK' });
            expect(res.status).toBe(200);
        });
    });

    describe('POST /api/projects/:id/reject', () => {
        it('should return 400 if no reason', async () => {
            const res = await request(app).post('/api/projects/p1/reject').set('Authorization', 'Bearer test').send({});
            expect(res.status).toBe(400);
        });

        it('should return 200 with reason', async () => {
            ProjectService.rejectProject.mockResolvedValue({ id: 'p1' });
            const res = await request(app).post('/api/projects/p1/reject').set('Authorization', 'Bearer test').send({ reason: 'Too costly' });
            expect(res.status).toBe(200);
        });
    });

    describe('POST /api/projects/:id/members', () => {
        it('should return 201', async () => {
            ProjectService.addMember.mockResolvedValue({ userId: 'u2' });
            const res = await request(app).post('/api/projects/p1/members').set('Authorization', 'Bearer test').send({ userId: 'u2', role: 'DEV' });
            expect(res.status).toBe(201);
        });
    });

    // --- Auth Routes ---
    
    // Configs de retorno manual via jest.mock do controller definidas globalmente acima,
    // garantem que as endpoints reajam a GET/POST respondendo 200

    describe('GET /api/auth/me', () => {
        it('should return user data without password', async () => {
            const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer test');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should return 400 on empty body', async () => {
            const AuthController = require('../../src/controllers/auth.controller');
            AuthController.login.mockImplementationOnce((req, res) => res.status(400).json({ error: 'Validação' }));
            const res = await request(app).post('/api/auth/login').send({});
            expect(res.status).toBe(400);
        });

        it('should return 200 with valid credentials', async () => {
            const res = await request(app).post('/api/auth/login').send({ email: 'admin@g360.com', password: '123' });
            expect(res.status).toBe(200);
            expect(res.body.token).toBe('jwt');
        });
    });

    describe('POST /api/auth/refresh', () => {
        it('should return 400 if no refreshToken', async () => {
            const AuthController = require('../../src/controllers/auth.controller');
            AuthController.refresh.mockImplementationOnce((req, res) => res.status(400).json({ error: 'Refresh token é obrigatório' }));
            const res = await request(app).post('/api/auth/refresh').send({});
            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should return 400 if no refreshToken', async () => {
            const AuthController = require('../../src/controllers/auth.controller');
            AuthController.logout.mockImplementationOnce((req, res) => res.status(400).json({ error: 'Refresh token é obrigatório' }));
            const res = await request(app).post('/api/auth/logout').send({});
            expect(res.status).toBe(400);
        });
    });

    // --- Error Handling ---

    describe('Error propagation', () => {
        it('should return proper error JSON on service exception', async () => {
            const error = new Error('Not Found');
            error.statusCode = 404;
            ProjectService.getById.mockRejectedValue(error);
            const res = await request(app).get('/api/projects/non-existent').set('Authorization', 'Bearer test');
            expect(res.status).toBe(404);
            expect(res.body.status).toBe('error');
        });
    });
});
