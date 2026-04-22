function expensePlanScopeSortKey(row) {
  if (row.entityType !== 'EXPENSE') return '';
  const v = row.expensePlanScope;
  if (v == null || v === '' || v === 'ALL') return '0';
  if (v === 'PLANNED') return '1';
  if (v === 'UNPLANNED') return '2';
  return String(v);
}

/** Ordenação — alçadas de aprovação (aba Organização, `DataListTable`). */
export function sortApprovalTierRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'name':
        cmp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'entityType':
        cmp = String(a.entityType || '').localeCompare(String(b.entityType || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'role':
        cmp = String(a.role?.name || '').localeCompare(String(b.role?.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'range':
        cmp = (Number(a.minAmount) || 0) - (Number(b.minAmount) || 0);
        if (cmp === 0) cmp = (Number(a.maxAmount) || 0) - (Number(b.maxAmount) || 0);
        break;
      case 'expensePlanScope':
        cmp = String(expensePlanScopeSortKey(a)).localeCompare(String(expensePlanScopeSortKey(b)), 'pt-BR', {
          sensitivity: 'base',
        });
        break;
      case 'globalScope':
        cmp = a.globalScope === b.globalScope ? 0 : a.globalScope ? 1 : -1;
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
