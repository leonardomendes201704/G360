const TaskTimeController = require('../../src/controllers/task-time.controller');

describe('TaskTimeController', () => {
    let mockReq;
    let mockRes;
    let mockPrisma;

    beforeEach(() => {
        mockPrisma = {
            task: { findUnique: jest.fn() },
            taskTimeLog: {
                findFirst: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                findMany: jest.fn()
            }
        };

        mockReq = {
            params: { id: 'task-1' },
            user: { userId: 'user-1' },
            prisma: mockPrisma,
            body: {},
            query: {}
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            setHeader: jest.fn(),
            send: jest.fn()
        };
        
        // Suppress console.error in tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('start', () => {
        it('should return 404 if task not found', async () => {
            mockPrisma.task.findUnique.mockResolvedValue(null);
            await TaskTimeController.start(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Tarefa não encontrada.' });
        });

        it('should return 403 if user is not assignee', async () => {
            mockPrisma.task.findUnique.mockResolvedValue({ id: 'task-1', assigneeId: 'different-user' });
            await TaskTimeController.start(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: expect.stringContaining('responsável pode iniciar') });
        });

        it('should return 409 if user already has an active session', async () => {
            mockPrisma.task.findUnique.mockResolvedValue({ id: 'task-1', assigneeId: 'user-1' });
            mockPrisma.taskTimeLog.findFirst.mockResolvedValue({ id: 'log-1', taskId: 'other-task' });
            
            await TaskTimeController.start(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(409);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('timer ativo')
            }));
        });

        it('should start timer and return 201', async () => {
            mockPrisma.task.findUnique.mockResolvedValue({ id: 'task-1', assigneeId: 'user-1' });
            mockPrisma.taskTimeLog.findFirst.mockResolvedValue(null);
            mockPrisma.taskTimeLog.create.mockResolvedValue({ id: 'new-log' });

            await TaskTimeController.start(mockReq, mockRes);
            expect(mockPrisma.taskTimeLog.create).toHaveBeenCalledWith({
                data: { taskId: 'task-1', userId: 'user-1' },
                include: expect.any(Object)
            });
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({ id: 'new-log' });
        });

        it('should handle errors returning 500', async () => {
            mockPrisma.task.findUnique.mockRejectedValue(new Error('DB Error'));
            await TaskTimeController.start(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Erro ao iniciar timer.' });
        });
        
        it('should fallback to req.user.id if userId is undefined', async () => {
            mockReq.user = { id: 'alt-user' };
            mockPrisma.task.findUnique.mockResolvedValue({ id: 'task-1', assigneeId: 'alt-user' });
            mockPrisma.taskTimeLog.findFirst.mockResolvedValue(null);
            mockPrisma.taskTimeLog.create.mockResolvedValue({ id: 'log' });
            await TaskTimeController.start(mockReq, mockRes);
            expect(mockPrisma.taskTimeLog.create).toHaveBeenCalledWith(expect.objectContaining({
                 data: { taskId: 'task-1', userId: 'alt-user' }
            }));
        });
    });

    describe('stop', () => {
        it('should return 404 if no active timer', async () => {
            mockPrisma.taskTimeLog.findFirst.mockResolvedValue(null);
            await TaskTimeController.stop(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Nenhum timer ativo para esta tarefa.' });
        });

        it('should stop timer calculating duration and return updated log', async () => {
            const startedAt = new Date(Date.now() - 3600000); // 1 hour ago
            mockPrisma.taskTimeLog.findFirst.mockResolvedValue({ id: 'log-1', startedAt });
            mockPrisma.taskTimeLog.update.mockResolvedValue({ id: 'log-1', duration: 3600 });
            mockReq.body = { notes: 'Work notes' };

            await TaskTimeController.stop(mockReq, mockRes);
            
            expect(mockPrisma.taskTimeLog.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'log-1' },
                data: expect.objectContaining({
                    duration: expect.any(Number),
                    notes: 'Work notes'
                })
            }));
            expect(mockRes.json).toHaveBeenCalledWith({ id: 'log-1', duration: 3600 });
        });

        it('should stop timer without notes if not provided', async () => {
            mockPrisma.taskTimeLog.findFirst.mockResolvedValue({ id: 'log-1', startedAt: new Date() });
            mockPrisma.taskTimeLog.update.mockImplementation((opts) => opts.data);
            mockReq.body = null; // simulate no body

            await TaskTimeController.stop(mockReq, mockRes);
            
            expect(mockPrisma.taskTimeLog.update).toHaveBeenCalled();
            const calledData = mockPrisma.taskTimeLog.update.mock.calls[0][0].data;
            expect(calledData.notes).toBeUndefined();
        });

        it('should fallback to req.user.id if userId is undefined', async () => {
            mockReq.user = { id: 'alt' };
            mockPrisma.taskTimeLog.findFirst.mockResolvedValue(null);
            await TaskTimeController.stop(mockReq, mockRes);
            expect(mockPrisma.taskTimeLog.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ userId: 'alt' })
            }));
        });

        it('should handle errors returning 500', async () => {
            mockPrisma.taskTimeLog.findFirst.mockRejectedValue(new Error('Bug'));
            await TaskTimeController.stop(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    describe('history', () => {
        it('should return logs and total calculated seconds', async () => {
            mockPrisma.taskTimeLog.findMany.mockResolvedValue([
                { id: 1, duration: 100 },
                { id: 2, duration: 200 },
                { id: 3, duration: null } // testing zero fallback
            ]);
            await TaskTimeController.history(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith({
                logs: expect.any(Array),
                totalSeconds: 300
            });
        });

        it('should handle errors returning 500', async () => {
            mockPrisma.taskTimeLog.findMany.mockRejectedValue(new Error('bug'));
            await TaskTimeController.history(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    describe('active', () => {
        it('should return active log', async () => {
            mockPrisma.taskTimeLog.findFirst.mockResolvedValue({ id: 1 });
            await TaskTimeController.active(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith({ id: 1 });
        });

        it('should return null if no active log', async () => {
            mockPrisma.taskTimeLog.findFirst.mockResolvedValue(null);
            await TaskTimeController.active(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith(null);
        });

        it('should handle errors returning 500', async () => {
            mockPrisma.taskTimeLog.findFirst.mockRejectedValue(new Error(''));
            await TaskTimeController.active(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
        
        it('should fallback to req.user.id', async () => {
             mockReq.user = { id: 'fallback' };
             mockPrisma.taskTimeLog.findFirst.mockResolvedValue(null);
             await TaskTimeController.active(mockReq, mockRes);
             expect(mockPrisma.taskTimeLog.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                 where: expect.objectContaining({ userId: 'fallback' })
             }));
        });
    });

    describe('report', () => {
        it('should fetch standard report with groupings', async () => {
            mockReq.query = {
                startDate: '2025-01-01',
                endDate: '2025-01-31',
                userId: 'user1',
                taskId: 'task1'
            };

            const mockLogs = [
                { id: 1, userId: 'u1', taskId: 't1', duration: 100, user: { name: 'U1' }, task: { title: 'T1' } },
                { id: 2, userId: 'u1', taskId: 't1', duration: 50, user: { name: 'U1' }, task: { title: 'T1' } },
                { id: 3, userId: 'u2', taskId: 't2', duration: null, user: { name: 'U2' }, task: { title: 'T2' } }
            ];
            mockPrisma.taskTimeLog.findMany.mockResolvedValue(mockLogs);

            await TaskTimeController.report(mockReq, mockRes);
            expect(mockPrisma.taskTimeLog.findMany).toHaveBeenCalled();
            const calledWhere = mockPrisma.taskTimeLog.findMany.mock.calls[0][0].where;
            expect(calledWhere.userId).toBe('user1');
            expect(calledWhere.taskId).toBe('task1');
            expect(calledWhere.startedAt.gte).toBeInstanceOf(Date);
            expect(calledWhere.startedAt.lte).toBeInstanceOf(Date);

            // Verify json response format
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                logs: mockLogs,
                totalSeconds: 150,
                totalSessions: 3,
                byUser: expect.any(Array),
                byTask: expect.any(Array)
            }));
            
            const payload = mockRes.json.mock.calls[0][0];
            expect(payload.byUser.length).toBe(2);
            expect(payload.byTask.length).toBe(2);
        });

        it('should handle missing query parameters gracefully', async () => {
            mockReq.query = {};
            mockPrisma.taskTimeLog.findMany.mockResolvedValue([]);
            await TaskTimeController.report(mockReq, mockRes);
            const calledWhere = mockPrisma.taskTimeLog.findMany.mock.calls[0][0].where;
            expect(calledWhere.userId).toBeUndefined();
            expect(calledWhere.taskId).toBeUndefined();
            expect(calledWhere.startedAt).toBeUndefined();
        });

        it('should handle errors returning 500', async () => {
            mockPrisma.taskTimeLog.findMany.mockRejectedValue(new Error('DB err'));
            await TaskTimeController.report(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    describe('exportReport', () => {
        const mockLogs = [
            { id: 1, duration: 3661, startedAt: '2025-01-01T10:00:00Z', endedAt: '2025-01-01T11:01:01Z', user: { name: 'User 1' }, task: { title: 'Task "A"' }, notes: 'Note' },
            { id: 2, duration: 0, startedAt: '2025-01-02T10:00:00Z', endedAt: null, user: { email: 'user@a.com' }, task: null } // testing edge cases
        ];

        it('should export CSV format correctly', async () => {
            mockReq.query = { format: 'csv' };
            mockPrisma.taskTimeLog.findMany.mockResolvedValue(mockLogs);
            
            await TaskTimeController.exportReport(mockReq, mockRes);
            
            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('.csv"'));
            expect(mockRes.send).toHaveBeenCalled();
            const csvOutput = mockRes.send.mock.calls[0][0];
            expect(csvOutput).toContain('User 1');
            expect(csvOutput).toContain('01:01:01'); // 3661 seconds formatted
            expect(csvOutput).toContain('""A""'); // CSV quote escaping
        });

        it('should apply filters to export query', async () => {
             mockReq.query = { startDate: '2025-01-01', endDate: '2025-01-02', userId: '1', taskId: '1', format: 'csv' };
             mockPrisma.taskTimeLog.findMany.mockResolvedValue([]);
             
             await TaskTimeController.exportReport(mockReq, mockRes);
             expect(mockPrisma.taskTimeLog.findMany).toHaveBeenCalled();
             const calledWhere = mockPrisma.taskTimeLog.findMany.mock.calls[0][0].where;
             expect(calledWhere.taskId).toBe('1');
        });

        it('should export XLSX mock format correctly', async () => {
            mockReq.query = { format: 'xlsx' };
            mockPrisma.taskTimeLog.findMany.mockResolvedValue(mockLogs);
            
            await TaskTimeController.exportReport(mockReq, mockRes);
            
            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.ms-excel');
            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('.xls"'));
            expect(mockRes.send).toHaveBeenCalled();
            const xlsOutput = mockRes.send.mock.calls[0][0];
            expect(xlsOutput).toContain('User 1');
            expect(xlsOutput).toContain('Task "A"'); // XLSX via tab separated doesn't need double quotes replacement
        });
        
        it('should handle empty lists on format duration gracefully', async () => {
             mockReq.query = { format: 'csv' };
             // Use a log object missing practically everything to hit fallbacks
             mockPrisma.taskTimeLog.findMany.mockResolvedValue([{ id: 3 }]); 
             await TaskTimeController.exportReport(mockReq, mockRes);
             expect(mockRes.send).toHaveBeenCalled();
             const out = mockRes.send.mock.calls[0][0];
             expect(out).toContain('00:00:00'); 
        });

        it('should handle errors returning 500', async () => {
            mockPrisma.taskTimeLog.findMany.mockRejectedValue(new Error('err'));
            await TaskTimeController.exportReport(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalled();
        });
    });
});
