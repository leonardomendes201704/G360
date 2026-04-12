import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Box, Typography, TextField, Select, MenuItem, Button, IconButton, Autocomplete
} from '@mui/material';
import { Close } from '@mui/icons-material';
import userService from '../../services/user.service';
import { getCostCenters } from '../../services/cost-center.service';

const schema = yup.object({
    code: yup.string().required('Obrigatório'),
    name: yup.string().required('Obrigatório'),
    type: yup.string().required('Obrigatório'),
    priority: yup.string().required('Obrigatório'),
    status: yup.string().required('Obrigatório'),
    managerId: yup.string().required('Obrigatório'),
    techLeadId: yup.string().required('Obrigatório'),
    budget: yup.number().typeError('Deve ser um número').min(0, 'Não pode ser negativo').required('Obrigatório'),
    startDate: yup.string().required('Obrigatório'),
    endDate: yup.string().required('Obrigatório'),
    actualStartDate: yup.string().nullable(),
    actualEndDate: yup.string().nullable(),
    costCenterId: yup.string().required('Obrigatório'),
    description: yup.string().required('Obrigatório'),
    area: yup.string().nullable(), // [NEW]
    notes: yup.string().nullable(), // Added for Edit
}).required();

const inputSx = {
    '& .MuiOutlinedInput-root': {
        background: 'var(--modal-surface-hover)',
        border: '1px solid var(--modal-border-strong)',
        borderRadius: '10px',
        color: 'var(--modal-text)',
        fontSize: '14px',
        '& fieldset': { border: 'none' },
        '&:hover': { borderColor: 'var(--modal-border-strong)' },
        '&.Mui-focused': {
            borderColor: '#2563eb',
            background: 'rgba(37, 99, 235, 0.05)',
            boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
        }
    },
    '& input::placeholder, & textarea::placeholder': { color: 'var(--modal-text-muted)' }
};

const selectSx = {
    background: 'var(--modal-surface-hover)',
    border: '1px solid var(--modal-border-strong)',
    borderRadius: '10px',
    color: 'var(--modal-text)',
    fontSize: '14px',
    '& fieldset': { border: 'none' },
    '&:hover': { borderColor: 'var(--modal-border-strong)' },
    '&.Mui-focused': {
        borderColor: '#2563eb',
        background: 'rgba(37, 99, 235, 0.05)',
        boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
    },
    '& .MuiSelect-icon': { color: 'var(--modal-text-muted)' }
};

const labelSx = { color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 };

const ProjectEditForm = ({ onSave, onCancel, project, loading }) => {
    const [users, setUsers] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [selectedArea, setSelectedArea] = useState('');
    const [areaManager, setAreaManager] = useState('');

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            type: 'INTERNO',
            priority: 'MEDIUM',
            status: 'PLANNING',
            budget: 0
        }
    });

    const priority = watch('priority');
    const status = watch('status');

    useEffect(() => {
        userService.getAll().then(setUsers).catch(console.error);
        getCostCenters().then(setCostCenters).catch(console.error);
    }, []);

    useEffect(() => {
        if (project) {
            reset({
                ...project,
                managerId: project.managerId || project.manager?.id || '',
                techLeadId: project.techLeadId || project.technicalLead?.id || project.techLead?.id || '',
                budget: project.budget || 0,
                startDate: project.startDate ? project.startDate.split('T')[0] : '',
                endDate: project.endDate ? project.endDate.split('T')[0] : '',
                actualStartDate: project.actualStartDate ? project.actualStartDate.split('T')[0] : '',
                actualEndDate: project.actualEndDate ? project.actualEndDate.split('T')[0] : '',
                costCenterId: project.costCenterId || project.costCenter?.id || '',
                area: project.area || '', // [NEW] Populate area
            });

            const safeCCId = project.costCenterId || project.costCenter?.id;
            if (safeCCId && costCenters.length > 0) {
                const cc = costCenters.find(c => c.id === safeCCId);
                if (cc) {
                    setSelectedArea(cc.department?.name || '');
                    setAreaManager(cc.manager?.name || '');
                }
            }
        }
    }, [project, reset, costCenters]);

    const handleCostCenterChange = (costCenterId) => {
        const cc = costCenters.find(c => c.id === costCenterId);
        if (cc) {
            setSelectedArea(cc.department?.name || '');
            setAreaManager(cc.manager?.name || '');
        } else {
            setSelectedArea('');
            setAreaManager('');
        }
    };

    const onSubmit = (data) => {
        const cleanData = {
            ...data,
            status: data.status,
            priority: data.priority,
            managerId: data.managerId,
            costCenterId: data.costCenterId,
            techLeadId: data.techLeadId,
            startDate: data.startDate,
            endDate: data.endDate,
            actualStartDate: data.actualStartDate === "" ? null : data.actualStartDate,
            actualEndDate: data.actualEndDate === "" ? null : data.actualEndDate,
            budget: Number(data.budget),
            area: data.area,
            notes: data.notes || '',
        };
        console.log('[ProjectEditForm] Saving project with data:', cleanData);
        onSave(cleanData);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Content */}
            <Box sx={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': { background: 'var(--modal-border-strong)', borderRadius: '3px' }
            }}>
                <form id="editForm" onSubmit={handleSubmit(onSubmit)}>

                    {/* Informações Básicas */}
                    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid var(--modal-border-strong)', background: 'var(--modal-surface-subtle)', mb: 2.5 }}>
                        <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '11px', fontWeight: 600, mb: 2, textTransform: 'uppercase' }}>INFORMAÇÕES BÁSICAS</Typography>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <Box sx={{ flex: '0 0 120px' }}>
                                <Typography sx={labelSx}>Código *</Typography>
                                <TextField {...register('code')} disabled fullWidth sx={inputSx} error={!!errors.code} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Nome *</Typography>
                                <TextField {...register('name')} fullWidth sx={inputSx} error={!!errors.name} />
                            </Box>
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Descrição *</Typography>
                            <TextField {...register('description')} multiline rows={2} fullWidth sx={inputSx} error={!!errors.description} />
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <Typography sx={labelSx}>Justificativa / Notas</Typography>
                            <TextField {...register('notes')} multiline rows={2} fullWidth sx={inputSx} placeholder="Justificativa..." />
                        </Box>
                    </Box>

                    {/* Configurações */}
                    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid var(--modal-border-strong)', background: 'var(--modal-surface-subtle)', mb: 2.5 }}>
                        <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '11px', fontWeight: 600, mb: 2, textTransform: 'uppercase' }}>CONFIGURAÇÕES</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Status *</Typography>
                                <Select
                                    value={status || 'PLANNING'}
                                    onChange={(e) => setValue('status', e.target.value)}
                                    fullWidth
                                    sx={selectSx}
                                >
                                    <MenuItem value="PLANNING">Planejamento</MenuItem>
                                    <MenuItem value="IN_PROGRESS">Em Andamento</MenuItem>
                                    <MenuItem value="COMPLETED">Concluído</MenuItem>
                                    <MenuItem value="CANCELLED">Cancelado</MenuItem>
                                </Select>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Prioridade *</Typography>
                                <Select
                                    value={priority || 'MEDIUM'}
                                    onChange={(e) => setValue('priority', e.target.value)}
                                    fullWidth
                                    sx={selectSx}
                                >
                                    <MenuItem value="LOW">Baixa</MenuItem>
                                    <MenuItem value="MEDIUM">Média</MenuItem>
                                    <MenuItem value="HIGH">Alta</MenuItem>
                                    <MenuItem value="CRITICAL">Crítica</MenuItem>
                                </Select>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Orçamento *</Typography>
                                <TextField {...register('budget')} type="number" fullWidth sx={inputSx} />
                            </Box>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={labelSx}>Área de Negócio</Typography>
                            <Autocomplete
                                freeSolo
                                options={['Fiscal', 'Financeiro', 'Recursos Humanos', 'Tecnologia', 'Operações', 'Comercial', 'Logística', 'Jurídico', 'Marketing']}
                                defaultValue={project?.area || ''}
                                renderInput={(params) => <TextField {...params} {...register('area')} placeholder="Ex: Fiscal, TI..." sx={inputSx} />}
                                onChange={(e, value) => setValue('area', value)}
                            />
                        </Box>
                    </Box>

                    {/* Responsáveis */}
                    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid var(--modal-border-strong)', background: 'var(--modal-surface-subtle)', mb: 2.5 }}>
                        <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '11px', fontWeight: 600, mb: 2, textTransform: 'uppercase' }}>RESPONSÁVEIS</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Gerente do Projeto *</Typography>
                                <Select
                                    value={watch('managerId') || ''}
                                    onChange={(e) => setValue('managerId', e.target.value)}
                                    fullWidth
                                    displayEmpty
                                    sx={selectSx}
                                >
                                    <MenuItem value="" disabled>Selecione...</MenuItem>
                                    {users.map(u => (
                                        <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                                    ))}
                                </Select>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Tech Lead *</Typography>
                                <Select
                                    value={watch('techLeadId') || ''}
                                    onChange={(e) => setValue('techLeadId', e.target.value)}
                                    fullWidth
                                    displayEmpty
                                    sx={selectSx}
                                >
                                    <MenuItem value="" disabled>Selecione...</MenuItem>
                                    {users.map(u => (
                                        <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                                    ))}
                                </Select>
                            </Box>
                        </Box>
                    </Box>


                    {/* Cronograma */}
                    <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid var(--modal-border-strong)', background: 'var(--modal-surface-subtle)' }}>
                        <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '11px', fontWeight: 600, mb: 2, textTransform: 'uppercase' }}>CRONOGRAMA</Typography>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Início Previsto *</Typography>
                                <TextField {...register('startDate')} type="date" fullWidth sx={inputSx} error={!!errors.startDate} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Término Previsto *</Typography>
                                <TextField {...register('endDate')} type="date" fullWidth sx={inputSx} error={!!errors.endDate} />
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Início Real</Typography>
                                <TextField {...register('actualStartDate')} type="date" fullWidth sx={inputSx} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Término Real</Typography>
                                <TextField {...register('actualEndDate')} type="date" fullWidth sx={inputSx} />
                            </Box>
                        </Box>
                    </Box>

                </form>
            </Box>

            {/* Footer */}
            <Box sx={{
                padding: '16px 24px', borderTop: '1px solid var(--modal-border-strong)',
                display: 'flex', justifyContent: 'flex-end', gap: 2, background: 'var(--modal-surface-subtle)'
            }}>
                <Button onClick={onCancel} disabled={loading} sx={{ color: 'var(--modal-text-secondary)' }}>Cancelar</Button>
                <Button
                    type="submit"
                    form="editForm"
                    disabled={loading}
                    variant="contained"
                    sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
                >
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </Box>
        </Box>
    );
};

export default ProjectEditForm;




