import { useState, useEffect } from 'react';
import {
    Button, TextField, Box, Typography, Slider, InputAdornment
} from '@mui/material';
import { Payments, CalendarMonth, Receipt } from '@mui/icons-material';
import projectService from '../../services/project.service';
import { useSnackbar } from 'notistack';
import StandardModal from '../common/StandardModal';

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
        <StandardModal
            open={open}
            onClose={onClose}
            title="Condição comercial"
            subtitle={proposal?.supplier?.name ? `Fornecedor: ${proposal.supplier.name}` : 'Proposta'}
            icon="payments"
            size="form"
            loading={loading}
            footer={
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end', width: '100%' }}>
                    <Button type="button" onClick={onClose} disabled={loading}>Cancelar</Button>
                    {proposal?.paymentCondition && !proposal?.costsGenerated && (
                        <Button
                            type="button"
                            onClick={handleGenerateCosts}
                            disabled={loading}
                            variant="outlined"
                            color="secondary"
                            startIcon={<Receipt />}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            Gerar custos
                        </Button>
                    )}
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={loading}
                        variant="contained"
                        color="primary"
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Salvar condição
                    </Button>
                </Box>
            }
        >
            <Typography sx={{ color: 'text.secondary', mb: 3 }}>
                Defina as condições de pagamento para{' '}
                <strong style={{ color: 'text.primary' }}>{proposal?.supplier?.name || '—'}</strong>
            </Typography>

            <TextField
                fullWidth
                label="Valor total negociado"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                InputProps={{
                    startAdornment: <InputAdornment position="start"><Payments sx={{ color: 'text.secondary' }} /></InputAdornment>
                }}
                sx={{ mb: 3 }}
            />

            <Box sx={{ mb: 3 }}>
                <Typography sx={{ color: 'text.secondary', mb: 1, fontSize: 14 }}>
                    Entrada: {entryPercent}% ({formatCurrency(entryValue)})
                </Typography>
                <Slider
                    value={entryPercent}
                    onChange={(_, v) => setEntryPercent(v)}
                    min={0}
                    max={50}
                    step={5}
                    marks={[{ value: 0, label: '0%' }, { value: 20, label: '20%' }, { value: 50, label: '50%' }]}
                    sx={{ color: 'primary.main' }}
                />
            </Box>

            <Box sx={{ mb: 3 }}>
                <Typography sx={{ color: 'text.secondary', mb: 1, fontSize: 14 }}>
                    Parcelas: {installments}x de {formatCurrency(installmentValue)}
                </Typography>
                <Slider
                    value={installments}
                    onChange={(_, v) => setInstallments(v)}
                    min={1}
                    max={12}
                    step={1}
                    marks={[{ value: 1, label: '1x' }, { value: 6, label: '6x' }, { value: 12, label: '12x' }]}
                    sx={{ color: 'success.main' }}
                />
            </Box>

            <TextField
                fullWidth
                label="Data da primeira parcela"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                    startAdornment: <InputAdornment position="start"><CalendarMonth sx={{ color: 'text.secondary' }} /></InputAdornment>
                }}
                sx={{ mb: 3 }}
            />

            <Box sx={{ background: 'action.hover', borderRadius: '8px', p: 2, border: 1, borderColor: 'divider' }}>
                <Typography sx={{ color: 'text.secondary', fontSize: 12, mb: 1, textTransform: 'uppercase' }}>
                    Resumo do cronograma
                </Typography>
                {entryPercent > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>Entrada</Typography>
                        <Typography sx={{ color: 'success.main', fontSize: 14, fontWeight: 600 }}>{formatCurrency(entryValue)}</Typography>
                    </Box>
                )}
                {installments > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{installments} parcelas</Typography>
                        <Typography sx={{ fontSize: 14 }}>{formatCurrency(installmentValue)} cada</Typography>
                    </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Total</Typography>
                    <Typography sx={{ color: 'primary.main', fontSize: 14, fontWeight: 600 }}>{formatCurrency(totalValue)}</Typography>
                </Box>
            </Box>

            {proposal?.costsGenerated && (
                <Box sx={{ mt: 2, p: 2, background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <Typography sx={{ color: 'success.main', fontSize: 14 }}>
                        Custos já foram gerados para esta proposta
                    </Typography>
                </Box>
            )}
        </StandardModal>
    );
};

export default PaymentConditionModal;
