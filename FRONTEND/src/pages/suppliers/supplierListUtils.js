export function getSupplierStatusStyle(status) {
  switch (status) {
    case 'ATIVO':
      return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Ativo', icon: '' };
    case 'PENDENTE':
      return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'Pendente', icon: '' };
    case 'INATIVO':
      return { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', label: 'Inativo', icon: '' };
    default:
      return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Ativo', icon: '' };
  }
}

export function getSupplierInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
