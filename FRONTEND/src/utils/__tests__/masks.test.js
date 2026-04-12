import { describe, it, expect } from 'vitest';
import { maskCPF, maskCNPJ, maskPhone, unmask, formatDocument } from '../../utils/masks';

describe('masks', () => {

    describe('maskCPF', () => {
        it('formats a valid CPF', () => {
            expect(maskCPF('12345678901')).toBe('123.456.789-01');
        });
        it('partially formats incomplete input', () => {
            expect(maskCPF('1234')).toBe('123.4');
        });
        it('returns empty for null/undefined', () => {
            expect(maskCPF(null)).toBe('');
            expect(maskCPF(undefined)).toBe('');
        });
        it('strips non-digits', () => {
            expect(maskCPF('123.456.789-01')).toBe('123.456.789-01');
        });
    });

    describe('maskCNPJ', () => {
        it('formats a valid CNPJ', () => {
            expect(maskCNPJ('12345678000199')).toBe('12.345.678/0001-99');
        });
        it('returns empty for falsy', () => {
            expect(maskCNPJ('')).toBe('');
        });
    });

    describe('maskPhone', () => {
        it('formats a mobile phone', () => {
            expect(maskPhone('11999887766')).toBe('(11) 99988-7766');
        });
        it('returns empty for falsy', () => {
            expect(maskPhone(null)).toBe('');
        });
    });

    describe('unmask', () => {
        it('removes all non-digit chars', () => {
            expect(unmask('123.456.789-01')).toBe('12345678901');
        });
        it('returns empty for falsy', () => {
            expect(unmask('')).toBe('');
        });
    });

    describe('formatDocument', () => {
        it('formats as CPF when type is CPF', () => {
            expect(formatDocument('12345678901', 'CPF')).toBe('123.456.789-01');
        });
        it('formats as CNPJ for 14-digit values', () => {
            expect(formatDocument('12345678000199')).toBe('12.345.678/0001-99');
        });
        it('auto-detects CPF by length', () => {
            expect(formatDocument('12345678901')).toBe('123.456.789-01');
        });
        it('returns dash for falsy', () => {
            expect(formatDocument(null)).toBe('-');
        });
    });
});
