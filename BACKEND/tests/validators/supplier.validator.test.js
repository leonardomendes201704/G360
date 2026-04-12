const { createSupplierSchema, updateSupplierSchema } = require('../../src/validators/supplier.validator');

const validData = {
    name: 'Tech Solutions LTDA',
    document: '12.345.678/0001-90',
    documentType: 'CNPJ',
};

describe('Supplier Validators', () => {
    describe('createSupplierSchema', () => {
        it('should pass with valid data', async () => {
            const result = await createSupplierSchema.validate(validData);
            expect(result.name).toBe('Tech Solutions LTDA');
            expect(result.classification).toBe('OUTROS'); // default
        });

        it('should reject missing name', async () => {
            await expect(createSupplierSchema.validate({ ...validData, name: undefined }))
                .rejects.toThrow('Razão Social/Nome é obrigatório');
        });

        it('should reject missing document', async () => {
            await expect(createSupplierSchema.validate({ ...validData, document: undefined }))
                .rejects.toThrow('CNPJ/CPF é obrigatório');
        });

        it('should reject missing documentType', async () => {
            await expect(createSupplierSchema.validate({ ...validData, documentType: undefined }))
                .rejects.toThrow('Tipo de documento é obrigatório');
        });

        it('should reject invalid documentType', async () => {
            await expect(createSupplierSchema.validate({ ...validData, documentType: 'RG' }))
                .rejects.toThrow('Tipo de documento inválido');
        });

        it('should accept all valid documentTypes', async () => {
            for (const documentType of ['CNPJ', 'CPF', 'FOREIGN']) {
                const result = await createSupplierSchema.validate({ ...validData, documentType });
                expect(result.documentType).toBe(documentType);
            }
        });

        it('should reject invalid classification', async () => {
            await expect(createSupplierSchema.validate({ ...validData, classification: 'INVALID' }))
                .rejects.toThrow('Classificação inválida');
        });

        it('should accept all valid classifications', async () => {
            for (const classification of ['CRITICO', 'ESTRATEGICO', 'OPERACIONAL', 'OUTROS']) {
                const result = await createSupplierSchema.validate({ ...validData, classification });
                expect(result.classification).toBe(classification);
            }
        });

        it('should reject invalid email', async () => {
            await expect(createSupplierSchema.validate({ ...validData, email: 'not-email' }))
                .rejects.toThrow('Email inválido');
        });
    });

    describe('updateSupplierSchema', () => {
        it('should pass with partial data', async () => {
            const result = await updateSupplierSchema.validate({ tradeName: 'New Trade' });
            expect(result.tradeName).toBe('New Trade');
        });
    });
});
