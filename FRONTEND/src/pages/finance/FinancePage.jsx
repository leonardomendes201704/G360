import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { Box, Button, IconButton, Typography, Paper, useTheme, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';

import FinanceDashboard from './FinanceDashboard';
import ExpensesPage from './ExpensesPage';
import DREPage from './DREPage';
import { ThemeContext } from '../../contexts/ThemeContext';

import BudgetModal from '../../components/modals/BudgetModal';
import AccountModal from '../../components/modals/AccountModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StandardModal from '../../components/common/StandardModal';
import EmptyState from '../../components/common/EmptyState';
import { AuthContext } from '../../contexts/AuthContext';

import budgetService, { duplicateBudget } from '../../services/budget.service';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../../services/account.service';
import { getErrorMessage } from '../../utils/errorUtils';

const commonPaperStyle = {
  borderRadius: '16px',
  overflow: 'hidden',
  transition: 'all 0.3s',
};

const FinancePage = () => {
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { mode } = useContext(ThemeContext);
  const { hasPermission } = useContext(AuthContext);
  const theme = useTheme();

  // Estados para Orçamentos
  const [budgets, setBudgets] = useState([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);

  // Estados para Duplicação
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  const [budgetToDuplicate, setBudgetToDuplicate] = useState(null);

  // Estados para Plano de Contas
  const [accounts, setAccounts] = useState([]);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Estado unificado para confirmação
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', content: '', action: null });

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
    if (newValue === 2) fetchBudgets();
    if (newValue === 3) fetchAccounts();
  };

  // --- LÓGICA ORÇAMENTOS ---
  const fetchBudgets = async () => {
    setLoadingBudgets(true);
    try { const data = await budgetService.getAll(); setBudgets(data); }
    catch (error) { console.error(error); }
    finally { setLoadingBudgets(false); }
  };

  const handleSaveBudget = async (data) => {
    try {
      if (selectedBudget) {
        await budgetService.update(selectedBudget.id, data);
        enqueueSnackbar('Orçamento atualizado!', { variant: 'success' });
      } else {
        await budgetService.create(data);
        enqueueSnackbar('Orçamento criado!', { variant: 'success' });
      }
      setBudgetModalOpen(false);
      fetchBudgets();
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e, 'Erro ao salvar.'), { variant: 'error' });
    }
  };

  const handleDeleteBudgetClick = (id) => {
    setConfirmConfig({
      title: 'Excluir Orçamento',
      content: 'Tem certeza que deseja excluir este orçamento? Todos os itens vinculados serão removidos.',
      action: async () => {
        try {
          await budgetService.delete(id);
          fetchBudgets();
          enqueueSnackbar('Orçamento excluído com sucesso!', { variant: 'success' });
        } catch (e) {
          enqueueSnackbar(getErrorMessage(e, 'Erro ao excluir orçamento.'), { variant: 'error' });
        }
      }
    });
    setConfirmOpen(true);
  };

  // --- LÓGICA DUPLICAÇÃO ---
  const handleDuplicateClick = (budget) => {
    setBudgetToDuplicate(budget);
    setDuplicateName(`${budget.name} - Cópia`);
    setDuplicateDialogOpen(true);
  };

  const handleConfirmDuplicate = async () => {
    if (!budgetToDuplicate) return;
    try {
      await duplicateBudget(budgetToDuplicate.id, duplicateName);
      enqueueSnackbar('Orçamento duplicado com sucesso!', { variant: 'success' });
      setDuplicateDialogOpen(false);
      setBudgetToDuplicate(null);
      fetchBudgets();
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e, 'Erro ao duplicar orçamento.'), { variant: 'error' });
    }
  };

  // --- LÓGICA PLANO DE CONTAS ---
  const fetchAccounts = async () => {
    try { const data = await getAccounts(); setAccounts(data); }
    catch (e) { console.error(e); }
  };

  const handleSaveAccount = async (data) => {
    try {
      if (selectedAccount) await updateAccount(selectedAccount.id, data);
      else await createAccount(data);
      setAccountModalOpen(false); fetchAccounts();
      enqueueSnackbar('Conta salva com sucesso!', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e, 'Erro ao salvar conta.'), { variant: 'error' });
    }
  };

  const handleDeleteAccountClick = (id) => {
    setConfirmConfig({
      title: 'Excluir Conta',
      content: 'Tem certeza que deseja excluir esta conta? Esta ação pode afetar lançamentos históricos.',
      action: async () => {
        try {
          await deleteAccount(id);
          fetchAccounts();
          enqueueSnackbar('Conta excluída com sucesso.', { variant: 'success' });
        } catch (e) {
          const msg = getErrorMessage(e, 'Erro ao excluir conta.');
          if (msg.includes('possui registros vinculados')) { // Check specifically for the backend message
            setConfirmOpen(false);
            setTimeout(() => {
              setConfirmConfig({
                title: 'Desativar Conta',
                content: 'Esta conta possui registros vinculados e não pode ser excluída. Deseja desativá-la?',
                action: async () => {
                  await updateAccount(id, { isActive: false });
                  fetchAccounts();
                  enqueueSnackbar('Conta desativada.', { variant: 'success' });
                }
              });
              setConfirmOpen(true);
            }, 100);
            return; // Prevent error snackbar
          }
          enqueueSnackbar(msg, { variant: 'error' });
        }
      }
    });
    setConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (confirmConfig.action) await confirmConfig.action();
    setConfirmOpen(false);
  };

  const handleOpenDetails = (budget) => { navigate(`/finance/budget/${budget.id}`); };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const tabs = [
    { id: 0, label: 'Dashboard', icon: 'dashboard' },
    { id: 1, label: 'Despesas e Contas', icon: 'payments' },
    { id: 2, label: 'Orçamentos', icon: 'account_balance_wallet' },
    { id: 3, label: 'Plano de Contas', icon: 'account_tree' },
    { id: 4, label: 'DRE', icon: 'table_chart' }
  ];

  const getStatusBadge = (status) => {
    const configs = {
      'DRAFT': { label: 'Rascunho', bg: 'action.hover', color: 'text.secondary' },
      'APPROVED': { label: 'Aprovado', bg: 'rgba(37, 99, 235, 0.15)', color: 'primary.main' },
      'REJECTED': { label: 'Rejeitado', bg: 'rgba(244, 63, 94, 0.15)', color: 'error.main' },
      'CLOSED': { label: 'Fechado', bg: 'action.disabledBackground', color: 'text.disabled' }
    };
    const config = configs[status] || configs['DRAFT'];
    return (
      <Box sx={{ px: 1.5, py: 0.5, borderRadius: '20px', fontSize: '12px', fontWeight: 600, bgcolor: config.bg, color: config.color, display: 'inline-block' }}>
        {config.label}
      </Box>
    );
  };

  const getTypeBadge = (type) => {
    const isOPEX = type === 'OPEX';
    return (
      <Box sx={{
        px: 1.5, py: 0.5, borderRadius: '20px', fontSize: '11px', fontWeight: 600,
        bgcolor: isOPEX ? 'rgba(37, 99, 235, 0.15)' : 'rgba(6, 182, 212, 0.15)',
        color: isOPEX ? '#2563eb' : '#06b6d4'
      }}>
        {type}
      </Box>
    );
  };

  return (
    <Box>
      {/* Page Header */}
      <Paper sx={{
        mb: 3,
        p: 3,
        ...commonPaperStyle,
        background: mode === 'dark' ? 'rgba(22, 29, 38, 0.5)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <span className="material-icons-round" style={{ fontSize: '36px', color: '#10b981' }}>account_balance</span>
        <Box>
          <Typography sx={{
            fontSize: '20px',
            fontWeight: 600,
            color: 'text.primary',
            mb: 0.5
          }}>
            Gestão Financeira
          </Typography>
        </Box>
      </Paper>

      {/* Tab Navigation */}
      <Box sx={{
        display: 'inline-flex', gap: 1, mb: 4, p: '6px',
        bgcolor: mode === 'dark' ? '#161d26' : '#ffffff',
        borderRadius: '16px', border: '1px solid', borderColor: 'divider'
      }}>
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            onClick={() => handleTabChange(tab.id)}
            sx={{
              padding: '12px 20px', borderRadius: '12px', border: 'none',
              background: tabValue === tab.id ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' : 'transparent',
              color: tabValue === tab.id ? 'white' : 'text.secondary',
              fontSize: '14px', fontWeight: 500, textTransform: 'none',
              gap: 1,
              transition: 'all 0.2s',
              '&:hover': {
                background: tabValue === tab.id ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' : 'action.hover'
              }
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
          </Button>
        ))}
      </Box>

      {/* Tab Content */}
      {tabValue === 0 && <FinanceDashboard data-testid="finance-dashboard" />}
      {tabValue === 1 && <ExpensesPage data-testid="expenses-page" />}
      {tabValue === 4 && <DREPage />}

      {/* Tab 2: Orçamentos */}
      {
        tabValue === 2 && (
          <Box data-testid="budgets-tab-content">
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 3 }}>
              <Button onClick={() => navigate('/finance/compare')} data-testid="btn-compare-budgets" sx={{
                padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
                bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', color: 'text.secondary',
                '&:hover': { bgcolor: 'action.hover', color: 'primary.main', borderColor: 'primary.main' }
              }} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>compare</span>}>
                Comparar Orçamentos
              </Button>
              {hasPermission('FINANCE', 'EDIT_BUDGET') && (
              <Button onClick={() => { setSelectedBudget(null); setBudgetModalOpen(true); }} sx={{
                padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
              }} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
                data-testid="btn-new-budget">
                Novo Orçamento
              </Button>
              )}
            </Box>

            <Paper sx={{ ...commonPaperStyle, overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.5 }}>Nome</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.5 }}>Ano</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.5 }}>Status</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.5 }}>Total</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', py: 1.5 }}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {budgets.length === 0 ? (
                      <TableRow><TableCell colSpan={5} sx={{ p: 0 }}>
                        <EmptyState
                          icon={<span className="material-icons-round" style={{ fontSize: 'inherit' }}>account_balance_wallet</span>}
                          title="Nenhum orçamento cadastrado"
                          description="Crie seu primeiro orçamento para acompanhar receitas e despesas."
                          actionLabel="Novo Orçamento"
                          actionIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
                          onAction={() => { setSelectedBudget(null); setBudgetModalOpen(true); }}
                          compact
                        />
                      </TableCell></TableRow>
                    ) : budgets.map((budget) => (
                      <TableRow key={budget.id} hover data-testid={`budget-row-${budget.name}`}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', display: 'inline' }}>{budget.name}</Typography>
                          {budget.isOBZ && <Box component="span" sx={{ ml: 1, px: 0.75, py: 0.25, borderRadius: '4px', fontSize: '10px', fontWeight: 600, bgcolor: 'rgba(37, 99, 235, 0.15)', color: 'primary.main' }}>OBZ</Box>}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{budget.fiscalYear?.year || '-'}</TableCell>
                        <TableCell>{getStatusBadge(budget.status)}</TableCell>
                        <TableCell align="right" sx={{ color: 'primary.main', fontWeight: 600 }}>{formatCurrency(budget.totalOpex)}</TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <IconButton onClick={() => handleDuplicateClick(budget)} size="small" sx={{ color: 'primary.light' }} title="Duplicar">
                              <span className="material-icons-round" style={{ fontSize: '18px' }}>content_copy</span>
                            </IconButton>
                            <IconButton onClick={() => handleOpenDetails(budget)} size="small" sx={{ color: 'text.secondary' }} title="Visualizar">
                              <span className="material-icons-round" style={{ fontSize: '18px' }}>visibility</span>
                            </IconButton>
                            <IconButton onClick={() => { setSelectedBudget(budget); setBudgetModalOpen(true); }} size="small" sx={{ color: 'primary.main' }} title="Editar" disabled={budget.status === 'APPROVED'}>
                              <span className="material-icons-round" style={{ fontSize: '18px' }}>edit</span>
                            </IconButton>
                            <IconButton onClick={() => handleDeleteBudgetClick(budget.id)} size="small" sx={{ color: 'error.main' }} title="Excluir" disabled={budget.status === 'APPROVED'}>
                              <span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span>
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
            <BudgetModal open={budgetModalOpen} onClose={() => setBudgetModalOpen(false)} onSave={handleSaveBudget} budget={selectedBudget} />
          </Box>
        )
      }

      {/* Tab 3: Plano de Contas */}
      {
        tabValue === 3 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              {hasPermission('FINANCE', 'EDIT_BUDGET') && (
              <Button onClick={() => { setSelectedAccount(null); setAccountModalOpen(true); }} sx={{
                padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
              }} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}>
                Nova Conta
              </Button>
              )}
            </Box>

            <Paper sx={{ ...commonPaperStyle, overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Código</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nome</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hierarquia</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {accounts.length === 0 ? (
                      <TableRow><TableCell colSpan={5} sx={{ p: 0 }}>
                        <EmptyState
                          icon={<span className="material-icons-round" style={{ fontSize: 'inherit' }}>account_tree</span>}
                          title="Nenhuma conta cadastrada"
                          description="Configure o plano de contas para organizar suas categorias financeiras."
                          actionLabel="Nova Conta"
                          actionIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
                          onAction={() => { setSelectedAccount(null); setAccountModalOpen(true); }}
                          compact
                        />
                      </TableCell></TableRow>
                    ) : accounts.map((acc) => (
                      <TableRow key={acc.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', color: 'text.primary' }}>{acc.code}</TableCell>
                        <TableCell sx={{ color: 'text.primary' }}>{acc.name}</TableCell>
                        <TableCell>{getTypeBadge(acc.type)}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{acc.parent ? `Sub de: ${acc.parent.name}` : 'Raiz'}</TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <IconButton onClick={() => { setSelectedAccount(acc); setAccountModalOpen(true); }} size="small" sx={{ color: 'primary.main' }} title="Editar">
                              <span className="material-icons-round" style={{ fontSize: '18px' }}>edit</span>
                            </IconButton>
                            <IconButton onClick={() => handleDeleteAccountClick(acc.id)} size="small" sx={{ color: 'error.main' }} title="Excluir">
                              <span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span>
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
            <AccountModal open={accountModalOpen} onClose={() => setAccountModalOpen(false)} onSave={handleSaveAccount} account={selectedAccount} />
          </Box>
        )
      }

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirmAction} title={confirmConfig.title} content={confirmConfig.content} />

      <StandardModal
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        title="Duplicar Orçamento"
        icon="content_copy"
        size="form"
        actions={[
          { label: 'Cancelar', onClick: () => setDuplicateDialogOpen(false) },
          { label: 'Duplicar', onClick: handleConfirmDuplicate },
        ]}
      >
        <Box sx={{ mt: 0 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Nome da Cópia"
            type="text"
            fullWidth
            variant="outlined"
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
          />
        </Box>
      </StandardModal>
    </Box >
  );
};

export default FinancePage;
