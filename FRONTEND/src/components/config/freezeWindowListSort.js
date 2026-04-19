export function getFreezeWindowStatus(w) {
  const now = new Date();
  const start = new Date(w.startDate);
  const end = new Date(w.endDate);
  if (now < start) return { label: 'Agendado', color: '#f59e0b' };
  if (now > end) return { label: 'Finalizado', color: '#64748b' };
  return { label: 'Ativo', color: '#f43f5e' };
}

/** Ordenação — freeze windows (aba Organização, `DataListTable`). */
export function sortFreezeWindowRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'name':
        cmp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'period':
        cmp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        break;
      case 'description':
        cmp = String(a.description || '').localeCompare(String(b.description || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'statusLabel':
        cmp = getFreezeWindowStatus(a).label.localeCompare(getFreezeWindowStatus(b).label, 'pt-BR');
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
