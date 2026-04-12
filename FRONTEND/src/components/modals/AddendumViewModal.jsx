import { Dialog, Box, Typography, IconButton, Grid, Chip } from '@mui/material';
import { Close, Visibility, Download, CalendarToday, TrendingUp, TrendingDown } from '@mui/icons-material';
import { format } from 'date-fns';
import { getFileURL } from '../../utils/urlUtils';

const AddendumViewModal = ({ open, onClose, addendum }) => {
    if (!open || !addendum) return null;

    const isPositive = Number(addendum.valueChange) >= 0;
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    const formatDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy') : '-';

    const labelSx = { color: 'var(--modal-text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 };
    const valueSx = { color: 'var(--modal-text)', fontSize: '14px', fontWeight: 500 };

    return (
        <Dialog
            open={true}
            onClose={onClose}
            maxWidth={false}
            PaperProps={{
                sx: {
                    maxWidth: '560px', width: '95%',
                    background: 'var(--modal-gradient)',
                    border: '1px solid var(--modal-border)',
                    borderRadius: '18px',
                    boxShadow: '0 24px 60px rgba(15, 23, 42, 0.6)',
                    overflow: 'hidden',
                }
            }}
            BackdropProps={{
                sx: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.7)' }
            }}
        >
            {/* Header */}
            <Box sx={{
                p: '20px 28px', borderBottom: '1px solid var(--modal-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 42, height: 42, borderRadius: '12px',
                        background: isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: isPositive ? '#10b981' : '#f43f5e',
                        border: `1px solid ${isPositive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Visibility fontSize="small" />
                    </Box>
                    <Box>
                        <Typography fontWeight="bold" sx={{ color: 'var(--modal-text)', fontSize: '1rem' }}>
                            Aditivo {addendum.number}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--modal-text-muted)' }}>
                            Detalhes do termo aditivo
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'var(--modal-text-muted)', '&:hover': { color: 'var(--modal-text)' } }}>
                    <Close />
                </IconButton>
            </Box>

            {/* Body */}
            <Box sx={{ p: '28px' }}>
                {/* Impact Banner */}
                <Box sx={{
                    p: 2.5, mb: 3, borderRadius: '14px',
                    background: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                    border: `1px solid ${isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
                    display: 'flex', alignItems: 'center', gap: 2
                }}>
                    {isPositive ? <TrendingUp sx={{ color: '#10b981', fontSize: 28 }} /> : <TrendingDown sx={{ color: '#f43f5e', fontSize: 28 }} />}
                    <Box>
                        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: isPositive ? '#10b981' : '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {isPositive ? 'Acréscimo' : 'Supressão'}
                        </Typography>
                        <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: isPositive ? '#10b981' : '#f43f5e', lineHeight: 1.2 }}>
                            {formatCurrency(addendum.valueChange)}
                        </Typography>
                    </Box>
                </Box>

                <Grid container spacing={3}>
                    <Grid item xs={6}>
                        <Typography sx={labelSx}>Número</Typography>
                        <Typography sx={valueSx}>{addendum.number}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography sx={labelSx}>Data de Assinatura</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarToday sx={{ fontSize: 14, color: 'var(--modal-text-muted)' }} />
                            <Typography sx={valueSx}>{formatDate(addendum.signatureDate)}</Typography>
                        </Box>
                    </Grid>

                    {addendum.newEndDate && (
                        <Grid item xs={6}>
                            <Typography sx={labelSx}>Nova Vigência (Fim)</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarToday sx={{ fontSize: 14, color: 'var(--modal-text-muted)' }} />
                                <Typography sx={valueSx}>{formatDate(addendum.newEndDate)}</Typography>
                            </Box>
                        </Grid>
                    )}

                    {addendum.fileUrl && (
                        <Grid item xs={6}>
                            <Typography sx={labelSx}>Documento Anexo</Typography>
                            <Chip
                                icon={<Download />}
                                label="Abrir arquivo"
                                size="small"
                                clickable
                                onClick={() => window.open(getFileURL(addendum.fileUrl), '_blank')}
                                sx={{
                                    background: 'rgba(37, 99, 235, 0.15)',
                                    color: '#2563eb', fontWeight: 600,
                                    border: '1px solid rgba(37, 99, 235, 0.25)'
                                }}
                            />
                        </Grid>
                    )}

                    {addendum.description && (
                        <Grid item xs={12}>
                            <Typography sx={labelSx}>Descrição / Justificativa</Typography>
                            <Box sx={{
                                p: 2, borderRadius: '10px',
                                background: 'var(--modal-surface)',
                                border: '1px solid var(--modal-border)'
                            }}>
                                <Typography sx={{ ...valueSx, lineHeight: 1.6 }}>
                                    {addendum.description}
                                </Typography>
                            </Box>
                        </Grid>
                    )}
                </Grid>
            </Box>

            {/* Footer */}
            <Box sx={{
                p: '16px 28px', borderTop: '1px solid var(--modal-border)',
                display: 'flex', justifyContent: 'flex-end',
                backgroundColor: 'rgba(22, 29, 38, 0.5)'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        padding: '10px 24px', background: 'var(--modal-surface)',
                        color: 'var(--modal-text-secondary)', border: '1px solid var(--modal-border)',
                        borderRadius: '10px', cursor: 'pointer', fontWeight: 500, fontSize: '14px'
                    }}
                >
                    Fechar
                </button>
            </Box>
        </Dialog>
    );
};

export default AddendumViewModal;
