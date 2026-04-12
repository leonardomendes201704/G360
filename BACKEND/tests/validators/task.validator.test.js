const { createTaskSchema, updateTaskSchema } = require('../../src/validators/task.validator');

const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const validData = {
    title: 'Fix login bug',
    priority: 'HIGH',
    dueDate: '2024-12-31',
    assigneeId: uuid,
};

describe('Task Validators', () => {
    describe('createTaskSchema', () => {
        it('should pass with valid data', async () => {
            const result = await createTaskSchema.validate(validData);
            expect(result.title).toBe('Fix login bug');
            expect(result.status).toBe('TODO'); // default
            expect(result.isPersonal).toBe(false); // default
        });

        it('should reject missing title', async () => {
            await expect(createTaskSchema.validate({ ...validData, title: undefined }))
                .rejects.toThrow('Título é obrigatório');
        });

        it('should reject missing priority', async () => {
            await expect(createTaskSchema.validate({ ...validData, priority: undefined }))
                .rejects.toThrow('Prioridade é obrigatória');
        });

        it('should reject invalid priority', async () => {
            await expect(createTaskSchema.validate({ ...validData, priority: 'INVALID' }))
                .rejects.toThrow('Prioridade inválida');
        });

        it('should accept all valid priorities', async () => {
            for (const priority of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) {
                const result = await createTaskSchema.validate({ ...validData, priority });
                expect(result.priority).toBe(priority);
            }
        });

        it('should reject invalid status', async () => {
            await expect(createTaskSchema.validate({ ...validData, status: 'INVALID' }))
                .rejects.toThrow('Status inválido');
        });

        it('should accept all valid statuses', async () => {
            for (const status of ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'ARCHIVED']) {
                const result = await createTaskSchema.validate({ ...validData, status });
                expect(result.status).toBe(status);
            }
        });

        it('should reject missing dueDate', async () => {
            await expect(createTaskSchema.validate({ ...validData, dueDate: undefined }))
                .rejects.toThrow('Data de vencimento é obrigatória');
        });

        it('should reject missing assigneeId', async () => {
            await expect(createTaskSchema.validate({ ...validData, assigneeId: undefined }))
                .rejects.toThrow('Atribuído a é obrigatório');
        });

        it('should reject invalid assigneeId', async () => {
            await expect(createTaskSchema.validate({ ...validData, assigneeId: 'not-uuid' }))
                .rejects.toThrow('ID do atribuído inválido');
        });
    });

    describe('updateTaskSchema', () => {
        it('should pass with partial data', async () => {
            const result = await updateTaskSchema.validate({ title: 'Updated' });
            expect(result.title).toBe('Updated');
        });

        it('should still reject invalid priority', async () => {
            await expect(updateTaskSchema.validate({ priority: 'INVALID' }))
                .rejects.toThrow('Prioridade inválida');
        });
    });
});
