const { createProjectTaskSchema, updateProjectTaskSchema } = require('../../src/validators/project-task.validator');

const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const validData = {
    projectId: uuid,
    title: 'Implement login page',
};

describe('ProjectTask Validators', () => {
    describe('createProjectTaskSchema', () => {
        it('should pass with valid data', async () => {
            const result = await createProjectTaskSchema.validate(validData);
            expect(result.title).toBe('Implement login page');
            expect(result.priority).toBe('MEDIUM'); // default
            expect(result.status).toBe('TODO'); // default
            expect(result.progress).toBe(0); // default
            expect(result.dependencies).toEqual([]); // default
        });

        it('should reject missing projectId', async () => {
            await expect(createProjectTaskSchema.validate({ title: 'Test' }))
                .rejects.toThrow('ID do projeto é obrigatório');
        });

        it('should reject invalid projectId', async () => {
            await expect(createProjectTaskSchema.validate({ ...validData, projectId: 'bad' }))
                .rejects.toThrow('ID do projeto inválido');
        });

        it('should reject missing title', async () => {
            await expect(createProjectTaskSchema.validate({ projectId: uuid }))
                .rejects.toThrow('Título é obrigatório');
        });

        it('should reject invalid priority', async () => {
            await expect(createProjectTaskSchema.validate({ ...validData, priority: 'INVALID' }))
                .rejects.toThrow('Prioridade inválida');
        });

        it('should reject invalid status', async () => {
            await expect(createProjectTaskSchema.validate({ ...validData, status: 'INVALID' }))
                .rejects.toThrow('Status inválido');
        });

        it('should reject progress > 100', async () => {
            await expect(createProjectTaskSchema.validate({ ...validData, progress: 150 }))
                .rejects.toThrow();
        });

        it('should reject progress < 0', async () => {
            await expect(createProjectTaskSchema.validate({ ...validData, progress: -10 }))
                .rejects.toThrow();
        });

        it('should accept storyPoints as integer', async () => {
            const result = await createProjectTaskSchema.validate({ ...validData, storyPoints: 5 });
            expect(result.storyPoints).toBe(5);
        });

        it('should reject non-integer storyPoints', async () => {
            await expect(createProjectTaskSchema.validate({ ...validData, storyPoints: 2.5 }))
                .rejects.toThrow('Story points deve ser inteiro');
        });
    });

    describe('updateProjectTaskSchema', () => {
        it('should pass with partial data', async () => {
            const result = await updateProjectTaskSchema.validate({ title: 'Updated task' });
            expect(result.title).toBe('Updated task');
        });
    });
});
