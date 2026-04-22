import { describe, it, expect, vi, afterEach } from 'vitest';

describe('getFileURL (DES-01 — origem alinhada à API)', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it('com VITE_API_URL remove /api/v1 e junta o path de uploads', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8500/api/v1');
        vi.resetModules();
        const { getFileURL } = await import('../urlUtils.js');
        expect(getFileURL('/uploads/expenses/doc.pdf')).toBe('http://localhost:8500/uploads/expenses/doc.pdf');
    });

    it('com VITE_API_URL sem versão remove /api', async () => {
        vi.stubEnv('VITE_API_URL', 'https://api.exemplo.com/api');
        vi.resetModules();
        const { getFileURL } = await import('../urlUtils.js');
        expect(getFileURL('uploads/x.png')).toBe('https://api.exemplo.com/uploads/x.png');
    });

    it('sem VITE_API_URL usa hostname e porta 8500', async () => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('window', {
            ...window,
            location: { hostname: '10.0.0.5', protocol: 'http:' },
        });
        vi.resetModules();
        const { getFileURL } = await import('../urlUtils.js');
        expect(getFileURL('/uploads/a.pdf')).toBe('http://10.0.0.5:8500/uploads/a.pdf');
    });

    it('URL absoluta devolve sem alterar', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8500/api/v1');
        vi.resetModules();
        const { getFileURL } = await import('../urlUtils.js');
        expect(getFileURL('https://cdn.example.com/f.pdf')).toBe('https://cdn.example.com/f.pdf');
    });

    it('path vazio devolve string vazia', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8500/api/v1');
        vi.resetModules();
        const { getFileURL } = await import('../urlUtils.js');
        expect(getFileURL('')).toBe('');
        expect(getFileURL(null)).toBe('');
    });
});
