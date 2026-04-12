import { useState, useEffect, useContext, useMemo } from 'react';
import { useSnackbar } from 'notistack';
import { Box, Button, IconButton, Typography, Paper, Tooltip, useTheme } from '@mui/material';
import { format } from 'date-fns';
import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';

import ExpenseModal from '../../components/modals/ExpenseModal';
import SubmitExpenseModal from '../../components/modals/SubmitExpenseModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../../services/expense.service';
import { getErrorMessage } from '../../utils/errorUtils';
import { getFileURL } from '../../utils/urlUtils';

const ExpensesPage = () => {
    const { mode } = useContext(ThemeContext);
    const { user, hasPermission } = useContext(AuthContext);

    // Permission detection using granular RBAC
    const canManageExpenses = hasPermission('FINANCE', 'WRITE');
    const canViewExpenses = hasPermission('FINANCE', 'VIEW_INVOICES');

    const canApproveOrEditExpense = hasPermission('FINANCE', 'WRITE');
    const canSubmitForApprovalFlow = hasPermission('FINANCE', 'WRITE') || hasPermission('FINANCE', 'EDIT_BUDGET');
    const theme = useTheme();

    const [tabValue, setTabValue] = useState(0); // 0=Todas, 1=A Pagar, 2=Pagas
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortBy, setSortBy] = useState('date'); // date, amount, status
    const [sortDesc, setSortDesc] = useState(true);

    const [expenses, setExpenses] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [submitItem, setSubmitItem] = useState(null);

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
        borderRadius: '16px',
        boxShadow: mode === 'dark' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    };

    const textPrimary = mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary;
    const textSecondary = mode === 'dark' ? '#64748b' : theme.palette.text.secondary;
    const textMuted = mode === 'dark' ? '#94a3b8' : theme.palette.text.disabled;
    const surfaceBg = mode === 'dark' ? '#1c2632' : theme.palette.background.default;
    const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : theme.palette.divider;

    const tableHeaderStyle = {
        background: surfaceBg,
        color: textSecondary,
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        padding: '14px 16px',
        borderBottom: `1px solid ${borderColor}`,
        textAlign: 'left'
    };

    const tableCellStyle = {
        color: textPrimary,
        fontSize: '13px',
        padding: '14px 16px',
        borderBottom: `1px solid ${borderColor}`
    };

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
        borderRadius: '12px',
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

    // Filtros e Ordenação
    const filtered = expenses.filter(e => {
        const status = (e.status || '').toUpperCase();
        const matchesTab = (
            tabValue === 0 ||
            (tabValue === 1 && (status === 'PREVISTO' || status === 'ATRASADO')) ||
            (tabValue === 2 && (status === 'PAGO' || status === 'APROVADO'))
        );
        const matchesSearch = (
            e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        let matchesDate = true;
        if (startDate) matchesDate = matchesDate && new Date(e.date) >= new Date(startDate);
        if (endDate) matchesDate = matchesDate && new Date(e.date) <= new Date(endDate);

        return matchesTab && matchesSearch && matchesDate;
    }).sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (sortBy === 'date' || sortBy === 'dueDate') {
            valA = new Date(valA || 0).getTime();
            valB = new Date(valB || 0).getTime();
        } else if (sortBy === 'amount') {
            valA = Number(valA);
            valB = Number(valB);
        }

        if (valA < valB) return sortDesc ? 1 : -1;
        if (valA > valB) return sortDesc ? -1 : 1;
        return 0;
    });

    // KPIs
    const totalPending = expenses.filter(e => {
        const s = (e.status || '').toUpperCase();
        return s !== 'PAGO' && s !== 'APROVADO' && s !== 'CANCELADO';
    }).reduce((acc, e) => acc + Number(e.amount), 0);

    const totalPaid = expenses.filter(e => {
        const s = (e.status || '').toUpperCase();
        return s === 'PAGO' || s === 'APROVADO';
    }).reduce((acc, e) => acc + Number(e.amount), 0);

    const getStatusBadge = (status) => {
        const configs = {
            'PREVISTO': { label: 'Previsto', bg: '#1c2632', color: '#94a3b8' },
            'PENDENTE': { label: 'Pendente', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
            'AGUARDANDO_APROVACAO': { label: 'Aguardando Aprovação', bg: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' },
            'APROVADO': { label: 'Aprovado', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
            'ATRASADO': { label: 'Atrasado', bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' },
            'PAGO': { label: 'Pago', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
            'CANCELADO': { label: 'Cancelado', bg: 'rgba(100, 116, 139, 0.15)', color: '#64748b' }
        };
        const config = configs[status] || configs['PREVISTO'];
        return (
            <span style={{ padding: '5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: config.bg, color: config.color }}>
                {config.label}
            </span>
        );
    };

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
                        width: 56, height: 56, borderRadius: '14px',
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
                        ml: 2, padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
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
                        borderRadius: '12px', padding: '10px 16px', flex: 1, minWidth: '250px'
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

                    {/* Sort Controls */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={inputStyle}
                    >
                        <option value="date">Data</option>
                        <option value="amount">Valor</option>
                        <option value="status">Status</option>
                    </select>
                    <IconButton onClick={() => setSortDesc(!sortDesc)} sx={{ border: `1px solid ${borderColor}` }}>
                        <span className="material-icons-round" style={{ color: textMuted }}>{sortDesc ? 'arrow_downward' : 'arrow_upward'}</span>
                    </IconButton>
                </Box>

                {/* Filter Tabs */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setTabValue(tab.id)}
                            style={{
                                padding: '10px 20px', borderRadius: '12px',
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

            {/* Table */}
            <Box sx={{ ...cardStyle, overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                        <thead>
                            <tr>
                                <th style={tableHeaderStyle}>Data</th>
                                <th style={tableHeaderStyle}>Descrição</th>
                                <th style={tableHeaderStyle}>Fornecedor</th>
                                <th style={tableHeaderStyle}>Conta / Centro</th>
                                <th style={tableHeaderStyle}>Vencimento</th>
                                <th style={tableHeaderStyle}>Status</th>
                                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Valor</th>
                                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={8} style={{ padding: 0, border: 'none' }}>
                                    <EmptyState
                                        icon={<span className="material-icons-round" style={{ fontSize: 'inherit' }}>receipt_long</span>}
                                        title="Nenhuma despesa encontrada"
                                        description="Ajuste os filtros de busca ou lance uma nova despesa para começar."
                                        actionLabel="Lançar Despesa"
                                        actionIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
                                        onAction={handleOpenCreate}
                                        compact
                                    />
                                </td></tr>
                            ) : filtered.map((item) => (
                                <tr key={item.id} style={{ transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = surfaceBg} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ ...tableCellStyle, color: textSecondary }}>{format(new Date(item.date), 'dd/MM/yyyy')}</td>
                                    <td style={tableCellStyle}>
                                        <Typography sx={{ fontWeight: 500, color: textPrimary, fontSize: '13px' }}>{item.description}</Typography>
                                        {/* Indicador de Extra-Orçamentário */}
                                        {item.approvalStatus === 'UNPLANNED' && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                <span className="material-icons-round" style={{ fontSize: '12px', color: '#f59e0b' }}>warning</span>
                                                <Typography sx={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>Extra-Orçamentário</Typography>
                                            </Box>
                                        )}
                                        {item.invoiceNumber && (
                                            item.fileUrl ? (
                                                <a href={getFileURL(item.fileUrl)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                                    <Typography sx={{ fontSize: '11px', color: '#2563eb', cursor: 'pointer', '&:hover': { textDecoration: 'underline', mt: 0.5, display: 'block' } }}>
                                                        NF: {item.invoiceNumber}
                                                    </Typography>
                                                </a>
                                            ) : (
                                                <Typography sx={{ fontSize: '11px', color: textSecondary, mt: 0.5 }}>NF: {item.invoiceNumber}</Typography>
                                            )
                                        )}
                                    </td>
                                    <td style={tableCellStyle}>{item.supplier?.name || '-'}</td>
                                    <td style={tableCellStyle}>
                                        <Typography sx={{ fontSize: '12px', color: textPrimary }}>{item.costCenter?.code}</Typography>
                                        <Typography sx={{ fontSize: '11px', color: textSecondary }}>{item.account?.name}</Typography>
                                    </td>
                                    <td style={{ ...tableCellStyle, color: textSecondary }}>{item.dueDate ? format(new Date(item.dueDate), 'dd/MM/yyyy') : '-'}</td>
                                    <td style={tableCellStyle}>{getStatusBadge(item.status)}</td>
                                    <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 600, color: textPrimary }}>{formatCurrency(item.amount)}</td>
                                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                            {/* Enviar para Aprovação - Financeiro + PREVISTO */}
                                            {(() => {
                                                const s = (item.status || '').toUpperCase();
                                                if (s !== 'PREVISTO') return null;
                                                if (!canSubmitForApprovalFlow) return null;
                                                return (
                                                    <Tooltip title="Enviar para Aprovação" arrow>
                                                        <IconButton onClick={() => handleOpenSubmit(item)} sx={actionBtnStyle('success')}>
                                                            <span className="material-icons-round" style={{ fontSize: '16px' }}>send</span>
                                                        </IconButton>
                                                    </Tooltip>
                                                );
                                            })()}
                                            {/* Aprovar - apenas Gestores/Admin e AGUARDANDO_APROVACAO */}
                                            {item.status === 'AGUARDANDO_APROVACAO' && canApproveOrEditExpense && (
                                                <Tooltip title="Aprovar e Provisionar" arrow>
                                                    <IconButton
                                                        onClick={() => {
                                                            const confirmApprove = async () => {
                                                                try {
                                                                    await updateExpense(item.id, { status: 'APROVADO' });
                                                                    enqueueSnackbar('Despesa aprovada e provisionada!', { variant: 'success' });
                                                                    fetchExpenses();
                                                                } catch (e) {
                                                                    enqueueSnackbar(getErrorMessage(e, 'Erro ao aprovar. Verifique se há NF anexada.'), { variant: 'error' });
                                                                }
                                                            };
                                                            confirmApprove();
                                                        }}
                                                        sx={actionBtnStyle('success')}
                                                    >
                                                        <span className="material-icons-round" style={{ fontSize: '16px' }}>check_circle</span>
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {/* Editar - Manager/Admin + PREVISTO somente */}
                                            {(() => {
                                                const s = (item.status || '').toUpperCase();
                                                if (s !== 'PREVISTO') return null;
                                                if (!canApproveOrEditExpense) return null;
                                                return (
                                                    <Tooltip title="Editar" arrow>
                                                        <IconButton onClick={() => handleOpenEdit(item)} sx={actionBtnStyle('edit')}>
                                                            <span className="material-icons-round" style={{ fontSize: '16px' }}>edit</span>
                                                        </IconButton>
                                                    </Tooltip>
                                                );
                                            })()}
                                            {(() => {
                                                const s = (item.status || '').toUpperCase();
                                                if (['APROVADO', 'PAGO', 'AGUARDANDO_APROVACAO'].includes(s)) return null;
                                                return (
                                                    <Tooltip title="Excluir" arrow>
                                                        <IconButton onClick={() => handleDeleteClick(item)} sx={actionBtnStyle('delete')}>
                                                            <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                                                        </IconButton>
                                                    </Tooltip>
                                                );
                                            })()}
                                        </Box>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Box>
            </Box>

            <ExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} expense={selectedItem} />
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