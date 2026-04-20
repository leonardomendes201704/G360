/** Ordenação — custos do projeto (`DataListTable`, aba Custos). */

export function sortProjectCostRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'id':
        cmp = String(a.id || '').localeCompare(String(b.id || ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
        break;
      case 'description':
        cmp = String(a.description || '').localeCompare(String(b.description || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'category':
        cmp = String(a.type || '').localeCompare(String(b.type || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'date':
        cmp = new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
        break;
      case 'amount':
        cmp = Number(a.amount || 0) - Number(b.amount || 0);
        break;
      case 'status':
        cmp = String(a.status || '').localeCompare(String(b.status || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
