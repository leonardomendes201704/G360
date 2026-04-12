import { describe, it, expect } from 'vitest';
import { getStatusConfig, STATUS_CONFIG } from '../../utils/statusUtils';

describe('statusUtils', () => {

    describe('STATUS_CONFIG', () => {
        it('has config for common statuses', () => {
            expect(STATUS_CONFIG['IN_PROGRESS']).toBeDefined();
            expect(STATUS_CONFIG['COMPLETED']).toBeDefined();
            expect(STATUS_CONFIG['DRAFT']).toBeDefined();
            expect(STATUS_CONFIG['APPROVED']).toBeDefined();
        });
    });

    describe('getStatusConfig', () => {
        it('returns config for known status', () => {
            const result = getStatusConfig('COMPLETED');
            expect(result.label).toBe('Concluído');
            expect(result.color).toBe('success');
        });

        it('is case-insensitive', () => {
            const result = getStatusConfig('completed');
            expect(result.label).toBe('Concluído');
        });

        it('returns fallback for unknown status', () => {
            const result = getStatusConfig('UNKNOWN_STATUS');
            expect(result.label).toBe('UNKNOWN_STATUS');
            expect(result.color).toBe('default');
        });

        it('returns dash label for null/undefined', () => {
            expect(getStatusConfig(null).label).toBe('-');
            expect(getStatusConfig(undefined).label).toBe('-');
        });

        it('returns correct GMUD statuses', () => {
            expect(getStatusConfig('PENDING_APPROVAL').label).toBe('Em Aprovação');
            expect(getStatusConfig('EXECUTED').label).toBe('Executada com Sucesso');
            expect(getStatusConfig('FAILED').label).toBe('Falha na Execução');
        });
    });
});
