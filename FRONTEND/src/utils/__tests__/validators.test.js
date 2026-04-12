import { describe, it, expect } from 'vitest';
import { validatecpf, validatecnpj } from '../../utils/validators';

describe('validators', () => {

    describe('validatecpf', () => {
        it('returns true for valid CPF', () => {
            expect(validatecpf('529.982.247-25')).toBe(true);
        });
        it('returns false for all-same-digit CPF', () => {
            expect(validatecpf('111.111.111-11')).toBe(false);
        });
        it('returns false for wrong length', () => {
            expect(validatecpf('123')).toBe(false);
        });
        it('returns false for invalid check digits', () => {
            expect(validatecpf('529.982.247-99')).toBe(false);
        });
        it('handles unmasked input', () => {
            expect(validatecpf('52998224725')).toBe(true);
        });
    });

    describe('validatecnpj', () => {
        it('returns true for valid CNPJ', () => {
            expect(validatecnpj('11.222.333/0001-81')).toBe(true);
        });
        it('returns false for all-same-digit CNPJ', () => {
            expect(validatecnpj('11.111.111/1111-11')).toBe(false);
        });
        it('returns false for wrong length', () => {
            expect(validatecnpj('123')).toBe(false);
        });
        it('returns false for invalid check digits', () => {
            expect(validatecnpj('11.222.333/0001-99')).toBe(false);
        });
    });
});
