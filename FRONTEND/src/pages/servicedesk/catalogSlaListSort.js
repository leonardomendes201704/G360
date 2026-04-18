/** Ordenação — políticas SLA do catálogo ITBM (DataListTable). */
export function sortCatalogSlaRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'name':
        cmp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'deadlines':
        cmp = Number(a.resolveMinutes ?? 0) - Number(b.resolveMinutes ?? 0);
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
