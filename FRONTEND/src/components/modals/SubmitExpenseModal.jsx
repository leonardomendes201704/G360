import { useState, useEffect } from 'react';
import { Box, Button, IconButton, TextField, Typography, Chip, Dialog } from '@mui/material';
import { Close, Send, CloudUpload, Description } from '@mui/icons-material';
import { getFileURL } from '../../utils/urlUtils';

const darkInputStyles = {
    '& .MuiOutlinedInput-root': {
        background: 'var(--modal-surface-hover)',
        border: '1px solid var(--modal-border-strong)',
        borderRadius: '10px',
        color: 'var(--modal-text)',
        fontSize: '14px',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--modal-border-strong)' },
        '&:hover': { borderColor: 'var(--modal-border-strong)' },
        '&.Mui-focused': {
            borderColor: '#3b82f6',
            background: 'rgba(59, 130, 246, 0.05)',
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
        }
    },
    '& input::placeholder': { color: 'var(--modal-text-muted)' },
    '& .MuiInputAdornment-root': { color: 'var(--modal-text-muted)' }
};

/**
 * Modal leve para envio de despesa para aprovação.
 * Só pede: Data Vencimento, Data Pagamento, Nº NF, Anexo NF.
 * Usado pelo perfil Financeiro para despesas com status PREVISTO.
 */
const SubmitExpenseModal = ({ open, onClose, onSubmit, expense = null }) => {
    const [dueDate, setDueDate] = useState('');
    const [paymentDate, setPaymentDate] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open && expense) {
            setDueDate(expense.dueDate?.split('T')[0] || '');
            setPaymentDate(expense.paymentDate?.split('T')[0] || '');
            setInvoiceNumber(expense.invoiceNumber || '');
            setAmount(expense.amount || '');
            setSelectedFile(null);
            setErrors({});
            setSubmitting(false);
        }
    }, [open, expense]);

    const validate = () => {
        const newErrors = {};
        if (!dueDate) newErrors.dueDate = 'Data de vencimento é obrigatória';
        if (!paymentDate) newErrors.paymentDate = 'Data de pagamento é obrigatória';
        if (!invoiceNumber.trim()) newErrors.invoiceNumber = 'Número da NF é obrigatório';
        if (!selectedFile && !expense?.fileUrl) newErrors.file = 'Anexo da NF é obrigatório';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            await onSubmit({
                id: expense.id,
                dueDate,
                paymentDate,
                invoiceNumber,
                amount: parseFloat(amount) || expense.amount,
                file: selectedFile,
                status: 'AGUARDANDO_APROVACAO'
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (!expense) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            PaperProps={{
                sx: {
                    width: '100%',
                    maxWidth: '520px',
                    background: 'var(--modal-bg)',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--modal-surface-hover)',
                    overflow: 'hidden',
                }
            }}
            BackdropProps={{
                sx: {
                    backdropFilter: 'blur(4px)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                }
            }}
        >
            {/* Header */}
            <Box sx={{
                padding: '24px 24px 20px 24px',
                borderBottom: '1px solid var(--modal-border-strong)',
                background: 'var(--modal-header-gradient)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                        <Box sx={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                        }}>
                            <Send sx={{ color: 'white', fontSize: '20px' }} />
                        </Box>
                        <Box>
                            <Typography sx={{ color: 'var(--modal-text)', fontSize: '18px', fontWeight: 600 }}>
                                Enviar para Aprovação
                            </Typography>
                            <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '13px', mt: 0.25 }}>
                                Preencha os dados obrigatórios para submeter
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        onClick={onClose}
                        sx={{
                            width: '36px', height: '36px', borderRadius: '8px',
                            background: 'var(--modal-surface-hover)',
                            color: 'var(--modal-text-muted)',
                            '&:hover': { background: 'var(--modal-border-strong)', color: 'var(--modal-text)' }
                        }}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                </Box>
            </Box>

            {/* Expense Summary */}
            <Box sx={{
                mx: 3, mt: 3, mb: 2,
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'var(--modal-surface-subtle)',
                border: '1px solid var(--modal-border-strong)',
            }}>
                <Typography sx={{ color: 'var(--modal-text)', fontSize: '14px', fontWeight: 600 }}>
                    {expense.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 0.75, alignItems: 'center' }}>
                    {expense.costCenter?.name && (
                        <Typography sx={{ color: 'var(--modal-text-muted)', fontSize: '12px' }}>
                            CC: {expense.costCenter.name}
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Valor Editável */}
            <Box sx={{ px: 3, mb: 1 }}>
                <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                    Valor (R$)
                </Typography>
                <TextField
                    type="number"
                    fullWidth
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    InputProps={{
                        startAdornment: <span style={{ color: 'var(--modal-text-muted)', marginRight: '8px', fontWeight: 600 }}>R$</span>
                    }}
                    sx={darkInputStyles}
                />
            </Box>

            {/* Form Fields */}
            <Box sx={{ px: 3, pb: 2 }}>
                {/* Dates */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                            Data Vencimento <span style={{ color: '#ef4444' }}>*</span>
                        </Typography>
                        <TextField
                            type="date"
                            fullWidth
                            value={dueDate}
                            onChange={(e) => { setDueDate(e.target.value); setErrors(prev => ({ ...prev, dueDate: undefined })); }}
                            error={!!errors.dueDate}
                            helperText={errors.dueDate}
                            sx={darkInputStyles}
                        />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                            Data Pagamento <span style={{ color: '#ef4444' }}>*</span>
                        </Typography>
                        <TextField
                            type="date"
                            fullWidth
                            value={paymentDate}
                            onChange={(e) => { setPaymentDate(e.target.value); setErrors(prev => ({ ...prev, paymentDate: undefined })); }}
                            error={!!errors.paymentDate}
                            helperText={errors.paymentDate}
                            sx={darkInputStyles}
                        />
                    </Box>
                </Box>

                {/* Invoice Number */}
                <Box sx={{ mb: 2.5 }}>
                    <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                        Nº Nota Fiscal <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <TextField
                        fullWidth
                        placeholder="Ex: NF-123456"
                        value={invoiceNumber}
                        onChange={(e) => { setInvoiceNumber(e.target.value); setErrors(prev => ({ ...prev, invoiceNumber: undefined })); }}
                        error={!!errors.invoiceNumber}
                        helperText={errors.invoiceNumber}
                        sx={darkInputStyles}
                    />
                </Box>

                {/* File Upload */}
                <Box sx={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: `1px solid ${errors.file ? '#ef4444' : 'var(--modal-border-strong)'}`,
                    background: 'var(--modal-surface-subtle)',
                }}>
                    <Typography sx={{
                        color: 'var(--modal-text-muted)',
                        fontSize: '11px', fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em', mb: 1.5
                    }}>
                        ANEXO DA NF <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>

                    <Button
                        component="label"
                        fullWidth
                        sx={{
                            height: '56px',
                            border: `1px dashed ${errors.file ? '#ef4444' : 'var(--modal-border-strong)'}`,
                            borderRadius: '10px',
                            color: selectedFile ? '#10b981' : 'var(--modal-text-muted)',
                            textTransform: 'none',
                            fontSize: '14px',
                            '&:hover': {
                                borderColor: '#3b82f6',
                                background: 'rgba(59, 130, 246, 0.05)',
                                color: '#3b82f6'
                            }
                        }}
                        startIcon={<CloudUpload />}
                    >
                        {selectedFile ? selectedFile.name : 'Anexar NF (PDF, Imagem)'}
                        <input
                            type="file"
                            hidden
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => {
                                setSelectedFile(e.target.files[0]);
                                setErrors(prev => ({ ...prev, file: undefined }));
                            }}
                        />
                    </Button>

                    {errors.file && (
                        <Typography sx={{ color: '#ef4444', fontSize: '12px', mt: 1 }}>
                            {errors.file}
                        </Typography>
                    )}

                    {expense?.fileUrl && !selectedFile && (
                        <Chip
                            icon={<Description sx={{ color: '#3b82f6 !important' }} />}
                            label="Ver Anexo Atual"
                            size="small"
                            onClick={() => window.open(getFileURL(expense.fileUrl), '_blank')}
                            sx={{
                                mt: 1.5, width: '100%',
                                background: 'rgba(59, 130, 246, 0.1)',
                                color: '#3b82f6',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                cursor: 'pointer',
                                '&:hover': { background: 'rgba(59, 130, 246, 0.2)' }
                            }}
                        />
                    )}
                </Box>
            </Box>

            {/* Footer */}
            <Box sx={{
                padding: '16px 24px',
                borderTop: '1px solid var(--modal-border-strong)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 1.5,
                background: 'var(--modal-surface-subtle)'
            }}>
                <Button
                    onClick={onClose}
                    sx={{
                        background: 'transparent',
                        border: '1px solid var(--modal-border)',
                        color: 'var(--modal-text-secondary)',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: 500,
                        textTransform: 'none',
                        '&:hover': {
                            borderColor: 'var(--modal-text-muted)',
                            background: 'var(--modal-surface-hover)',
                            color: 'var(--modal-text)'
                        }
                    }}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    sx={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                        color: 'white',
                        borderRadius: '8px',
                        padding: '10px 24px',
                        fontSize: '14px',
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #1d4ed8 0%, #1d4ed8 100%)',
                            boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)'
                        },
                        '&:disabled': { opacity: 0.6 }
                    }}
                    startIcon={<Send />}
                >
                    {submitting ? 'Enviando...' : 'Enviar para Aprovação'}
                </Button>
            </Box>
        </Dialog>
    );
};

export default SubmitExpenseModal;
