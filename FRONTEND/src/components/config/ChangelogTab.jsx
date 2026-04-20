import { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Typography,
  Link,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import Visibility from '@mui/icons-material/Visibility';

import DataListTable from '../common/DataListTable';
import { useOrgThemeStyles } from '../../pages/config/useOrgThemeStyles';
import { parseChangelog, sortChangelogRows } from '../../pages/config/parseChangelog';
/** Caminho relativo ao monorepo: `docs/CHANGELOG.md` (Vite: `server.fs.allow` na raiz do repo). */
import changelogRaw from '../../../../docs/CHANGELOG.md?raw';

function getChangelogColumns({ textPrimary, textSecondary, onOpen }) {
  return [
    {
      id: 'date',
      label: 'Versão',
      width: '14%',
      minWidth: 110,
      sortable: true,
      accessor: (r) => r.sortKey ?? 0,
      render: (row) => (
        <Typography sx={{ fontWeight: 600, color: textPrimary, fontFamily: 'monospace', fontSize: 'inherit' }}>
          {row.dateStr}
        </Typography>
      ),
    },
    {
      id: 'preview',
      label: 'Resumo',
      width: 'auto',
      minWidth: 200,
      sortable: true,
      accessor: (r) => r.preview || '',
      render: (row) => (
        <Typography
          sx={{
            color: textSecondary,
            fontSize: 'inherit',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          title={row.preview}
        >
          {row.preview}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: '',
      width: '52px',
      minWidth: 48,
      sortable: false,
      align: 'right',
      render: (row) => (
        <Tooltip title="Ver detalhes">
          <IconButton
            size="small"
            aria-label="Ver detalhes"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(row);
            }}
            sx={{
              color: '#2563eb',
              '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.08)' },
            }}
          >
            <Visibility sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      ),
    },
  ];
}

/**
 * Aba de leitura do CHANGELOG do repositório (lista + modal com markdown).
 */
export default function ChangelogTab() {
  const { textPrimary, textSecondary, textMuted, cardStyle } = useOrgThemeStyles();
  const [selected, setSelected] = useState(null);

  const entries = useMemo(() => parseChangelog(changelogRaw), []);

  const columns = useMemo(
    () =>
      getChangelogColumns({
        textPrimary,
        textSecondary,
        onOpen: setSelected,
      }),
    [textPrimary, textSecondary]
  );

  const handleClose = useCallback(() => setSelected(null), []);

  const mdComponents = useMemo(
    () => ({
      h3: ({ children }) => (
        <Typography variant="subtitle1" sx={{ mt: 2.5, mb: 1, fontWeight: 600, color: textPrimary }}>
          {children}
        </Typography>
      ),
      h2: ({ children }) => (
        <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600, color: textPrimary }}>
          {children}
        </Typography>
      ),
      p: ({ children }) => (
        <Typography variant="body2" sx={{ mb: 1.25, color: textSecondary, lineHeight: 1.65 }} component="div">
          {children}
        </Typography>
      ),
      ul: ({ children }) => (
        <Box component="ul" sx={{ pl: 2.5, my: 1, listStyleType: 'disc' }}>
          {children}
        </Box>
      ),
      ol: ({ children }) => (
        <Box component="ol" sx={{ pl: 2.5, my: 1 }}>
          {children}
        </Box>
      ),
      li: ({ children }) => (
        <Box component="li" sx={{ mb: 0.75, color: textSecondary }}>
          <Typography variant="body2" component="span" sx={{ lineHeight: 1.65 }}>
            {children}
          </Typography>
        </Box>
      ),
      a: ({ href, children }) => (
        <Link href={href} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: '#2563eb' }}>
          {children}
        </Link>
      ),
      code: ({ children }) => (
        <Box
          component="code"
          sx={{
            bgcolor: 'rgba(37, 99, 235, 0.08)',
            px: 0.75,
            py: 0.25,
            borderRadius: '4px',
            fontSize: '0.85em',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          {children}
        </Box>
      ),
      hr: () => <Box sx={{ border: 0, borderTop: '1px solid rgba(148, 163, 184, 0.35)', my: 2 }} />,
    }),
    [textPrimary, textSecondary]
  );

  return (
    <>
      <DataListTable
        density="compact"
        dataTestidTable="tabela-organizacao-changelog"
        shell={{
          title: 'Notas de versão',
          titleIcon: 'history',
          accentColor: '#2563eb',
          count: entries.length,
          sx: { ...cardStyle, overflow: 'hidden' },
          tableContainerSx: { maxHeight: 560 },
        }}
        columns={columns}
        rows={entries}
        sortRows={sortChangelogRows}
        defaultOrderBy="date"
        defaultOrder="desc"
        getDefaultOrderForColumn={(id) => (id === 'date' ? 'desc' : 'asc')}
        emptyMessage="Nenhuma entrada encontrada no changelog."
        rowsPerPageDefault={15}
        onRowClick={(row) => setSelected(row)}
      />

      <Dialog open={Boolean(selected)} onClose={handleClose} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ pr: 6 }}>
          <Typography component="span" variant="h6" sx={{ fontWeight: 700 }}>
            {selected ? `Versão ${selected.dateStr}` : ''}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: textMuted, mt: 0.5 }}>
            Conteúdo de docs/CHANGELOG.md (referência do produto)
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {selected && (
            <Box className="changelog-markdown-body" sx={{ '& a': { wordBreak: 'break-word' } }}>
              <ReactMarkdown components={mdComponents}>{selected.rawBody}</ReactMarkdown>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} variant="contained" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
