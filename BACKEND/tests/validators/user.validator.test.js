const { createUserSchema, updateUserSchema, importAzureUsersSchema } = require('../../src/validators/user.validator');

const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const validData = {
    name: 'John Doe',
    email: 'john@company.com',
    password: 'secure123',
};

describe('User Validators', () => {
    describe('createUserSchema', () => {
        it('should pass with valid data', async () => {
            const result = await createUserSchema.validate(validData);
            expect(result.name).toBe('John Doe');
            expect(result.email).toBe('john@company.com');
        });

        it('should reject missing name', async () => {
            await expect(createUserSchema.validate({ ...validData, name: undefined }))
                .rejects.toThrow('Nome é obrigatório');
        });

        it('should reject missing email', async () => {
            await expect(createUserSchema.validate({ ...validData, email: undefined }))
                .rejects.toThrow('Email é obrigatório');
        });

        it('should reject invalid email', async () => {
            await expect(createUserSchema.validate({ ...validData, email: 'not-email' }))
                .rejects.toThrow('Email inválido');
        });

        it('should reject missing password', async () => {
            await expect(createUserSchema.validate({ ...validData, password: undefined }))
                .rejects.toThrow('Senha é obrigatória');
        });

        it('should reject short password', async () => {
            await expect(createUserSchema.validate({ ...validData, password: '12345' }))
                .rejects.toThrow('Senha deve ter no mínimo 6 caracteres');
        });

        it('should transform empty departmentId to null', async () => {
            const result = await createUserSchema.validate({ ...validData, departmentId: '' });
            expect(result.departmentId).toBeNull();
        });

        it('should reject invalid departmentId', async () => {
            await expect(createUserSchema.validate({ ...validData, departmentId: 'not-uuid' }))
                .rejects.toThrow('ID do departamento inválido');
        });

        it('should accept valid roleIds array', async () => {
            const result = await createUserSchema.validate({ ...validData, roleIds: [uuid] });
            expect(result.roleIds).toHaveLength(1);
        });

        it('should reject invalid UUID in roleIds', async () => {
            await expect(createUserSchema.validate({ ...validData, roleIds: ['not-uuid'] }))
                .rejects.toThrow('ID de perfil inválido');
        });
    });

    describe('updateUserSchema', () => {
        it('should pass with partial data', async () => {
            const result = await updateUserSchema.validate({ name: 'Jane' });
            expect(result.name).toBe('Jane');
        });

        it('should still reject invalid email', async () => {
            await expect(updateUserSchema.validate({ email: 'bad' }))
                .rejects.toThrow('Email inválido');
        });

        it('should still reject short password', async () => {
            await expect(updateUserSchema.validate({ password: '123' }))
                .rejects.toThrow('Senha deve ter no mínimo 6 caracteres');
        });
    });

    describe('importAzureUsersSchema', () => {
        it('should pass with valid users array', async () => {
            const result = await importAzureUsersSchema.validate({
                users: [{ name: 'Azure User', email: 'azure@ms.com' }]
            });
            expect(result.users).toHaveLength(1);
        });

        it('should reject empty users array', async () => {
            await expect(importAzureUsersSchema.validate({ users: [] }))
                .rejects.toThrow('Lista de usuários não pode ser vazia');
        });

        it('should reject missing users', async () => {
            await expect(importAzureUsersSchema.validate({}))
                .rejects.toThrow('Lista de usuários é obrigatória');
        });

        it('should reject user without name', async () => {
            await expect(importAzureUsersSchema.validate({
                users: [{ email: 'test@ms.com' }]
            })).rejects.toThrow('Nome é obrigatório');
        });

        it('should reject user with invalid email', async () => {
            await expect(importAzureUsersSchema.validate({
                users: [{ name: 'Test', email: 'bad' }]
            })).rejects.toThrow('Email inválido');
        });
    });
});
