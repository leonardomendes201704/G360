import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useContext, useCallback } from 'react';
import { Box, Button, Typography, CircularProgress, Alert } from '@mui/material';
import { ArrowBack, Edit } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import { AuthContext } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import ChangeRequestViewContent, { formatChangeViewDate } from '../../components/changes/ChangeRequestViewContent';
import ChangeModal from '../../components/modals/ChangeModal';
import { getChangeById, updateChange } from '../../services/change-request.service';
import { getErrorMessage } from '../../utils/errorUtils';

const ChangeRequestDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { hasPermission } = useContext(AuthContext);
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const { enqueueSnackbar } = useSnackbar();

    const canEdit = hasPermission('GMUD', 'EDIT_CHANGE');
    const initialTab = searchParams.get('action') === 'approve' ? 'aprovacao' : 'geral';

    const [change, setChange] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const textMuted = isDark ? '#64748b' : '#94a3b8';

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getChangeById(id);
            setChange(data);
        } catch (e) {
            setError(getErrorMessage(e, 'GMUD não encontrada ou sem permissão.'));
            setChange(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const handleSave = async (data) => {
        if (!change) return;
        setSaving(true);
        try {
            await updateChange(change.id, data);
            enqueueSnackbar('GMUD atualizada com sucesso!', { variant: 'success' });
            setEditOpen(false);
            await load();
        } catch (err) {
            enqueueSnackbar(getErrorMessage(err, 'Erro ao salvar GMUD.'), { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading && !change) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !change) {
        return (
            <Box sx={{ p: 3 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/changes')} sx={{ mb: 2 }}>
                    Voltar
                </Button>
                <Alert severity="error">{error || 'GMUD não encontrada.'}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/changes')} sx={{ mb: 2, alignSelf: 'flex-start' }}>
                Voltar
            </Button>

            <Box sx={{ mb: 2 }}>
                <Typography variant="h4" fontWeight={700} color="text.primary">{change.code}</Typography>
                <Typography variant="subtitle1" color="text.secondary">{change.title}</Typography>
            </Box>

            <Box sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
            }}
            >
                <ChangeRequestViewContent change={change} initialTab={initialTab} variant="page" />
            </Box>

            <Box sx={{
                display: 'flex',
                width: '100%',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
                mt: 2,
                pt: 2,
                borderTop: 1,
                borderColor: 'divider',
            }}
            >
                <Typography sx={{ fontSize: '11px', color: textMuted }}>
                    Criado em {formatChangeViewDate(change.createdAt)} • Atualizado em {formatChangeViewDate(change.updatedAt)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                        onClick={() => navigate('/changes')}
                        variant="outlined"
                        color="inherit"
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '13px' }}
                    >
                        Voltar à lista
                    </Button>
                    {canEdit && (
                        <Button
                            onClick={() => setEditOpen(true)}
                            variant="contained"
                            color="primary"
                            startIcon={<Edit />}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '13px' }}
                        >
                            Editar
                        </Button>
                    )}
                </Box>
            </Box>

            <ChangeModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                onSave={handleSave}
                change={change}
                isViewMode={false}
                loading={saving}
                onUpdate={load}
                initialTab="geral"
            />
        </Box>
    );
};

export default ChangeRequestDetailPage;
