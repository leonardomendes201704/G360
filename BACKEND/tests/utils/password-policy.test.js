const {
    PASSWORD_POLICY,
    validatePassword,
    getPasswordPolicyDescription
} = require('../../src/utils/password-policy');

describe('Password Policy', () => {
    describe('validatePassword', () => {
        it('should accept valid password', () => {
            const result = validatePassword('Str0ng!Pass');
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject empty password', () => {
            const result = validatePassword('');
            expect(result.valid).toBe(false);
        });

        it('should reject null password', () => {
            const result = validatePassword(null);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Senha é obrigatória');
        });

        it('should reject short password', () => {
            const result = validatePassword('Aa1!');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('mínimo'))).toBe(true);
        });

        it('should reject password without uppercase', () => {
            const result = validatePassword('password1!');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('maiúscula'))).toBe(true);
        });

        it('should reject password without lowercase', () => {
            const result = validatePassword('PASSWORD1!');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('minúscula'))).toBe(true);
        });

        it('should reject password without number', () => {
            const result = validatePassword('Password!');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('número'))).toBe(true);
        });

        it('should reject password without special chars', () => {
            const result = validatePassword('Password1');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('especial'))).toBe(true);
        });

        it('should reject extremely long password', () => {
            const result = validatePassword('A'.repeat(129) + 'a1!');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('máximo'))).toBe(true);
        });

        it('should accept password missing special char if requireSpecialChars is false', () => {
            const originalSpecial = PASSWORD_POLICY.requireSpecialChars;
            PASSWORD_POLICY.requireSpecialChars = false;
            const result = validatePassword('Password123');
            expect(result.valid).toBe(true);
            PASSWORD_POLICY.requireSpecialChars = originalSpecial;
        });
    });

    describe('getPasswordPolicyDescription', () => {
        it('should return array of rules', () => {
            const rules = getPasswordPolicyDescription();
            expect(Array.isArray(rules)).toBe(true);
            expect(rules.length).toBeGreaterThan(0);
            expect(rules.some(r => r.includes('Mínimo'))).toBe(true);
        });

        it('should omit rules in description if requirements are false', () => {
            const originalUpper = PASSWORD_POLICY.requireUppercase;
            const originalLower = PASSWORD_POLICY.requireLowercase;
            const originalNumber = PASSWORD_POLICY.requireNumbers;
            const originalSpecial = PASSWORD_POLICY.requireSpecialChars;
            
            PASSWORD_POLICY.requireUppercase = false;
            PASSWORD_POLICY.requireLowercase = false;
            PASSWORD_POLICY.requireNumbers = false;
            PASSWORD_POLICY.requireSpecialChars = false;

            const rules = getPasswordPolicyDescription();
            expect(rules).toHaveLength(1);
            expect(rules[0]).toContain('Mínimo');

            PASSWORD_POLICY.requireUppercase = originalUpper;
            PASSWORD_POLICY.requireLowercase = originalLower;
            PASSWORD_POLICY.requireNumbers = originalNumber;
            PASSWORD_POLICY.requireSpecialChars = originalSpecial;
        });
    });

    describe('PASSWORD_POLICY', () => {
        it('should export policy constants', () => {
            expect(PASSWORD_POLICY.minLength).toBe(8);
            expect(PASSWORD_POLICY.maxLength).toBe(128);
            expect(PASSWORD_POLICY.requireUppercase).toBe(true);
        });
    });
});
