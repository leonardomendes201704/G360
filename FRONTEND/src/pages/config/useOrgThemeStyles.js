import { useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';

/** Estilos alinhados às abas de Configurações (OrganizationPage). */
export const useOrgThemeStyles = () => {
  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#475569';
  const textMuted = isDark ? '#64748b' : '#64748b';
  const cardBg = isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#ffffff';
  const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)';
  const surfaceBg = isDark ? '#1c2632' : '#f1f5f9';
  const rowHoverBg = isDark ? '#1c2632' : '#f1f5f9';

  const cardStyle = {
    background: cardBg,
    border: cardBorder,
    borderRadius: '16px'
  };

  const tableHeaderStyle = {
    background: surfaceBg,
    color: textMuted,
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '12px 16px',
    borderBottom: cardBorder,
    textAlign: 'left',
    whiteSpace: 'nowrap'
  };

  const tableCellStyle = {
    color: textSecondary,
    fontSize: '13px',
    padding: '14px 16px',
    borderBottom: cardBorder
  };

  const actionBtnStyle = (type = 'edit') => ({
    width: 32,
    height: 32,
    borderRadius: '8px',
    background: type === 'delete' ? 'rgba(244, 63, 94, 0.1)' : surfaceBg,
    border: cardBorder,
    color: type === 'delete' ? '#f43f5e' : textSecondary,
    '&:hover': {
      background: type === 'delete' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(37, 99, 235, 0.12)',
      color: type === 'delete' ? '#f43f5e' : '#2563eb',
      borderColor: type === 'delete' ? '#f43f5e' : '#2563eb'
    }
  });

  return { textPrimary, textSecondary, textMuted, cardStyle, tableHeaderStyle, tableCellStyle, actionBtnStyle, rowHoverBg };
};
