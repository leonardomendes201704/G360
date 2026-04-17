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
