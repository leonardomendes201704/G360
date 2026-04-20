import { Box, Button, Chip, Typography } from '@mui/material';
import { Visibility, Edit, Delete, Send, Download } from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getFileURL } from '../../../utils/urlUtils';
import { formatParticipantsSortKey } from './projectMinuteListSort';

function getMinuteDisplayId(minute) {
  return `ATA-${String(minute.id).slice(-3).padStart(3, '0')}`;
}

function formatParticipantsLine(minute) {
  if (!minute.participants) return '—';
  if (typeof minute.participants === 'string') {
    const s = minute.participants.trim();
    if (s.length > 90) return `${s.slice(0, 87)}…`;
    return s;
  }
  return `${minute.participants.length} participantes`;
}

/**
 * Colunas `DataListTable` — atas de reunião do projeto.
 */
export function getProjectMinuteListColumns({
  colors,
  getStatusConfig,
  handleOpenEdit,
  handleSubmit,
  handleDelete,
}) {
  return [
    {
      id: 'displayId',
      label: 'ID',
      width: '10%',
      minWidth: 88,
      sortable: true,
      accessor: (r) => String(r.id),
      cellSx: () => ({ fontFamily: 'monospace' }),
      render: (minute) => (
        <Typography sx={{ fontSize: 'inherit', color: '#2563eb', fontWeight: 600, fontFamily: 'monospace' }}>
          {getMinuteDisplayId(minute)}
        </Typography>
      ),
    },
    {
      id: 'title',
      label: 'Título',
      width: '22%',
      minWidth: 140,
      sortable: true,
      accessor: (r) => r.title || '',
      render: (minute) => (
        <Typography sx={{ fontWeight: 600, color: colors.textPrimary, fontSize: 'inherit' }} noWrap title={minute.title}>
          {minute.title}
        </Typography>
      ),
    },
    {
      id: 'date',
      label: 'Data',
      width: '12%',
      minWidth: 104,
      sortable: true,
      accessor: (r) => new Date(r.date).getTime(),
      render: (minute) => (
        <Typography sx={{ color: colors.textSecondary, fontSize: 'inherit' }}>
          {format(new Date(minute.date), 'dd/MM/yyyy', { locale: ptBR })}
        </Typography>
      ),
    },
    {
      id: 'participants',
      label: 'Participantes',
      width: '20%',
      minWidth: 120,
      sortable: true,
      accessor: (r) => formatParticipantsSortKey(r),
      render: (minute) => (
        <Typography
          sx={{ color: colors.textMuted, fontSize: 'inherit', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          title={typeof minute.participants === 'string' ? minute.participants : undefined}
        >
          {formatParticipantsLine(minute)}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: '14%',
      minWidth: 120,
      sortable: true,
      accessor: (r) => r.status || '',
      render: (minute) => {
        const status = getStatusConfig(minute.status);
        return (
          <Chip
            label={status.label}
            icon={status.icon}
            size="small"
            sx={{
              bgcolor: status.bg,
              color: status.color,
              fontWeight: 500,
              maxWidth: '100%',
              '& .MuiChip-label': { px: 0.75 },
              '& .MuiChip-icon': { color: status.color },
            }}
          />
        );
      },
    },
    {
      id: 'actions',
      label: 'Ações',
      width: '22%',
      minWidth: 200,
      sortable: false,
      align: 'right',
      render: (minute) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'flex-end' }}>
          {minute.fileUrl && (
            <>
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(getFileURL(minute.fileUrl), '_blank', 'noopener,noreferrer');
                }}
                startIcon={<Visibility />}
                sx={{
                  color: colors.textMuted,
                  textTransform: 'none',
                  fontSize: 12,
                  minWidth: 0,
                  '&:hover': { color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)' },
                }}
              >
                Ver
              </Button>
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  const a = document.createElement('a');
                  a.href = getFileURL(minute.fileUrl);
                  a.download = minute.fileName || 'ata.pdf';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                startIcon={<Download />}
                sx={{
                  color: colors.textMuted,
                  textTransform: 'none',
                  fontSize: 12,
                  minWidth: 0,
                  '&:hover': { color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' },
                }}
              >
                Baixar
              </Button>
            </>
          )}
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(minute);
            }}
            startIcon={<Edit />}
            disabled={minute.status === 'APPROVED'}
            sx={{
              color: colors.textMuted,
              textTransform: 'none',
              fontSize: 12,
              minWidth: 0,
              '&:hover': { color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)' },
            }}
          >
            Editar
          </Button>
          {(minute.status === 'DRAFT' || minute.status === 'RETURNED') && (
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleSubmit(minute.id);
              }}
              startIcon={<Send />}
              sx={{
                color: '#10b981',
                textTransform: 'none',
                fontSize: 12,
                minWidth: 0,
                '&:hover': { background: 'rgba(16, 185, 129, 0.1)' },
              }}
            >
              {minute.status === 'RETURNED' ? 'Reenviar' : 'Submeter'}
            </Button>
          )}
          {minute.status !== 'APPROVED' && (
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(minute.id);
              }}
              startIcon={<Delete />}
              sx={{
                color: '#f43f5e',
                textTransform: 'none',
                fontSize: 12,
                minWidth: 0,
                '&:hover': { background: 'rgba(244, 63, 94, 0.1)' },
              }}
            >
              Excluir
            </Button>
          )}
        </Box>
      ),
    },
  ];
}
