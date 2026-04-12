const ProblemService = require('../../src/services/problem.service');
const ticketService = require('../../src/services/ticket.service');

// Mock dependencies
jest.mock('../../src/services/ticket.service');

describe('ProblemService', () => {
    let mockPrismaClient;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrismaClient = {
            problemRequest: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
                count: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
            ticket: {
                update: jest.fn(),
            }
        };
    });

    describe('getAll', () => {
        it('should return all problems, matching query params completely if provided', async () => {
            const mockProblems = [{ id: 'p1', title: 'Network Outage' }];
            mockPrismaClient.problemRequest.findMany.mockResolvedValue(mockProblems);

            let result = await ProblemService.getAll(mockPrismaClient, {});
            expect(mockPrismaClient.problemRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {},
                orderBy: { createdAt: 'desc' },
                include: {
                    requester: { select: { id: true, name: true, avatar: true } },
                    incidents: { select: { id: true, code: true, title: true, status: true } }
                }
            }));
            expect(result).toEqual(mockProblems);

            // Using status query
            result = await ProblemService.getAll(mockPrismaClient, { status: 'RESOLVED' });
            expect(mockPrismaClient.problemRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { status: 'RESOLVED' }
            }));
        });
    });

    describe('getById', () => {
        it('should return a specific problem when found', async () => {
            const mockProblem = { id: 'p1', title: 'Server Down' };
            mockPrismaClient.problemRequest.findUnique.mockResolvedValue(mockProblem);

            const result = await ProblemService.getById(mockPrismaClient, 'p1');
            expect(result).toEqual(mockProblem);
            expect(mockPrismaClient.problemRequest.findUnique).toHaveBeenCalledWith({
                where: { id: 'p1' },
                include: {
                    requester: { select: { id: true, name: true, avatar: true } },
                    incidents: true
                }
            });
        });

        it('should throw an error when problem is not found', async () => {
            mockPrismaClient.problemRequest.findUnique.mockResolvedValue(null);
            await expect(ProblemService.getById(mockPrismaClient, 'p99')).rejects.toThrow('Problema não encontrado');
        });
    });

    describe('create', () => {
        it('should create a new problem with generated code', async () => {
            mockPrismaClient.problemRequest.count.mockResolvedValue(5);
            const mockData = { title: 'Lag', description: 'Very high ping', requesterId: 'user1' };
            
            mockPrismaClient.problemRequest.create.mockResolvedValue({ id: 'p6', ...mockData });
            
            const result = await ProblemService.create(mockPrismaClient, mockData);
            
            expect(mockPrismaClient.problemRequest.count).toHaveBeenCalledTimes(1);
            expect(mockPrismaClient.problemRequest.create).toHaveBeenCalledWith({
                data: {
                    code: expect.stringMatching(/^PRB-\d{4}-0006$/),
                    title: 'Lag',
                    description: 'Very high ping',
                    priority: 'HIGH', // default because not provided
                    requesterId: 'user1'
                }
            });
            expect(result.id).toBe('p6');
        });

        it('should keep custom priority when provided on create', async () => {
            mockPrismaClient.problemRequest.count.mockResolvedValue(0);
            const mockData = { title: 'Lag', description: 'Ping', priority: 'URGENT', requesterId: 'user2' };
            mockPrismaClient.problemRequest.create.mockResolvedValue({ id: 'p1', ...mockData });
            
            await ProblemService.create(mockPrismaClient, mockData);
            
            expect(mockPrismaClient.problemRequest.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    priority: 'URGENT'
                })
            });
        });
    });

    describe('updateStatus', () => {
        it('should update just the status if no RCA or workaround provided', async () => {
            const returnedProblem = { id: 'p1', status: 'INVESTIGATING', incidents: [] };
            mockPrismaClient.problemRequest.update.mockResolvedValue(returnedProblem);

            const result = await ProblemService.updateStatus(mockPrismaClient, 'p1', 'INVESTIGATING', null, null);
            expect(mockPrismaClient.problemRequest.update).toHaveBeenCalledWith({
                where: { id: 'p1' },
                data: { status: 'INVESTIGATING' },
                include: { incidents: true }
            });
            expect(result).toEqual(returnedProblem);
        });

        it('should add RCA and workaround if provided', async () => {
            const returnedProblem = { id: 'p1', status: 'IDENTIFIED', incidents: [] };
            mockPrismaClient.problemRequest.update.mockResolvedValue(returnedProblem);

            await ProblemService.updateStatus(mockPrismaClient, 'p1', 'IDENTIFIED', 'bad DNS', 'restart router');
            expect(mockPrismaClient.problemRequest.update).toHaveBeenCalledWith({
                where: { id: 'p1' },
                data: { status: 'IDENTIFIED', rootCause: 'bad DNS', workaround: 'restart router' },
                include: { incidents: true }
            });
        });

        it('should set resolvedAt and auto-resolve linked unresolved incidents if status is RESOLVED', async () => {
            // Mock Date for reliable testing
            const mockDate = new Date('2026-04-10T12:00:00Z');
            jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

            ticketService.addMessage.mockResolvedValue({});
            ticketService.updateStatus.mockResolvedValue({});

            const mockProblem = { 
                id: 'p1', 
                status: 'RESOLVED', 
                code: 'PRB-1',
                rootCause: 'DNS Error', 
                workaround: null,
                requesterId: 'sysadmin',
                incidents: [
                    { id: 't1', status: 'OPEN' }, // Will resolve
                    { id: 't2', status: 'RESOLVED' } // Won't resolve again
                ] 
            };
            mockPrismaClient.problemRequest.update.mockResolvedValue(mockProblem);

            await ProblemService.updateStatus(mockPrismaClient, 'p1', 'RESOLVED', 'DNS Error', null);
            
            expect(mockPrismaClient.problemRequest.update).toHaveBeenCalledWith({
                where: { id: 'p1' },
                data: { status: 'RESOLVED', rootCause: 'DNS Error', resolvedAt: mockDate },
                include: { incidents: true }
            });

            // Ensure incident 't1' is updated and has a message attached
            expect(ticketService.addMessage).toHaveBeenCalledWith(
                mockPrismaClient,
                't1',
                'sysadmin',
                expect.stringContaining('Problema Causa-Raiz [PRB-1] foi marcado como Resolvido'),
                true
            );
            expect(ticketService.updateStatus).toHaveBeenCalledWith(mockPrismaClient, 't1', 'RESOLVED', {});

            // Ensure incident 't2' is skipped
            expect(ticketService.updateStatus).not.toHaveBeenCalledWith(mockPrismaClient, 't2', expect.any(String), expect.any(Object));

            jest.restoreAllMocks();
        });
        
        it('should auto-resolve linked unresolved incidents if status is CLOSED', async () => {
            const mockProblem = { 
                id: 'p1', status: 'CLOSED', incidents: [{ id: 't1', status: 'IN_PROGRESS' }] 
            };
            mockPrismaClient.problemRequest.update.mockResolvedValue(mockProblem);

            await ProblemService.updateStatus(mockPrismaClient, 'p1', 'CLOSED', null, null);
            expect(ticketService.updateStatus).toHaveBeenCalledWith(mockPrismaClient, 't1', 'RESOLVED', {});
        });
    });

    describe('linkIncident', () => {
        it('should link the problem to specific ticket', async () => {
            mockPrismaClient.ticket.update.mockResolvedValue({ id: 't1', problemId: 'p1' });
            const result = await ProblemService.linkIncident(mockPrismaClient, 'p1', 't1');
            expect(mockPrismaClient.ticket.update).toHaveBeenCalledWith({
                where: { id: 't1' },
                data: { problemId: 'p1' }
            });
            expect(result).toEqual({ id: 't1', problemId: 'p1' });
        });
    });
});
