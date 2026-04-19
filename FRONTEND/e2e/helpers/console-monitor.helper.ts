/**
 * Monitor de consola do browser para E2E (Playwright).
 *
 * Por defeito falham apenas:
 * - mensagens com tipo `error` na API Console do browser (não confundir com HTTP 4xx/5xx);
 * - exceções não tratadas (`pageerror`).
 *
 * Allowlist (regex): ruído conhecido em desenvolvimento (ex.: sugestão React DevTools).
 * Rever periodicamente — não mascarar erros reais.
 */
import type { Page, ConsoleMessage } from '@playwright/test';

export type ConsoleViolation = {
    kind: 'console' | 'pageerror';
    /** tipo Playwright: log | info | warning | error */
    consoleType?: string;
    text: string;
    stack?: string;
};

/** Mensagens de `console.error` que podem ser ignoradas (falsos positivos raros). */
const DEFAULT_ALLOW_ERROR_PATTERNS: RegExp[] = [
    /Download the React DevTools/i,
    // Chromium sem sockets/ligações ao fazer muitos `goto` seguidos num único teste (tour E2E) — não é bug da app.
    /Failed to load resource: net::ERR_INSUFFICIENT_RESOURCES/i,
];

export type AttachConsoleMonitorOptions = {
    /** Regex extra a aplicar a mensagens de tipo `error` (além das predefinidas). */
    allowErrorPatterns?: RegExp[];
};

export type ConsoleMonitorHandle = {
    getViolations: () => ConsoleViolation[];
    clear: () => void;
    dispose: () => void;
};

function isAllowedErrorText(text: string, extra: RegExp[]): boolean {
    const all = [...DEFAULT_ALLOW_ERROR_PATTERNS, ...extra];
    return all.some((re) => re.test(text));
}

/**
 * Instala listeners na `page`. Chamar `dispose()` no fim do teste (ou `test.afterEach`).
 * Recomendado: instalar **após** login se quiser ignorar ruído da página de login.
 */
export function attachConsoleMonitor(
    page: Page,
    options: AttachConsoleMonitorOptions = {}
): ConsoleMonitorHandle {
    const violations: ConsoleViolation[] = [];
    const extraAllow = options.allowErrorPatterns ?? [];

    const onConsole = (msg: ConsoleMessage) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (isAllowedErrorText(text, extraAllow)) return;
        violations.push({ kind: 'console', consoleType: msg.type(), text });
    };

    const onPageError = (err: Error) => {
        violations.push({
            kind: 'pageerror',
            text: err.message,
            stack: err.stack,
        });
    };

    page.on('console', onConsole);
    page.on('pageerror', onPageError);

    return {
        getViolations: () => [...violations],
        clear: () => {
            violations.length = 0;
        },
        dispose: () => {
            page.off('console', onConsole);
            page.off('pageerror', onPageError);
        },
    };
}

/** Formata violações para mensagem de assert ou log. */
export function formatViolations(v: ConsoleViolation[]): string {
    return v
        .map(
            (x, i) =>
                `${i + 1}. [${x.kind}]${x.consoleType ? ` (${x.consoleType})` : ''} ${x.text}${x.stack ? `\n${x.stack}` : ''}`
        )
        .join('\n---\n');
}
