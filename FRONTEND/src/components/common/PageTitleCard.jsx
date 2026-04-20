import { useContext } from 'react';
import { Paper, Box, Typography, useTheme } from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';

/**
 * Cabeçalho de página em card (título + subtítulo opcional + ícone Material opcional + ações ao lado do título).
 * Padrão visual alinhado a Minhas Aprovações / Service Desk.
 */
const PageTitleCard = ({
  title,
  subtitle,
  iconName,
  iconColor = '#2563eb',
  actions = null,
  /** Se true, empurra `actions` para a direita do card (ex.: CTA “Novo …”) */
  pushActionsToEnd = false,
  /** Alinhamento vertical do ícone com o bloco de texto (`flex-start` quando há várias linhas / chips). */
  stackAlign = 'center',
  mb = 2,
  sx: sxProp,
  ...paperProps
}) => {
  const { mode } = useContext(ThemeContext);
  const theme = useTheme();
  const textPrimary = mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary;
  const textSecondary = mode === 'dark' ? '#64748b' : theme.palette.text.secondary;
  const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : theme.palette.divider;

  return (
    <Paper
      sx={{
        mb,
        p: 3,
        borderRadius: '8px',
        bgcolor: mode === 'dark' ? 'background.paper' : '#FFFFFF',
        border: `1px solid ${borderColor}`,
        boxShadow: mode === 'dark' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.07)',
        ...sxProp,
      }}
      {...paperProps}
    >
      <Box sx={{ display: 'flex', alignItems: stackAlign, gap: 2 }}>
        {iconName ? (
          <span
            className="material-icons-round"
            style={{
              fontSize: 36,
              color: iconColor,
              flexShrink: 0,
              lineHeight: 1,
            }}
            aria-hidden
          >
            {iconName}
          </span>
        ) : null}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={
              pushActionsToEnd
                ? {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexWrap: 'wrap',
                    width: '100%',
                  }
                : {
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 1,
                    columnGap: 1.5,
                  }
            }
          >
            <Typography
              component="h1"
              sx={{
                fontSize: '20px',
                fontWeight: 600,
                color: textPrimary,
                ...(pushActionsToEnd ? { flex: '1 1 auto', minWidth: 0 } : {}),
              }}
            >
              {title}
            </Typography>
            {actions}
          </Box>
          {subtitle != null && subtitle !== '' ? (
            typeof subtitle === 'string' ? (
              <Typography sx={{ color: textSecondary, fontSize: '15px', mt: 0.5 }}>{subtitle}</Typography>
            ) : (
              <Box sx={{ mt: 1 }}>{subtitle}</Box>
            )
          ) : null}
        </Box>
      </Box>
    </Paper>
  );
};

export default PageTitleCard;
