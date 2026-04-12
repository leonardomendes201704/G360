import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, TextField, Button, MenuItem, Select,
    FormControl, InputLabel, IconButton, CircularProgress
} from '@mui/material';
import { Close, Warning } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { createIncident, getIncidentCategories } from '../../services/incident.service';

const PRIORITIES = [
    { value: 'LOW', label: 'Baixa', color: '#10b981' },
    { value: 'MEDIUM', label: 'Média', color: '#f59e0b' },
    { value: 'HIGH', label: 'Alta', color: '#f97316' },
    { value: 'CRITICAL', label: 'Crítica', color: '#ef4444' },
];

const IMPACTS = [
    { value: 'LOW', label: 'Baixo — afeta 1 usuário' },
    { value: 'MEDIUM', label: 'Médio — afeta equipe/departamento' },
    { value: 'HIGH', label: 'Alto — afeta vários setores' },
    { value: 'CRITICAL', label: 'Crítico — afeta toda a empresa' },
];

const IncidentCreateModal = ({ open, onClose, onSave }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        impactLevel: 'MEDIUM',
        categoryId: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open) {
            getIncidentCategories()
                .then(cats => setCategories(cats || []))
                .catch(() => setCategories([]));
            // Reset form
            setForm({ title: '', description: '', priority: 'MEDIUM', impactLevel: 'MEDIUM', categoryId: '' });
            setErrors({});
        }
    }, [open]);

    const validate = () => {
        const e = {};
        if (!form.title.trim()) e.title = 'Título é obrigatório';
        if (!form.description.trim()) e.description = 'Descrição é obrigatória';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleChange = (field) => (e) =>
        setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const payload = {
                title: form.title.trim(),
                description: form.description.trim(),
                priority: form.priority,
                impactLevel: form.impactLevel,
                ...(form.categoryId ? { categoryId: form.categoryId } : {}),
            };
            const created = await createIncident(payload);
            enqueueSnackbar('Incidente criado com sucesso!', { variant: 'success' });
            onSave?.(created);
            onClose();
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.message || 'Erro ao criar incidente.', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const selectedPriority = PRIORITIES.find(p => p.value === form.priority);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}>

            {/* Header */}
            <DialogTitle sx={{
                p: 0,
                background: 'linear-gradient(135deg, #ef444418 0%, #f9731608 100%)',
                borderBottom: '1px solid rgba(239,68,68,0.15)',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '16px 20px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Warning sx={{ color: '#ef4444', fontSize: '18px' }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '16px', fontWeight: 700 }}>Novo Incidente</Typography>
                            <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>Registre um incidente para análise e resolução</Typography>
                        </Box>
                    </Box>
                    <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>

                    {/* Title */}
                    <TextField
                        label="Título *"
                        value={form.title}
                        onChange={handleChange('title')}
                        error={!!errors.title}
                        helperText={errors.title}
                        fullWidth
                        size="small"
                        placeholder="Ex: Sistema de pagamentos indisponível"
                        inputProps={{ maxLength: 200 }}
                    />

                    {/* Description */}
                    <TextField
                        label="Descrição *"
                        value={form.description}
                        onChange={handleChange('description')}
                        error={!!errors.description}
                        helperText={errors.description}
                        fullWidth
                        multiline
                        rows={3}
                        size="small"
                        placeholder="Descreva o que está acontecendo, quando começou e o impacto observado..."
                    />

                    {/* Priority + Impact row */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Prioridade *</InputLabel>
                            <Select value={form.priority} label="Prioridade *" onChange={handleChange('priority')}>
                                {PRIORITIES.map(p => (
                                    <MenuItem key={p.value} value={p.value}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color, flexShrink: 0 }} />
                                            {p.label}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" fullWidth>
                            <InputLabel>Impacto *</InputLabel>
                            <Select value={form.impactLevel} label="Impacto *" onChange={handleChange('impactLevel')}>
                                {IMPACTS.map(i => (
                                    <MenuItem key={i.value} value={i.value}>{i.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Category */}
                    {categories.length > 0 && (
                        <FormControl size="small" fullWidth>
                            <InputLabel>Categoria</InputLabel>
                            <Select value={form.categoryId} label="Categoria" onChange={handleChange('categoryId')}>
                                <MenuItem value=""><em>Sem categoria</em></MenuItem>
                                {categories.map(c => (
                                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {/* Priority preview badge */}
                    {selectedPriority && (
                        <Box sx={{
                            p: 1.5, borderRadius: '10px',
                            bgcolor: `${selectedPriority.color}10`,
                            border: `1px solid ${selectedPriority.color}25`,
                            display: 'flex', alignItems: 'center', gap: 1
                        }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: selectedPriority.color, flexShrink: 0 }} />
                            <Typography sx={{ fontSize: '12px', color: selectedPriority.color, fontWeight: 600 }}>
                                Prioridade {selectedPriority.label} — o incidente será atribuído à fila correspondente
                            </Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                <Button onClick={onClose} variant="outlined" disabled={loading}
                    sx={{ borderRadius: '8px', textTransform: 'none' }}>
                    Cancelar
                </Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}
                    startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <Warning />}
                    sx={{
                        borderRadius: '8px', textTransform: 'none', fontWeight: 600,
                        bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' },
                    }}>
                    {loading ? 'Criando...' : 'Registrar Incidente'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default IncidentCreateModal;
