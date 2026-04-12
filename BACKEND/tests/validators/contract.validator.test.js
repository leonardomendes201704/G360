const { createContractSchema, updateContractSchema } = require('../../src/validators/contract.validator');

const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const validData = {
    supplierId: uuid,
    number: 'CTR-001',
    description: 'Annual IT services',
    type: 'Serviço',
    value: 120000,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
};

describe('Contract Validators', () => {
    describe('createContractSchema', () => {
        it('should pass with valid data', async () => {
            const result = await createContractSchema.validate(validData);
            expect(result.number).toBe('CTR-001');
            expect(result.alertDays).toBe(30); // default
            expect(result.autoRenew).toBe(false); // default
        });

        it('should reject missing supplierId', async () => {
            await expect(createContractSchema.validate({ ...validData, supplierId: undefined }))
                .rejects.toThrow('Fornecedor é obrigatório');
        });

        it('should reject missing number', async () => {
            await expect(createContractSchema.validate({ ...validData, number: undefined }))
                .rejects.toThrow('Número do contrato é obrigatório');
        });

        it('should reject missing description', async () => {
            await expect(createContractSchema.validate({ ...validData, description: undefined }))
                .rejects.toThrow('Descrição é obrigatória');
        });

        it('should reject missing type', async () => {
            await expect(createContractSchema.validate({ ...validData, type: undefined }))
                .rejects.toThrow('Tipo é obrigatório');
        });

        it('should reject missing startDate', async () => {
            await expect(createContractSchema.validate({ ...validData, startDate: undefined }))
                .rejects.toThrow('Data de início é obrigatória');
        });

        it('should reject missing endDate', async () => {
            await expect(createContractSchema.validate({ ...validData, endDate: undefined }))
                .rejects.toThrow('Data de fim é obrigatória');
        });

        it('should require value when monthlyValue is zero', async () => {
            await expect(createContractSchema.validate({ ...validData, value: undefined, monthlyValue: 0 }))
                .rejects.toThrow('Valor Total é obrigatório');
        });

        it('should allow null value when monthlyValue is set', async () => {
            const result = await createContractSchema.validate({ ...validData, value: null, monthlyValue: 10000 });
            expect(result.monthlyValue).toBe(10000);
        });
    });

    describe('updateContractSchema', () => {
        it('should pass with partial data', async () => {
            const result = await updateContractSchema.validate({ description: 'Updated', monthlyValue: 5000 });
            expect(result.description).toBe('Updated');
        });
    });
});
