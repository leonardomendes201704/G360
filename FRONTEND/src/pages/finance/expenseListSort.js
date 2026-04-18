/** Ordenação — contas a pagar / despesas (DataListTable). */
export function sortExpenseRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'date':
        cmp = new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
        break;
      case 'description':
        cmp = String(a.description || '').localeCompare(String(b.description || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'supplier':
        cmp = String(a.supplier?.name || '').localeCompare(String(b.supplier?.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'accountLine': {
        const sa = `${a.costCenter?.code || ''} ${a.account?.name || ''}`;
        const sb = `${b.costCenter?.code || ''} ${b.account?.name || ''}`;
        cmp = sa.localeCompare(sb, 'pt-BR', { sensitivity: 'base' });
        break;
      }
      case 'dueDate':
        cmp = new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
        break;
      case 'status':
        cmp = String(a.status || '').localeCompare(String(b.status || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'amount':
        cmp = Number(a.amount) - Number(b.amount);
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
