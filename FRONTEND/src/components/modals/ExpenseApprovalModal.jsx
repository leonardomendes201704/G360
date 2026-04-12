import { useState, useEffect } from 'react';
import {
    Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    IconButton, Typography, TextField, CircularProgress
} from '@mui/material';
import { Close, CheckCircle, Check, CloudUpload } from '@mui/icons-material';

const modalStyles = {
    backdrop: { backdropFilter: 'blur(8px)', backgroundColor: 'var(--modal-backdrop, rgba(0, 0, 0, 0.7))' },
    paper: {
        borderRadius: '16px',
        background: 'var(--modal-gradient)',
        border: '1px solid var(--modal-border)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: 'var(--modal-text)',
        maxWidth: '520px', width: '100%', m: 2
    },
    title: {
        borderBottom: '1px solid var(--modal-border)',
        padding: '24px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    input: {
        '& .MuiOutlinedInput-root': {
            background: 'var(--modal-surface-subtle)', color: 'var(--modal-text-soft)', borderRadius: '10px',
            '& fieldset': { borderColor: 'var(--modal-border)' },
            '&:hover fieldset': { borderColor: 'rgba(16, 185, 129, 0.3)' },
            '&.Mui-focused fieldset': { borderColor: '#10b981' }
        },
        '& .MuiInputLabel-root': { color: 'var(--modal-text-secondary)' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#10b981' },
        '& .MuiInputBase-input': { color: 'var(--modal-text-soft)' }
    }
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
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{ sx: modalStyles.paper }}
            BackdropProps={{ sx: modalStyles.backdrop }}
        >
            <DialogTitle sx={modalStyles.title}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 44, height: 44, borderRadius: '12px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <CheckCircle sx={{ color: '#10b981', fontSize: 24 }} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '18px', fontWeight: 600, color: 'var(--modal-text-strong)' }}>Aprovar Despesa</Typography>
                        <Typography sx={{ fontSize: '13px', color: 'var(--modal-text-secondary)' }}>Anexar Nota Fiscal e confirmar</Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { color: 'var(--modal-text)', background: 'var(--modal-surface-hover)' } }}>
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, background: 'transparent !important' }}>
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
                        sx={modalStyles.input}
                    />

                    <Button
                        component="label" fullWidth
                        sx={{
                            height: '60px', borderStyle: 'dashed',
                            border: selectedFile ? '1px dashed #10b981' : '1px dashed var(--modal-border)',
                            borderRadius: '12px',
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
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: '1px solid var(--modal-border)', gap: 2 }}>
                <Button onClick={onClose} sx={{ color: 'var(--modal-text-secondary)', '&:hover': { background: 'var(--modal-surface-hover)' } }}>Cancelar</Button>
                <Button
                    onClick={handleSubmit}
                    disabled={loading || !selectedFile}
                    startIcon={loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <Check />}
                    sx={{
                        padding: '10px 24px', borderRadius: '10px', fontWeight: 600, textTransform: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white',
                        '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)' },
                        '&.Mui-disabled': { background: 'rgba(100, 116, 139, 0.3)', color: 'rgba(255,255,255,0.3)' }
                    }}
                >
                    {loading ? 'Processando...' : 'Aprovar e Salvar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ExpenseApprovalModal;
