const { createBudgetSchema, updateBudgetSchema, duplicateBudgetSchema, addBudgetItemSchema } = require('../../src/validators/budget.validator');

describe('Budget Validators', () => {
    describe('createBudgetSchema', () => {
        const validData = { name: 'Budget 2024', fiscalYearId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890' };

        it('should pass with valid data', async () => {
            const result = await createBudgetSchema.validate(validData);
            expect(result.name).toBe('Budget 2024');
            expect(result.type).toBe('MIXED'); // default
            expect(result.isOBZ).toBe(false); // default
        });

        it('should reject missing name', async () => {
            await expect(createBudgetSchema.validate({ fiscalYearId: validData.fiscalYearId }))
                .rejects.toThrow('Nome é obrigatório');
        });

        it('should reject missing fiscalYearId', async () => {
            await expect(createBudgetSchema.validate({ name: 'Test' }))
                .rejects.toThrow('Ano fiscal é obrigatório');
        });

        it('should reject invalid fiscalYearId (not UUID)', async () => {
            await expect(createBudgetSchema.validate({ name: 'Test', fiscalYearId: 'not-a-uuid' }))
                .rejects.toThrow('ID do ano fiscal inválido');
        });

        it('should reject invalid type', async () => {
            await expect(createBudgetSchema.validate({ ...validData, type: 'INVALID' }))
                .rejects.toThrow('Tipo inválido');
        });

        it('should accept valid types', async () => {
            for (const type of ['OPEX', 'CAPEX', 'MIXED']) {
                const result = await createBudgetSchema.validate({ ...validData, type });
                expect(result.type).toBe(type);
            }
        });

        it('should trim whitespace from name', async () => {
            const result = await createBudgetSchema.validate({ ...validData, name: '  Budget  ' });
            expect(result.name).toBe('Budget');
        });
    });

    describe('updateBudgetSchema', () => {
        it('should pass with partial data (all optional)', async () => {
            const result = await updateBudgetSchema.validate({ name: 'Updated' });
            expect(result.name).toBe('Updated');
        });

        it('should pass with empty object', async () => {
            const result = await updateBudgetSchema.validate({});
            expect(result).toBeDefined();
        });
    });

    describe('duplicateBudgetSchema', () => {
        it('should require newName', async () => {
            await expect(duplicateBudgetSchema.validate({}))
                .rejects.toThrow('O novo nome é obrigatório');
        });

        it('should pass with valid newName', async () => {
            const result = await duplicateBudgetSchema.validate({ newName: 'Copy of Budget' });
            expect(result.newName).toBe('Copy of Budget');
        });
    });

    describe('addBudgetItemSchema', () => {
        it('should require accountId', async () => {
            await expect(addBudgetItemSchema.validate({}))
                .rejects.toThrow('Conta Contábil é obrigatória');
        });

        it('should default month values to 0', async () => {
            const result = await addBudgetItemSchema.validate({
                accountId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
            });
            expect(result.jan).toBe(0);
            expect(result.feb).toBe(0);
            expect(result.dec).toBe(0);
        });

        it('should accept month values', async () => {
            const result = await addBudgetItemSchema.validate({
                accountId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
                jan: 1000, feb: 2000, mar: 3000
            });
            expect(result.jan).toBe(1000);
            expect(result.feb).toBe(2000);
        });

        it('should reject invalid priority', async () => {
            await expect(addBudgetItemSchema.validate({
                accountId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
                priority: 'INVALID'
            })).rejects.toThrow('Prioridade inválida');
        });

        it('should accept valid priorities', async () => {
            for (const priority of ['ESSENCIAL', 'IMPORTANTE', 'DESEJAVEL', null]) {
                const result = await addBudgetItemSchema.validate({
                    accountId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
                    priority
                });
                expect(result).toBeDefined();
            }
        });
    });
});
