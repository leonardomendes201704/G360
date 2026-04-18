import { Box, Typography, Grid, Chip, Button } from '@mui/material';
import { Download, CalendarToday, TrendingUp, TrendingDown } from '@mui/icons-material';
import { format } from 'date-fns';
import { getFileURL } from '../../utils/urlUtils';
import StandardModal from '../common/StandardModal';

const AddendumViewModal = ({ open, onClose, addendum }) => {
    if (!open || !addendum) return null;

    const isPositive = Number(addendum.valueChange) >= 0;
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    const formatDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy') : '-';

    const labelSx = { color: 'var(--modal-text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.5 };
    const valueSx = { color: 'var(--modal-text)', fontSize: '14px', fontWeight: 500 };

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title={`Aditivo ${addendum.number}`}
            subtitle="Detalhes do termo aditivo"
            icon="visibility"
            size="detail"
            footer={
                <Button type="button" onClick={onClose} variant="outlined" color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
                    Fechar
                </Button>
            }
        >
            <Box sx={{
                p: 2.5, mb: 3, borderRadius: '8px',
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
                    <Typography sx={labelSx}>Data de assinatura</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarToday sx={{ fontSize: 14, color: 'var(--modal-text-muted)' }} />
                        <Typography sx={valueSx}>{formatDate(addendum.signatureDate)}</Typography>
                    </Box>
                </Grid>

                {addendum.newEndDate && (
                    <Grid item xs={6}>
                        <Typography sx={labelSx}>Nova vigência (fim)</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarToday sx={{ fontSize: 14, color: 'var(--modal-text-muted)' }} />
                            <Typography sx={valueSx}>{formatDate(addendum.newEndDate)}</Typography>
                        </Box>
                    </Grid>
                )}

                {addendum.fileUrl && (
                    <Grid item xs={6}>
                        <Typography sx={labelSx}>Documento anexo</Typography>
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
                        <Typography sx={labelSx}>Descrição / justificativa</Typography>
                        <Box sx={{
                            p: 2, borderRadius: '8px',
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
        </StandardModal>
    );
};

export default AddendumViewModal;
