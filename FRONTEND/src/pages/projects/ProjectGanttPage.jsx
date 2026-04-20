import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Button, Chip, CircularProgress, Typography } from '@mui/material';
import { ArrowBack, OpenInNew } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import { useAuth } from '../../contexts/AuthContext';
import DarkTaskGantt from '../../components/tasks/DarkTaskGantt';
import { getProjectById } from '../../services/project.service';
import { getProjectTasks, updateProjectTask } from '../../services/project-details.service';

/**
 * Vista só Gantt (sem MainLayout), aberta em nova aba. Permissão: PROJECTS READ;
 * edição (arrastar / progresso) exige PROJECTS WRITE.
 */
export default function ProjectGanttPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { hasPermission } = useAuth();

  const canWrite = hasPermission?.('PROJECTS', 'WRITE') ?? false;
  const readOnly = !canWrite;

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [p, t] = await Promise.all([getProjectById(projectId), getProjectTasks(projectId)]);
      setProject(p);
      setTasks(t || []);
    } catch (e) {
      console.error(e);
      enqueueSnackbar('Não foi possível carregar o projeto ou as tarefas.', { variant: 'error' });
      setProject(null);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, enqueueSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  const handleTaskDateChange = useCallback(
    async (taskId, { startDate, endDate }) => {
      try {
        await updateProjectTask(taskId, { startDate, endDate });
        await load();
        enqueueSnackbar('Datas atualizadas.', { variant: 'success' });
      } catch (e) {
        const msg = e.response?.data?.message || 'Erro ao atualizar datas.';
        enqueueSnackbar(msg, { variant: 'error' });
        await load();
      }
    },
    [load, enqueueSnackbar]
  );

  const handleProgressChange = useCallback(
    async (taskId, progress) => {
      try {
        await updateProjectTask(taskId, { progress });
        await load();
        enqueueSnackbar('Progresso atualizado.', { variant: 'success' });
      } catch (e) {
        const msg = e.response?.data?.message || 'Erro ao atualizar progresso.';
        enqueueSnackbar(msg, { variant: 'error' });
        await load();
      }
    },
    [load, enqueueSnackbar]
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#0f1419',
        }}
      >
        <CircularProgress sx={{ color: '#2563eb' }} />
      </Box>
    );
  }

  if (!project) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#0f1419', color: '#f1f5f9', p: 3 }}>
        <Typography>Projeto não encontrado ou sem permissão.</Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/projects')} sx={{ mt: 2, color: '#94a3b8' }}>
          Lista de projetos
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0f1419',
        display: 'flex',
        flexDirection: 'column',
      }}
      data-testid="project-gantt-page"
    >
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          px: 2,
          py: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Button
            component={RouterLink}
            to={`/projects/${projectId}`}
            startIcon={<ArrowBack />}
            size="small"
            sx={{ color: '#94a3b8', textTransform: 'none' }}
            data-testid="project-gantt-back"
          >
            Voltar ao projeto
          </Button>
          <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 600 }} noWrap title={project.name}>
            {project.name}
          </Typography>
          <Chip size="small" label="Gantt" sx={{ bgcolor: 'rgba(37,99,235,0.2)', color: '#93c5fd' }} />
          {readOnly && (
            <Chip size="small" label="Somente leitura" sx={{ bgcolor: 'rgba(148,163,184,0.15)', color: '#94a3b8' }} />
          )}
        </Box>
        <Button
          component="a"
          href={`/projects/${projectId}/gantt`}
          target="_blank"
          rel="noopener noreferrer"
          size="small"
          startIcon={<OpenInNew sx={{ fontSize: 18 }} />}
          sx={{ color: '#64748b', textTransform: 'none' }}
        >
          Duplicar aba
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <DarkTaskGantt
          tasks={tasks}
          readOnly={readOnly}
          onTaskDateChange={handleTaskDateChange}
          onProgressChange={handleProgressChange}
        />
      </Box>
    </Box>
  );
}
