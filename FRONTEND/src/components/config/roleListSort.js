/** Ordenação — perfis de acesso (aba Organização, `DataListTable`). */
export function sortRoleRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'name':
        cmp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'description':
        cmp = String(a.description || '').localeCompare(String(b.description || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'permissions':
        cmp = (a.permissions?.length ?? 0) - (b.permissions?.length ?? 0);
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
