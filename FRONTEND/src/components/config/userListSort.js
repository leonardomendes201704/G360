function rolesSortKey(u) {
  if (u.roles?.length) {
    return u.roles
      .map((r) => r.name)
      .sort()
      .join(', ');
  }
  if (u.role?.name) return u.role.name;
  return '';
}

/** Ordenação — usuários (aba Organização, `DataListTable`). */
export function sortUserRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'user':
        cmp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'email':
        cmp = String(a.email || '').localeCompare(String(b.email || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'roles':
        cmp = rolesSortKey(a).localeCompare(rolesSortKey(b), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'costCenter':
        cmp = String(a.costCenter?.name || '').localeCompare(String(b.costCenter?.name || ''), 'pt-BR', {
          sensitivity: 'base',
        });
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
