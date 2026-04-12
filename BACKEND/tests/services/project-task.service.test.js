const ProjectTaskService = require('../../src/services/project-task.service');
const ProjectTaskRepository = require('../../src/repositories/project-task.repository');
const ProjectRepository = require('../../src/repositories/project.repository');
const UserRepository = require('../../src/repositories/user.repository');
const AuditLogRepository = require('../../src/repositories/audit-log.repository');

jest.mock('../../src/repositories/project-task.repository');
jest.mock('../../src/repositories/project.repository');
jest.mock('../../src/repositories/user.repository');
jest.mock('../../src/repositories/audit-log.repository');
jest.mock('../../src/config/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));
jest.mock('../../src/utils/access-scope', () => ({
    getUserAccessScope: jest.fn().mockResolvedValue({ isAdmin: true, accessibleCostCenterIds: [] })
}));
jest.mock('../../src/config/database', () => ({
    prisma: {
        user: { findUnique: jest.fn() },
        notification: { create: jest.fn() },
        project: { findUnique: jest.fn(), update: jest.fn() },
        projectTask: { aggregate: jest.fn().mockResolvedValue({ _avg: { progress: 50 } }) }
    }
}));

const { prisma } = require('../../src/config/database');

describe('ProjectTaskService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        const tenantId = 'tenant-1';
        const userId = 'user-1';
        const projectId = 'proj-1';
        const projectData = { id: projectId };
        const validTaskData = {
            projectId,
            title: 'Task 1',
            description: 'Desc',
            status: 'TODO',
            priority: 'HIGH', // Sanitized to MEDIUM default? No, priority: data.priority || 'MEDIUM'
            storyPoints: 5,
            assigneeId: 'user-2',
            startDate: '2025-01-01',
            endDate: '2025-01-10'
        };

        it('should create task successfully', async () => {
            ProjectRepository.findById.mockResolvedValue(projectData);
            UserRepository.findById.mockResolvedValue({ id: 'user-2' });
            ProjectTaskRepository.create.mockResolvedValue({ id: 'task-1', ...validTaskData });

            const result = await ProjectTaskService.create(prisma, tenantId, userId, validTaskData);

            expect(result.id).toBe('task-1');
            expect(ProjectTaskRepository.create).toHaveBeenCalledWith(prisma, expect.objectContaining({
                title: 'Task 1',
                priority: 'HIGH',
                startDate: new Date('2025-01-01'), // Check date conversion
                endDate: new Date('2025-01-10')
            }));
            expect(AuditLogRepository.create).toHaveBeenCalledWith(prisma, expect.anything());
        });

        it('should perform date conversion correctly', async () => {
            ProjectRepository.findById.mockResolvedValue(projectData);
            ProjectTaskRepository.create.mockResolvedValue({});

            await ProjectTaskService.create(prisma, tenantId, userId, { projectId, title: 'T', startDate: '2025-05-05' });

            expect(ProjectTaskRepository.create).toHaveBeenCalledWith(prisma, expect.objectContaining({
                startDate: expect.any(Date)
            }));
        });

        it('should throw 404 if project not found', async () => {
            ProjectRepository.findById.mockResolvedValue(null);

            await expect(ProjectTaskService.create(prisma, tenantId, userId, { projectId: 'missing' }))
                .rejects.toHaveProperty('statusCode', 404);
        });
    });

    describe('update', () => {
        const tenantId = 'tenant-1';
        const userId = 'user-1';
        const taskId = 'task-1';
        const existingTask = {
            id: taskId,
            projectId: 'proj-1',
            title: 'Old Title',
            status: 'TODO',
            assigneeId: 'old-user'
        };

        it('should update allowed fields', async () => {
            ProjectTaskRepository.findById.mockResolvedValue(existingTask);
            ProjectRepository.findById.mockResolvedValue({ id: 'proj-1' });
            ProjectTaskRepository.update.mockResolvedValue({ ...existingTask, title: 'New Title' });

            await ProjectTaskService.update(prisma, taskId, tenantId, userId, { title: 'New Title' });

            expect(ProjectTaskRepository.update).toHaveBeenCalledWith(prisma, taskId, expect.objectContaining({
                title: 'New Title'
            }));
        });

        it('should log status change', async () => {
            ProjectTaskRepository.findById.mockResolvedValue(existingTask); // status: TODO
            ProjectRepository.findById.mockResolvedValue({ id: 'proj-1' });
            ProjectTaskRepository.update.mockResolvedValue({ ...existingTask, status: 'DONE' });

            await ProjectTaskService.update(prisma, taskId, tenantId, userId, { status: 'DONE' });

            expect(AuditLogRepository.create).toHaveBeenCalledWith(prisma, expect.objectContaining({
                action: expect.stringContaining('moveu a tarefa "Old Title" para DONE')
            }));
        });
    });

    describe('delete', () => {
        it('should delete task if exists and user has access', async () => {
            ProjectTaskRepository.findById.mockResolvedValue({ id: 't1', projectId: 'p1' });
            ProjectRepository.findById.mockResolvedValue({ id: 'p1' });
            ProjectTaskRepository.delete.mockResolvedValue(true);

            await ProjectTaskService.delete(prisma, 't1', 'tenant-1', 'user-1');

            expect(ProjectTaskRepository.delete).toHaveBeenCalledWith(prisma, 't1');
        });
    });
});
