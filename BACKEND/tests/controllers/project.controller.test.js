const request = require('supertest');
const ProjectService = require('../../src/services/project.service');
const TenantManager = require('../../src/config/tenant-manager');

// 1. Mock ProjectService methods (static)
jest.mock('../../src/services/project.service', () => ({
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    addMember: jest.fn(),
    updateMember: jest.fn(),
    removeMember: jest.fn(),
    submitForApproval: jest.fn(),
    approveProject: jest.fn(),
    rejectProject: jest.fn()
}));

// 2. Mock TenantManager
jest.mock('../../src/config/tenant-manager');

// 3. Mock Auth Middleware (CRITICAL: returning user object)
jest.mock('../../src/middlewares/auth.middleware', () => (req, res, next) => {
    req.user = { userId: 'user-123', email: 'test@example.com', roles: ['ADMIN'] };
    next();
});

// 4. Mock Sanitize Middleware
jest.mock('../../src/middlewares/sanitize.middleware', () => ({
    sanitize: () => (req, res, next) => next(),
    sanitizeRichText: () => (req, res, next) => next()
}));

// 5. Mock Tenant Resolver Middleware
jest.mock('../../src/middlewares/tenant-resolver.middleware', () => ({
    tenantResolver: () => (req, res, next) => next(),
    tenantResolverPublic: () => (req, res, next) => next(),
    tenantResolverAdmin: () => (req, res, next) => next()
}));

// 6. Mock Permission Middleware
jest.mock('../../src/middlewares/permission.middleware', () => ({
    authorize: () => (req, res, next) => next(),
    authorizeSuperAdmin: (req, res, next) => next()
}));

// 7. Mock Upload Validator
jest.mock('../../src/middlewares/upload-validator.middleware', () => ({
    validateUploadedFile: (req, res, next) => next()
}));

// 8. Mock Audit Middleware
jest.mock('../../src/middlewares/audit.middleware', () => ({
    audit: () => (req, res, next) => next()
}));

// 9. Mock Project Details Controller (to avoid real loading)
jest.mock('../../src/controllers/project-details.controller', () => ({
    getMinutes: (req, res) => res.send('mock'),
    uploadMinute: (req, res) => res.send('mock'),
    updateMinute: (req, res) => res.send('mock'),
    deleteMinute: (req, res) => res.send('mock'),
    submitMinute: (req, res) => res.send('mock'),
    approveMinute: (req, res) => res.send('mock'),
    rejectMinute: (req, res) => res.send('mock'),
    getRisks: (req, res) => res.send('mock'),
    createRisk: (req, res) => res.send('mock'),
    updateRisk: (req, res) => res.send('mock'),
    deleteRisk: (req, res) => res.send('mock'),
    getProposals: (req, res) => res.send('mock'),
    createProposal: (req, res) => res.send('mock'),
    updateProposal: (req, res) => res.send('mock'),
    deleteProposal: (req, res) => res.send('mock'),
    submitProposal: (req, res) => res.send('mock'),
    setPaymentCondition: (req, res) => res.send('mock'),
    generateCostsFromProposal: (req, res) => res.send('mock'),
    getFollowUps: (req, res) => res.send('mock'),
    createFollowUp: (req, res) => res.send('mock'),
    updateFollowUp: (req, res) => res.send('mock'),
    deleteFollowUp: (req, res) => res.send('mock'),
    completeFollowUp: (req, res) => res.send('mock'),
    rescheduleFollowUp: (req, res) => res.send('mock'),
    getActivities: (req, res) => res.send('mock'),
    getCosts: (req, res) => res.send('mock'),
    createCost: (req, res) => res.send('mock'),
    updateCost: (req, res) => res.send('mock'),
    deleteCost: (req, res) => res.send('mock'),
    submitCostForApproval: (req, res) => res.send('mock'),
    approveCost: (req, res) => res.send('mock'),
    rejectCost: (req, res) => res.send('mock')
}));

// 10. Mock Routes Index to ONLY load Project Routes
jest.mock('../../src/routes', () => {
    const express = require('express');
    const router = express.Router();
    router.use('/projects', require('../../src/routes/project.routes'));
    return router;
});

const createApp = require('../helpers/test-app');
const app = createApp();

describe('Project Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/projects', () => {
        it('should list projects', async () => {
            const projects = [{ id: 1, name: 'Project A' }];
            ProjectService.getAll.mockResolvedValue({ data: projects, meta: {} });

            const res = await request(app).get('/api/projects');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ data: projects, meta: {} });
            // Controller returns what service returns? 
            // In project.controller.js: return res.status(200).json(projects);
            // So if service returns { data: ..., meta: ... }, controller returns it.
        });
    });

    describe('POST /api/projects', () => {
        it('should create a project', async () => {
            // Valid internal project payload
            const payload = {
                name: 'New Project',
                code: 'PRJ-123',
                status: 'PLANNING',
                type: 'INTERNO'
            };
            const created = { id: 1, ...payload };
            ProjectService.create.mockResolvedValue(created);

            const res = await request(app).post('/api/projects').send(payload);

            expect(res.status).toBe(201);
            expect(res.body).toEqual(created);
            expect(ProjectService.create).toHaveBeenCalled();
        });

        it('should validate inputs', async () => {
            const res = await request(app).post('/api/projects').send({});
            expect(res.status).toBe(422); // Unprocessable Entity
        });
    });

    describe('GET /api/projects/:id', () => {
        it('should return project details', async () => {
            ProjectService.getById.mockResolvedValue({ id: 1, name: 'Project A' });
            const res = await request(app).get('/api/projects/1');
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(1);
        });

        it('should return 404 if not found', async () => {
            const { AppError } = require('../../src/errors');
            // Assuming AppError works in test env or mock it.
            // But strict error checking might be tricky if AppError is not mocked.
            // Let's just mock rejection with an object that has statusCode
            ProjectService.getById.mockRejectedValue({ statusCode: 404, message: 'Project not found' });

            const res = await request(app).get('/api/projects/999');
            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/projects/:id', () => {
        it('should update project', async () => {
            ProjectService.update.mockResolvedValue({ id: 1, name: 'Updated' });
            const res = await request(app).put('/api/projects/1').send({ name: 'Updated' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated');
        });
    });

    describe('DELETE /api/projects/:id', () => {
        it('should delete project', async () => {
            ProjectService.delete.mockResolvedValue(true);
            const res = await request(app).delete('/api/projects/1');
            expect(res.status).toBe(204);
        });
    });

    describe('Members endpoints', () => {
        it('POST /api/projects/:id/members should add member', async () => {
             ProjectService.addMember.mockResolvedValue({ id: 2, role: 'CONTRIBUTOR' });
             const res = await request(app).post('/api/projects/1/members').send({ email: 'm@test.com' });
             expect(res.status).toBe(201);
             expect(ProjectService.addMember).toHaveBeenCalled();
        });

        it('PUT /api/projects/:id/members/:userId should update member role', async () => {
             ProjectService.updateMember.mockResolvedValue({ id: 2, role: 'MANAGER' });
             const res = await request(app).put('/api/projects/1/members/2').send({ role: 'MANAGER' });
             expect(res.status).toBe(200);
             expect(res.body.role).toBe('MANAGER');
        });

        it('DELETE /api/projects/:id/members/:userId should remove member', async () => {
             ProjectService.removeMember.mockResolvedValue(true);
             const res = await request(app).delete('/api/projects/1/members/2');
             expect(res.status).toBe(204);
        });
    });

    describe('Workflow endpoints', () => {
        it('POST /api/projects/:id/submit-approval should submit', async () => {
             ProjectService.submitForApproval.mockResolvedValue({ id: 1, status: 'PENDING_APPROVAL' });
             const res = await request(app).post('/api/projects/1/submit-approval');
             expect(res.status).toBe(200);
             expect(ProjectService.submitForApproval).toHaveBeenCalled();
        });

        it('POST /api/projects/:id/approve should approve', async () => {
             ProjectService.approveProject.mockResolvedValue({ id: 1, status: 'APPROVED' });
             const res = await request(app).post('/api/projects/1/approve').send({ notes: 'OK' });
             expect(res.status).toBe(200);
             expect(res.body.status).toBe('APPROVED');
        });

        it('POST /api/projects/:id/reject should reject', async () => {
             ProjectService.rejectProject.mockResolvedValue({ id: 1, status: 'REJECTED' });
             const res = await request(app).post('/api/projects/1/reject').send({ reason: 'NOK', requiresAdjustment: true });
             expect(res.status).toBe(200);
             expect(ProjectService.rejectProject).toHaveBeenCalled();
        });

        it('POST /api/projects/:id/reject should 400 if reason missing', async () => {
             const res = await request(app).post('/api/projects/1/reject').send({ requiresAdjustment: true });
             expect(res.status).toBe(400);
             expect(res.body.message).toMatch(/obrigatório/);
        });
    });
});
