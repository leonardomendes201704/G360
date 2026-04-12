import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    Box, Typography, Slider, InputAdornment
} from '@mui/material';
import { Payments, CalendarMonth, Receipt } from '@mui/icons-material';
import projectService from '../../services/project.service';
import { useSnackbar } from 'notistack';

const PaymentConditionModal = ({ open, onClose, proposal, projectId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [entryPercent, setEntryPercent] = useState(20);
    const [installments, setInstallments] = useState(3);
    const [startDate, setStartDate] = useState('');
    const [value, setValue] = useState('');
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        if (proposal) {
            setValue(proposal.value || '');
            if (proposal.paymentCondition) {
                setEntryPercent(proposal.paymentCondition.entryPercent || 20);
                setInstallments(proposal.paymentCondition.installments || 3);
                setStartDate(proposal.paymentCondition.startDate || '');
            } else {
                setEntryPercent(20);
                setInstallments(3);
                setStartDate(new Date().toISOString().split('T')[0]);
            }
        }
    }, [proposal]);

    const formatCurrency = (val) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    const handleSave = async () => {
        try {
            setLoading(true);
            await projectService.setPaymentCondition(projectId, proposal.id, {
                entryPercent,
                installments,
                startDate,
                value: Number(value) || proposal.value
            });
            enqueueSnackbar('Condição comercial salva!', { variant: 'success' });
            onSuccess?.();
            onClose();
        } catch (e) {
            enqueueSnackbar(e.response?.data?.message || 'Erro ao salvar condição', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCosts = async () => {
        try {
            setLoading(true);
            await projectService.generateCostsFromProposal(projectId, proposal.id);
            enqueueSnackbar('Custos gerados com sucesso! Acesse a aba Custos.', { variant: 'success' });
            onSuccess?.();
            onClose();
        } catch (e) {
            enqueueSnackbar(e.response?.data?.message || 'Erro ao gerar custos', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const totalValue = Number(value) || proposal?.value || 0;
    const entryValue = totalValue * (entryPercent / 100);
    const remainingValue = totalValue - entryValue;
    const installmentValue = installments > 0 ? remainingValue / installments : 0;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    background: 'var(--modal-gradient)',
                    border: '1px solid var(--modal-border)',
                    borderRadius: 3
                }
            }}
        >
            <DialogTitle sx={{ color: 'var(--modal-text)', fontWeight: 600, borderBottom: '1px solid var(--modal-border)' }}>
                Condição Comercial
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                <Typography sx={{ color: 'var(--modal-text-secondary)', mb: 3 }}>
                    Defina as condições de pagamento para <strong style={{ color: 'var(--modal-text)' }}>{proposal?.supplier?.name}</strong>
                </Typography>

                {/* Valor Total */}
                <TextField
                    fullWidth
                    label="Valor Total Negociado"
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Payments sx={{ color: 'var(--modal-text-muted)' }} /></InputAdornment>
                    }}
                    sx={{ mb: 3, '& .MuiOutlinedInput-root': { color: 'var(--modal-text)' }, '& .MuiInputLabel-root': { color: 'var(--modal-text-secondary)' } }}
                />

                {/* Entrada */}
                <Box sx={{ mb: 3 }}>
                    <Typography sx={{ color: 'var(--modal-text-secondary)', mb: 1, fontSize: 14 }}>
                        Entrada: {entryPercent}% ({formatCurrency(entryValue)})
                    </Typography>
                    <Slider
                        value={entryPercent}
                        onChange={(_, v) => setEntryPercent(v)}
                        min={0}
                        max={50}
                        step={5}
                        marks={[{ value: 0, label: '0%' }, { value: 20, label: '20%' }, { value: 50, label: '50%' }]}
                        sx={{ color: '#2563eb' }}
                    />
                </Box>

                {/* Parcelas */}
                <Box sx={{ mb: 3 }}>
                    <Typography sx={{ color: 'var(--modal-text-secondary)', mb: 1, fontSize: 14 }}>
                        Parcelas: {installments}x de {formatCurrency(installmentValue)}
                    </Typography>
                    <Slider
                        value={installments}
                        onChange={(_, v) => setInstallments(v)}
                        min={1}
                        max={12}
                        step={1}
                        marks={[{ value: 1, label: '1x' }, { value: 6, label: '6x' }, { value: 12, label: '12x' }]}
                        sx={{ color: '#10b981' }}
                    />
                </Box>

                {/* Data Início */}
                <TextField
                    fullWidth
                    label="Data da Primeira Parcela"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><CalendarMonth sx={{ color: 'var(--modal-text-muted)' }} /></InputAdornment>
                    }}
                    sx={{ mb: 3, '& .MuiOutlinedInput-root': { color: 'var(--modal-text)' }, '& .MuiInputLabel-root': { color: 'var(--modal-text-secondary)' } }}
                />

                {/* Preview */}
                <Box sx={{ background: 'var(--modal-surface-alt)', borderRadius: 2, p: 2, border: '1px solid var(--modal-border)' }}>
                    <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: 12, mb: 1, textTransform: 'uppercase' }}>
                        Resumo do Cronograma
                    </Typography>
                    {entryPercent > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: 14 }}>Entrada</Typography>
                            <Typography sx={{ color: '#10b981', fontSize: 14, fontWeight: 600 }}>{formatCurrency(entryValue)}</Typography>
                        </Box>
                    )}
                    {installments > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: 14 }}>{installments} parcelas</Typography>
                            <Typography sx={{ color: 'var(--modal-text)', fontSize: 14 }}>{formatCurrency(installmentValue)} cada</Typography>
                        </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: '1px solid var(--modal-border)' }}>
                        <Typography sx={{ color: 'var(--modal-text)', fontSize: 14, fontWeight: 600 }}>Total</Typography>
                        <Typography sx={{ color: '#2563eb', fontSize: 14, fontWeight: 600 }}>{formatCurrency(totalValue)}</Typography>
                    </Box>
                </Box>

                {proposal?.costsGenerated && (
                    <Box sx={{ mt: 2, p: 2, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 2, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <Typography sx={{ color: '#10b981', fontSize: 14 }}>
                            ✓ Custos já foram gerados para esta proposta
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2.5, borderTop: '1px solid var(--modal-border)' }}>
                <Button onClick={onClose} sx={{ color: 'var(--modal-text-secondary)' }}>Cancelar</Button>
                <Button
                    onClick={handleSave}
                    disabled={loading}
                    variant="contained"
                    sx={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', textTransform: 'none' }}
                >
                    Salvar Condição
                </Button>
                {proposal?.paymentCondition && !proposal?.costsGenerated && (
                    <Button
                        onClick={handleGenerateCosts}
                        disabled={loading}
                        variant="contained"
                        startIcon={<Receipt />}
                        sx={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', textTransform: 'none' }}
                    >
                        Gerar Custos
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default PaymentConditionModal;

