/** Ordenação — centros de custo (aba Organização, `DataListTable`). */
export function sortCostCenterRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'code':
        cmp = String(a.code || '').localeCompare(String(b.code || ''), 'pt-BR', {
          numeric: true,
          sensitivity: 'base',
        });
        break;
      case 'name':
        cmp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'department':
        cmp = String(a.department?.name || '').localeCompare(String(b.department?.name || ''), 'pt-BR', {
          sensitivity: 'base',
        });
        break;
      case 'manager':
        cmp = String(a.manager?.name || '').localeCompare(String(b.manager?.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'annualBudget':
        cmp = (Number(a.annualBudget) || 0) - (Number(b.annualBudget) || 0);
        break;
      case 'isActive':
        cmp = a.isActive === b.isActive ? 0 : a.isActive ? 1 : -1;
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
