const {
    createIncidentSchema, updateIncidentSchema, resolveIncidentSchema,
    assignIncidentSchema, addCommentSchema, createCategorySchema
} = require('../../src/validators/incident.validator');

const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';

describe('Incident Validators', () => {
    describe('createIncidentSchema', () => {
        const validData = {
            title: 'Server down',
            description: 'Production server unreachable',
            categoryId: uuid,
        };

        it('should pass with valid data', async () => {
            const result = await createIncidentSchema.validate(validData);
            expect(result.title).toBe('Server down');
            expect(result.impact).toBe('MEDIO'); // default
            expect(result.urgency).toBe('MEDIA'); // default
        });

        it('should reject missing title', async () => {
            await expect(createIncidentSchema.validate({ ...validData, title: undefined }))
                .rejects.toThrow('Título é obrigatório');
        });

        it('should reject missing description', async () => {
            await expect(createIncidentSchema.validate({ ...validData, description: undefined }))
                .rejects.toThrow('Descrição é obrigatória');
        });

        it('should reject missing categoryId', async () => {
            await expect(createIncidentSchema.validate({ ...validData, categoryId: undefined }))
                .rejects.toThrow('Categoria é obrigatória');
        });

        it('should reject invalid impact', async () => {
            await expect(createIncidentSchema.validate({ ...validData, impact: 'INVALID' }))
                .rejects.toThrow('Impacto inválido');
        });

        it('should accept all valid impacts', async () => {
            for (const impact of ['BAIXO', 'MEDIO', 'ALTO', 'CRITICO']) {
                const result = await createIncidentSchema.validate({ ...validData, impact });
                expect(result.impact).toBe(impact);
            }
        });

        it('should reject invalid urgency', async () => {
            await expect(createIncidentSchema.validate({ ...validData, urgency: 'INVALID' }))
                .rejects.toThrow('Urgência inválida');
        });
    });

    describe('updateIncidentSchema', () => {
        it('should pass with partial data', async () => {
            const result = await updateIncidentSchema.validate({ title: 'Updated' });
            expect(result.title).toBe('Updated');
        });

        it('should reject invalid status', async () => {
            await expect(updateIncidentSchema.validate({ status: 'INVALID' }))
                .rejects.toThrow('Status inválido');
        });

        it('should accept all valid statuses', async () => {
            for (const status of ['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED']) {
                const result = await updateIncidentSchema.validate({ status });
                expect(result.status).toBe(status);
            }
        });
    });

    describe('resolveIncidentSchema', () => {
        it('should require solution', async () => {
            await expect(resolveIncidentSchema.validate({}))
                .rejects.toThrow('Solução é obrigatória para resolver');
        });

        it('should pass with solution', async () => {
            const result = await resolveIncidentSchema.validate({ solution: 'Restarted server' });
            expect(result.solution).toBe('Restarted server');
        });

        it('should accept optional rootCause', async () => {
            const result = await resolveIncidentSchema.validate({
                solution: 'Restarted server',
                rootCause: 'Memory leak'
            });
            expect(result.rootCause).toBe('Memory leak');
        });
    });

    describe('assignIncidentSchema', () => {
        it('should require assigneeId', async () => {
            await expect(assignIncidentSchema.validate({}))
                .rejects.toThrow('assigneeId é obrigatório');
        });

        it('should reject invalid assigneeId', async () => {
            await expect(assignIncidentSchema.validate({ assigneeId: 'bad' }))
                .rejects.toThrow('ID do responsável inválido');
        });

        it('should pass with valid UUID', async () => {
            const result = await assignIncidentSchema.validate({ assigneeId: uuid });
            expect(result.assigneeId).toBe(uuid);
        });
    });

    describe('addCommentSchema', () => {
        it('should require content', async () => {
            await expect(addCommentSchema.validate({}))
                .rejects.toThrow('Conteúdo do comentário é obrigatório');
        });

        it('should pass with content', async () => {
            const result = await addCommentSchema.validate({ content: 'Investigating...' });
            expect(result.content).toBe('Investigating...');
            expect(result.isInternal).toBe(false); // default
        });
    });

    describe('createCategorySchema', () => {
        it('should require name', async () => {
            await expect(createCategorySchema.validate({}))
                .rejects.toThrow('Nome da categoria é obrigatório');
        });

        it('should set defaults', async () => {
            const result = await createCategorySchema.validate({ name: 'Network' });
            expect(result.slaResponse).toBe(480);
            expect(result.slaResolve).toBe(1440);
            expect(result.color).toBe('#6366f1');
            expect(result.icon).toBe('warning');
        });
    });
});
