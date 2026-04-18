/** Ordenação da lista de problemas (DataListTable). */

const STATUS_ORDER = {
  INVESTIGATING: 1,
  IDENTIFIED: 2,
  WORKAROUND: 3,
  RESOLVED: 4,
  CLOSED: 5,
};

/**
 * @param {Array} rows
 * @param {string} orderBy — id da coluna
 * @param {'asc'|'desc'} order
 */
export function sortProblemsRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'code':
        cmp = String(a.code || '').localeCompare(String(b.code || ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
        break;
      case 'titleAndCause':
        cmp = String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'incidentCount': {
        const na = a.incidents?.length ?? 0;
        const nb = b.incidents?.length ?? 0;
        cmp = na - nb;
        break;
      }
      case 'status': {
        const sa = STATUS_ORDER[a.status] ?? 99;
        const sb = STATUS_ORDER[b.status] ?? 99;
        cmp = sa - sb;
        if (cmp === 0) cmp = String(a.status || '').localeCompare(String(b.status || ''), 'pt-BR');
        break;
      }
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
