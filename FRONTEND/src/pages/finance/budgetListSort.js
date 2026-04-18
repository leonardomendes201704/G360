/** Ordenação — lista de orçamentos (DataListTable). */
export function sortBudgetRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'name':
        cmp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'fiscalYear':
        cmp = (a.fiscalYear?.year || 0) - (b.fiscalYear?.year || 0);
        break;
      case 'status':
        cmp = String(a.status || '').localeCompare(String(b.status || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'totalOpex':
        cmp = Number(a.totalOpex) - Number(b.totalOpex);
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
