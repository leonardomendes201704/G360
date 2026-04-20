import { useMatch, useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Box, Button, CircularProgress, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import PageTitleCard from '../../components/common/PageTitleCard';
import ProjectCreationWizard from '../../components/modals/ProjectCreationWizard';
import ProjectEditForm from '../../components/modals/ProjectEditForm';
import { getProjectById, createProject, updateProject } from '../../services/project.service';
import { getErrorMessage } from '../../utils/errorUtils';

/**
 * Criação (`/projects/new`) e edição (`/projects/:id/edit`) em página dedicada — sem modal.
 */
const ProjectFormPage = () => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const matchNew = useMatch({ path: '/projects/new', end: true });
    const isNew = Boolean(matchNew);
    const { id: editId } = useParams();

    const [project, setProject] = useState(null);
    const [loadingProject, setLoadingProject] = useState(!isNew);
    const [loadError, setLoadError] = useState(null);
    const [saving, setSaving] = useState(false);

    const loadProject = useCallback(async () => {
        if (!editId) return;
        setLoadingProject(true);
        setLoadError(null);
        try {
            const data = await getProjectById(editId);
            setProject(data);
        } catch (e) {
            setLoadError(getErrorMessage(e, 'Projeto não encontrado ou sem permissão.'));
            setProject(null);
        } finally {
            setLoadingProject(false);
        }
    }, [editId]);

    useEffect(() => {
        if (isNew) {
            setProject(null);
            setLoadingProject(false);
            setLoadError(null);
            return;
        }
        loadProject();
    }, [isNew, loadProject]);

    const handleClose = () => {
        if (isNew) {
            navigate('/projects');
        } else if (editId) {
            navigate(`/projects/${editId}`);
        } else {
            navigate('/projects');
        }
    };

    const handleSaveNew = async (data) => {
        setSaving(true);
        try {
            const created = await createProject(data);
            enqueueSnackbar('Projeto criado com sucesso!', { variant: 'success' });
            if (created?.id) {
                navigate(`/projects/${created.id}`);
            } else {
                navigate('/projects');
            }
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error, 'Erro ao criar projeto.'), { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveEdit = async (data) => {
        if (!project) return;
        setSaving(true);
        try {
            await updateProject(project.id, data);
            enqueueSnackbar('Projeto atualizado com sucesso!', { variant: 'success' });
            navigate(`/projects/${project.id}`);
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error, 'Erro ao salvar projeto.'), { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (!isNew && loadingProject) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!isNew && loadError) {
        return (
            <Box sx={{ p: 3 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/projects')} sx={{ mb: 2 }}>
                    Voltar
                </Button>
                <Alert severity="error">{loadError}</Alert>
            </Box>
        );
    }

    if (!isNew && !project && !loadingProject) {
        return (
            <Box sx={{ p: 3 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/projects')} sx={{ mb: 2 }}>
                    Voltar
                </Button>
                <Alert severity="warning">Projeto não encontrado.</Alert>
            </Box>
        );
    }

    const title = isNew ? 'Novo projeto' : 'Editar projeto';
    const subtitle = isNew ? 'Identificação, escopo e planejamento' : project ? `${project.code || ''} ${project.name || ''}`.trim() : '';

    return (
        <Box
            sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 'calc(100vh - 64px)',
            }}
        >
            <PageTitleCard
                iconName="folder_copy"
                title={title}
                subtitle={subtitle}
                pushActionsToEnd
                mb={2}
                actions={
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={handleClose}
                        variant="outlined"
                        color="inherit"
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '13px', flexShrink: 0 }}
                    >
                        Voltar
                    </Button>
                }
            />

            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    overflow: 'auto',
                }}
            >
                {isNew ? (
                    <ProjectCreationWizard
                        variant="page"
                        onSave={handleSaveNew}
                        onCancel={handleClose}
                        loading={saving}
                    />
                ) : (
                    <ProjectEditForm
                        variant="page"
                        project={project}
                        onSave={handleSaveEdit}
                        onCancel={handleClose}
                        loading={saving}
                    />
                )}
            </Box>
        </Box>
    );
};

export default ProjectFormPage;
