import { useState, useEffect, useMemo, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { Box, Button, IconButton, Typography, Collapse, useTheme } from '@mui/material';

import BudgetItemModal from '../../components/modals/BudgetItemModal';
import BudgetImportModal from '../../components/modals/BudgetImportModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

import { getBudgetById, addBudgetItem, updateBudgetItem, deleteBudgetItem, approveBudget, submitBudgetForApproval } from '../../services/budget.service';
import { getErrorMessage } from '../../utils/errorUtils';
import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';

const priorityLabels = {
  ESSENCIAL: { label: 'Essencial', color: '#ef4444', icon: '🔴' },
  IMPORTANTE: { label: 'Importante', color: '#f59e0b', icon: '🟡' },
  DESEJAVEL: { label: 'Desejável', color: '#10b981', icon: '🟢' }
};

const buildBudgetTheme = (isDark, theme) => {
  const colors = {
    cardBg: isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#ffffff',
    surface: isDark ? '#1c2632' : '#f8fafc',
    surfaceAlt: isDark ? '#161d26' : '#ffffff',
    border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)',
    borderSubtle: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)',
    textPrimary: isDark ? '#f1f5f9' : theme.palette.text.primary,
    textSecondary: isDark ? '#94a3b8' : theme.palette.text.secondary,
    textMuted: isDark ? '#64748b' : theme.palette.text.disabled,
    accent: '#2563eb',
    success: '#10b981',
    danger: '#f43f5e',
    warn: '#f59e0b',
    accentSoft: 'rgba(37, 99, 235, 0.15)',
    dangerSoft: 'rgba(244, 63, 94, 0.12)',
    rowHover: isDark ? 'rgba(37, 99, 235, 0.05)' : 'rgba(37, 99, 235, 0.08)'
  };

  return {
    colors,
    cardStyle: {
      background: colors.cardBg,
      border: colors.border,
      borderRadius: '16px'
    },
    tableHeaderStyle: {
      background: colors.surface,
      color: colors.textMuted,
      fontSize: '10px',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.3px',
      padding: '10px 8px',
      borderBottom: `1px solid ${colors.borderSubtle}`,
      textAlign: 'left',
      whiteSpace: 'nowrap'
    },
    tableCellStyle: {
      color: colors.textSecondary,
      fontSize: '11px',
      padding: '10px 8px',
      borderBottom: `1px solid ${colors.borderSubtle}`
    },
    actionBtnStyle: (type = 'edit') => ({
      width: 28,
      height: 28,
      borderRadius: '6px',
      background: type === 'delete' ? colors.dangerSoft : colors.surface,
      border: `1px solid ${colors.borderSubtle}`,
      color: type === 'delete' ? colors.danger : colors.textSecondary,
      '&:hover': {
        background: type === 'delete' ? 'rgba(244, 63, 94, 0.2)' : colors.accentSoft,
        color: type === 'delete' ? colors.danger : colors.accent,
        borderColor: type === 'delete' ? colors.danger : colors.accent
      }
    })
  };
};

// --- COMPONENTE DE LINHA AGRUPADA (CONTÁBIL) ---
const BudgetGroupRow = ({ group, onEdit, onDelete, ui, isOBZ }) => {
  const [open, setOpen] = useState(false);
  const { account, items, totals } = group;
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const isCapex = account.type === 'CAPEX';

  return (
    <>
      {/* LINHA PAI: CONTA CONTÁBIL */}
      <tr style={{ background: open ? ui.colors.surface : 'transparent', transition: 'background 0.2s' }}>
        <td style={{ ...ui.tableCellStyle, width: '40px' }}>
          <IconButton size="small" onClick={() => setOpen(!open)} sx={{ color: ui.colors.textSecondary, width: 28, height: 28 }}>
            <span className="material-icons-round" style={{ fontSize: '18px' }}>{open ? 'expand_less' : 'expand_more'}</span>
          </IconButton>
        </td>
        <td style={{ ...ui.tableCellStyle, color: ui.colors.textPrimary, fontWeight: 600 }}>
          {account.code} - {account.name}
          <br />
          <span style={{ fontSize: '11px', color: ui.colors.textMuted }}>{items.length} lançamento(s)</span>
        </td>
        <td style={{ ...ui.tableCellStyle, color: ui.colors.textMuted, fontStyle: 'italic' }}>Consolidado<br /><span style={{ fontSize: '10px' }}>da Conta</span></td>
        <td style={ui.tableCellStyle}>
          <span style={{
            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
            background: isCapex ? 'rgba(6, 182, 212, 0.15)' : 'rgba(37, 99, 235, 0.15)',
            color: isCapex ? '#06b6d4' : '#2563eb'
          }}>
            {account.type}
          </span>
        </td>
        {months.map(m => (
          <td key={m} style={{ ...ui.tableCellStyle, textAlign: 'right', fontWeight: 600, color: totals[m] !== 0 ? ui.colors.textPrimary : ui.colors.textMuted }}>
            {totals[m] !== 0 ? Number(totals[m]).toLocaleString('pt-BR') : '-'}
          </td>
        ))}
        <td style={{ ...ui.tableCellStyle, textAlign: 'right', fontWeight: 700, color: ui.colors.success, fontSize: '13px' }}>
          {Number(totals.total).toLocaleString('pt-BR')}
        </td>
        <td style={{ ...ui.tableCellStyle, width: '50px' }} />
      </tr>

      {/* LINHA FILHA: DETALHES */}
      {open && (
        <tr>
          <td colSpan={18} style={{ padding: 0 }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ m: 2, ml: 6, borderRadius: '12px', overflow: 'hidden', border: ui.colors.border, background: ui.colors.surfaceAlt }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...ui.tableHeaderStyle, background: ui.colors.surfaceAlt }}>Fornecedor</th>
                      <th style={{ ...ui.tableHeaderStyle, background: ui.colors.surfaceAlt }}>Centro de Custo</th>
                      {isOBZ && <th style={{ ...ui.tableHeaderStyle, background: ui.colors.surfaceAlt }}>Prioridade (OBZ)</th>}
                      <th style={{ ...ui.tableHeaderStyle, background: ui.colors.surfaceAlt }}>Descrição</th>
                      <th style={{ ...ui.tableHeaderStyle, background: ui.colors.surfaceAlt }}>Tipo</th>
                      {months.map(m => <th key={m} style={{ ...ui.tableHeaderStyle, background: ui.colors.surfaceAlt, textAlign: 'right', fontSize: '10px' }}>{m.toUpperCase()}</th>)}
                      <th style={{ ...ui.tableHeaderStyle, background: ui.colors.surfaceAlt, textAlign: 'right' }}>Total</th>
                      <th style={{ ...ui.tableHeaderStyle, background: ui.colors.surfaceAlt, textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} style={{ transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = ui.colors.rowHover} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td style={ui.tableCellStyle}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span className="material-icons-round" style={{ fontSize: '14px', color: ui.colors.textMuted }}>business</span>
                            {item.supplier?.name || <span style={{ color: ui.colors.textMuted }}>-</span>}
                          </Box>
                        </td>
                        <td style={ui.tableCellStyle}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span className="material-icons-round" style={{ fontSize: '14px', color: ui.colors.textMuted }}>domain</span>
                            {item.costCenter?.code || '-'}
                          </Box>
                        </td>
                        {isOBZ && (
                          <td style={ui.tableCellStyle}>
                            {item.priority && priorityLabels[item.priority] ? (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                                background: `${priorityLabels[item.priority].color}15`, color: priorityLabels[item.priority].color
                              }}>
                                {priorityLabels[item.priority].icon} {priorityLabels[item.priority].label}
                              </span>
                            ) : '-'}
                          </td>
                        )}
                        <td style={ui.tableCellStyle}>{item.description || '-'}</td>
                        <td style={ui.tableCellStyle}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', border: `1px solid ${ui.colors.borderSubtle}`, color: ui.colors.textMuted, background: ui.colors.surface }}>
                            {item.type}
                          </span>
                        </td>
                        {months.map(m => (
                          <td key={m} style={{ ...ui.tableCellStyle, textAlign: 'right', color: Number(item[m]) !== 0 ? ui.colors.textPrimary : ui.colors.textMuted }}>
                            {Number(item[m]) !== 0 ? Number(item[m]).toLocaleString('pt-BR') : '-'}
                          </td>
                        ))}
                        <td style={{ ...ui.tableCellStyle, textAlign: 'right', fontWeight: 600, color: ui.colors.textPrimary }}>
                          {Number(item.total).toLocaleString('pt-BR')}
                        </td>
                        <td style={{ ...ui.tableCellStyle, textAlign: 'right' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <IconButton size="small" onClick={() => onEdit(item)} sx={ui.actionBtnStyle('edit')}>
                              <span className="material-icons-round" style={{ fontSize: '14px' }}>edit</span>
                            </IconButton>
                            <IconButton size="small" onClick={() => onDelete(item.id)} sx={ui.actionBtnStyle('delete')}>
                              <span className="material-icons-round" style={{ fontSize: '14px' }}>delete</span>
                            </IconButton>
                          </Box>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Collapse>
          </td>
        </tr>
      )}
    </>
  );
};

// --- PÁGINA PRINCIPAL ---
const BudgetDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { mode } = useContext(ThemeContext);
  const { hasPermission } = useContext(AuthContext);
  const theme = useTheme();
  const isDark = mode === 'dark';
  const ui = useMemo(() => buildBudgetTheme(isDark, theme), [isDark, theme]);

  const [budget, setBudget] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);


  const fetchBudget = async () => {
    try { const data = await getBudgetById(id); setBudget(data); }
    catch (e) { console.error(e); enqueueSnackbar(getErrorMessage(e, 'Erro ao carregar orçamento.'), { variant: 'error' }); navigate('/finance'); }
  };

  useEffect(() => { fetchBudget(); }, [id]);

  // AGRUPAMENTO DE DADOS
  const groupedBudget = useMemo(() => {
    if (!budget || !budget.items) return [];
    const groups = {};
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    budget.items.forEach(item => {
      const accId = item.accountId;
      if (!groups[accId]) {
        groups[accId] = { account: item.account, items: [], totals: { total: 0 } };
        months.forEach(m => groups[accId].totals[m] = 0);
      }
      groups[accId].items.push(item);
      months.forEach(m => { groups[accId].totals[m] += Number(item[m] || 0); });
      groups[accId].totals.total += Number(item.total || 0);
    });

    return Object.values(groups).sort((a, b) => a.account.code.localeCompare(b.account.code));
  }, [budget]);

  const handleSaveItem = async (data) => {
    try {
      if (selectedItem) await updateBudgetItem(selectedItem.id, data);
      else await addBudgetItem(id, data);
      setModalOpen(false); fetchBudget();
      enqueueSnackbar('Salvo com sucesso!', { variant: 'success' });
    } catch (e) { enqueueSnackbar(getErrorMessage(e, 'Erro ao salvar.'), { variant: 'error' }); }
  };

  const handleDeleteItemClick = (itemId) => { setDeleteId(itemId); setConfirmOpen(true); };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteBudgetItem(deleteId);
      fetchBudget();
      enqueueSnackbar('Excluído com sucesso.', { variant: 'success' });
      setConfirmOpen(false);
      setDeleteId(null);
    } catch (e) { enqueueSnackbar(getErrorMessage(e, 'Erro ao excluir.'), { variant: 'error' }); }
  };

  const handleSubmitBudgetForApproval = async () => {
    if (!window.confirm('Enviar este orçamento para a fila de aprovações?')) return;
    try {
      await submitBudgetForApproval(id);
      fetchBudget();
      enqueueSnackbar('Orçamento enviado para aprovação.', { variant: 'success' });
    } catch (e) { enqueueSnackbar(getErrorMessage(e, 'Erro ao enviar para aprovação.'), { variant: 'error' }); }
  };

  const handleApproveBudget = async () => {
    if (!window.confirm('Tem certeza que deseja APROVAR este orçamento?')) return;
    try {
      await approveBudget(id);
      fetchBudget();
      enqueueSnackbar('Orçamento aprovado com sucesso!', { variant: 'success' });
    } catch (e) { enqueueSnackbar(getErrorMessage(e, 'Erro ao aprovar orçamento.'), { variant: 'error' }); }
  };

  const handleOpenCreate = () => { setSelectedItem(null); setModalOpen(true); };
  const handleOpenEdit = (item) => { setSelectedItem(item); setModalOpen(true); };

  if (!budget) return (
    <Box sx={{ p: 4, textAlign: 'center', color: ui.colors.textMuted }}>
      <span className="material-icons-round" style={{ fontSize: '48px', opacity: 0.5, marginBottom: '16px', display: 'block' }}>hourglass_empty</span>
      Carregando...
    </Box>
  );

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];



  const getStatusBadge = (status) => {
    const configs = {
      'DRAFT': { label: 'Rascunho', bg: ui.colors.surface, color: ui.colors.textMuted },
      'PENDING_APPROVAL': { label: 'Aguardando aprovação', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
      'APPROVED': { label: 'Aprovado', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
      'REJECTED': { label: 'Rejeitado', bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' },
      'CLOSED': { label: 'Fechado', bg: 'rgba(100, 116, 139, 0.15)', color: ui.colors.textMuted }
    };
    const config = configs[status] || configs['DRAFT'];
    return <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: config.bg, color: config.color }}>{config.label}</span>;
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', p: { xs: 2, md: 3 } }}>

      {/* Header */}
      <Box sx={{ ...ui.cardStyle, p: 3, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/finance')} sx={{ background: ui.colors.surface, border: `1px solid ${ui.colors.borderSubtle}`, color: ui.colors.textSecondary, '&:hover': { background: ui.colors.accentSoft, color: ui.colors.accent } }}>
            <span className="material-icons-round">arrow_back</span>
          </IconButton>
          <Box>
            <Typography sx={{ fontSize: '24px', fontWeight: 600, color: ui.colors.textPrimary }}>{budget.name}</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 0.5 }}>
              <Typography sx={{ fontSize: '13px', color: ui.colors.textSecondary }}>Ano Fiscal: {budget.fiscalYear?.year}</Typography>
              <Typography sx={{ fontSize: '13px', color: ui.colors.textSecondary }}>|</Typography>
              <Typography sx={{ fontSize: '13px', color: ui.colors.textSecondary }}>Versão: {budget.version}</Typography>
              <Typography sx={{ fontSize: '13px', color: ui.colors.textSecondary }}>|</Typography>
              {getStatusBadge(budget.status)}
              {budget.isOBZ && (
                <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-icons-round" style={{ fontSize: '14px' }}>lightbulb</span>
                  OBZ
                </span>
              )}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: '11px', color: ui.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total OPEX</Typography>
            <Typography sx={{ fontSize: '22px', fontWeight: 700, color: '#2563eb' }}>{formatCurrency(budget.totalOpex)}</Typography>
          </Box>
          <Box sx={{ textAlign: 'right', borderLeft: `1px solid ${ui.colors.borderSubtle}`, pl: 3 }}>
            <Typography sx={{ fontSize: '11px', color: ui.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total CAPEX</Typography>
            <Typography sx={{ fontSize: '22px', fontWeight: 700, color: '#06b6d4' }}>{formatCurrency(budget.totalCapex)}</Typography>
          </Box>

          {budget.status === 'DRAFT' && hasPermission('FINANCE', 'EDIT_BUDGET') && (
            <Button onClick={handleSubmitBudgetForApproval} sx={{
              padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
              background: 'transparent', border: '2px solid #f59e0b', color: '#f59e0b',
              '&:hover': { background: '#f59e0b', color: 'white' }
            }}>
              Enviar para aprovação
            </Button>
          )}

          {(budget.status === 'PENDING_APPROVAL' || budget.status === 'DRAFT') && hasPermission('FINANCE', 'WRITE') && (
            <Button onClick={handleApproveBudget} sx={{
              padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
              background: 'transparent', border: '2px solid #10b981', color: '#10b981',
              '&:hover': { background: '#10b981', color: 'white' }
            }}>
              Aprovar orçamento
            </Button>
          )}

          {budget.status !== 'APPROVED' && budget.status !== 'APROVADO' && budget.status !== 'PENDING_APPROVAL' && hasPermission('FINANCE', 'EDIT_BUDGET') && (
            <>
              <Button onClick={() => setImportModalOpen(true)} sx={{
                padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
                background: ui.colors.surface, color: ui.colors.textPrimary,
                border: `1px solid ${ui.colors.borderSubtle}`,
                '&:hover': { background: ui.colors.accentSoft, color: ui.colors.accent, borderColor: ui.colors.accent }
              }} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>upload_file</span>}>
                Importar Excel
              </Button>
              <Button onClick={handleOpenCreate} sx={{
                padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
              }} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}>
                Novo Lançamento
              </Button>
            </>
          )}
        </Box>
      </Box>



      {/* Matriz Orçamentária */}
      <Box sx={{ ...ui.cardStyle, overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
            <thead>
              <tr>
                <th style={{ ...ui.tableHeaderStyle, width: '40px' }} />
                <th style={ui.tableHeaderStyle}>Conta Contábil</th>
                <th style={ui.tableHeaderStyle}>Detalhes</th>
                <th style={ui.tableHeaderStyle}>Tipo</th>
                {months.map(m => <th key={m} style={{ ...ui.tableHeaderStyle, textAlign: 'right', minWidth: '50px' }}>{m}</th>)}
                <th style={{ ...ui.tableHeaderStyle, textAlign: 'right' }}>Total</th>
                <th style={{ ...ui.tableHeaderStyle, width: '50px' }} />
              </tr>
            </thead>
            <tbody>
              {groupedBudget.map((group) => (
                <BudgetGroupRow key={group.account.id} group={group} onEdit={handleOpenEdit} onDelete={handleDeleteItemClick} ui={ui} isOBZ={budget.isOBZ} />
              ))}
              {groupedBudget.length === 0 && (
                <tr><td colSpan={18} style={{ ...ui.tableCellStyle, textAlign: 'center', padding: '60px' }}>
                  <span className="material-icons-round" style={{ fontSize: '48px', color: ui.colors.textMuted, opacity: 0.5, display: 'block', marginBottom: '12px' }}>assignment</span>
                  <Typography sx={{ color: ui.colors.textMuted, fontSize: '14px' }}>Nenhum lançamento neste orçamento</Typography>
                </td></tr>
              )}
            </tbody>
          </table>
        </Box>
      </Box>

      <BudgetItemModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveItem} item={selectedItem} isOBZ={budget?.isOBZ} />
      <BudgetImportModal open={importModalOpen} onClose={() => setImportModalOpen(false)} budgetId={id} onSuccess={fetchBudget} />
      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Excluir Lançamento" content="Tem certeza que deseja excluir este lançamento do orçamento?" />
    </Box>
  );
};

export default BudgetDetailsPage;








