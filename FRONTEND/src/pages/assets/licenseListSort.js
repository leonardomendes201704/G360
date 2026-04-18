/** Ordenação da lista de licenças — `DataListTable`. */

const TYPE_ORDER = { PERPETUA: 1, ASSINATURA: 2, ANUAL: 3 };

/**
 * @param {Array} rows
 * @param {string} orderBy
 * @param {'asc'|'desc'} order
 */
export function sortLicenseRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'name':
        cmp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'vendor':
        cmp = String(a.vendor || '').localeCompare(String(b.vendor || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'licenseType': {
        const ta = TYPE_ORDER[a.licenseType] ?? 99;
        const tb = TYPE_ORDER[b.licenseType] ?? 99;
        cmp = ta - tb;
        if (cmp === 0) cmp = String(a.licenseType || '').localeCompare(String(b.licenseType || ''), 'pt-BR');
        break;
      }
      case 'quantity': {
        cmp = (Number(a.quantity) || 0) - (Number(b.quantity) || 0);
        break;
      }
      case 'expirationSort': {
        const da = a.expirationDate ? new Date(a.expirationDate).getTime() : null;
        const db = b.expirationDate ? new Date(b.expirationDate).getTime() : null;
        if (da == null && db == null) cmp = 0;
        else if (da == null) cmp = 1;
        else if (db == null) cmp = -1;
        else cmp = da - db;
        break;
      }
      case 'cost': {
        cmp = (Number(a.cost) || 0) - (Number(b.cost) || 0);
        break;
      }
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
