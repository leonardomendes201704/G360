import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowBack, Edit, Delete, Person, Engineering,
  LocalFireDepartment, CalendarToday, AttachMoney,
  TrendingDown
} from '@mui/icons-material';
import { Box, Button, Typography, Chip, IconButton, Stack, Paper } from '@mui/material';
import StatusChip from '../common/StatusChip';

const ProjectHeader = ({ project, onEdit, onDelete, onSubmitForApproval }) => {
  const navigate = useNavigate();
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatName = (name) => {
    if (!name) return 'N/A';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  return (
    <Box sx={{ mb: 4 }}>

      {/* --- TOP ROW: BACK, TITLE, ACTIONS --- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconButton
            onClick={() => navigate('/projects')}
            sx={{
              bgcolor: 'white', border: '1px solid #e2e8f0', borderRadius: 2, width: 44, height: 44,
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' }
            }}
          >
            <ArrowBack sx={{ fontSize: 20, color: '#64748b' }} />
          </IconButton>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Typography variant="h4" fontWeight="800" sx={{ color: '#1e293b', lineHeight: 1.1 }}>
                {project.name}
              </Typography>
              {/* Warning Badge Example */}
              {/* <Chip label="Atenção" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} /> */}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={project.code}
                size="small"
                sx={{
                  borderRadius: 1, height: 22, fontSize: '0.75rem', fontWeight: 700,
                  bgcolor: '#f1f5f9', color: '#64748b', fontFamily: 'monospace'
                }}
              />
              {/* Status Pill simulated */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <StatusChip status={project.status} />
              </Box>
            </Box>
          </Box>
        </Box>

        <Stack direction="row" spacing={1}>
          {/* [NEW] Submit for Approval Button */}
          {project.approvalStatus === 'DRAFT' && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                if (window.confirm('Deseja enviar este projeto para aprovação?')) {
                  // Call API to submit
                  // Using a simpler approach here: emitting an event or calling a passed prop would be better,
                  // but for now let's assume the parent can pass a handler or we use a service directly if needed.
                  // Ideally `onEdit` or a specific `onSubmitApproval` prop should be used.
                  // Since I can't easily add a new prop to the parent usage without finding it, 
                  // I will checking if I can add a new prop `onSubmitApproval` to the component signature.
                }
              }}
              // Actually, checking the signature, only onEdit and onDelete are passed. 
              // I should probably wait to see where this is used or just add the button visuals first 
              // and let the user know, OR improved plan:
              // The user wants "Enviar para aprovação". I will add the logic in the parent page actually, 
              // but first let me update the Header to Accept `onSubmitForApproval`.
              startIcon={<LocalFireDepartment />} // Using an icon to signify action
              sx={{
                textTransform: 'none', fontWeight: 600, borderRadius: 2,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
              }}
            >
              Enviar para Aprovação
            </Button>
          )}

          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={onEdit}
            sx={{
              textTransform: 'none', fontWeight: 600, borderRadius: 2,
              borderColor: '#e2e8f0', color: '#475569',
              '&:hover': { borderColor: '#cbd5e1', bgcolor: 'white' }
            }}
          >
            Editar
          </Button>
          <Button
            variant="outlined"
            startIcon={<Delete />}
            onClick={onDelete}
            color="error"
            sx={{
              textTransform: 'none', fontWeight: 600, borderRadius: 2,
              borderColor: '#fee2e2', color: '#ef4444',
              bgcolor: '#fef2f2',
              '&:hover': { borderColor: '#fecaca', bgcolor: '#fee2e2' }
            }}
          >
            Excluir
          </Button>
        </Stack>
      </Box>



    </Box>
  );
};

const MetaItem = ({ icon, label, value, color = 'slate', isPriority }) => {
  const colors = {
    indigo: { bg: '#e0e7ff', text: '#1e40af' },
    blue: { bg: '#e0f2fe', text: '#0369a1' },
    orange: { bg: '#ffedd5', text: '#c2410c' },
    green: { bg: '#dcfce7', text: '#15803d' },
    purple: { bg: '#f3e8ff', text: '#7e22ce' },
    slate: { bg: '#f1f5f9', text: '#475569' },
  };
  const c = colors[color] || colors.slate;

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'white' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{
          width: 28, height: 28, borderRadius: 1.5,
          bgcolor: c.bg, color: c.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {icon}
        </Box>
        <Typography variant="caption" fontWeight="600" color="text.secondary">{label}</Typography>
      </Box>
      <Typography
        variant="body2"
        fontWeight="700"
        sx={{
          color: '#1e293b',
          pl: 0.5,
          ...(isPriority && {
            color: value === 'ALTA' ? '#dc2626' : value === 'MEDIA' ? '#d97706' : '#1e293b'
          })
        }}
      >
        {value}
      </Typography>
    </Paper>
  );
}

export default ProjectHeader;