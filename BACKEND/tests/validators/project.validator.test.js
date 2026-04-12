const { createProjectSchema, updateProjectSchema, rejectProjectSchema, addMemberSchema } = require('../../src/validators/project.validator');

const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';

describe('Project Validators', () => {
    describe('createProjectSchema', () => {
        const validData = { name: 'New Platform', type: 'INTERNO' };

        it('should pass with valid data', async () => {
            const result = await createProjectSchema.validate(validData);
            expect(result.name).toBe('New Platform');
            expect(result.status).toBe('PLANNING'); // default
            expect(result.priority).toBe('MEDIUM'); // default
            expect(result.approvalStatus).toBe('DRAFT'); // default
        });

        it('should reject missing name', async () => {
            await expect(createProjectSchema.validate({ type: 'INTERNO' }))
                .rejects.toThrow('Nome é obrigatório');
        });

        it('should reject missing type', async () => {
            await expect(createProjectSchema.validate({ name: 'Test' }))
                .rejects.toThrow('Tipo é obrigatório');
        });

        it('should reject invalid type', async () => {
            await expect(createProjectSchema.validate({ ...validData, type: 'INVALID' }))
                .rejects.toThrow('Tipo inválido');
        });

        it('should accept all valid types', async () => {
            for (const type of ['INTERNO', 'CLIENTE', 'MELHORIA', 'INOVACAO']) {
                const result = await createProjectSchema.validate({ ...validData, type });
                expect(result.type).toBe(type);
            }
        });

        it('should reject endDate before startDate', async () => {
            await expect(createProjectSchema.validate({
                ...validData,
                startDate: '2024-12-01',
                endDate: '2024-01-01'
            })).rejects.toThrow('Data de término deve ser posterior à data de início');
        });

        it('should allow endDate equal to startDate', async () => {
            const result = await createProjectSchema.validate({
                ...validData,
                startDate: '2024-06-01',
                endDate: '2024-06-01'
            });
            expect(result).toBeDefined();
        });

        it('should reject negative budget', async () => {
            await expect(createProjectSchema.validate({ ...validData, budget: -1000 }))
                .rejects.toThrow('Orçamento deve ser positivo');
        });

        it('should reject invalid managerId', async () => {
            await expect(createProjectSchema.validate({ ...validData, managerId: 'bad' }))
                .rejects.toThrow('ID do gerente inválido');
        });
    });

    describe('updateProjectSchema', () => {
        it('should pass with partial data', async () => {
            const result = await updateProjectSchema.validate({ name: 'Updated' });
            expect(result.name).toBe('Updated');
        });
    });

    describe('rejectProjectSchema', () => {
        it('should require reason', async () => {
            await expect(rejectProjectSchema.validate({}))
                .rejects.toThrow('Motivo da rejeição é obrigatório');
        });

        it('should pass with reason', async () => {
            const result = await rejectProjectSchema.validate({ reason: 'Over budget' });
            expect(result.reason).toBe('Over budget');
            expect(result.requiresAdjustment).toBe(false); // default
        });
    });

    describe('addMemberSchema', () => {
        it('should require userId', async () => {
            await expect(addMemberSchema.validate({ role: 'Developer' }))
                .rejects.toThrow('ID do usuário é obrigatório');
        });

        it('should require role', async () => {
            await expect(addMemberSchema.validate({ userId: uuid }))
                .rejects.toThrow('Papel é obrigatório');
        });

        it('should pass with valid data', async () => {
            const result = await addMemberSchema.validate({ userId: uuid, role: 'Developer' });
            expect(result.userId).toBe(uuid);
            expect(result.role).toBe('Developer');
        });

        it('should reject invalid userId', async () => {
            await expect(addMemberSchema.validate({ userId: 'bad', role: 'Dev' }))
                .rejects.toThrow('ID do usuário inválido');
        });
    });
});
