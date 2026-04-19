/**
 * Estados de workflow dos chamados (helpdesk / portal).
 * Valores alinhados ao backend (`Ticket` / `TicketController.updateStatus`).
 */
export const TicketStatus = Object.freeze({
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_USER: 'WAITING_USER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
});

/** Cores MUI para `<Chip color={...} />` */
export const TICKET_STATUS_CHIP_COLOR = Object.freeze({
  [TicketStatus.OPEN]: 'info',
  [TicketStatus.IN_PROGRESS]: 'warning',
  [TicketStatus.WAITING_USER]: 'secondary',
  [TicketStatus.RESOLVED]: 'success',
  [TicketStatus.CLOSED]: 'default',
});

export const TICKET_STATUS_LABEL_PT = Object.freeze({
  [TicketStatus.OPEN]: 'Aberto',
  [TicketStatus.IN_PROGRESS]: 'Em andamento',
  [TicketStatus.WAITING_USER]: 'Aguardando usuário',
  [TicketStatus.RESOLVED]: 'Resolvido',
  [TicketStatus.CLOSED]: 'Encerrado',
});

/** Ordem lógica dos estados (para ordenação na lista). */
export const TICKET_STATUS_SORT_ORDER = Object.freeze([
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_USER,
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
]);

export function getTicketStatusSortIndex(status) {
  const i = TICKET_STATUS_SORT_ORDER.indexOf(status);
  return i === -1 ? 999 : i;
}

/**
 * Cor do tema equivalente ao `<Chip color={TICKET_STATUS_CHIP_COLOR[status]} />` (KPIs / barras coloridas).
 * @param {import('@mui/material/styles').Theme} theme
 * @param {string} status
 */
export function getTicketStatusThemeColor(theme, status) {
  const chip = TICKET_STATUS_CHIP_COLOR[status] ?? 'default';
  if (chip === 'default') {
    return theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.grey[700];
  }
  const key = chip;
  const palette = theme.palette[key];
  return palette?.main ?? theme.palette.grey[500];
}

/**
 * Rótulo em PT-BR para exibição (lista, chips). Valores desconhecidos retornam o código bruto.
 * @param {string | null | undefined} status
 */
export function getTicketStatusLabel(status) {
  if (status == null || status === '') return '';
  return TICKET_STATUS_LABEL_PT[status] ?? status;
}

/**
 * Remove sufixo legado de seeds do tipo ` — OPEN` … ` — CLOSED` no título (lista do portal).
 * @param {string | null | undefined} title
 */
export function stripTicketTitleStatusSuffix(title) {
  if (title == null || typeof title !== 'string') return '';
  return title
    .replace(/\s+—\s+(OPEN|IN_PROGRESS|WAITING_USER|RESOLVED|CLOSED)$/i, '')
    .trim();
}

/**
 * Divide título do tipo «Serviço — requisição N» (travessão em U+2014) para duas linhas na grelha.
 * @param {string | null | undefined} title
 * @returns {{ main: string, rest: string }}
 */
export function splitTicketTitleEmDash(title) {
  if (title == null || typeof title !== 'string') return { main: '', rest: '' };
  const s = title.trim();
  if (!s) return { main: '', rest: '' };
  const idx = s.indexOf('—');
  if (idx === -1) return { main: s, rest: '' };
  const main = s.slice(0, idx).trim();
  const rest = s.slice(idx + 1).trim();
  return { main, rest };
}

/**
 * Texto da coluna «Título» no portal: evita repetir o nome do serviço quando o título segue o padrão
 * «Nome do serviço — …» (o serviço já aparece na coluna Serviço). Caso contrário mantém o título completo
 * (após {@link stripTicketTitleStatusSuffix}).
 * @param {{ title?: string | null, service?: { name?: string | null } | null }} ticket
 */
export function getPortalTicketTitleColumnText(ticket) {
  const stripped = stripTicketTitleStatusSuffix(ticket?.title ?? '');
  if (!stripped) return '';
  const { main, rest } = splitTicketTitleEmDash(stripped);
  const svc = (ticket?.service?.name || '').trim();
  if (rest && svc && main.localeCompare(svc, 'pt-BR', { sensitivity: 'accent' }) === 0) {
    return rest;
  }
  return stripped;
}
