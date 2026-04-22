import { format, isToday, isYesterday, isTomorrow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Converte valor da API (tarefas, etc.) em `Date` no **calendário local**:
 * - `YYYY-MM-DD` sem hora → meio-dia local nesse dia (evita TAR-04: UTC midnight virar dia anterior no Brasil).
 * - ISO com hora / `Date` → parsing nativo.
 * @param {string|Date|number|null|undefined} input
 * @returns {Date|null}
 */
export function parseLocalCalendarDateInput(input) {
    if (input == null || input === '') return null;
    if (input instanceof Date) {
        return Number.isNaN(input.getTime()) ? null : input;
    }
    const s = String(input).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        const local = new Date(y, m - 1, d, 12, 0, 0, 0);
        return Number.isNaN(local.getTime()) ? null : local;
    }
    const t = new Date(s);
    return Number.isNaN(t.getTime()) ? null : t;
}

/**
 * Returns a human-friendly relative string.
 * Examples: "agora", "há 3 minutos", "há 2 horas", "ontem", "há 5 dias", "15/02/2026"
 */
export const formatRelative = (dateInput) => {
    if (!dateInput) return '—';
    const date = new Date(dateInput);
    if (isNaN(date)) return '—';

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24 && isToday(date)) return `há ${diffHours}h`;
    if (isYesterday(date)) return 'ontem';

    const diffDaysVal = Math.abs(differenceInDays(now, date));
    if (diffDaysVal < 7) return `há ${diffDaysVal} dias`;

    return format(date, 'dd/MM/yyyy', { locale: ptBR });
};

/**
 * Returns relative string for FUTURE dates (deadlines, due dates).
 * Examples: "hoje", "amanhã", "em 3 dias", "em 2 semanas", "15/02/2025 (vencido)"
 */
export const formatDueDate = (dateInput) => {
    if (!dateInput) return '—';
    const date = dateInput instanceof Date ? dateInput : parseLocalCalendarDateInput(dateInput);
    if (!date || Number.isNaN(date.getTime())) return '—';

    const now = new Date();
    const diff = differenceInDays(date, now);

    if (isToday(date)) return { label: 'hoje', color: '#f59e0b' };
    if (isTomorrow(date)) return { label: 'amanhã', color: '#f59e0b' };
    if (diff > 0 && diff <= 3) return { label: `em ${diff} dias`, color: '#f97316' };
    if (diff > 3 && diff <= 14) return { label: `em ${diff} dias`, color: '#10b981' };
    if (diff > 14) return { label: format(date, 'dd/MM/yyyy', { locale: ptBR }), color: '#64748b' };

    // Overdue
    const overdueDays = Math.abs(diff);
    if (overdueDays === 1) return { label: 'vencido ontem', color: '#ef4444' };
    return { label: `vencido há ${overdueDays}d`, color: '#ef4444' };
};

/**
 * Returns relative string with full date as tooltip hint.
 * e.g. "há 2 dias" (title="15/02/2026 14:30")
 */
export const formatRelativeWithTooltip = (dateInput) => {
    if (!dateInput) return { label: '—', title: '' };
    const date = new Date(dateInput);
    if (isNaN(date)) return { label: '—', title: '' };
    return {
        label: formatRelative(dateInput),
        title: format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
    };
};

/**
 * Full date-time format pt-BR
 */
export const formatDateTime = (dateInput) => {
    if (!dateInput) return '—';
    const date = new Date(dateInput);
    if (isNaN(date)) return '—';
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

/**
 * Short date format pt-BR
 */
export const formatDate = (dateInput) => {
    if (!dateInput) return '—';
    const date = dateInput instanceof Date ? dateInput : parseLocalCalendarDateInput(dateInput);
    if (!date || Number.isNaN(date.getTime())) return '—';
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
};
