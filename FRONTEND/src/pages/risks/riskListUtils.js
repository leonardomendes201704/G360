export const RISK_STATUS_CONFIG = {
  IDENTIFICADO: { label: 'Identificado', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
  EM_ANALISE: { label: 'Em Análise', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  TRATAMENTO: { label: 'Tratamento', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  MONITORAMENTO: { label: 'Monitoramento', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.15)' },
  ACEITO: { label: 'Aceito', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  FECHADO: { label: 'Fechado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
};

export function getRiskStatusOptions() {
  return Object.entries(RISK_STATUS_CONFIG).map(([value, cfg]) => ({
    value,
    label: cfg.label,
    color: cfg.color,
  }));
}

export function getSeverityLabel(severity) {
  if (severity >= 16) return { label: 'CRÍTICO', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' };
  if (severity >= 10) return { label: 'ALTO', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' };
  if (severity >= 6) return { label: 'MÉDIO', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
  return { label: 'BAIXO', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
}
