import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    Box, Typography, TextField, Select, MenuItem, Button,
    Stepper, Step, StepLabel, CircularProgress, Autocomplete
} from '@mui/material';
import {
    RocketLaunch, CalendarToday, AttachMoney,
    ArrowForward, ArrowBack, Save, Check
} from '@mui/icons-material';
import userService from '../../services/user.service';
import { getCostCenters } from '../../services/cost-center.service';

// Schema for Creation Wizard
const schema = yup.object({
    // Step 0: Definitions
    code: yup.string(), // Auto-generated
    name: yup.string().required('Nome do projeto é obrigatório'),
    type: yup.string().required('Tipo é obrigatório'),
    costCenterId: yup.string().required('Centro de Custo é obrigatório'),
    managerId: yup.string().required('Gerente é obrigatório'),
    techLeadId: yup.string().required('Tech Lead é obrigatório'),
    area: yup.string().nullable(), // [NEW] Area

    // Step 1: Scope
    description: yup.string().required('Escopo macro é obrigatório'),
    notes: yup.string().required('Justificativa de negócio é obrigatória'),

    // Step 2: Planning
    priority: yup.string().required('Prioridade é obrigatória'),
    budget: yup.number().typeError('Deve ser número').min(0).required('Orçamento é obrigatório'),
    startDate: yup.string().required('Data de início é obrigatória'),
    endDate: yup.string().required('Data de término é obrigatória')
        .test('date-order', 'Término deve ser após início', function (val) {
            if (!val || !this.parent.startDate) return true;
            return new Date(val) >= new Date(this.parent.startDate);
        }),
}).required();

// Styles
const inputSx = {
    '& .MuiOutlinedInput-root': {
        background: 'var(--modal-surface)',
        borderRadius: '10px',
        color: 'var(--modal-text)',
        fontSize: '14px',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--modal-border-strong)' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--modal-border-strong)' },
        '&.Mui-focused': {
            background: 'rgba(37, 99, 235, 0.08)',
            boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' }
        }
    },
    '& input::placeholder, & textarea::placeholder': { color: 'var(--modal-text-muted)' }
};

const selectSx = {
    background: 'var(--modal-surface)',
    borderRadius: '10px',
    color: 'var(--modal-text)',
    fontSize: '14px',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--modal-border-strong)' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--modal-border-strong)' },
    '&.Mui-focused': {
        background: 'rgba(37, 99, 235, 0.08)',
        boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' }
    },
    '& .MuiSelect-icon': { color: 'var(--modal-text-muted)' }
};

const labelSx = { color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 };

const steps = ['Identificação', 'Escopo e Justificativa', 'Planejamento'];

const ProjectCreationWizard = ({ onSave, onCancel, loading }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [users, setUsers] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [managerLockedByCostCenter, setManagerLockedByCostCenter] = useState(false);

    const { register, control, trigger, watch, setValue, formState: { errors }, handleSubmit } = useForm({
        resolver: yupResolver(schema),
        mode: 'onChange',
        defaultValues: {
            type: 'INTERNO',
            priority: 'MEDIUM',
            status: 'PLANNING', // Always planning for new
            approvalStatus: 'DRAFT',
            area: '', // [NEW] Default area
            budget: 0,
            description: '',
            notes: ''
        }
    });

    const priority = watch('priority');

    useEffect(() => {
        userService.getAll().then(data => {
            console.log('ProjectWizard Users:', data.map(u => ({ id: u.id, name: u.name })));
            setUsers(data);
        }).catch(console.error);
        getCostCenters().then(setCostCenters).catch(console.error);
    }, []);

    // [NEW] Auto-assign Manager when Cost Center changes and LOCK the field
    const selectedCostCenterId = watch('costCenterId');
    useEffect(() => {
        if (selectedCostCenterId && costCenters.length > 0) {
            const cc = costCenters.find(c => c.id === selectedCostCenterId);
            const managerId = cc?.managerId || cc?.manager?.id;

            if (managerId) {
                const managerExists = users.some(u => u.id === managerId);
                if (managerExists) {
                    setValue('managerId', managerId, { shouldValidate: true });
                    setManagerLockedByCostCenter(true); // Lock the field
                }
            }
        } else {
            setManagerLockedByCostCenter(false); // Unlock if no CC selected
        }
    }, [selectedCostCenterId, costCenters, users, setValue]);

    const handleNext = async () => {
        let fieldsToValidate = [];
        // Removed 'area' from step 0
        if (activeStep === 0) fieldsToValidate = ['code', 'name', 'type', 'costCenterId', 'managerId', 'techLeadId'];
        // Added 'area' to step 1
        if (activeStep === 1) fieldsToValidate = ['area', 'description', 'notes'];
        if (activeStep === 2) fieldsToValidate = ['priority', 'budget', 'startDate', 'endDate'];

        const isValid = await trigger(fieldsToValidate);
        if (isValid) {
            setActiveStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const onSubmit = (data) => {
        // Transform data if needed
        const cleanData = {
            ...data,
            budget: Number(data.budget),
            // Ensure notes/description are passed
        };
        onSave(cleanData);
    };

    const renderStepContent = (step) => {
        switch (step) {
            case 0: // Identificação
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: '0 0 140px' }}>
                                <Typography sx={labelSx}>Código (Auto)</Typography>
                                <TextField
                                    inputProps={{ "data-testid": "input-codigo" }}
                                    {...register('code')}
                                    placeholder="Gerado Auto."
                                    fullWidth
                                    variant="outlined"
                                    sx={{ ...inputSx, opacity: 0.7 }}
                                    disabled={true}
                                    error={!!errors.code}
                                    helperText={errors.code?.message}
                                />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Nome do Projeto *</Typography>
                                <TextField inputProps={{ "data-testid": "input-nome" }} {...register('name')} placeholder="Novo Projeto..." fullWidth variant="outlined" sx={inputSx} error={!!errors.name} helperText={errors.name?.message} />
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Tipos *</Typography>
                                <Controller
                                    name="type"
                                    control={control}
                                    render={({ field }) => (
                                        <Autocomplete
                                            freeSolo
                                            value={field.value}
                                            onChange={(e, newValue) => field.onChange(newValue || '')}
                                            onInputChange={(e, newInputValue, reason) => {
                                                if (reason === 'input') field.onChange(newInputValue);
                                            }}
                                            options={['INTERNO', 'CLIENTE', 'MELHORIA', 'INOVACAO', 'REGULATORIO', 'P&D']}
                                            getOptionLabel={(option) => {
                                                const labels = { INTERNO: 'Interno', CLIENTE: 'Cliente', MELHORIA: 'Melhoria', INOVACAO: 'Inovação', REGULATORIO: 'Regulatório', 'P&D': 'Pesquisa & Desenvolvimento' };
                                                return labels[option] || option;
                                            }}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    data-testid="select-tipo"
                                                    placeholder="Selecione ou digite..."
                                                    variant="outlined"
                                                    sx={inputSx}
                                                    error={!!errors.type}
                                                    helperText={errors.type?.message}
                                                />
                                            )}
                                            PaperComponent={({ children }) => (
                                                <Box sx={{ background: 'var(--modal-surface)', border: '1px solid var(--modal-border)', borderRadius: '10px', mt: 0.5 }}>{children}</Box>
                                            )}
                                            sx={{ '& .MuiAutocomplete-popupIndicator': { color: 'var(--modal-text-muted)' }, '& .MuiAutocomplete-clearIndicator': { color: 'var(--modal-text-muted)' } }}
                                        />
                                    )}
                                />
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Centro de Custo *</Typography>
                                <Controller
                                    name="costCenterId"
                                    control={control}
                                    defaultValue=""
                                    render={({ field }) => (
                                        <Select data-testid="select-centro-custo" {...field} fullWidth variant="outlined" sx={selectSx} error={!!errors.costCenterId}>
                                            <MenuItem value="">Selecione...</MenuItem>
                                            {costCenters.map(cc => <MenuItem key={cc.id} value={cc.id}>{cc.name} ({cc.code})</MenuItem>)}
                                        </Select>
                                    )}
                                />
                                {errors.costCenterId && <Typography color="error" variant="caption">{errors.costCenterId.message}</Typography>}
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>
                                    Gerente * {managerLockedByCostCenter && <span style={{ color: '#2563eb', fontSize: '11px' }}>(definido pelo Centro de Custo)</span>}
                                </Typography>
                                <Controller
                                    name="managerId"
                                    control={control}
                                    defaultValue=""
                                    render={({ field }) => (
                                        <Select
                                            data-testid="select-gerente"
                                            {...field}
                                            fullWidth
                                            variant="outlined"
                                            sx={{
                                                ...selectSx,
                                                ...(managerLockedByCostCenter && {
                                                    background: 'rgba(37, 99, 235, 0.12)',
                                                    borderColor: 'rgba(37, 99, 235, 0.3)',
                                                    pointerEvents: 'none'
                                                })
                                            }}
                                            error={!!errors.managerId}
                                            disabled={managerLockedByCostCenter}
                                        >
                                            <MenuItem value="">Selecione...</MenuItem>
                                            {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
                                        </Select>
                                    )}
                                />
                                {errors.managerId && <Typography color="error" variant="caption">{errors.managerId.message}</Typography>}
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Tech Lead *</Typography>
                                <Controller
                                    name="techLeadId"
                                    control={control}
                                    defaultValue=""
                                    render={({ field }) => (
                                        <Select data-testid="select-tech-lead" {...field} fullWidth variant="outlined" sx={selectSx} error={!!errors.techLeadId}>
                                            <MenuItem value="">Selecione...</MenuItem>
                                            {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
                                        </Select>
                                    )}
                                />
                                {errors.techLeadId && <Typography color="error" variant="caption">{errors.techLeadId.message}</Typography>}
                            </Box>
                        </Box>
                    </Box>
                );

            case 1: // Escopo
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Box>
                            <Typography sx={labelSx}>Área solicitante do projeto</Typography>
                            <Autocomplete
                                freeSolo
                                options={['Fiscal', 'Financeiro', 'Recursos Humanos', 'Tecnologia', 'Operações', 'Comercial', 'Logística', 'Jurídico', 'Marketing']}
                                renderInput={(params) => <TextField inputProps={{ ...params.inputProps, "data-testid": "input-area" }} {...params} {...register('area')} placeholder="Ex: Fiscal, TI..." variant="outlined" sx={inputSx} />}
                                onChange={(e, value) => setValue('area', value)}
                            />
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Escopo Macro / Objetivos *</Typography>
                            <TextField
                                {...register('description')}
                                placeholder="Descreva o escopo macro, principais entregáveis e objetivos do projeto..."
                                multiline
                                rows={6}
                                fullWidth
                                variant="outlined"
                                sx={inputSx}
                                error={!!errors.description}
                                helperText={errors.description?.message}
                            />
                        </Box>
                        <Box>
                            <Typography sx={labelSx}>Justificativa de Negócio & Benefícios *</Typography>
                            <TextField
                                {...register('notes')}
                                placeholder="Por que este projeto é necessário? Quais os benefícios esperados?"
                                multiline
                                rows={4}
                                fullWidth
                                variant="outlined"
                                sx={inputSx}
                                error={!!errors.notes}
                                helperText={errors.notes?.message}
                            />
                        </Box>
                    </Box>
                );

            case 2: // Planejamento
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Box>
                            <Typography sx={labelSx}>Prioridade *</Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(lvl => (
                                    <Button
                                        key={lvl}
                                        onClick={() => setValue('priority', lvl)}
                                        sx={{
                                            flex: 1,
                                            py: 1.5,
                                            border: '1px solid',
                                            borderColor: priority === lvl ? '#2563eb' : 'var(--modal-border-strong)',
                                            background: priority === lvl ? 'rgba(37, 99, 235, 0.2)' : 'var(--modal-surface-subtle)',
                                            color: priority === lvl ? 'var(--modal-text-strong)' : 'var(--modal-text-muted)',
                                            '&:hover': {
                                                background: priority === lvl ? 'rgba(37, 99, 235, 0.3)' : 'var(--modal-surface-hover)'
                                            }
                                        }}
                                    >
                                        {lvl === 'LOW' ? 'Baixa' : lvl === 'MEDIUM' ? 'Média' : lvl === 'HIGH' ? 'Alta' : 'Crítica'}
                                    </Button>
                                ))}
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Data de Início Prevista *</Typography>
                                <TextField inputProps={{ "data-testid": "input-inicio" }} {...register('startDate')} type="date" fullWidth variant="outlined" sx={inputSx} error={!!errors.startDate} helperText={errors.startDate?.message} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={labelSx}>Data de Término Prevista *</Typography>
                                <TextField inputProps={{ "data-testid": "input-termino" }} {...register('endDate')} type="date" fullWidth variant="outlined" sx={inputSx} error={!!errors.endDate} helperText={errors.endDate?.message} />
                            </Box>
                        </Box>

                        <Box>
                            <Typography sx={labelSx}>Orçamento Previsto (Capex + Opex) *</Typography>
                            <TextField
                                {...register('budget')}
                                type="number"
                                placeholder="0.00"
                                fullWidth
                                variant="outlined"
                                sx={inputSx}
                                InputProps={{
                                    startAdornment: <AttachMoney sx={{ color: 'var(--modal-text-muted)', mr: 1 }} />
                                }}
                                error={!!errors.budget}
                                helperText={errors.budget?.message}
                            />
                        </Box>
                    </Box>
                );
            default:
                return null;
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header Content */}
            <Box sx={{ px: 3, pt: 1, pb: 3 }}>
                <Stepper activeStep={activeStep} alternativeLabel
                    sx={{
                        '& .MuiStepLabel-label': { color: 'var(--modal-text-muted) !important', fontSize: '12px' },
                        '& .MuiStepLabel-label.Mui-active': { color: 'var(--modal-text) !important', fontWeight: 600 },
                        '& .MuiStepLabel-label.Mui-completed': { color: 'var(--modal-text) !important' },
                        '& .MuiStepIcon-root': { color: 'var(--modal-border-strong)' },
                        '& .MuiStepIcon-root.Mui-active': { color: '#2563eb' },
                        '& .MuiStepIcon-root.Mui-completed': { color: '#10b981' },
                    }}
                >
                    {steps.map(label => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', px: 4, py: 2 }}>
                <form id="wizardForm" onSubmit={handleSubmit(onSubmit)}>
                    {renderStepContent(activeStep)}
                </form>
            </Box>

            <Box sx={{
                p: 3, borderTop: '1px solid var(--modal-border-strong)',
                display: 'flex', justifyContent: 'space-between',
                background: 'var(--modal-surface-subtle)'
            }}>
                <Button onClick={onCancel} disabled={loading} sx={{ color: 'var(--modal-text-muted)' }}>
                    Cancelar
                </Button>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        disabled={activeStep === 0 || loading}
                        onClick={handleBack}
                        startIcon={<ArrowBack />}
                        sx={{ color: 'var(--modal-text)', borderColor: 'var(--modal-border-strong)' }}
                        variant="outlined"
                    >
                        Voltar
                    </Button>

                    {activeStep < steps.length - 1 ? (
                        <Button
                            onClick={handleNext}
                            endIcon={<ArrowForward />}
                            variant="contained"
                            sx={{ background: '#2563eb', '&:hover': { background: '#1d4ed8' } }}
                        >
                            Próximo
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            form="wizardForm"
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
                            variant="contained"
                            sx={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                            }}
                        >
                            {loading ? 'Criando...' : 'Criar Rascunho'}
                        </Button>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default ProjectCreationWizard;





