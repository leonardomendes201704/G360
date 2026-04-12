const { createChangeRequestSchema, updateChangeRequestSchema, reviewChangeSchema } = require('../../src/validators/change-request.validator');

const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const validData = {
    code: 'GMUD-001',
    title: 'Server migration',
    description: 'Migrate DB to new server',
    justification: 'Performance improvement',
    type: 'NORMAL',
    impact: 'SIGNIFICATIVO',
    scheduledStart: '2024-06-01T22:00:00Z',
    scheduledEnd: '2024-06-02T06:00:00Z',
};

describe('ChangeRequest Validators', () => {
    describe('createChangeRequestSchema', () => {
        it('should pass with valid data', async () => {
            const result = await createChangeRequestSchema.validate(validData);
            expect(result.code).toBe('GMUD-001');
            expect(result.title).toBe('Server migration');
        });

        it('should reject missing code', async () => {
            await expect(createChangeRequestSchema.validate({ ...validData, code: undefined }))
                .rejects.toThrow('Código é obrigatório');
        });

        it('should reject missing title', async () => {
            await expect(createChangeRequestSchema.validate({ ...validData, title: undefined }))
                .rejects.toThrow('Título é obrigatório');
        });

        it('should reject missing description', async () => {
            await expect(createChangeRequestSchema.validate({ ...validData, description: undefined }))
                .rejects.toThrow('Descrição é obrigatória');
        });

        it('should reject missing justification', async () => {
            await expect(createChangeRequestSchema.validate({ ...validData, justification: undefined }))
                .rejects.toThrow('Justificativa é obrigatória');
        });

        it('should reject invalid type', async () => {
            await expect(createChangeRequestSchema.validate({ ...validData, type: 'INVALID' }))
                .rejects.toThrow('Tipo inválido');
        });

        it('should accept all valid types', async () => {
            for (const type of ['NORMAL', 'PADRAO', 'EMERGENCIAL']) {
                const result = await createChangeRequestSchema.validate({ ...validData, type });
                expect(result.type).toBe(type);
            }
        });

        it('should reject invalid impact', async () => {
            await expect(createChangeRequestSchema.validate({ ...validData, impact: 'INVALID' }))
                .rejects.toThrow('Impacto inválido');
        });

        it('should reject invalid riskLevel', async () => {
            await expect(createChangeRequestSchema.validate({ ...validData, riskLevel: 'INVALID' }))
                .rejects.toThrow('Nível de risco inválido');
        });

        it('should reject scheduledEnd before scheduledStart', async () => {
            await expect(createChangeRequestSchema.validate({
                ...validData,
                scheduledStart: '2024-06-02T22:00:00Z',
                scheduledEnd: '2024-06-01T06:00:00Z'
            })).rejects.toThrow('Data fim deve ser posterior à data início');
        });

        it('should transform empty projectId to null', async () => {
            const result = await createChangeRequestSchema.validate({ ...validData, projectId: '' });
            expect(result.projectId).toBeNull();
        });
    });

    describe('updateChangeRequestSchema', () => {
        it('should pass with partial data', async () => {
            const result = await updateChangeRequestSchema.validate({ title: 'Updated' });
            expect(result.title).toBe('Updated');
        });

        it('should accept all valid statuses', async () => {
            const statuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'APPROVED_WAITING_EXECUTION', 'REJECTED', 'REVISION_REQUESTED', 'EXECUTED', 'FAILED', 'CANCELLED'];
            for (const status of statuses) {
                const result = await updateChangeRequestSchema.validate({ status });
                expect(result.status).toBe(status);
            }
        });
    });

    describe('reviewChangeSchema', () => {
        it('should require status', async () => {
            await expect(reviewChangeSchema.validate({}))
                .rejects.toThrow('Status é obrigatório');
        });

        it('should reject invalid review status', async () => {
            await expect(reviewChangeSchema.validate({ status: 'PENDING' }))
                .rejects.toThrow('Status de review inválido');
        });

        it('should accept APPROVED', async () => {
            const result = await reviewChangeSchema.validate({ status: 'APPROVED' });
            expect(result.status).toBe('APPROVED');
        });

        it('should accept REJECTED with comment', async () => {
            const result = await reviewChangeSchema.validate({ status: 'REJECTED', comment: 'Too risky' });
            expect(result.status).toBe('REJECTED');
            expect(result.comment).toBe('Too risky');
        });
    });
});
