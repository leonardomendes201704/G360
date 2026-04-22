import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Button, IconButton, Chip, CircularProgress, TextField, Tooltip, Checkbox, FormControlLabel, Paper, useTheme } from '@mui/material';
import { useSnackbar } from 'notistack';
import { ThemeContext } from '../../contexts/ThemeContext';
import approvalService from '../../services/approval.service';
import ApprovalDetailsModal from '../../components/modals/ApprovalDetailsModal';
import EmptyState from '../../components/common/EmptyState';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import StatsCard from '../../components/common/StatsCard';
import StandardModal from '../../components/common/StandardModal';
import KpiGrid from '../../components/common/KpiGrid';
import PageTitleCard from '../../components/common/PageTitleCard';

const formatCurrency = (val) => val ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val) : '-';
const formatDate = (date) => date ? new Date(date).toLocaleDateString('pt-BR') : '-';

const typeConfig = {
    expense: { label: 'Despesa', icon: 'payments', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.15)' },
    projectCost: { label: 'Custo Projeto', icon: 'folder', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    minute: { label: 'Ata', icon: 'description', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
    gmud: { label: 'GMUD', icon: 'build', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    project: { label: 'Projeto', icon: 'work', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    proposal: { label: 'Proposta', icon: 'handshake', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
    budget: { label: 'Orçamento', icon: 'account_balance', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
};

/** Tabs na URL / notificações (singular) e KPIs (plural) — ver tabToPendingApiType para GET /approvals/pending */
const VALID_TABS = [
    'all',
    'expense', 'expenses',
    'projectCost', 'projectCosts',
    'minute', 'minutes',
    'gmud', 'gmuds',
    'project', 'projects',
    'proposal', 'proposals',
    'budget', 'budgets',
];

/** Backend getPending espera type plural (expenses, projectCosts, …). */
function tabToPendingApiType(tab) {
    if (!tab || tab === 'all') return null;
    const map = {
        expense: 'expenses',
        expenses: 'expenses',
        projectCost: 'projectCosts',
        projectCosts: 'projectCosts',
        minute: 'minutes',
        minutes: 'minutes',
        gmud: 'gmuds',
        gmuds: 'gmuds',
        project: 'projects',
        projects: 'projects',
        proposal: 'proposals',
        proposals: 'proposals',
        budget: 'budgets',
        budgets: 'budgets',
    };
    return map[tab] ?? tab;
}

const MyApprovalsPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { enqueueSnackbar } = useSnackbar();
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();

    const [counts, setCounts] = useState({
        expenses: 0, projectCosts: 0, minutes: 0, gmuds: 0, projects: 0, proposals: 0, budgets: 0, total: 0,
    });
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [rejectDialog, setRejectDialog] = useState({ open: false, item: null });
    const [rejectReason, setRejectReason] = useState('');
    const [requiresAdjustment, setRequiresAdjustment] = useState(false);

    const [processing, setProcessing] = useState(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Theme-aware styles
    const textPrimary = mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary;
    const textSecondary = mode === 'dark' ? '#64748b' : theme.palette.text.secondary;
    const surfaceBg = mode === 'dark' ? '#1c2632' : theme.palette.background.default;
    const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : theme.palette.divider;

    const cardStyle = {
        bgcolor: mode === 'dark' ? 'background.paper' : '#FFFFFF',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: mode === 'dark' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    };

    const fetchData = async (isTabSwitch = false) => {
        if (isTabSwitch) {
            setSwitching(true);
        } else {
            setLoading(true);
        }
        try {
            const [countsData, itemsData] = await Promise.all([
                approvalService.getCounts(),
                approvalService.getPending(tabToPendingApiType(activeTab))
            ]);
            setCounts(countsData);
            setItems(itemsData);
        } catch (error) {
            enqueueSnackbar('Erro ao carregar aprovações', { variant: 'error' });
        } finally {
            setLoading(false);
            setSwitching(false);
        }
    };

    useEffect(() => {
        const t = searchParams.get('tab');
        if (t && VALID_TABS.includes(t)) {
            setActiveTab(t);
        }
    }, [searchParams]);

    const isFirstLoad = items.length === 0 && loading;
    useEffect(() => {
        const scrollY = window.scrollY;
        fetchData(!isFirstLoad).then(() => {
            window.scrollTo(0, scrollY);
        });
    }, [activeTab]);

    const handleApprove = async (item) => {
        setProcessing(item.id);
        try {
            await approvalService.approve(item.type, item.id);
            enqueueSnackbar('Aprovado com sucesso!', { variant: 'success' });
            fetchData();
        } catch (error) {
            enqueueSnackbar('Erro ao aprovar', { variant: 'error' });
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async () => {
        if (!rejectDialog.item) return;
        if (!rejectReason.trim()) {
            enqueueSnackbar('Motivo da rejeição é obrigatório', { variant: 'warning' });
            return;
        }
        setProcessing(rejectDialog.item.id);
        try {
            await approvalService.reject(rejectDialog.item.type, rejectDialog.item.id, rejectReason, requiresAdjustment);
            enqueueSnackbar(requiresAdjustment ? 'Devolvido para ajustes' : 'Rejeitado definitivamente', { variant: 'info' });
            setRejectDialog({ open: false, item: null });
            setRejectReason('');
            setRequiresAdjustment(false);
            fetchData();
        } catch (error) {
            enqueueSnackbar('Erro ao rejeitar', { variant: 'error' });
        } finally {
            setProcessing(null);
        }
    };

    const getItemLabel = (type) => {
        if (type === 'minute') return 'a ata';
        if (type === 'projectCost') return 'o custo';
        if (type === 'proposal') return 'a proposta';
        if (type === 'project') return 'o projeto';
        if (type === 'gmud') return 'a GMUD';
        if (type === 'budget') return 'o orçamento';
        if (type === 'expense') return 'a despesa';
        return 'o item';
    };

    const handleViewDetails = (item) => {
        setSelectedItem(item);
        setDetailsModalOpen(true);
    };

    return (
        <Box>
            <PageTitleCard
                iconName="fact_check"
                title="Minhas Aprovações"
                subtitle="Central de aprovações pendentes de todos os módulos"
            />

            {/* Summary Cards — usando StatsCard + KpiGrid padrao (8: Todas + 7 tipos) */}
            <KpiGrid maxColumns={8} maxColumnsMd={8} mb={1.5}>
                {[
                    { key: 'all', label: 'Todas', iconName: 'inbox', hexColor: '#64748b' },
                    { key: 'expenses', label: 'Despesas', iconName: 'payments', hexColor: '#2563eb' },
                    { key: 'projectCosts', label: 'Custos Projeto', iconName: 'folder', hexColor: '#3b82f6' },
                    { key: 'minutes', label: 'Atas', iconName: 'description', hexColor: '#06b6d4' },
                    { key: 'gmuds', label: 'GMUDs', iconName: 'build', hexColor: '#f59e0b' },
                    { key: 'projects', label: 'Projetos', iconName: 'work', hexColor: '#10b981' },
                    { key: 'proposals', label: 'Propostas', iconName: 'handshake', hexColor: '#ec4899' },
                    { key: 'budgets', label: 'Orçamentos', iconName: 'account_balance', hexColor: '#8b5cf6' },
                ].map((card) => (
                    <StatsCard
                        key={card.key}
                        title={card.label}
                        value={card.key === 'all' ? counts.total : counts[card.key]}
                        iconName={card.iconName}
                        hexColor={card.hexColor}
                        active={activeTab === card.key}
                        onClick={() => setActiveTab(card.key)}
                    />
                ))}
            </KpiGrid>

            {/* Items List */}
            <Paper sx={{ ...cardStyle, position: 'relative', minHeight: 300 }}>
                <LoadingOverlay loading={loading || switching} />
                {items.length === 0 && !loading && !switching ? (
                    <EmptyState
                        icon={<span className="material-icons-round" style={{ fontSize: 'inherit' }}>check_circle</span>}
                        title="Nenhuma aprovação pendente"
                        description="Todos os itens foram processados. Quando novos itens precisarem de sua aprovação, eles aparecerão aqui."
                    />
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {items.map((item) => {
                            const config = typeConfig[item.type] || typeConfig.expense;
                            return (
                                <Box
                                    key={`${item.type}-${item.id}`}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 1.5, p: 1,
                                        background: surfaceBg, borderRadius: '8px', transition: 'all 0.2s',
                                        '&:hover': { background: mode === 'dark' ? '#232f3e' : theme.palette.action.hover }
                                    }}
                                >
                                    {/* Type Icon */}
                                    <Box sx={{ width: 36, height: 36, borderRadius: '6px', background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="material-icons-round" style={{ color: config.color, fontSize: 18 }}>{config.icon}</span>
                                    </Box>

                                    {/* Info */}
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{item.title}</Typography>
                                            <Chip label={config.label} size="small" sx={{ background: config.bg, color: config.color, fontSize: 9, height: 18, fontWeight: 600 }} />
                                        </Box>
                                        <Typography sx={{ fontSize: 12, color: textSecondary }}>
                                            {item.subtitle}
                                            {item.supplier && ` • ${item.supplier}`}
                                            {item.invoiceNumber && ` • NF: ${item.invoiceNumber}`}
                                        </Typography>
                                    </Box>

                                    {/* Value */}
                                    <Box sx={{ textAlign: 'right', minWidth: 100 }}>
                                        <Typography sx={{ fontSize: 16, fontWeight: 600, color: item.value ? textPrimary : textSecondary }}>
                                            {formatCurrency(item.value)}
                                        </Typography>
                                        <Typography sx={{ fontSize: 11, color: textSecondary }}>{formatDate(item.createdAt)}</Typography>
                                    </Box>

                                    {/* Actions */}
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <Tooltip title="Ver Detalhes">
                                            <IconButton
                                                onClick={() => handleViewDetails(item)}
                                                sx={{
                                                    width: 32, height: 32, p: 0.5, borderRadius: '6px',
                                                    background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb',
                                                    '&:hover': { background: '#2563eb', color: 'white' }
                                                }}
                                            >
                                                <span className="material-icons-round" style={{ fontSize: 16 }}>visibility</span>
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Aprovar">
                                            <IconButton
                                                onClick={() => handleApprove(item)}
                                                disabled={processing === item.id}
                                                sx={{
                                                    width: 32, height: 32, p: 0.5, borderRadius: '6px',
                                                    background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                                                    '&:hover': { background: '#10b981', color: 'white' },
                                                    '&:disabled': { opacity: 0.5 }
                                                }}
                                            >
                                                {processing === item.id ? <CircularProgress size={14} sx={{ color: '#10b981' }} /> : <span className="material-icons-round" style={{ fontSize: 16 }}>check</span>}
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Rejeitar">
                                            <IconButton
                                                onClick={() => setRejectDialog({ open: true, item })}
                                                disabled={processing === item.id}
                                                sx={{
                                                    width: 32, height: 32, p: 0.5, borderRadius: '6px',
                                                    background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e',
                                                    '&:hover': { background: '#f43f5e', color: 'white' },
                                                    '&:disabled': { opacity: 0.5 }
                                                }}
                                            >
                                                <span className="material-icons-round" style={{ fontSize: 16 }}>close</span>
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Paper>

            <StandardModal
                open={rejectDialog.open}
                onClose={() => {
                    if (processing === rejectDialog.item?.id) return;
                    setRejectDialog({ open: false, item: null });
                    setRequiresAdjustment(false);
                }}
                title="Rejeitar Item"
                icon="block"
                size="form"
                loading={processing === rejectDialog.item?.id}
                footer={
                    <>
                        <Button onClick={() => { setRejectDialog({ open: false, item: null }); setRequiresAdjustment(false); }} sx={{ color: 'text.secondary' }}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleReject}
                            variant="contained"
                            disabled={processing === rejectDialog.item?.id || !rejectReason.trim()}
                            sx={{
                                background: requiresAdjustment ? '#f59e0b' : '#f43f5e',
                                '&:hover': { background: requiresAdjustment ? '#d97706' : '#dc2626' }
                            }}
                        >
                            {requiresAdjustment ? 'Devolver para Ajustes' : 'Rejeitar Definitivo'}
                        </Button>
                    </>
                }
            >
                    <Typography sx={{ color: 'text.secondary', mb: 2 }}>
                        Rejeitando:{' '}
                        <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {rejectDialog.item?.title}
                        </Box>
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Motivo da rejeição *"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        sx={{ mb: 2 }}
                    />

                    {(rejectDialog.item?.type === 'project' || rejectDialog.item?.type === 'minute' || rejectDialog.item?.type === 'projectCost' || rejectDialog.item?.type === 'proposal' || rejectDialog.item?.type === 'gmud' || rejectDialog.item?.type === 'expense') && (
                        <Box sx={{
                            p: 2,
                            background: requiresAdjustment ? 'rgba(245, 158, 11, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                            borderRadius: '8px',
                            border: `1px solid ${requiresAdjustment ? '#f59e0b40' : '#f43f5e40'}`,
                            transition: 'all 0.2s'
                        }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={requiresAdjustment}
                                        onChange={(e) => setRequiresAdjustment(e.target.checked)}
                                        sx={{ color: '#f59e0b', '&.Mui-checked': { color: '#f59e0b' } }}
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                                            Permitir ajustes e reenvio
                                        </Typography>
                                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                                            {requiresAdjustment
                                                ? `O criador poderá editar e reenviar ${getItemLabel(rejectDialog.item?.type)} para aprovação.`
                                                : `Rejeição definitiva - ${getItemLabel(rejectDialog.item?.type)} ficará somente leitura.`}
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Box>
                    )}
            </StandardModal>

            <ApprovalDetailsModal
                open={detailsModalOpen}
                onClose={() => setDetailsModalOpen(false)}
                item={selectedItem}
            />
        </Box>
    );
};

export default MyApprovalsPage;
