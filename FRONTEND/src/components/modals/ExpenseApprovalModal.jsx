import { useState, useEffect } from 'react';
import { Box, Button, Typography, TextField, CircularProgress, Chip } from '@mui/material';
import { CheckCircle, Check, CloudUpload } from '@mui/icons-material';
import StandardModal from '../common/StandardModal';

const inputSx = {
    '& .MuiOutlinedInput-root': {
        background: 'var(--modal-surface-subtle)', color: 'var(--modal-text-soft)', borderRadius: '8px',
        '& fieldset': { borderColor: 'var(--modal-border)' },
        '&:hover fieldset': { borderColor: 'rgba(16, 185, 129, 0.3)' },
        '&.Mui-focused fieldset': { borderColor: '#10b981' }
    },
    '& .MuiInputLabel-root': { color: 'var(--modal-text-secondary)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#10b981' },
    '& .MuiInputBase-input': { color: 'var(--modal-text-soft)' }
};

const ExpenseApprovalModal = ({ open, onClose, onConfirm, expense }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (expense?.invoiceNumber) {
            setInvoiceNumber(expense.invoiceNumber);
        } else {
            setInvoiceNumber('');
        }
        setSelectedFile(null);
    }, [expense?.id]);

    if (!expense) return null;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onConfirm({
                id: expense.id, status: 'APROVADO',
                invoiceNumber: invoiceNumber || expense.invoiceNumber,
                file: selectedFile
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title="Aprovar Despesa"
            subtitle="Anexar Nota Fiscal e confirmar"
            icon="check_circle"
            size="form"
            loading={loading}
            footer={
                <>
                    <Button variant="outlined" onClick={onClose} disabled={loading} sx={{ textTransform: 'none', fontWeight: 600 }}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleSubmit}
                        disabled={loading || !selectedFile}
                        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Check />}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {loading ? 'Processando...' : 'Aprovar e Salvar'}
                    </Button>
                </>
            }
            contentSx={{ pt: 2 }}
        >
            {expense.approvalStatus === 'UNPLANNED' && (
                <Chip
                    icon={<span className="material-icons-round" style={{ fontSize: '16px' }}>warning</span>}
                    label="Extra-orçamentário"
                    sx={{
                        mb: 2,
                        fontWeight: 600,
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#d97706',
                        '& .MuiChip-icon': { color: '#d97706' },
                    }}
                />
            )}
            <Typography sx={{ fontSize: '14px', color: 'var(--modal-text-secondary)', mb: 3, lineHeight: 1.6 }}>
                Para aprovar a despesa <strong style={{ color: 'var(--modal-text-strong)' }}>{expense.description}</strong> no valor de{' '}
                <strong style={{ color: '#10b981' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.amount)}
                </strong>, é necessário anexar a Nota Fiscal.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                    fullWidth label="Número da Nota Fiscal" placeholder="Ex: NF-123456"
                    value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)}
                    sx={inputSx}
                />

                <Button
                    component="label" fullWidth
                    sx={{
                        height: '60px', borderStyle: 'dashed',
                        border: selectedFile ? '1px dashed #10b981' : '1px dashed var(--modal-border)',
                        borderRadius: '8px',
                        background: selectedFile ? 'rgba(16, 185, 129, 0.05)' : 'var(--modal-surface-subtle)',
                        color: selectedFile ? '#10b981' : 'var(--modal-text-secondary)',
                        textTransform: 'none', fontSize: '14px', fontWeight: 500,
                        '&:hover': { borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.08)', color: '#10b981' }
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {selectedFile ? <CheckCircle sx={{ fontSize: 20 }} /> : <CloudUpload sx={{ fontSize: 20 }} />}
                        <span>{selectedFile ? selectedFile.name : 'Anexar Nota Fiscal (PDF/Imagem)'}</span>
                    </Box>
                    <input type="file" hidden onChange={(e) => setSelectedFile(e.target.files[0])} accept="application/pdf,image/*" />
                </Button>
            </Box>
        </StandardModal>
    );
};

export default ExpenseApprovalModal;
