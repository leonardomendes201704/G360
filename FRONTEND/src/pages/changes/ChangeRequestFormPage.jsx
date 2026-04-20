import { useMatch, useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Box, Button, CircularProgress, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import PageTitleCard from '../../components/common/PageTitleCard';
import ChangeModal from '../../components/modals/ChangeModal';
import { getChangeById, createChange, updateChange } from '../../services/change-request.service';
import { getErrorMessage } from '../../utils/errorUtils';

/**
 * Criação (`/changes/new`) e edição (`/changes/:id/edit`) em página dedicada — sem modal.
 */
const ChangeRequestFormPage = () => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const matchNew = useMatch({ path: '/changes/new', end: true });
    const isNew = Boolean(matchNew);
    const { id: editId } = useParams();

    const [change, setChange] = useState(null);
    const [loadingChange, setLoadingChange] = useState(!isNew);
    const [loadError, setLoadError] = useState(null);
    const [saving, setSaving] = useState(false);

    const loadChange = useCallback(async () => {
        if (!editId) return;
        setLoadingChange(true);
        setLoadError(null);
        try {
            const data = await getChangeById(editId);
            setChange(data);
        } catch (e) {
            setLoadError(getErrorMessage(e, 'GMUD não encontrada ou sem permissão.'));
            setChange(null);
        } finally {
            setLoadingChange(false);
        }
    }, [editId]);

    useEffect(() => {
        if (isNew) {
            setChange(null);
            setLoadingChange(false);
            setLoadError(null);
            return;
        }
        loadChange();
    }, [isNew, loadChange]);

    const handleClose = () => {
        if (isNew) {
            navigate('/changes');
        } else if (editId) {
            navigate(`/changes/${editId}`);
        } else {
            navigate('/changes');
        }
    };

    const handleSave = async (data) => {
        setSaving(true);
        try {
            if (isNew) {
                const created = await createChange(data);
                enqueueSnackbar('GMUD criada com sucesso!', { variant: 'success' });
                navigate(`/changes/${created.id}`);
            } else if (change) {
                await updateChange(change.id, data);
                enqueueSnackbar('GMUD atualizada com sucesso!', { variant: 'success' });
                navigate(`/changes/${change.id}`);
            }
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error, 'Erro ao salvar GMUD.'), { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (!isNew && loadingChange) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!isNew && loadError) {
        return (
            <Box sx={{ p: 3 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/changes')} sx={{ mb: 2 }}>
                    Voltar
                </Button>
                <Alert severity="error">{loadError}</Alert>
            </Box>
        );
    }

    if (!isNew && !change && !loadingChange) {
        return (
            <Box sx={{ p: 3 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/changes')} sx={{ mb: 2 }}>
                    Voltar
                </Button>
                <Alert severity="warning">GMUD não encontrada.</Alert>
            </Box>
        );
    }

    const title = isNew ? 'Nova GMUD' : 'Editar GMUD';
    const subtitle = isNew ? 'Planejamento, aprovação e execução da mudança' : change?.code;

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
                iconName="sync_alt"
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

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <ChangeModal
                    variant="page"
                    open
                    onClose={handleClose}
                    onSave={handleSave}
                    change={isNew ? null : change}
                    isViewMode={false}
                    loading={saving}
                    onUpdate={isNew ? undefined : loadChange}
                    initialTab="geral"
                />
            </Box>
        </Box>
    );
};

export default ChangeRequestFormPage;
