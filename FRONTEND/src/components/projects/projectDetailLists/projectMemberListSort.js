/** Ordenação — membros do projeto (`DataListTable`, aba Equipe). */

const STATUS_ORDER = { alocado: 2, ativo: 1, disponivel: 0 };

function statusRank(status) {
  return STATUS_ORDER[status] ?? 0;
}

export function sortProjectMemberRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'member':
        cmp = String(a.user?.name || '').localeCompare(String(b.user?.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'team':
        cmp = String(a.__teamName || '').localeCompare(String(b.__teamName || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'role':
        cmp = String(a.__roleLabel || '').localeCompare(String(b.__roleLabel || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'status':
        cmp = statusRank(a.calculatedStatus) - statusRank(b.calculatedStatus);
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
