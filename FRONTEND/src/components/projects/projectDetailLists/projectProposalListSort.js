/** Ordenação — propostas do projeto (`DataListTable`). */

export function sortProjectProposalRows(rows, orderBy, order, suppliers = []) {
  const supplierName = (p) => suppliers.find((s) => s.id === p.supplierId)?.name || '';
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'description':
        cmp = String(a.description || '').localeCompare(String(b.description || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'supplier':
        cmp = String(supplierName(a)).localeCompare(String(supplierName(b)), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'value':
        cmp = Number(a.value || 0) - Number(b.value || 0);
        break;
      case 'status': {
        const sa = `${a.isWinner ? '1' : '0'}_${a.status || ''}`;
        const sb = `${b.isWinner ? '1' : '0'}_${b.status || ''}`;
        cmp = sa.localeCompare(sb, 'pt-BR');
        break;
      }
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
