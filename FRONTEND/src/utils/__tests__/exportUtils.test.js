import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToCSV, exportToExcel, EXPORT_COLUMNS } from '../../utils/exportUtils';

describe('exportUtils', () => {

    afterEach(() => { vi.restoreAllMocks(); });

    beforeEach(() => {
        // Mock DOM methods
        vi.spyOn(document, 'createElement').mockReturnValue({
            setAttribute: vi.fn(),
            click: vi.fn(),
            style: {},
        });
        vi.spyOn(document.body, 'appendChild').mockImplementation(() => { });
        vi.spyOn(document.body, 'removeChild').mockImplementation(() => { });
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => { });
    });

    const columns = [
        { key: 'name', label: 'Nome' },
        { key: 'status', label: 'Status' },
    ];

    const data = [
        { name: 'Project A', status: 'ACTIVE' },
        { name: 'Project B', status: 'COMPLETED' },
    ];

    describe('exportToCSV', () => {
        it('does nothing for empty data', () => {
            exportToCSV([], columns, 'test');
            expect(document.createElement).not.toHaveBeenCalled();
        });

        it('does nothing for null data', () => {
            exportToCSV(null, columns, 'test');
            expect(document.createElement).not.toHaveBeenCalled();
        });

        it('creates and clicks download link for valid data', () => {
            exportToCSV(data, columns, 'test');
            expect(document.createElement).toHaveBeenCalledWith('a');
            expect(URL.createObjectURL).toHaveBeenCalled();
        });
    });

    describe('exportToExcel', () => {
        it('does nothing for empty data', () => {
            exportToExcel([], columns, 'test');
            expect(document.createElement).not.toHaveBeenCalled();
        });

        it('creates download for valid data', () => {
            exportToExcel(data, columns, 'test');
            expect(document.createElement).toHaveBeenCalledWith('a');
        });
    });

    describe('EXPORT_COLUMNS', () => {
        it('has column definitions for all modules', () => {
            expect(EXPORT_COLUMNS.projects).toBeDefined();
            expect(EXPORT_COLUMNS.incidents).toBeDefined();
            expect(EXPORT_COLUMNS.changes).toBeDefined();
            expect(EXPORT_COLUMNS.risks).toBeDefined();
            expect(EXPORT_COLUMNS.contracts).toBeDefined();
            expect(EXPORT_COLUMNS.suppliers).toBeDefined();
            expect(EXPORT_COLUMNS.assets).toBeDefined();
        });

        it('projects has expected keys', () => {
            const keys = EXPORT_COLUMNS.projects.map(c => c.key);
            expect(keys).toContain('code');
            expect(keys).toContain('name');
            expect(keys).toContain('status');
        });
    });
});
