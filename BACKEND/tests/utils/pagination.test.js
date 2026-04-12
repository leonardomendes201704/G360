const {
    DEFAULT_PAGE,
    DEFAULT_LIMIT,
    MAX_LIMIT,
    parsePagination,
    buildPaginatedResponse
} = require('../../src/utils/pagination');

describe('Pagination Utility', () => {
    describe('parsePagination', () => {
        it('should return defaults when no query', () => {
            const result = parsePagination();
            expect(result.page).toBe(DEFAULT_PAGE);
            expect(result.limit).toBe(DEFAULT_LIMIT);
            expect(result.skip).toBe(0);
        });

        it('should parse valid page and limit', () => {
            const result = parsePagination({ page: '3', limit: '25' });
            expect(result.page).toBe(3);
            expect(result.limit).toBe(25);
            expect(result.skip).toBe(50); // (3-1)*25
        });

        it('should clamp limit to MAX_LIMIT', () => {
            const result = parsePagination({ page: '1', limit: '999' });
            expect(result.limit).toBe(MAX_LIMIT);
        });

        it('should default invalid page', () => {
            const result = parsePagination({ page: 'abc', limit: '10' });
            expect(result.page).toBe(DEFAULT_PAGE);
        });

        it('should default negative page', () => {
            const result = parsePagination({ page: '-5', limit: '10' });
            expect(result.page).toBe(DEFAULT_PAGE);
        });

        it('should default negative limit', () => {
            const result = parsePagination({ page: '1', limit: '-1' });
            expect(result.limit).toBe(DEFAULT_LIMIT);
        });
    });

    describe('buildPaginatedResponse', () => {
        it('should build response with correct meta', () => {
            const data = [{ id: 1 }, { id: 2 }];
            const result = buildPaginatedResponse(data, 50, 1, 20);

            expect(result.data).toEqual(data);
            expect(result.meta.total).toBe(50);
            expect(result.meta.totalPages).toBe(3);
            expect(result.meta.hasNext).toBe(true);
            expect(result.meta.hasPrev).toBe(false);
        });

        it('should indicate hasPrev on page > 1', () => {
            const result = buildPaginatedResponse([], 50, 2, 20);
            expect(result.meta.hasPrev).toBe(true);
        });

        it('should indicate no hasNext on last page', () => {
            const result = buildPaginatedResponse([], 20, 1, 20);
            expect(result.meta.hasNext).toBe(false);
        });
    });

    describe('constants', () => {
        it('should export correct defaults', () => {
            expect(DEFAULT_PAGE).toBe(1);
            expect(DEFAULT_LIMIT).toBe(20);
            expect(MAX_LIMIT).toBe(100);
        });
    });
});
