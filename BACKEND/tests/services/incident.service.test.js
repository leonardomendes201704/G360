const IncidentService = require('../../src/services/incident.service');
const IncidentRepository = require('../../src/repositories/incident.repository');
const NotificationRepository = require('../../src/repositories/notification.repository');
const AuditLogRepository = require('../../src/repositories/audit-log.repository');
const UserRepository = require('../../src/repositories/user.repository');

// MOCKS
jest.mock('../../src/repositories/incident.repository');
jest.mock('../../src/repositories/notification.repository');
jest.mock('../../src/repositories/audit-log.repository');
jest.mock('../../src/repositories/user.repository');
const mockPrisma = {
    user: { findUnique: jest.fn() }
};
jest.mock('../../src/config/database', () => ({
    prisma: mockPrisma
}));
jest.mock('../../src/services/email-template.service', () => ({
    sendIncidentCreatedEmail: jest.fn(),
    sendIncidentAssignedEmail: jest.fn(),
    sendIncidentResolvedEmail: jest.fn()
}));
jest.mock('../../src/config/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
}));
jest.mock('../../src/utils/access-scope', () => ({
    getUserAccessScope: jest.fn().mockResolvedValue({ isAdmin: true, accessibleCostCenterIds: [] })
}));

describe('IncidentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculatePriority (Matriz ITIL)', () => {
        it('should return P1 for CRITICO impact and CRITICA urgency', () => {
            expect(IncidentService.calculatePriority('CRITICO', 'CRITICA')).toBe('P1');
        });

        it('should return P2 for ALTO impact and ALTA urgency', () => {
            expect(IncidentService.calculatePriority('ALTO', 'ALTA')).toBe('P2');
        });

        it('should return P3 for MEDIO impact and MEDIA urgency', () => {
            expect(IncidentService.calculatePriority('MEDIO', 'MEDIA')).toBe('P3');
        });

        it('should return P4 for BAIXO impact and BAIXA urgency', () => {
            expect(IncidentService.calculatePriority('BAIXO', 'BAIXA')).toBe('P4');
        });

        it('should return P2 for CRITICO impact with MEDIA urgency', () => {
            expect(IncidentService.calculatePriority('CRITICO', 'MEDIA')).toBe('P2');
        });

        it('should return P3 as default for unknown values', () => {
            expect(IncidentService.calculatePriority('UNKNOWN', 'UNKNOWN')).toBe('P3');
        });
    });

    describe('calculateSLADates', () => {
        it('should calculate SLA dates for P1 priority', () => {
            const createdAt = new Date('2025-01-15T10:00:00Z');
            const result = IncidentService.calculateSLADates('P1', createdAt);

            // P1: response 60min, resolve 240min
            expect(result.slaResponseDue).toEqual(new Date('2025-01-15T11:00:00Z'));
            expect(result.slaResolveDue).toEqual(new Date('2025-01-15T14:00:00Z'));
        });

        it('should calculate SLA dates for P3 priority', () => {
            const createdAt = new Date('2025-01-15T10:00:00Z');
            const result = IncidentService.calculateSLADates('P3', createdAt);

            // P3: response 480min (8h), resolve 1440min (24h)
            expect(result.slaResponseDue).toEqual(new Date('2025-01-15T18:00:00Z'));
            expect(result.slaResolveDue).toEqual(new Date('2025-01-16T10:00:00Z'));
        });

        it('should use P3 defaults for unknown priority', () => {
            const createdAt = new Date('2025-01-15T10:00:00Z');
            const result = IncidentService.calculateSLADates('UNKNOWN', createdAt);

            // Same as P3
            expect(result.slaResponseDue).toEqual(new Date('2025-01-15T18:00:00Z'));
        });
    });

    describe('checkSLABreach', () => {
        it('should return false if resolved before deadline', () => {
            const incident = {
                resolvedAt: new Date('2025-01-15T12:00:00Z'),
                slaResolveDue: new Date('2025-01-15T14:00:00Z')
            };
            expect(IncidentService.checkSLABreach(incident)).toBe(false);
        });

        it('should return true if resolved after deadline', () => {
            const incident = {
                resolvedAt: new Date('2025-01-15T16:00:00Z'),
                slaResolveDue: new Date('2025-01-15T14:00:00Z')
            };
            expect(IncidentService.checkSLABreach(incident)).toBe(true);
        });

        it('should return true if not responded and response deadline passed', () => {
            const incident = {
                respondedAt: null,
                slaResponseDue: new Date('2020-01-01T10:00:00Z'), // Past
                slaResolveDue: new Date('2030-01-01T10:00:00Z')   // Future
            };
            expect(IncidentService.checkSLABreach(incident)).toBe(true);
        });
    });

    describe('create', () => {
        it('should create incident with calculated priority and SLA', async () => {
            const userId = 'user-1';
            const data = {
                title: 'Sistema fora do ar',
                description: 'ERP não responde',
                categoryId: 'cat-rede',
                impact: 'ALTO',
                urgency: 'ALTA'
            };

            IncidentRepository.getNextCode.mockResolvedValue('INC-2025-0001');
            IncidentRepository.findByCode.mockResolvedValue(null);
            IncidentRepository.create.mockResolvedValue({
                id: 'inc-1',
                code: 'INC-2025-0001',
                ...data,
                priority: 'P2'
            });
            IncidentRepository.addHistory.mockResolvedValue({});
            AuditLogRepository.create.mockResolvedValue({});

            const result = await IncidentService.create(mockPrisma, userId, data);

            expect(result.priority).toBe('P2');
            expect(IncidentRepository.create).toHaveBeenCalledWith(
                mockPrisma,
                expect.objectContaining({
                    priority: 'P2',
                    reporterId: 'user-1',
                    slaResponseDue: expect.any(Date),
                    slaResolveDue: expect.any(Date)
                })
            );
        });

        it('should throw error if code already exists', async () => {
            IncidentRepository.getNextCode.mockResolvedValue('INC-2025-0001');
            IncidentRepository.findByCode.mockResolvedValue({ id: 'existing' });

            await expect(IncidentService.create(mockPrisma, 'user-1', { title: 'Test' }))
                .rejects
                .toEqual(expect.objectContaining({
                    statusCode: 409,
                    message: expect.stringContaining('existe')
                }));
        });
    });

    describe('assign', () => {
        it('should assign incident and change status to IN_PROGRESS', async () => {
            const incidentId = 'inc-1';
            const assigneeId = 'user-tech';
            const userId = 'user-manager';

            IncidentRepository.findById.mockResolvedValue({
                id: incidentId,
                code: 'INC-001',
                title: 'Test',
                status: 'OPEN',
                reporterId: 'user-1',
                respondedAt: null
            });

            IncidentRepository.update.mockResolvedValue({
                id: incidentId,
                status: 'IN_PROGRESS',
                assigneeId
            });

            UserRepository.findById.mockResolvedValue({ id: assigneeId, name: 'Tech User' });
            IncidentRepository.addHistory.mockResolvedValue({});
            NotificationRepository.create.mockResolvedValue({});
            AuditLogRepository.create.mockResolvedValue({});

            const result = await IncidentService.assign(mockPrisma, incidentId, assigneeId, userId);

            expect(result.status).toBe('IN_PROGRESS');
            expect(IncidentRepository.update).toHaveBeenCalledWith(
                mockPrisma,
                incidentId,
                expect.objectContaining({
                    assigneeId,
                    status: 'IN_PROGRESS',
                    respondedAt: expect.any(Date)
                })
            );
        });
    });

    describe('resolve', () => {
        it('should resolve incident and record solution', async () => {
            const incidentId = 'inc-1';
            const userId = 'user-1';
            const solution = 'Reiniciado serviço';

            IncidentRepository.findById.mockResolvedValue({
                id: incidentId,
                code: 'INC-001',
                title: 'Test',
                status: 'IN_PROGRESS',
                reporterId: 'user-reporter',
                slaResolveDue: new Date(Date.now() + 10000000) // Future date
            });

            IncidentRepository.update.mockResolvedValue({
                id: incidentId,
                status: 'RESOLVED',
                solution,
                slaBreached: false
            });

            IncidentRepository.addHistory.mockResolvedValue({});
            NotificationRepository.create.mockResolvedValue({});
            AuditLogRepository.create.mockResolvedValue({});

            const result = await IncidentService.resolve(mockPrisma, incidentId, userId, solution);

            expect(result.status).toBe('RESOLVED');
            expect(result.slaBreached).toBe(false);
        });

        it('should mark SLA as breached if resolved after deadline', async () => {
            const incidentId = 'inc-1';
            const userId = 'user-1';
            const solution = 'Problema resolvido tarde';

            IncidentRepository.findById.mockResolvedValue({
                id: incidentId,
                code: 'INC-001',
                title: 'Test',
                status: 'IN_PROGRESS',
                reporterId: 'user-reporter',
                slaResolveDue: new Date('2020-01-01') // Past date
            });

            IncidentRepository.update.mockResolvedValue({
                id: incidentId,
                status: 'RESOLVED',
                solution,
                slaBreached: true
            });

            IncidentRepository.addHistory.mockResolvedValue({});
            NotificationRepository.create.mockResolvedValue({});
            AuditLogRepository.create.mockResolvedValue({});

            const result = await IncidentService.resolve(mockPrisma, incidentId, userId, solution);

            expect(result.slaBreached).toBe(true);
        });

        it('should throw error if solution is missing', async () => {
            IncidentRepository.findById.mockResolvedValue({
                id: 'inc-1',
                status: 'IN_PROGRESS'
            });

            await expect(IncidentService.resolve(mockPrisma, 'inc-1', 'user-1', null))
                .rejects
                .toMatchObject({
                    statusCode: 400,
                    message: expect.stringContaining('obrigat')
                });
        });

        it('should throw error if incident is already closed', async () => {
            IncidentRepository.findById.mockResolvedValue({
                id: 'inc-1',
                status: 'CLOSED'
            });

            await expect(IncidentService.resolve(mockPrisma, 'inc-1', 'user-1', 'Solution'))
                .rejects
                .toMatchObject({
                    statusCode: 400,
                    message: expect.stringContaining('fechado')
                });
        });
    });

    describe('getById', () => {
        it('should return incident by ID', async () => {
            IncidentRepository.findById.mockResolvedValue({
                id: 'inc-1',
                code: 'INC-001',
                status: 'CLOSED'
            });

            const result = await IncidentService.getById(mockPrisma, 'inc-1');
            expect(result.id).toBe('inc-1');
        });

        it('should throw error if incident not found', async () => {
            IncidentRepository.findById.mockResolvedValue(null);

            await expect(IncidentService.getById(mockPrisma, 'invalid-id'))
                .rejects
                .toMatchObject({
                    statusCode: 404,
                    message: expect.stringContaining('nao encontrado')
                });
        });
    });

    describe('getAll', () => {
        it('should return all incidents with SLA check', async () => {
            IncidentRepository.findAll.mockResolvedValue([
                { id: 'inc-1', status: 'OPEN', slaResolveDue: new Date('2020-01-01'), slaResponseDue: new Date('2020-01-01'), respondedAt: null }
            ]);

            const result = await IncidentService.getAll(mockPrisma, {}, 'u1');
            expect(result).toHaveLength(1);
            expect(result[0].slaBreached).toBe(true);
        });
    });

    describe('close', () => {
        it('should close a RESOLVED incident', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', status: 'RESOLVED', code: 'INC-001' });
            IncidentRepository.update.mockResolvedValue({ id: 'inc-1', status: 'CLOSED' });
            IncidentRepository.addHistory.mockResolvedValue({});

            const result = await IncidentService.close(mockPrisma, 'inc-1', 'u1');
            expect(result.status).toBe('CLOSED');
        });

        it('should throw 400 if incident not RESOLVED', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', status: 'OPEN', code: 'INC-001' });

            await expect(IncidentService.close(mockPrisma, 'inc-1', 'u1'))
                .rejects.toMatchObject({ statusCode: 400 });
        });
    });

    describe('escalate', () => {
        it('should escalate incident with manager notification', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', code: 'INC-001', assigneeId: 'tech-1', reporterId: 'rep-1' });
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'rep-1',
                costCenter: { manager: { id: 'mgr-1', name: 'Manager' }, department: { director: null } }
            });
            IncidentRepository.addHistory.mockResolvedValue({});
            IncidentRepository.addComment.mockResolvedValue({});

            const result = await IncidentService.escalate(mockPrisma, 'inc-1', 'u1', 'Urgente');
            expect(result.escalatedTo).toBe('Manager');
        });

        it('should throw 400 if reason is missing', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', status: 'OPEN', code: 'INC-001' });

            await expect(IncidentService.escalate(mockPrisma, 'inc-1', 'u1', null))
                .rejects.toMatchObject({ statusCode: 400 });
        });
    });

    describe('addComment', () => {
        it('should add comment and notify assignee', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', code: 'INC-001', assigneeId: 'tech-1' });
            IncidentRepository.addComment.mockResolvedValue({ id: 'c1', content: 'Test comment' });
            IncidentRepository.addHistory.mockResolvedValue({});
            mockPrisma.user.findUnique.mockResolvedValue({ id: 'tech-1', email: 'tech@test.com', name: 'Tech' });

            const result = await IncidentService.addComment(mockPrisma, 'inc-1', 'u1', 'Test comment');
            expect(result.content).toBe('Test comment');
            expect(NotificationRepository.create).toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('should delete an open incident', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', code: 'INC-001', title: 'Test', status: 'OPEN' });
            IncidentRepository.delete.mockResolvedValue(true);

            const result = await IncidentService.delete(mockPrisma, 'inc-1', 'u1');
            expect(result.message).toContain('excluído');
        });

        it('should throw 400 for CLOSED incidents', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', status: 'CLOSED', code: 'INC-001' });

            await expect(IncidentService.delete(mockPrisma, 'inc-1', 'u1'))
                .rejects.toMatchObject({ statusCode: 400 });
        });
    });

    // ===== BATCH 6: BRANCH COVERAGE EXPANSION =====

    describe('checkSLABreach — additional branches', () => {
        it('should return true when resolved after SLA', () => {
            const result = IncidentService.checkSLABreach({
                resolvedAt: new Date('2025-06-15'),
                slaResolveDue: new Date('2025-06-10')
            });
            expect(result).toBe(true);
        });

        it('should return false when resolved before SLA', () => {
            const result = IncidentService.checkSLABreach({
                resolvedAt: new Date('2025-06-05'),
                slaResolveDue: new Date('2025-06-10')
            });
            expect(result).toBe(false);
        });

        it('should return true when response SLA is breached', () => {
            const result = IncidentService.checkSLABreach({
                respondedAt: null,
                slaResponseDue: new Date('2020-01-01'),
                slaResolveDue: new Date('2030-01-01')
            });
            expect(result).toBe(true);
        });

        it('should return true when resolve SLA is breached', () => {
            const result = IncidentService.checkSLABreach({
                respondedAt: new Date(),
                slaResponseDue: new Date('2030-01-01'),
                slaResolveDue: new Date('2020-01-01')
            });
            expect(result).toBe(true);
        });

        it('should return false when all within SLA', () => {
            const result = IncidentService.checkSLABreach({
                respondedAt: new Date(),
                slaResponseDue: new Date('2030-01-01'),
                slaResolveDue: new Date('2030-01-01')
            });
            expect(result).toBe(false);
        });
    });

    describe('calculatePriority — additional branches', () => {
        it('should default to P3 for null values', () => {
            expect(IncidentService.calculatePriority(null, null)).toBe('P3');
        });

        it('should default to P3 for unknown impact/urgency', () => {
            expect(IncidentService.calculatePriority('UNKNOWN', 'UNKNOWN')).toBe('P3');
        });
    });

    describe('calculateSLADates — additional branches', () => {
        it('should use P3 defaults for unknown priority', () => {
            const result = IncidentService.calculateSLADates('UNKNOWN');
            expect(result.slaResponseDue).toBeDefined();
            expect(result.slaResolveDue).toBeDefined();
        });
    });

    describe('create — additional branches', () => {
        it('should throw 409 for duplicate code', async () => {
            IncidentRepository.getNextCode.mockResolvedValue('INC-001');
            IncidentRepository.findByCode.mockResolvedValue({ id: 'existing' });

            await expect(IncidentService.create(mockPrisma, 'u1', {}))
                .rejects.toEqual(expect.objectContaining({ statusCode: 409 }));
        });
    });

    describe('getById — additional branches', () => {
        const { getUserAccessScope } = require('../../src/utils/access-scope');

        it('should throw 404 when incident not found', async () => {
            IncidentRepository.findById.mockResolvedValue(null);
            await expect(IncidentService.getById(mockPrisma, 'bad', 'u1'))
                .rejects.toEqual(expect.objectContaining({ statusCode: 404 }));
        });

        it('should throw 403 for non-admin without CC or user match', async () => {
            IncidentRepository.findById.mockResolvedValue({
                id: 'inc-1', status: 'OPEN', reporterId: 'other', assigneeId: 'other2',
                reporter: { costCenterId: 'cc99' },
                assignee: { costCenterId: 'cc88' }
            });
            getUserAccessScope.mockResolvedValue({ isAdmin: false, accessibleCostCenterIds: ['cc1'] });

            await expect(IncidentService.getById(mockPrisma, 'inc-1', 'u1'))
                .rejects.toEqual(expect.objectContaining({ statusCode: 403 }));
        });

        it('should allow non-admin when reporter matches', async () => {
            IncidentRepository.findById.mockResolvedValue({
                id: 'inc-1', status: 'OPEN', reporterId: 'u1', assigneeId: 'other',
                reporter: { costCenterId: 'cc99' },
                assignee: null
            });
            getUserAccessScope.mockResolvedValue({ isAdmin: false, accessibleCostCenterIds: [] });

            const result = await IncidentService.getById(mockPrisma, 'inc-1', 'u1');
            expect(result.id).toBe('inc-1');
        });

        it('should allow non-admin with matching CC', async () => {
            IncidentRepository.findById.mockResolvedValue({
                id: 'inc-1', status: 'OPEN', reporterId: 'other', assigneeId: 'other2',
                reporter: { costCenterId: 'cc1' },
                assignee: null
            });
            getUserAccessScope.mockResolvedValue({ isAdmin: false, accessibleCostCenterIds: ['cc1'] });

            const result = await IncidentService.getById(mockPrisma, 'inc-1', 'u1');
            expect(result.id).toBe('inc-1');
        });
    });

    describe('update — additional branches', () => {
        it('should recalculate priority when impact changes', async () => {
            IncidentRepository.findById.mockResolvedValue({
                id: 'inc-1', status: 'OPEN', impact: 'MEDIO', urgency: 'MEDIA', priority: 'P3',
                reporterId: 'u1', createdAt: new Date()
            });
            IncidentRepository.update.mockResolvedValue({ id: 'inc-1', priority: 'P1' });

            await IncidentService.update(mockPrisma, 'inc-1', 'u1', { impact: 'CRITICO' });
            expect(IncidentRepository.update).toHaveBeenCalledWith(mockPrisma, 'inc-1', expect.objectContaining({ priority: 'P2' }));
        });

        it('should record history when status changes', async () => {
            IncidentRepository.findById.mockResolvedValue({
                id: 'inc-1', status: 'OPEN', reporterId: 'u1'
            });
            IncidentRepository.update.mockResolvedValue({ id: 'inc-1', status: 'IN_PROGRESS' });

            await IncidentService.update(mockPrisma, 'inc-1', 'u1', { status: 'IN_PROGRESS' });
            expect(IncidentRepository.addHistory).toHaveBeenCalledWith(mockPrisma, 'inc-1', 'u1', 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS');
        });
    });

    describe('resolve — additional branches', () => {
        it('should throw 400 without solution', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', status: 'IN_PROGRESS', reporterId: 'u1' });
            await expect(IncidentService.resolve(mockPrisma, 'inc-1', 'u1', null))
                .rejects.toEqual(expect.objectContaining({ statusCode: 400, message: expect.stringContaining('Solução') }));
        });

        it('should mark SLA breach when resolved after due', async () => {
            IncidentRepository.findById.mockResolvedValue({
                id: 'inc-1', status: 'IN_PROGRESS', reporterId: 'u1',
                slaResolveDue: new Date('2020-01-01') // Already breached
            });
            IncidentRepository.update.mockResolvedValue({ id: 'inc-1', status: 'RESOLVED' });

            await IncidentService.resolve(mockPrisma, 'inc-1', 'u1', 'Fixed the issue', 'Root cause');
            expect(IncidentRepository.update).toHaveBeenCalledWith(mockPrisma, 'inc-1', expect.objectContaining({ slaBreached: true }));
        });

        it('should throw 400 when already closed', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', status: 'CLOSED', reporterId: 'u1' });
            await expect(IncidentService.resolve(mockPrisma, 'inc-1', 'u1', 'solution'))
                .rejects.toEqual(expect.objectContaining({ statusCode: 400 }));
        });
    });

    describe('close — additional branches', () => {
        it('should throw 400 when not resolved', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', status: 'IN_PROGRESS', reporterId: 'u1' });
            await expect(IncidentService.close(mockPrisma, 'inc-1', 'u1'))
                .rejects.toEqual(expect.objectContaining({ statusCode: 400, message: expect.stringContaining('resolvido') }));
        });
    });

    describe('escalate — additional branches', () => {
        it('should throw 400 without reason', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', status: 'OPEN', reporterId: 'u1' });
            await expect(IncidentService.escalate(mockPrisma, 'inc-1', 'u1', null))
                .rejects.toEqual(expect.objectContaining({ statusCode: 400 }));
        });

        it('should escalate to CC manager when assignee exists', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', status: 'IN_PROGRESS', reporterId: 'u1', assigneeId: 'a1' });
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'u1',
                costCenter: { manager: { id: 'mgr-1', name: 'Manager' }, department: { director: null } }
            });
            IncidentRepository.addComment.mockResolvedValue({});

            const result = await IncidentService.escalate(mockPrisma, 'inc-1', 'u1', 'Urgente');
            expect(result.escalatedTo).toBe('Manager');
            expect(NotificationRepository.create).toHaveBeenCalled();
        });

        it('should escalate to department director when no CC manager', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', status: 'IN_PROGRESS', reporterId: 'u1', assigneeId: null });
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'u1',
                costCenter: { manager: null, department: { director: { id: 'dir-1', name: 'Director' } } }
            });
            IncidentRepository.addComment.mockResolvedValue({});

            const result = await IncidentService.escalate(mockPrisma, 'inc-1', 'u1', 'Critical');
            expect(result.escalatedTo).toBe('Director');
        });

        it('should handle no escalation target', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', status: 'IN_PROGRESS', reporterId: 'u1', assigneeId: null });
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'u1', costCenter: null
            });
            IncidentRepository.addComment.mockResolvedValue({});

            const result = await IncidentService.escalate(mockPrisma, 'inc-1', 'u1', 'Issue');
            expect(result.escalatedTo).toBe('Sem gestor definido');
        });
    });

    describe('addComment — additional branches', () => {
        it('should notify assignee for public comment', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', status: 'OPEN', reporterId: 'u1', assigneeId: 'a1', code: 'INC-001', title: 'Test' });
            IncidentRepository.addComment.mockResolvedValue({ id: 'c1' });
            mockPrisma.user.findUnique.mockResolvedValue({ id: 'a1', email: 'a@test.com', name: 'Assignee' });

            await IncidentService.addComment(mockPrisma, 'inc-1', 'u1', 'Please check', false);
            expect(NotificationRepository.create).toHaveBeenCalled();
        });

        it('should NOT notify for internal comment', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', status: 'OPEN', reporterId: 'u1', assigneeId: 'a1', code: 'INC-001' });
            IncidentRepository.addComment.mockResolvedValue({ id: 'c1' });

            await IncidentService.addComment(mockPrisma, 'inc-1', 'u1', 'Internal note', true);
            expect(NotificationRepository.create).not.toHaveBeenCalled();
        });

        it('should NOT notify when commenter is assignee', async () => {
            IncidentRepository.findById.mockResolvedValue({ id: 'inc-1', status: 'OPEN', reporterId: 'u1', assigneeId: 'u1', code: 'INC-001' });
            IncidentRepository.addComment.mockResolvedValue({ id: 'c1' });

            await IncidentService.addComment(mockPrisma, 'inc-1', 'u1', 'Self note', false);
            expect(NotificationRepository.create).not.toHaveBeenCalled();
        });
    });
});
