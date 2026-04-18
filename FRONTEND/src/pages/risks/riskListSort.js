/** Ordenação — riscos (`DataListTable`), vista lista. */
export function sortRiskRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'code':
        cmp = String(a.code || '').localeCompare(String(b.code || ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
        break;
      case 'title':
        cmp = String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'category':
        cmp = String(a.category || '').localeCompare(String(b.category || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'severity':
        cmp = Number(a.severity) - Number(b.severity);
        break;
      case 'owner':
        cmp = String(a.owner?.name || '').localeCompare(String(b.owner?.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'status':
        cmp = String(a.status || '').localeCompare(String(b.status || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'plans':
        cmp = (a.mitigationTasks?.length || 0) - (b.mitigationTasks?.length || 0);
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
