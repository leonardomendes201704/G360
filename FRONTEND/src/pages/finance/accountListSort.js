/** Ordenação — plano de contas (DataListTable). */
export function sortAccountRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'code':
        cmp = String(a.code || '').localeCompare(String(b.code || ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
        break;
      case 'name':
        cmp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'type':
        cmp = String(a.type || '').localeCompare(String(b.type || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'hierarchy': {
        const sa = a.parent ? `Sub de: ${a.parent.name || ''}` : 'Raiz';
        const sb = b.parent ? `Sub de: ${b.parent.name || ''}` : 'Raiz';
        cmp = sa.localeCompare(sb, 'pt-BR', { sensitivity: 'base' });
        break;
      }
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
