import { isAfter, isBefore, addDays } from 'date-fns';

/** Vigência derivada do fim do contrato (KPIs, filtros, coluna Status). */
export function getContractStatus(contract) {
  const end = new Date(contract.endDate);
  const today = new Date();
  if (isAfter(today, end)) return 'VENCIDO';
  if (isBefore(end, addDays(today, 30))) return 'A VENCER';
  return 'VIGENTE';
}

export function getContractStatusStyle(status) {
  switch (status) {
    case 'VIGENTE':
      return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' };
    case 'A VENCER':
      return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
    case 'VENCIDO':
      return { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' };
    default:
      return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' };
  }
}
