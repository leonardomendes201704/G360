import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useSnackbar } from 'notistack';

import approvalTierService from '../../services/approval-tier.service';
import roleService from '../../services/role.service';
import ConfirmDialog from '../common/ConfirmDialog';
import StandardModal from '../common/StandardModal';
import { getErrorMessage } from '../../utils/errorUtils';
import { ThemeContext } from '../../contexts/ThemeContext';

const ENTITY_OPTIONS = [
  { value: 'EXPENSE', label: 'Despesas (financeiro)' },
  { value: 'PROJECT_COST', label: 'Custos de projeto' },
  { value: 'PROJECT', label: 'Projeto (baseline / execução)' },
  { value: 'MEETING_MINUTE', label: 'Atas de reunião' },
  { value: 'PROPOSAL', label: 'Propostas comerciais' },
  { value: 'BUDGET', label: 'Orçamento anual' },
];

const emptyForm = () => ({
  name: '',
  entityType: 'EXPENSE',
  roleId: '',
  minAmount: '',
  maxAmount: '',
  globalScope: false,
  isActive: true,
  sortOrder: 0,
});

const ApprovalTiersTab = () => {
  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#475569';
  const textMuted = isDark ? '#64748b' : '#64748b';
  const cardBg = isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#ffffff';
  const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)';
  const surfaceBg = isDark ? '#1c2632' : '#f1f5f9';
  const rowHoverBg = isDark ? '#1c2632' : '#f1f5f9';

  const cardStyle = {
    background: cardBg,
    border: cardBorder,
    borderRadius: '8px',
  };

  const tableHeaderStyle = {
    background: surfaceBg,
    color: textMuted,
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '16px 24px',
    borderBottom: cardBorder,
    textAlign: 'left',
  };

  const tableCellStyle = {
    color: textSecondary,
    fontSize: '14px',
    padding: '20px 24px',
    borderBottom: cardBorder,
  };

  const actionBtnStyle = (type = 'edit') => ({
    width: 32,
    height: 32,
    borderRadius: '8px',
    background: type === 'delete' ? 'rgba(244, 63, 94, 0.1)' : surfaceBg,
    border: cardBorder,
    color: type === 'delete' ? '#f43f5e' : textSecondary,
    '&:hover': {
      background: type === 'delete' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(37, 99, 235, 0.12)',
      color: type === 'delete' ? '#f43f5e' : '#2563eb',
      borderColor: type === 'delete' ? '#f43f5e' : '#2563eb',
    },
  });

  const [tiers, setTiers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const loadData = async () => {
    try {
      const [t, r] = await Promise.all([
        approvalTierService.getAll(),
        roleService.getAll(),
      ]);
      setTiers(Array.isArray(t) ? t : []);
      setRoles(Array.isArray(r) ? r : []);
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Erro ao carregar alçadas.'), { variant: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      entityType: row.entityType || 'EXPENSE',
      roleId: row.roleId || '',
      minAmount: row.minAmount != null ? String(row.minAmount) : '',
      maxAmount: row.maxAmount != null ? String(row.maxAmount) : '',
      globalScope: Boolean(row.globalScope),
      isActive: row.isActive !== false,
      sortOrder: row.sortOrder ?? 0,
    });
    setModalOpen(true);
  };

  const parsePayload = () => {
    const minAmount = form.minAmount === '' ? null : Number(form.minAmount);
    const maxAmount = form.maxAmount === '' ? null : Number(form.maxAmount);
    if (form.minAmount !== '' && Number.isNaN(minAmount)) {
      throw new Error('Valor mínimo inválido');
    }
    if (form.maxAmount !== '' && Number.isNaN(maxAmount)) {
      throw new Error('Valor máximo inválido');
    }
    if (minAmount != null && maxAmount != null && minAmount > maxAmount) {
      throw new Error('Mínimo não pode ser maior que o máximo');
    }
    return {
      name: form.name.trim(),
      entityType: form.entityType,
      roleId: form.roleId,
      minAmount,
      maxAmount,
      globalScope: form.globalScope,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
    };
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      enqueueSnackbar('Informe o nome da alçada.', { variant: 'warning' });
      return;
    }
    if (!form.roleId) {
      enqueueSnackbar('Selecione um perfil.', { variant: 'warning' });
      return;
    }
    let payload;
    try {
      payload = parsePayload();
    } catch (e) {
      enqueueSnackbar(e.message, { variant: 'warning' });
      return;
    }
    try {
      if (editingId) {
        await approvalTierService.update(editingId, payload);
        enqueueSnackbar('Alçada atualizada.', { variant: 'success' });
      } else {
        await approvalTierService.create(payload);
        enqueueSnackbar('Alçada criada.', { variant: 'success' });
      }
      setModalOpen(false);
      loadData();
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Erro ao salvar alçada.'), { variant: 'error' });
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await approvalTierService.delete(deleteId);
      enqueueSnackbar('Alçada excluída.', { variant: 'success' });
      setConfirmOpen(false);
      setDeleteId(null);
      loadData();
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Erro ao excluir alçada.'), { variant: 'error' });
    }
  };

  const formatMoney = (v) => {
    if (v == null || v === '') return '—';
    const n = Number(v);
    if (Number.isNaN(n)) return '—';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const entityLabel = (v) => ENTITY_OPTIONS.find((o) => o.value === v)?.label || v;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>Alçadas de aprovação</Typography>
          <Typography sx={{ fontSize: '13px', color: textMuted, mt: 0.5, maxWidth: 720 }}>
            Defina faixas de valor e perfis que podem aprovar despesas e custos de projeto. Escopo restrito: apenas itens dos
            centros de custo ou projetos que o usuário gerencia. Escopo global: toda a empresa na faixa de valor (ex.: diretoria
            financeira). Sem alçadas cadastradas, vale apenas a regra atual (gestor de CC / gestor de projeto).
          </Typography>
        </Box>
        <Button
          onClick={openCreate}
          sx={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'none',
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            color: 'white',
            '&:hover': { opacity: 0.92 },
          }}
        >
          Nova alçada
        </Button>
      </Box>

      <Box sx={{ ...cardStyle, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Nome</th>
              <th style={tableHeaderStyle}>Tipo</th>
              <th style={tableHeaderStyle}>Perfil</th>
              <th style={tableHeaderStyle}>Faixa (R$)</th>
              <th style={tableHeaderStyle}>Escopo</th>
              <th style={tableHeaderStyle}>Ativa</th>
              <th style={{ ...tableHeaderStyle, width: 100 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {tiers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...tableCellStyle, textAlign: 'center', color: textMuted }}>
                  Nenhuma alçada cadastrada. A aprovação segue apenas gestores de CC/projeto.
                </td>
              </tr>
            ) : (
              tiers.map((row) => (
                <tr key={row.id} style={{ transition: 'background 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.background = rowHoverBg; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <td style={{ ...tableCellStyle, color: textPrimary, fontWeight: 500 }}>{row.name}</td>
                  <td style={tableCellStyle}>{entityLabel(row.entityType)}</td>
                  <td style={tableCellStyle}>{row.role?.name || '—'}</td>
                  <td style={tableCellStyle}>
                    {formatMoney(row.minAmount)} → {formatMoney(row.maxAmount)}
                  </td>
                  <td style={tableCellStyle}>{row.globalScope ? 'Global (empresa)' : 'Só recursos geridos'}</td>
                  <td style={tableCellStyle}>{row.isActive ? 'Sim' : 'Não'}</td>
                  <td style={tableCellStyle}>
                    <IconButton size="small" onClick={() => openEdit(row)} sx={actionBtnStyle('edit')}>
                      <span className="material-icons-round" style={{ fontSize: '16px' }}>edit</span>
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteClick(row.id)} sx={{ ...actionBtnStyle('delete'), ml: 0.5 }}>
                      <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                    </IconButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Box>

      <StandardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar alçada' : 'Nova alçada'}
        icon="layers"
        size="form"
        actions={[
          { label: 'Cancelar', onClick: () => setModalOpen(false) },
          { label: 'Salvar', onClick: handleSave },
        ]}
        contentSx={{ '& .MuiTextField-root, & .MuiFormControlLabel-root': { color: textPrimary } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} fullWidth size="small" InputLabelProps={{ shrink: true }} />
          <TextField select label="Tipo de item" value={form.entityType} onChange={(e) => setForm((f) => ({ ...f, entityType: e.target.value }))} fullWidth size="small">
            {ENTITY_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Perfil (role)" value={form.roleId} onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))} fullWidth size="small">
            <MenuItem value="">
              <em>Selecione</em>
            </MenuItem>
            {roles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Valor mínimo (opcional)" value={form.minAmount} onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))} fullWidth size="small" type="number" InputLabelProps={{ shrink: true }} />
            <TextField label="Valor máximo (opcional)" value={form.maxAmount} onChange={(e) => setForm((f) => ({ ...f, maxAmount: e.target.value }))} fullWidth size="small" type="number" InputLabelProps={{ shrink: true }} />
          </Box>
          <FormControlLabel control={<Switch checked={form.globalScope} onChange={(e) => setForm((f) => ({ ...f, globalScope: e.target.checked }))} />} label="Escopo global (toda a empresa na faixa)" sx={{ color: textSecondary }} />
          <FormControlLabel control={<Switch checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />} label="Alçada ativa" sx={{ color: textSecondary }} />
          <TextField label="Ordem" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} fullWidth size="small" type="number" InputLabelProps={{ shrink: true }} />
        </Box>
      </StandardModal>

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Excluir alçada" content="Tem certeza? A regra deixará de se aplicar." />
    </>
  );
};

export default ApprovalTiersTab;
