/** Ordenação — membros CAB (aba Organização, `DataListTable`). */
export function sortCabMemberRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'name':
        cmp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'roleName':
        cmp = String(a.roles?.find((r) => r.name !== 'CAB Member')?.name || 'Membro').localeCompare(
          String(b.roles?.find((r) => r.name !== 'CAB Member')?.name || 'Membro'),
          'pt-BR',
          { sensitivity: 'base' }
        );
        break;
      case 'department':
        cmp = String(a.department?.name || '').localeCompare(String(b.department?.name || ''), 'pt-BR', {
          sensitivity: 'base',
        });
        break;
      case 'email':
        cmp = String(a.email || '').localeCompare(String(b.email || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
