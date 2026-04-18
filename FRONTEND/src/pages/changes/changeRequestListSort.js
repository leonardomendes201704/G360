/** Ordenação da lista de GMUDs (DataListTable). */

const RISK_ORDER = { BAIXO: 1, MEDIO: 2, ALTO: 3, CRITICO: 4 };
const IMPACT_ORDER = { MENOR: 1, SIGNIFICATIVO: 2, MAIOR: 3 };
const TYPE_ORDER = { EMERGENCIAL: 1, NORMAL: 2, PADRAO: 3 };

const STATUS_ORDER = {
  DRAFT: 1,
  REVISION_REQUESTED: 2,
  PENDING_APPROVAL: 3,
  APPROVED: 4,
  APPROVED_WAITING_EXECUTION: 5,
  EXECUTED: 6,
  COMPLETED: 7,
  REJECTED: 8,
  FAILED: 9,
  CANCELLED: 10,
};

/**
 * @param {Array} rows
 * @param {string} orderBy
 * @param {'asc'|'desc'} order
 */
export function sortChangeRequestRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'code':
        cmp = String(a.code || '').localeCompare(String(b.code || ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
        break;
      case 'title':
        cmp = String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'type': {
        const ta = TYPE_ORDER[a.type] ?? 99;
        const tb = TYPE_ORDER[b.type] ?? 99;
        cmp = ta - tb;
        if (cmp === 0) cmp = String(a.type || '').localeCompare(String(b.type || ''), 'pt-BR');
        break;
      }
      case 'riskLevel': {
        const ra = RISK_ORDER[a.riskLevel] ?? 99;
        const rb = RISK_ORDER[b.riskLevel] ?? 99;
        cmp = ra - rb;
        break;
      }
      case 'statusSort': {
        const sa = STATUS_ORDER[a.status] ?? 99;
        const sb = STATUS_ORDER[b.status] ?? 99;
        cmp = sa - sb;
        if (cmp === 0) cmp = String(a.status || '').localeCompare(String(b.status || ''), 'pt-BR');
        break;
      }
      case 'requesterName':
        cmp = String(a.requester?.name || '').localeCompare(String(b.requester?.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'scheduledStart': {
        const ta = a.scheduledStart ? new Date(a.scheduledStart).getTime() : null;
        const tb = b.scheduledStart ? new Date(b.scheduledStart).getTime() : null;
        if (ta == null && tb == null) cmp = 0;
        else if (ta == null) cmp = 1;
        else if (tb == null) cmp = -1;
        else cmp = ta - tb;
        break;
      }
      case 'impactSort': {
        const ia = IMPACT_ORDER[a.impact] ?? 99;
        const ib = IMPACT_ORDER[b.impact] ?? 99;
        cmp = ia - ib;
        break;
      }
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
