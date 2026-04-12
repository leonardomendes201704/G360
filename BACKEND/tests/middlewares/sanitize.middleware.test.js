// Mock isomorphic-dompurify to avoid jsdom dependency in test environment
jest.mock('isomorphic-dompurify', () => ({
    sanitize: (input, opts) => {
        if (!input || typeof input !== 'string') return input || '';
        const tags = (opts && opts.ALLOWED_TAGS) || [];
        if (tags.length === 0) {
            // Strip ALL HTML tags
            return input.replace(/<[^>]*>/g, '').trim();
        }
        // For rich text: strip only disallowed tags (simplified: strip script/iframe)
        return input.replace(/<\/?(?:script|iframe|object|embed)[^>]*>/gi, '').trim();
    }
}));

const { sanitize, sanitizeRichText } = require('../../src/middlewares/sanitize.middleware');

describe('sanitize middleware', () => {
    let req, res, next;
    beforeEach(() => {
        req = { body: {} };
        res = {};
        next = jest.fn();
    });

    it('strips all HTML from body strings', () => {
        req.body = { name: '<script>alert("xss")</script>John', email: 'user@test.com' };
        sanitize()(req, res, next);
        expect(req.body.name).not.toContain('<script>');
        expect(req.body.email).toBe('user@test.com');
        expect(next).toHaveBeenCalled();
    });

    it('handles nested objects', () => {
        req.body = { data: { name: '<b>Bold</b> text' } };
        sanitize()(req, res, next);
        expect(req.body.data.name).not.toContain('<b>');
    });

    it('handles arrays', () => {
        req.body = { tags: ['<img src=x onerror=alert(1)>', 'safe'] };
        sanitize()(req, res, next);
        expect(req.body.tags[0]).not.toContain('<img');
        expect(req.body.tags[1]).toBe('safe');
    });

    it('preserves non-string values', () => {
        req.body = { count: 42, active: true, date: new Date('2025-01-01') };
        sanitize()(req, res, next);
        expect(req.body.count).toBe(42);
        expect(req.body.active).toBe(true);
    });

    it('calls next even with empty body', () => {
        req.body = null;
        sanitize()(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});

describe('sanitizeRichText middleware', () => {
    let req, res, next;
    beforeEach(() => {
        req = { body: {} };
        res = {};
        next = jest.fn();
    });

    it('preserves safe HTML in rich text fields but strips from others', () => {
        req.body = { content: '<p>Hello <strong>world</strong></p>', name: '<b>Bold</b>' };
        sanitizeRichText(['content'])(req, res, next);
        // content is rich text — should preserve safe tags
        expect(req.body.content).toContain('<p>');
        // name is NOT rich text — all HTML stripped
        expect(req.body.name).not.toContain('<b>');
    });

    it('strips dangerous tags from rich text fields', () => {
        req.body = { content: '<script>alert("xss")</script><p>Safe</p>' };
        sanitizeRichText(['content'])(req, res, next);
        expect(req.body.content).not.toContain('<script>');
        expect(req.body.content).toContain('<p>Safe</p>');
    });

    it('calls next', () => {
        req.body = { title: 'test' };
        sanitizeRichText([])(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
