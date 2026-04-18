/** Ordenação da lista de ativos (hardware) — `DataListTable`. */

const STATUS_ORDER = {
  PROPRIO: 1, ATIVO: 1, LOCADO: 2, MANUTENCAO: 3, DESATIVADO: 4, INATIVO: 4,
};

/**
 * @param {Array} rows
 * @param {string} orderBy
 * @param {'asc'|'desc'} order
 */
export function sortAssetRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'code':
        cmp = String(a.code || '').localeCompare(String(b.code || ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
        break;
      case 'assetName':
        cmp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'categoryName':
        cmp = String(a.category?.name || '').localeCompare(String(b.category?.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'status': {
        const sa = STATUS_ORDER[a.status] ?? 99;
        const sb = STATUS_ORDER[b.status] ?? 99;
        cmp = sa - sb;
        if (cmp === 0) cmp = String(a.status || '').localeCompare(String(b.status || ''), 'pt-BR');
        break;
      }
      case 'location':
        cmp = String(a.location || '').localeCompare(String(b.location || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'acquisitionValue': {
        const va = Number(a.acquisitionValue) || 0;
        const vb = Number(b.acquisitionValue) || 0;
        cmp = va - vb;
        break;
      }
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
