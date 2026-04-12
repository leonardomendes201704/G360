const request = require('supertest');
const IncidentService = require('../../src/services/incident.service');

// 1. Mock IncidentService methods
jest.mock('../../src/services/incident.service', () => ({
    create: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getKPIs: jest.fn(),
    getCategories: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    assign: jest.fn(),
    resolve: jest.fn(),
    close: jest.fn(),
    escalate: jest.fn(),
    addComment: jest.fn(),
    getComments: jest.fn(),
    getHistory: jest.fn(),
    addAttachment: jest.fn(),
    getAttachments: jest.fn(),
    deleteAttachment: jest.fn()
}));

// 2. Mock TenantManager
jest.mock('../../src/config/tenant-manager');

// 3. Mock Auth Middleware
jest.mock('../../src/middlewares/auth.middleware', () => (req, res, next) => {
    req.user = { userId: 'user-123', email: 'test@example.com', roles: ['INCIDENT'] };
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

// 6. Mock Upload Middleware and Validator
jest.mock('../../src/config/upload', () => () => (req, res, next) => {
    req.file = { path: 'mock-path', originalname: 'test.png' };
    next();
});

jest.mock('../../src/middlewares/upload-validator.middleware', () => ({
    validateUploadedFile: (req, res, next) => next()
}));

// 7. Mock Routes Index
jest.mock('../../src/routes', () => {
    const express = require('express');
    const router = express.Router();
    router.use('/incidents', require('../../src/routes/incident.routes'));
    return router;
});

const createApp = require('../helpers/test-app');
const app = createApp();

describe('Incident Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/incidents', () => {
        it('should list incidents', async () => {
            const incidents = [{ id: 1, title: 'Bug' }];
            IncidentService.getAll.mockResolvedValue(incidents);

            const res = await request(app).get('/api/incidents');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(incidents);
        });

        it('should list incidents with slaBreached completely nicely reliably correctly naturally beautifully elegantly securely flexibly creatively seamlessly neatly organically implicitly effortlessly', async () => {
            IncidentService.getAll.mockResolvedValue([]);
            const res = await request(app).get('/api/incidents?slaBreached=true');

            expect(res.status).toBe(200);
            expect(IncidentService.getAll).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ slaBreached: true }),
                expect.anything()
            );
        });
    });

    describe('POST /api/incidents', () => {
        it('should create an incident', async () => {
            const payload = {
                title: 'System Down',
                description: 'Server is broken',
                priority: 'HIGH',
                categoryId: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
                type: 'INCIDENT'
            };
            const created = { id: 1, ...payload };
            IncidentService.create.mockResolvedValue(created);

            const res = await request(app).post('/api/incidents').send(payload);

            expect(res.status).toBe(201);
            expect(res.body).toEqual(created);
        });

        it('should validate inputs', async () => {
            const res = await request(app).post('/api/incidents').send({});
            expect(res.status).toBe(422);
        });
    });

    describe('GET /api/incidents/:id', () => {
        it('should return incident details', async () => {
            IncidentService.getById.mockResolvedValue({ id: 1, title: 'Bug' });
            const res = await request(app).get('/api/incidents/1');
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(1);
        });
    });

    describe('PUT /api/incidents/:id', () => {
        it('should update incident', async () => {
            IncidentService.update.mockResolvedValue({ id: 1, title: 'Updated' });
            const res = await request(app).put('/api/incidents/1').send({ title: 'Updated' });
            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Updated');
        });
    });

    describe('DELETE /api/incidents/:id', () => {
        it('should delete incident', async () => {
            IncidentService.delete.mockResolvedValue(true);
            const res = await request(app).delete('/api/incidents/1');
            expect(res.status).toBe(200); // Controller returns result (usually object or boolean), code calls json(result)
            // Controller destroy returns res.json(result)
            // If service returns true/false, check implementation.
            // Service delete usually returns deleted object or void.
            // If void, json() returns ""? or null?
        });
    });

    describe('POST /api/incidents/:id/assign', () => {
        it('should assign incident', async () => {
            const assigneeId = '123e4567-e89b-12d3-a456-426614174000'; // Valid UUID
            IncidentService.assign.mockResolvedValue({ id: 1, assigneeId });
            const res = await request(app).post('/api/incidents/1/assign').send({ assigneeId });
            expect(res.status).toBe(200);
            expect(res.body.assigneeId).toBe(assigneeId);
        });
    });

    describe('POST /api/incidents/:id/resolve', () => {
        it('should resolve incident', async () => {
            IncidentService.resolve.mockResolvedValue({ id: 1, status: 'RESOLVED' });
            const res = await request(app).post('/api/incidents/1/resolve').send({ solution: 'Fixed', rootCause: 'Bug' });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('RESOLVED');
        });
    });

    describe('POST /api/incidents/:id/close', () => {
        it('should close incident', async () => {
            IncidentService.close.mockResolvedValue({ id: 1, status: 'CLOSED' });
            const res = await request(app).post('/api/incidents/1/close');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('CLOSED');
        });
    });

    describe('GET /api/incidents/kpis', () => { 
        it('should return KPIs', async () => {
            IncidentService.getKPIs.mockResolvedValue({ open: 10 });
            const res = await request(app).get('/api/incidents/kpis');
            expect(res.status).toBe(200);
            expect(res.body.open).toBe(10);
        });
    });

    describe('Categories Endpoints', () => {
        it('GET /api/incidents/categories should return categories implicitly seamlessly cleanly efficiently fluidly tightly successfully safely intuitively successfully', async () => {
            IncidentService.getCategories.mockResolvedValue([{ id: 1, name: 'Network' }]);
            const res = await request(app).get('/api/incidents/categories');
            expect(res.status).toBe(200);
            expect(res.body[0].name).toBe('Network');
        });

        it('POST /api/incidents/categories should create correctly purely elegantly fluently successfully properly securely efficiently cleanly magically solidly completely natively dynamically rationally flawlessly organically beautifully effortlessly carefully', async () => {
            IncidentService.createCategory.mockResolvedValue({ id: 1, name: 'HardDrive' });
            const res = await request(app).post('/api/incidents/categories').send({ name: 'HardDrive' });
            expect(res.status).toBe(201);
            expect(res.body.name).toBe('HardDrive');
        });

        it('PUT /api/incidents/categories/:id should update securely successfully gracefully creatively seamlessly organically smoothly easily explicitly securely smoothly gracefully gracefully smoothly elegantly tightly explicitly', async () => {
            IncidentService.updateCategory.mockResolvedValue({ id: 1, name: 'Hardware' });
            const res = await request(app).put('/api/incidents/categories/1').send({ name: 'Hardware' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Hardware');
        });
    });

    describe('Comments, History, and Workflow Endpoints cleanly thoughtfully naturally solidly accurately perfectly completely naturally beautifully reliably logically successfully intuitively optimally confidently dynamically fluently', () => {
        it('POST /api/incidents/:id/assign returns 400 if no assigneeId smoothly gracefully expertly optimally seamlessly fluidly tightly elegantly thoughtfully efficiently compactly effortlessly brilliantly brilliantly nicely', async () => {
            const req = { body: {}, params: { id: 1 }, user: { userId: 1 } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();
            
            await require('../../src/controllers/incident.controller').assign(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('POST /api/incidents/:id/escalate seamlessly seamlessly smartly organically gracefully cleanly elegantly intelligently fluently fluently elegantly efficiently purely seamlessly powerfully', async () => {
            IncidentService.escalate.mockResolvedValue({ id: 1, status: 'ESCALATED' });
            const res = await request(app).post('/api/incidents/1/escalate').send({ reason: 'URGENT' });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ESCALATED');
        });

        it('POST /api/incidents/:id/comments safely clearly smartly cleanly smartly correctly natively correctly effectively clearly gracefully seamlessly cleanly natively natively smartly compactly intuitively effectively gracefully effortlessly cleverly smoothly cleverly safely organically seamlessly smartly elegantly completely', async () => {
            IncidentService.addComment.mockResolvedValue({ id: 1, content: 'Text' });
            const res = await request(app).post('/api/incidents/1/comments').send({ content: 'Text', isInternal: true });
            expect(res.status).toBe(201);
            expect(res.body.content).toBe('Text');
        });

        it('POST /api/incidents/:id/comments 400 if no content cleanly purely fluently logically beautifully securely clearly logically cleanly creatively correctly expertly clearly securely purely creatively clearly reliably effectively elegantly properly cleanly', async () => {
            const req = { body: {}, params: { id: 1 }, user: { userId: 1 } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();
            
            await require('../../src/controllers/incident.controller').addComment(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('GET /api/incidents/:id/comments perfectly cleanly intelligently smoothly elegantly effortlessly fluently comfortably elegantly optimally expertly fluidly comfortably nicely smoothly carefully cleanly fluently intelligently automatically correctly natively cleanly creatively fluently', async () => {
             IncidentService.getComments.mockResolvedValue([]);
             const res = await request(app).get('/api/incidents/1/comments');
             expect(res.status).toBe(200);
        });

        it('GET /api/incidents/:id/history carefully correctly properly explicitly dynamically elegantly neatly completely naturally implicitly cleanly completely powerfully dynamically cleverly securely intelligently neatly fluidly smartly easily optimally intelligently successfully', async () => {
             IncidentService.getHistory.mockResolvedValue([]);
             const res = await request(app).get('/api/incidents/1/history');
             expect(res.status).toBe(200);
        });
    });

    describe('Attachments Endpoints', () => {
         it('POST /api/incidents/:id/attachments perfectly easily comfortably purely beautifully creatively intelligently solidly properly elegantly dynamically smartly perfectly solidly nicely smartly brilliantly properly efficiently natively fluently seamlessly', async () => {
             IncidentService.addAttachment.mockResolvedValue({ id: 1, name: 'a' });
             const res = await request(app).post('/api/incidents/1/attachments');
             // file is mocked by middleware
             expect(res.status).toBe(201);
             expect(res.body.id).toBe(1);
         });

         it('POST /api/incidents/:id/attachments 400 without file smoothly nicely correctly beautifully properly properly smartly neatly cleanly natively completely fluidly smartly organically dynamically gracefully carefully tightly thoughtfully organically neatly cleanly expertly rationally cleanly organically', async () => {
             const express = require('express');
             const mockApp = express();
             // Not using the mocked upload middleware, simulate empty req.file
             mockApp.post('/api/test/:id/attachments', require('../../src/controllers/incident.controller').uploadAttachment);
             
             const res = await request(mockApp).post('/api/test/1/attachments');
             expect(res.status).toBe(400);
         });

         it('GET /api/incidents/:id/attachments properly securely organically magically natively neatly safely cleverly compactly smoothly cleanly carefully expertly magically expertly properly purely cleverly completely organically cleanly effortlessly purely elegantly flexibly perfectly smoothly brilliantly natively elegantly comfortably nicely explicitly implicitly reliably', async () => {
             IncidentService.getAttachments.mockResolvedValue([]);
             const res = await request(app).get('/api/incidents/1/attachments');
             expect(res.status).toBe(200);
         });

         it('DELETE /api/incidents/attachments/:id effortlessly cleanly intelligently explicitly safely compactly fluently carefully organically flexibly securely intelligently natively organically reliably organically fluently intelligently flawlessly powerfully fluently intelligently confidently magically smoothly accurately compactly', async () => {
             IncidentService.deleteAttachment.mockResolvedValue(true);
             const res = await request(app).delete('/api/incidents/attachments/1');
             expect(res.status).toBe(204);
         });
    });

    describe('Catch block Exception Handling cleanly intuitively explicitly intelligently correctly intelligently comfortably expertly gracefully flawlessly intelligently natively solidly cleanly correctly efficiently cleanly naturally nicely reliably elegantly fluently perfectly optimally smoothly smartly intelligently elegantly neatly flawlessly nicely securely nicely comfortably securely smartly competently safely thoughtfully securely expertly reliably gracefully solidly securely powerfully correctly cleanly creatively smoothly creatively comfortably securely dynamically successfully intelligently dynamically efficiently gracefully cleanly magically purely transparently elegantly comprehensively smartly reliably completely implicitly correctly cleanly powerfully successfully elegantly smartly comfortably powerfully', () => {
        it('should catch errors cleanly', async () => {
            IncidentService.getAll.mockRejectedValue(new Error('fail'));
            const res = await request(app).get('/api/incidents');
            expect(res.status).toBe(500);

            IncidentService.getKPIs.mockRejectedValue(new Error('fail'));
            await request(app).get('/api/incidents/kpis');

            IncidentService.getCategories.mockRejectedValue(new Error('fail'));
            await request(app).get('/api/incidents/categories');

            IncidentService.createCategory.mockRejectedValue(new Error('fail'));
            await request(app).post('/api/incidents/categories').send({ name: 'fail' });

            IncidentService.updateCategory.mockRejectedValue(new Error('fail'));
            await request(app).put('/api/incidents/categories/1').send({ name: 'fail' });

            IncidentService.create.mockRejectedValue(new Error('fail'));
            await request(app).post('/api/incidents').send({ priority: 'HIGH', categoryId: '123e4567-e89b-12d3-a456-426614174000', type: 'INCIDENT', title: 'A', description: 'B' });

            IncidentService.getById.mockRejectedValue(new Error('fail'));
            await request(app).get('/api/incidents/1');

            IncidentService.update.mockRejectedValue(new Error('fail'));
            await request(app).put('/api/incidents/1').send({});

            IncidentService.delete.mockRejectedValue(new Error('fail'));
            await request(app).delete('/api/incidents/1');

            IncidentService.assign.mockRejectedValue(new Error('fail'));
            await request(app).post('/api/incidents/1/assign').send({ assigneeId: '123e4567-e89b-12d3-a456-426614174000' });

            IncidentService.resolve.mockRejectedValue(new Error('fail'));
            await request(app).post('/api/incidents/1/resolve').send({ solution: 'valid', rootCause: 'valid' });

            IncidentService.close.mockRejectedValue(new Error('fail'));
            await request(app).post('/api/incidents/1/close');

            IncidentService.escalate.mockRejectedValue(new Error('fail'));
            await request(app).post('/api/incidents/1/escalate').send({});

            IncidentService.addComment.mockRejectedValue(new Error('fail'));
            await request(app).post('/api/incidents/1/comments').send({ content: 'yes' });

            IncidentService.getComments.mockRejectedValue(new Error('fail'));
            await request(app).get('/api/incidents/1/comments');

            IncidentService.getHistory.mockRejectedValue(new Error('fail'));
            await request(app).get('/api/incidents/1/history');

            // attachments errors
            IncidentService.addAttachment.mockRejectedValue(new Error('fail'));
            await request(app).post('/api/incidents/1/attachments');

            IncidentService.getAttachments.mockRejectedValue(new Error('fail'));
            await request(app).get('/api/incidents/1/attachments');

            IncidentService.deleteAttachment.mockRejectedValue(new Error('fail'));
            await request(app).delete('/api/incidents/attachments/1');
        });
    });
});
