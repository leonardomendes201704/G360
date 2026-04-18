import { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Chip } from '@mui/material';
import { Send, CloudUpload, Description } from '@mui/icons-material';
import { getFileURL } from '../../utils/urlUtils';
import StandardModal from '../common/StandardModal';

const darkInputStyles = {
    '& .MuiOutlinedInput-root': {
        background: 'var(--modal-surface-hover)',
        border: '1px solid var(--modal-border-strong)',
        borderRadius: '8px',
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
        <StandardModal
            open={open}
            onClose={onClose}
            title="Enviar para Aprovação"
            subtitle="Preencha os dados obrigatórios para submeter"
            icon="send"
            size="form"
            loading={submitting}
            footer={
                <>
                    <Button variant="outlined" onClick={onClose} disabled={submitting} sx={{ textTransform: 'none', fontWeight: 600 }}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={submitting}
                        startIcon={<Send />}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {submitting ? 'Enviando...' : 'Enviar para Aprovação'}
                    </Button>
                </>
            }
            contentSx={{ pt: 2 }}
        >
            <Box sx={{
                mb: 2,
                padding: '14px 16px',
                borderRadius: '8px',
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

            <Box sx={{ mb: 1 }}>
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

            <Box sx={{ pb: 1 }}>
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

                <Box sx={{
                    padding: '16px',
                    borderRadius: '8px',
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
                            borderRadius: '8px',
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
        </StandardModal>
    );
};

export default SubmitExpenseModal;
