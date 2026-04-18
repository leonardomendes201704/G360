/** Ordenação — anexos do contrato (DataListTable). */
export function sortContractAttachmentRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'fileName':
        cmp = String(a.fileName || '').localeCompare(String(b.fileName || ''), 'pt-BR', {
          sensitivity: 'base',
        });
        break;
      case 'createdAt':
        cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
