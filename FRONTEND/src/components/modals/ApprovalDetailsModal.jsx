import { useEffect, useState } from 'react';
import {
    Box, Typography, CircularProgress, Button, Divider, Chip
} from '@mui/material';
import { Description, AttachFile, Person, Business, CalendarToday, Payments, Label } from '@mui/icons-material';
import approvalService from '../../services/approval.service';
import { getFileURL } from '../../utils/urlUtils';
import StandardModal from '../common/StandardModal';

const DetailRow = ({ icon: Icon, label, value }) => {
    if (!value) return null;
    return (
        <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
            <Box sx={{ mt: 0.5, color: 'var(--modal-text-muted)' }}>
                <Icon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
                <Typography sx={{ fontSize: 12, color: 'var(--modal-text-muted)', fontWeight: 500 }}>{label}</Typography>
                <Typography sx={{ fontSize: 14, color: 'var(--modal-text)' }}>{value}</Typography>
            </Box>
        </Box>
    );
};

const ApprovalDetailsModal = ({ open, onClose, item }) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open && item) {
            setLoading(true);
            setError(null);
            approvalService.getDetail(item.type, item.id)
                .then(setDetails)
                .catch(err => {
                    console.error(err);
                    setError('Erro ao carregar detalhes.');
                })
                .finally(() => setLoading(false));
        } else {
            setDetails(null);
        }
    }, [open, item]);

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatDate = (date) => new Date(date).toLocaleDateString('pt-BR');

    if (!open) return null;

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title="Detalhes da aprovação"
            subtitle={item?.subtitle || item?.title || ' '}
            icon="assignment_turned_in"
            size="detail"
            loading={loading}
            footer={
                <Button type="button" onClick={onClose} disabled={loading}>
                    Fechar
                </Button>
            }
        >
            {item && (
                <Chip
                    label={item.type.toUpperCase()}
                    size="small"
                    sx={{ mb: 2, background: 'var(--modal-border-strong)', color: 'var(--modal-text-soft)', fontSize: 10, fontWeight: 700 }}
                />
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress sx={{ color: '#2563eb' }} />
                </Box>
            ) : error ? (
                <Box sx={{ textAlign: 'center', py: 4, color: '#ef4444' }}>
                    <Typography>{error}</Typography>
                </Box>
            ) : details ? (
                <Box>
                    <Box sx={{ mb: 4 }}>
                        <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--modal-text)', mb: 1 }}>
                            {item?.title || details.description || details.title || details.name}
                        </Typography>
                        <Typography sx={{ color: 'var(--modal-text-secondary)' }}>
                            {item?.subtitle || details.project?.name || 'Projeto não identificado'}
                        </Typography>
                    </Box>

                    <Divider sx={{ borderColor: 'var(--modal-border)', mb: 4 }} />

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                        <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#2563eb', mb: 2.5, textTransform: 'uppercase' }}>
                                Informações gerais
                            </Typography>

                            {(details.value !== undefined || details.amount !== undefined) && (
                                <DetailRow icon={Payments} label="Valor" value={formatCurrency(details.value ?? details.amount)} />
                            )}
                            {details.budget !== undefined && details.budget !== null && (
                                <DetailRow icon={Payments} label="Orçamento (projeto)" value={formatCurrency(details.budget)} />
                            )}
                            {(details.totalOpex != null || details.totalCapex != null) && (
                                <DetailRow
                                    icon={Payments}
                                    label="Totais (OPEX + CAPEX)"
                                    value={formatCurrency(
                                        Number(details.totalOpex || 0) + Number(details.totalCapex || 0)
                                    )}
                                />
                            )}

                            {(details.createdAt || details.date) && (
                                <DetailRow icon={CalendarToday} label="Data" value={formatDate(details.date || details.createdAt)} />
                            )}

                            {details.supplier && (
                                <DetailRow icon={Business} label="Fornecedor" value={details.supplier.name} />
                            )}

                            {details.requester && (
                                <DetailRow icon={Person} label="Solicitante" value={details.requester.name} />
                            )}

                            {details.manager && (
                                <DetailRow icon={Person} label="Gerente" value={details.manager.name} />
                            )}
                        </Box>

                        <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#2563eb', mb: 2.5, textTransform: 'uppercase' }}>
                                Detalhes específicos
                            </Typography>

                            {details.description && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography sx={{ fontSize: 12, color: 'var(--modal-text-muted)', mb: 0.5 }}>Descrição</Typography>
                                    <Typography sx={{ color: 'var(--modal-text-soft)' }}>{details.description}</Typography>
                                </Box>
                            )}

                            {details.notes && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography sx={{ fontSize: 12, color: 'var(--modal-text-muted)', mb: 0.5 }}>Notas</Typography>
                                    <Typography sx={{ color: 'var(--modal-text-soft)' }}>{details.notes}</Typography>
                                </Box>
                            )}

                            {details.invoiceNumber && (
                                <DetailRow icon={Label} label="Nota fiscal" value={details.invoiceNumber} />
                            )}

                            {details.validity && (
                                <DetailRow icon={CalendarToday} label="Validade da proposta" value={formatDate(details.validity)} />
                            )}

                            {(details.fileUrl || details.meetingLink) && (
                                <Box sx={{ mt: 3, p: 2, background: 'var(--modal-surface-subtle)', borderRadius: '8px'}}>
                                    {details.fileUrl && (
                                        <Button
                                            startIcon={<AttachFile />}
                                            variant="outlined"
                                            fullWidth
                                            onClick={() => window.open(getFileURL(details.fileUrl), '_blank')}
                                            sx={{ borderColor: 'var(--modal-border-strong)', color: 'var(--modal-text-soft)', justifyContent: 'flex-start', mb: 1 }}
                                        >
                                            Visualizar anexo
                                        </Button>
                                    )}
                                    {details.meetingLink && (
                                        <Button
                                            startIcon={<Description />}
                                            variant="outlined"
                                            fullWidth
                                            onClick={() => window.open(details.meetingLink, '_blank')}
                                            sx={{ borderColor: 'var(--modal-border-strong)', color: 'var(--modal-text-soft)', justifyContent: 'flex-start' }}
                                        >
                                            Entrar na reunião
                                        </Button>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {item?.type === 'gmud' && (
                        <Box sx={{ mt: 3 }}>
                            <Typography sx={{ fontSize: 14, color: '#f59e0b', mb: 1 }}>Risco: {details.riskLevel}</Typography>
                            <Typography sx={{ fontSize: 14, color: '#ec4899' }}>Impacto: {details.impact}</Typography>
                        </Box>
                    )}
                </Box>
            ) : null}
        </StandardModal>
    );
};

export default ApprovalDetailsModal;
