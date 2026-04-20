/** Ordenação — atas do projeto (`DataListTable`). */

export function sortProjectMinuteRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'displayId':
        cmp = String(a.id).localeCompare(String(b.id), 'pt-BR');
        break;
      case 'title':
        cmp = String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'date':
        cmp = new Date(a.date) - new Date(b.date);
        break;
      case 'participants':
        cmp = String(formatParticipantsSortKey(a)).localeCompare(
          String(formatParticipantsSortKey(b)),
          'pt-BR',
          { sensitivity: 'base' }
        );
        break;
      case 'status':
        cmp = String(a.status || '').localeCompare(String(b.status || ''), 'pt-BR');
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}

export function formatParticipantsSortKey(m) {
  if (!m.participants) return '';
  if (typeof m.participants === 'string') return m.participants;
  return String(m.participants?.length ?? '');
}
