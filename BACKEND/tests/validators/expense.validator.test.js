const { createExpenseSchema, updateExpenseSchema } = require('../../src/validators/expense.validator');

const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const validData = {
    description: 'Office supplies',
    amount: 500,
    date: '2024-06-15',
    type: 'OPEX',
    costCenterId: uuid,
};

describe('Expense Validators', () => {
    describe('createExpenseSchema', () => {
        it('should pass with valid data', async () => {
            const result = await createExpenseSchema.validate(validData);
            expect(result.description).toBe('Office supplies');
            expect(result.amount).toBe(500);
            expect(result.status).toBe('PREVISTO');
        });

        it('should reject missing description', async () => {
            await expect(createExpenseSchema.validate({ ...validData, description: undefined }))
                .rejects.toThrow('Descrição é obrigatória');
        });

        it('should reject missing amount', async () => {
            await expect(createExpenseSchema.validate({ ...validData, amount: undefined }))
                .rejects.toThrow('Valor é obrigatório');
        });

        it('should reject negative amount', async () => {
            await expect(createExpenseSchema.validate({ ...validData, amount: -100 }))
                .rejects.toThrow('Valor deve ser positivo');
        });

        it('should reject zero amount', async () => {
            await expect(createExpenseSchema.validate({ ...validData, amount: 0 }))
                .rejects.toThrow('Valor deve ser positivo');
        });

        it('should reject missing date', async () => {
            await expect(createExpenseSchema.validate({ ...validData, date: undefined }))
                .rejects.toThrow('Data de competência é obrigatória');
        });

        it('should reject invalid date', async () => {
            await expect(createExpenseSchema.validate({ ...validData, date: 'not-a-date' }))
                .rejects.toThrow('Data inválida');
        });

        it('should reject invalid type', async () => {
            await expect(createExpenseSchema.validate({ ...validData, type: 'INVALID' }))
                .rejects.toThrow('Tipo inválido');
        });

        it('should accept all valid types', async () => {
            for (const type of ['OPEX', 'CAPEX', 'SERVICO', 'MATERIAL', 'EQUIPAMENTO', 'MAO_OBRA']) {
                const result = await createExpenseSchema.validate({ ...validData, type });
                expect(result.type).toBe(type);
            }
        });

        it('should reject missing costCenterId', async () => {
            await expect(createExpenseSchema.validate({ ...validData, costCenterId: undefined }))
                .rejects.toThrow('Centro de Custo é obrigatório');
        });

        it('should transform empty string to null for nullable fields', async () => {
            const result = await createExpenseSchema.validate({ ...validData, accountId: '' });
            expect(result.accountId).toBeNull();
        });

        it('should reject invalid status on create', async () => {
            await expect(createExpenseSchema.validate({ ...validData, status: 'APROVADO' }))
                .rejects.toThrow('Status inválido na criação');
        });

        it('should reject invalid approvalStatus', async () => {
            await expect(createExpenseSchema.validate({ ...validData, approvalStatus: 'OTHER' }))
                .rejects.toThrow('Âmbito da despesa inválido');
        });

        it('should accept UNPLANNED approvalStatus', async () => {
            const result = await createExpenseSchema.validate({ ...validData, approvalStatus: 'UNPLANNED' });
            expect(result.approvalStatus).toBe('UNPLANNED');
        });
    });

    describe('updateExpenseSchema', () => {
        it('should pass with partial data', async () => {
            const result = await updateExpenseSchema.validate({ description: 'Updated' });
            expect(result.description).toBe('Updated');
        });

        it('should still reject negative amount', async () => {
            await expect(updateExpenseSchema.validate({ amount: -50 }))
                .rejects.toThrow('Valor deve ser positivo');
        });
    });
});
