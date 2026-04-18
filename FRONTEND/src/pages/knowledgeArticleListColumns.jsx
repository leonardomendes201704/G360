import { Box, IconButton, Typography } from '@mui/material';
import {
  Description as ArticleIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

/**
 * Colunas `DataListTable` — artigos da base de conhecimento.
 */
export function getKnowledgeArticleColumns({
  isDark,
  textPrimary,
  textSecondary,
  onView,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
}) {
  return [
    {
      id: 'title',
      label: 'Título',
      accessor: (r) => r.title || '',
      cellSx: () => ({ minWidth: 200 }),
      render: (article) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <ArticleIcon sx={{ color: '#2563eb', fontSize: 20, flexShrink: 0 }} />
          <Typography
            component="span"
            sx={{ color: textPrimary, fontWeight: 500, fontSize: 14, wordBreak: 'break-word' }}
          >
            {article.title}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'categoryName',
      label: 'Categoria',
      accessor: (r) => r.category?.name || '',
      render: (article) => (
        <Box
          sx={{
            display: 'inline-block',
            padding: '4px 12px',
            bgcolor: article.category?.color || (isDark ? '#374151' : '#e2e8f0'),
            color: isDark ? 'white' : '#1f2937',
            borderRadius: '8px',
            fontSize: 12,
            fontWeight: 500,
            maxWidth: '100%',
          }}
        >
          {article.category?.name || 'Sem categoria'}
        </Box>
      ),
    },
    {
      id: 'authorName',
      label: 'Autor',
      accessor: (r) => r.author?.name || '',
      render: (article) => (
        <Typography sx={{ color: textSecondary, fontSize: 14 }}>
          {article.author?.name || 'Desconhecido'}
        </Typography>
      ),
    },
    {
      id: 'views',
      label: 'Visualizações',
      align: 'right',
      accessor: (r) => Number(r.views) || 0,
      cellSx: () => ({ width: 120, whiteSpace: 'nowrap' }),
      render: (article) => (
        <Typography sx={{ color: textSecondary, fontSize: 14 }}>{article.views || 0}</Typography>
      ),
    },
    {
      id: 'createdAt',
      label: 'Criado em',
      accessor: (r) => (r.createdAt ? new Date(r.createdAt).getTime() : 0),
      cellSx: () => ({ whiteSpace: 'nowrap' }),
      render: (article) => (
        <Typography sx={{ color: textSecondary, fontSize: 14 }}>
          {new Date(article.createdAt).toLocaleDateString('pt-BR')}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      align: 'right',
      sortable: false,
      width: 140,
      minWidth: 120,
      render: (article) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <IconButton
            size="small"
            onClick={() => onView(article)}
            sx={{ color: '#2563eb' }}
            title="Visualizar"
            aria-label="Visualizar artigo"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          {canUpdate && (
            <IconButton
              size="small"
              onClick={() => onEdit(article)}
              sx={{ color: textSecondary, '&:hover': { color: '#fbbf24' } }}
              title="Editar"
              aria-label="Editar artigo"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {canDelete && (
            <IconButton
              size="small"
              onClick={() => onDelete(article)}
              sx={{ color: textSecondary, '&:hover': { color: '#ef4444' } }}
              title="Excluir"
              aria-label="Excluir artigo"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];
}
