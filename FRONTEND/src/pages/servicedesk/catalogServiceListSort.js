/** Ordenação — serviços do catálogo ITBM (DataListTable). */
export function sortCatalogServiceRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'name':
        cmp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'category':
        cmp = String(a.category?.name || '').localeCompare(String(b.category?.name || ''), 'pt-BR', {
          sensitivity: 'base',
        });
        break;
      case 'sla':
        cmp = String(a.slaPolicy?.name || '').localeCompare(String(b.slaPolicy?.name || ''), 'pt-BR', {
          sensitivity: 'base',
        });
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
