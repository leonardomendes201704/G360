import { useContext } from 'react';
import { Box, Typography } from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';

/**
 * Cartão com cabeçalho para listas/grelhas (título, contagem opcional, toolbar).
 * O corpo (tabela MUI, HTML, BulkActionsBar, EmptyState) passa em children.
 *
 * @param {string} title
 * @param {string} [titleIcon='list'] — Material Icons Round (ligature)
 * @param {string} [accentColor='#2563eb'] — Cor do ícone do título
 * @param {number} [count] — Exibe " (n)" após o título quando definido
 * @param {import('react').ReactNode} [toolbar] — Área à direita (busca, botões)
 * @param {import('react').ReactNode} children
 * @param {object} [sx] — Estilos do contentor exterior (ex.: mesmo `cardStyle` da página)
 * @param {string} [className] — Classe CSS no contentor exterior (ex.: tema premium da página)
 */
const DataListShell = ({
  title,
  titleIcon = 'list',
  accentColor = '#2563eb',
  count,
  toolbar,
  children,
  sx = {},
  className,
}) => {
  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.08)';

  return (
    <Box
      className={className}
      sx={{
        borderRadius: '16px',
        overflow: 'hidden',
        bgcolor: isDark ? 'rgba(22, 29, 38, 0.5)' : '#ffffff',
        border: `1px solid ${borderColor}`,
        boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)',
        ...sx,
      }}
    >
      <Box
        sx={{
          p: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${borderColor}`,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: '18px',
            fontWeight: 600,
            color: textPrimary,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '20px', color: accentColor }}>
            {titleIcon}
          </span>
          {title}
          {count != null && (
            <Typography component="span" sx={{ fontSize: '14px', color: textMuted, fontWeight: 400 }}>
              ({count})
            </Typography>
          )}
        </Typography>
        {toolbar ? (
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: '1 1 auto', justifyContent: 'flex-end' }}>
            {toolbar}
          </Box>
        ) : null}
      </Box>
      {children}
    </Box>
  );
};

export default DataListShell;
