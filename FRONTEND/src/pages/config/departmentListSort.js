/** Ordenação — diretorias / departamentos (aba Organização, `DataListTable`). */
export function sortDepartmentRows(rows, orderBy, order) {
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
      case 'director':
        cmp = String(a.director?.name || '').localeCompare(String(b.director?.name || ''), 'pt-BR', {
          sensitivity: 'base',
        });
        break;
      case 'costCenters':
        cmp = (a._count?.costCenters ?? 0) - (b._count?.costCenters ?? 0);
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
