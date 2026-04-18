import { useState, useEffect, useContext, useMemo } from 'react';
import { useSnackbar } from 'notistack';
import { Box, Button, IconButton, Typography, Tooltip, useTheme } from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';

import ExpenseModal from '../../components/modals/ExpenseModal';
import ExpenseApprovalModal from '../../components/modals/ExpenseApprovalModal';
import SubmitExpenseModal from '../../components/modals/SubmitExpenseModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import DataListTable from '../../components/common/DataListTable';
import { getExpenseListColumns } from './expenseListColumns';
import { sortExpenseRows } from './expenseListSort';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../../services/expense.service';
import { getErrorMessage } from '../../utils/errorUtils';

const ExpensesPage = () => {
    const { mode } = useContext(ThemeContext);
    const { hasPermission } = useContext(AuthContext);

    // Permission detection using granular RBAC
    const canManageExpenses = hasPermission('FINANCE', 'WRITE');
    const canApproveOrEditExpense = hasPermission('FINANCE', 'WRITE');
    const canSubmitForApprovalFlow = hasPermission('FINANCE', 'WRITE') || hasPermission('FINANCE', 'EDIT_BUDGET');
    const theme = useTheme();

    const [tabValue, setTabValue] = useState(0); // 0=Todas, 1=A Pagar, 2=Pagas
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expenses, setExpenses] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [submitItem, setSubmitItem] = useState(null);
    const [approvalModalOpen, setApprovalModalOpen] = useState(false);

    // Deletion Request Utils
    const [deletionModalOpen, setDeletionModalOpen] = useState(false);
    const [deletionJustification, setDeletionJustification] = useState('');
    const [expenseToDelete, setExpenseToDelete] = useState(null);

    const { enqueueSnackbar } = useSnackbar();

    // Theme-aware styles
    const cardStyle = {
        bgcolor: mode === 'dark' ? 'background.paper' : '#FFFFFF',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px',
        boxShadow: mode === 'dark' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    };

    const textPrimary = mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary;
    const textSecondary = mode === 'dark' ? '#64748b' : theme.palette.text.secondary;
    const textMuted = mode === 'dark' ? '#94a3b8' : theme.palette.text.disabled;
    const surfaceBg = mode === 'dark' ? '#1c2632' : theme.palette.background.default;
    const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : theme.palette.divider;

    const actionBtnStyle = (type = 'edit') => ({
        width: 32, height: 32, borderRadius: '8px',
        background: type === 'delete' ? 'rgba(244, 63, 94, 0.1)' : type === 'success' ? 'rgba(16, 185, 129, 0.1)' : surfaceBg,
        border: `1px solid ${borderColor}`,
        color: type === 'delete' ? '#f43f5e' : type === 'success' ? '#10b981' : textMuted,
        '&:hover': {
            background: type === 'delete' ? 'rgba(244, 63, 94, 0.2)' : type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(37, 99, 235, 0.15)',
            color: type === 'delete' ? '#f43f5e' : type === 'success' ? '#10b981' : '#2563eb',
            borderColor: type === 'delete' ? '#f43f5e' : type === 'success' ? '#10b981' : '#2563eb'
        },
        '&:disabled': {
            opacity: 0.4,
            cursor: 'not-allowed'
        }
    });

    const inputStyle = {
        background: mode === 'dark' ? '#1c2632' : '#FFFFFF',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '10px 16px',
        color: textPrimary,
        fontSize: '14px'
    };

    const fetchExpenses = async () => {
        try { const data = await getExpenses(); setExpenses(data); }
        catch (e) { console.error(e); enqueueSnackbar(getErrorMessage(e, 'Erro ao carregar despesas'), { variant: 'error' }); }
    };

    useEffect(() => { fetchExpenses(); }, []);

    const handleSave = async (data) => {
        try {
            const payload = { ...data };

            if (selectedItem) await updateExpense(selectedItem.id, payload);
            else {
                // Novas despesas: financeiro auto-submete, manager salva como PREVISTO
                if (!payload.status || payload.status === 'PREVISTO') {
                    payload.status = 'AGUARDANDO_APROVACAO';
                }
                await createExpense(payload);
            }

            enqueueSnackbar(selectedItem ? 'Despesa salva!' : 'Despesa criada e enviada para aprovação!', { variant: 'success' });
            setModalOpen(false); fetchExpenses();
        } catch (e) {
            enqueueSnackbar(getErrorMessage(e, 'Erro ao salvar despesa.'), { variant: 'error' });
        }
    };

    const handleSubmitForApproval = async (data) => {
        try {
            await updateExpense(data.id, data);
            enqueueSnackbar('Despesa enviada para aprovação!', { variant: 'success' });
            setSubmitModalOpen(false);
            setSubmitItem(null);
            fetchExpenses();
        } catch (e) {
            enqueueSnackbar(getErrorMessage(e, 'Erro ao enviar para aprovação.'), { variant: 'error' });
        }
    };

    const handleOpenSubmit = (item) => {
        setSubmitItem(item);
        setSubmitModalOpen(true);
    };

    const handleDeleteClick = (item) => {
        if (item.status === 'PAGO') {
            setExpenseToDelete(item);
            setDeletionJustification('');
            setDeletionModalOpen(true);
        } else {
            setDeleteId(item.id);
            setConfirmOpen(true);
        }
    };

    const handleRequestDeletion = async () => {
        if (!deletionJustification.trim()) {
            enqueueSnackbar('A justificativa é obrigatória.', { variant: 'warning' });
            return;
        }
        try {
            // Updating status to AGUARDANDO_EXCLUSAO and adding note
            // Note: Reuse updateExpense as we don't assume a specific endpoint exists yet
            await updateExpense(expenseToDelete.id, {
                status: 'AGUARDANDO_EXCLUSAO',
                approvalNotes: `SOLICITAÇÃO DE EXCLUSÃO: ${deletionJustification}`
            });
            enqueueSnackbar('Solicitação de exclusão enviada para aprovação.', { variant: 'success' });
            setDeletionModalOpen(false);
            fetchExpenses();
        } catch (e) {
            enqueueSnackbar(getErrorMessage(e, 'Erro ao solicitar exclusão'), { variant: 'error' });
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteExpense(deleteId);
            fetchExpenses();
            enqueueSnackbar('Despesa excluída com sucesso.', { variant: 'success' });
            setConfirmOpen(false);
            setDeleteId(null);
        } catch (e) {
            enqueueSnackbar(getErrorMessage(e, 'Erro ao excluir despesa.'), { variant: 'error' });
        }
    };

    const handleOpenApproval = (item) => { setSelectedItem(item); setApprovalModalOpen(true); };

    const handleConfirmApproval = async (data) => {
        try {
            await updateExpense(data.id, data);
            enqueueSnackbar('Despesa aprovada e NF anexada!', { variant: 'success' });
            setApprovalModalOpen(false);
            setSelectedItem(null);
            fetchExpenses();
        } catch (e) {
            enqueueSnackbar(getErrorMessage(e, 'Erro ao aprovar despesa'), { variant: 'error' });
        }
    };

    const handlePay = async (item) => {
        const errors = [];
        if (!item.invoiceNumber) errors.push('Número da NF');
        if (!item.dueDate) errors.push('Data de Vencimento');
        // if (!item.paymentDate) errors.push('Data de Pagamento'); // Usually set on action, but checked strictly in backend now?
        // Let's assume user must edit if missing.

        if (errors.length > 0) {
            enqueueSnackbar(`Para pagar, preencha: ${errors.join(', ')}`, { variant: 'warning' });
            handleOpenEdit(item); // Open modal to fix
            return;
        }

        if (!item.fileUrl) {
            enqueueSnackbar('É necessário anexar a NF antes de pagar.', { variant: 'warning' });
            return;
        }
        try {
            await updateExpense(item.id, { status: 'PAGO', paymentDate: new Date() });
            enqueueSnackbar('Despesa marcada como PAGA!', { variant: 'success' });
            fetchExpenses();
        } catch (e) {
            enqueueSnackbar(getErrorMessage(e, 'Erro ao pagar despesa'), { variant: 'error' });
        }
    };

    const handleOpenEdit = (item) => { setSelectedItem(item); setModalOpen(true); };
    const handleOpenCreate = () => { setSelectedItem(null); setModalOpen(true); };

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // Filtros (ordenação na DataListTable)
    const filtered = useMemo(
        () =>
            expenses.filter((e) => {
                const status = (e.status || '').toUpperCase();
                const matchesTab =
                    tabValue === 0 ||
                    (tabValue === 1 && (status === 'PREVISTO' || status === 'ATRASADO')) ||
                    (tabValue === 2 && (status === 'PAGO' || status === 'APROVADO'));
                const matchesSearch =
                    (e.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (e.supplier?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
                let matchesDate = true;
                if (startDate) matchesDate = matchesDate && new Date(e.date) >= new Date(startDate);
                if (endDate) matchesDate = matchesDate && new Date(e.date) <= new Date(endDate);
                return matchesTab && matchesSearch && matchesDate;
            }),
        [expenses, tabValue, searchTerm, startDate, endDate]
    );

    const expensesResetKey = useMemo(
        () => [searchTerm, startDate, endDate, tabValue, expenses.length].join('|'),
        [searchTerm, startDate, endDate, tabValue, expenses.length]
    );

    // KPIs
    const totalPending = expenses.filter(e => {
        const s = (e.status || '').toUpperCase();
        return s !== 'PAGO' && s !== 'APROVADO' && s !== 'CANCELADO';
    }).reduce((acc, e) => acc + Number(e.amount), 0);

    const totalPaid = expenses.filter(e => {
        const s = (e.status || '').toUpperCase();
        return s === 'PAGO' || s === 'APROVADO';
    }).reduce((acc, e) => acc + Number(e.amount), 0);

    const tabs = [
        { id: 0, label: 'Todas' },
        { id: 1, label: 'A Pagar' },
        { id: 2, label: 'Realizadas' }
    ];

    return (
        <Box>
            {/* Header with Stats */}
            <Box sx={{ ...cardStyle, p: 3, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 56, height: 56, borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <span className="material-icons-round" style={{ color: '#10b981', fontSize: '28px' }}>receipt_long</span>
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>Contas a Pagar</Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '11px', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total a Pagar</Typography>
                        <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#f43f5e' }}>{formatCurrency(totalPending)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', borderLeft: `1px solid ${borderColor}`, pl: 4 }}>
                        <Typography sx={{ fontSize: '11px', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Realizado</Typography>
                        <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{formatCurrency(totalPaid)}</Typography>
                    </Box>
                    {canManageExpenses && (
                    <Button onClick={handleOpenCreate} sx={{
                        ml: 2, padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
                    }} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}>
                        Lançar Despesa
                    </Button>
                    )}
                </Box>
            </Box>

            {/* Toolbar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                {/* Search */}
                {/* Search & Filters */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 2, flex: 1, flexWrap: 'wrap'
                }}>
                    <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 2,
                        background: surfaceBg, border: `1px solid ${borderColor}`,
                        borderRadius: '8px', padding: '10px 16px', flex: 1, minWidth: '250px'
                    }}>
                        <span className="material-icons-round" style={{ color: textSecondary, fontSize: '20px' }}>search</span>
                        <input
                            placeholder="Buscar por descrição ou fornecedor"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                                color: textPrimary, fontSize: '14px'
                            }}
                        />
                    </Box>

                    {/* Date Filters */}
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={inputStyle}
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={inputStyle}
                    />
                </Box>

                {/* Filter Tabs */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setTabValue(tab.id)}
                            style={{
                                padding: '10px 20px', borderRadius: '8px',
                                background: tabValue === tab.id ? '#2563eb' : surfaceBg,
                                border: tabValue === tab.id ? 'none' : `1px solid ${borderColor}`,
                                color: tabValue === tab.id ? 'white' : textMuted,
                                fontSize: '14px', fontWeight: 500, cursor: 'pointer'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </Box>
            </Box>

            <DataListTable
                dataTestidTable="tabela-despesas"
                shell={{
                    title: 'Contas a Pagar',
                    titleIcon: 'receipt_long',
                    accentColor: '#10b981',
                    count: filtered.length,
                    sx: { ...cardStyle, overflow: 'hidden' },
                }}
                columns={getExpenseListColumns({
                    formatCurrency,
                    textPrimary,
                    textSecondary,
                    borderColor,
                    surfaceBg,
                    actionBtnStyle,
                    canSubmitForApprovalFlow,
                    canApproveOrEditExpense,
                    onOpenSubmit: handleOpenSubmit,
                    onOpenApproval: handleOpenApproval,
                    onOpenEdit: handleOpenEdit,
                    onDelete: handleDeleteClick,
                })}
                rows={filtered}
                sortRows={sortExpenseRows}
                defaultOrderBy="date"
                defaultOrder="desc"
                getDefaultOrderForColumn={(colId) =>
                    colId === 'date' || colId === 'dueDate' || colId === 'amount' ? 'desc' : 'asc'
                }
                resetPaginationKey={expensesResetKey}
                emptyMessage="Nenhuma despesa encontrada."
                emptyContent={
                    canManageExpenses
                        ? (
                            <EmptyState
                                icon={<span className="material-icons-round" style={{ fontSize: 'inherit' }}>receipt_long</span>}
                                title="Nenhuma despesa encontrada"
                                description="Ajuste os filtros de busca ou lance uma nova despesa para começar."
                                actionLabel="Lançar Despesa"
                                actionIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
                                onAction={handleOpenCreate}
                                compact
                            />
                        )
                        : undefined
                }
            />

            <ExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} expense={selectedItem} />
            <ExpenseApprovalModal
                open={approvalModalOpen}
                onClose={() => { setApprovalModalOpen(false); setSelectedItem(null); }}
                onConfirm={handleConfirmApproval}
                expense={selectedItem}
            />
            <SubmitExpenseModal open={submitModalOpen} onClose={() => { setSubmitModalOpen(false); setSubmitItem(null); }} onSubmit={handleSubmitForApproval} expense={submitItem} />
            <ConfirmDialog open={confirmOpen} title="Excluir Despesa" content="Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita." onConfirm={handleConfirmDelete} onClose={() => setConfirmOpen(false)} />

            {/* Modal de Justificativa de Exclusão */}
            <ConfirmDialog
                open={deletionModalOpen}
                title="Solicitar Exclusão"
                content={
                    <Box>
                        <Typography sx={{ color: '#94a3b8', mb: 2 }}>Esta despesa já foi paga. Para excluí-la, é necessário fornecer uma justificativa e aguardar aprovação.</Typography>
                        <textarea
                            value={deletionJustification}
                            onChange={(e) => setDeletionJustification(e.target.value)}
                            placeholder="Descreva o motivo da exclusão..."
                            style={{
                                width: '100%', minHeight: '100px',
                                background: '#131920', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px', padding: '12px',
                                color: '#f1f5f9', fontSize: '14px', resize: 'vertical'
                            }}
                        />
                    </Box>
                }
                onConfirm={handleRequestDeletion}
                onClose={() => setDeletionModalOpen(false)}
                confirmText="Enviar Solicitação"
            />
        </Box>
    );
};

export default ExpensesPage;