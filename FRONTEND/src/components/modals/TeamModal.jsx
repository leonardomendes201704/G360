import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    OutlinedInput,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Checkbox
} from '@mui/material';
import { Close, Groups, Person } from '@mui/icons-material';

const TEAM_ICONS = {
    'Desenvolvimento': 'code',
    'Design': 'palette',
    'QA': 'bug_report',
    'Qualidade': 'bug_report',
    'Product': 'rocket_launch',
    'Gestão': 'rocket_launch'
};

const TeamModal = ({ open, onClose, onSave, team, projectMembers = [], loading = false }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        memberIds: [],
        leaderId: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (team) {
            // Editing existing team
            setFormData({
                name: team.name || '',
                description: team.description || '',
                memberIds: team.members?.map(m => m.userId) || [],
                leaderId: team.leaderId || (team.members?.[0]?.userId || '')
            });
        } else {
            // Creating new team
            setFormData({
                name: '',
                description: '',
                memberIds: [],
                leaderId: ''
            });
        }
        setErrors({});
    }, [team, open]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Nome da equipe é obrigatório';
        }

        if (formData.memberIds.length === 0) {
            newErrors.memberIds = 'Selecione pelo menos um membro';
        }

        if (formData.memberIds.length > 0 && !formData.leaderId) {
            newErrors.leaderId = 'Selecione um líder para a equipe';
        }

        if (formData.leaderId && !formData.memberIds.includes(formData.leaderId)) {
            newErrors.leaderId = 'O líder deve ser um dos membros selecionados';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        const teamData = {
            name: formData.name.trim(),
            description: formData.description.trim(),
            memberIds: formData.memberIds,
            leaderId: formData.leaderId,
            // If editing, include old name to find and update
            oldName: team?.name
        };

        onSave(teamData);
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    const availableMembers = projectMembers.filter(m => m.user);
    const selectedMembers = availableMembers.filter(m => formData.memberIds.includes(m.userId));

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    background: 'var(--modal-gradient)',
                    border: '1px solid var(--modal-border)',
                }
            }}
        >
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--modal-border)',
                pb: 2
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Groups sx={{ color: '#0ea5e9' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {team ? 'Editar Equipe' : 'Nova Equipe'}
                    </Typography>
                </Box>
                <IconButton onClick={handleClose} disabled={loading} size="small">
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                    {/* Team Name */}
                    <TextField
                        label="Nome da Equipe"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        error={!!errors.name}
                        helperText={errors.name || 'Ex: Desenvolvimento, Design, QA'}
                        fullWidth
                        disabled={loading}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                background: 'var(--modal-surface)',
                                '& fieldset': { borderColor: 'var(--modal-border)' },
                                '&:hover fieldset': { borderColor: 'var(--modal-border-strong)' },
                            }
                        }}
                    />

                    {/* Description */}
                    <TextField
                        label="Descrição"
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        multiline
                        rows={2}
                        fullWidth
                        disabled={loading}
                        placeholder="Ex: Backend, Frontend e Mobile"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                background: 'var(--modal-surface)',
                                '& fieldset': { borderColor: 'var(--modal-border)' },
                                '&:hover fieldset': { borderColor: 'var(--modal-border-strong)' },
                            }
                        }}
                    />

                    {/* Member Selection */}
                    <FormControl fullWidth error={!!errors.memberIds}>
                        <InputLabel>Membros da Equipe</InputLabel>
                        <Select
                            multiple
                            value={formData.memberIds}
                            onChange={(e) => handleChange('memberIds', e.target.value)}
                            input={<OutlinedInput label="Membros da Equipe" />}
                            disabled={loading}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((userId) => {
                                        const member = availableMembers.find(m => m.userId === userId);
                                        return (
                                            <Chip
                                                key={userId}
                                                label={member?.user?.name || 'Usuário'}
                                                size="small"
                                                sx={{
                                                    background: 'rgba(14, 165, 233, 0.15)',
                                                    color: '#0ea5e9',
                                                    border: '1px solid rgba(14, 165, 233, 0.3)'
                                                }}
                                            />
                                        );
                                    })}
                                </Box>
                            )}
                            sx={{
                                background: 'var(--modal-surface)',
                                '& fieldset': { borderColor: 'var(--modal-border)' },
                                '&:hover fieldset': { borderColor: 'var(--modal-border-strong)' },
                            }}
                        >
                            {availableMembers.map((member) => (
                                <MenuItem key={member.userId} value={member.userId}>
                                    <Checkbox checked={formData.memberIds.includes(member.userId)} />
                                    <ListItemAvatar>
                                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#0ea5e9', fontSize: 14 }}>
                                            {member.user.name?.charAt(0)}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={member.user.name}
                                        secondary={member.role}
                                        primaryTypographyProps={{ fontSize: 14 }}
                                        secondaryTypographyProps={{ fontSize: 12 }}
                                    />
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.memberIds && (
                            <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, ml: 1.5 }}>
                                {errors.memberIds}
                            </Typography>
                        )}
                    </FormControl>

                    {/* Leader Selection */}
                    {formData.memberIds.length > 0 && (
                        <FormControl fullWidth error={!!errors.leaderId}>
                            <InputLabel>Líder da Equipe</InputLabel>
                            <Select
                                value={formData.leaderId}
                                onChange={(e) => handleChange('leaderId', e.target.value)}
                                label="Líder da Equipe"
                                disabled={loading}
                                sx={{
                                    background: 'var(--modal-surface)',
                                    '& fieldset': { borderColor: 'var(--modal-border)' },
                                    '&:hover fieldset': { borderColor: 'var(--modal-border-strong)' },
                                }}
                            >
                                {selectedMembers.map((member) => (
                                    <MenuItem key={member.userId} value={member.userId}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#f59e0b', fontSize: 14 }}>
                                                {member.user.name?.charAt(0)}
                                            </Avatar>
                                            <Box>
                                                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                                                    {member.user.name}
                                                </Typography>
                                                <Typography sx={{ fontSize: 12, color: 'var(--modal-text-muted)' }}>
                                                    {member.role}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.leaderId && (
                                <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, ml: 1.5 }}>
                                    {errors.leaderId}
                                </Typography>
                            )}
                        </FormControl>
                    )}

                    {/* Selected Members Preview */}
                    {formData.memberIds.length > 0 && (
                        <Box sx={{
                            background: 'var(--modal-surface)',
                            borderRadius: 2,
                            p: 2,
                            border: '1px solid var(--modal-border)'
                        }}>
                            <Typography variant="caption" sx={{ color: 'var(--modal-text-muted)', textTransform: 'uppercase', mb: 1, display: 'block' }}>
                                Membros Selecionados ({formData.memberIds.length})
                            </Typography>
                            <List dense disablePadding>
                                {selectedMembers.map((member) => (
                                    <ListItem
                                        key={member.userId}
                                        disablePadding
                                        sx={{
                                            py: 0.5,
                                            borderBottom: '1px solid var(--modal-surface-subtle)',
                                            '&:last-child': { borderBottom: 'none' }
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar sx={{
                                                width: 28,
                                                height: 28,
                                                bgcolor: member.userId === formData.leaderId ? '#f59e0b' : '#0ea5e9',
                                                fontSize: 12
                                            }}>
                                                {member.user.name?.charAt(0)}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography sx={{ fontSize: 13 }}>
                                                        {member.user.name}
                                                    </Typography>
                                                    {member.userId === formData.leaderId && (
                                                        <Chip
                                                            label="Líder"
                                                            size="small"
                                                            sx={{
                                                                height: 18,
                                                                fontSize: 10,
                                                                background: 'rgba(245, 158, 11, 0.15)',
                                                                color: '#f59e0b'
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            }
                                            secondary={member.role}
                                            primaryTypographyProps={{ fontSize: 13 }}
                                            secondaryTypographyProps={{ fontSize: 11 }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{
                px: 3,
                py: 2,
                borderTop: '1px solid var(--modal-border)',
                gap: 1
            }}>
                <Button
                    onClick={handleClose}
                    disabled={loading}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        color: 'var(--modal-text-secondary)'
                    }}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #0284c7, #1d4ed8)',
                        }
                    }}
                >
                    {loading ? 'Salvando...' : (team ? 'Atualizar Equipe' : 'Criar Equipe')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TeamModal;


