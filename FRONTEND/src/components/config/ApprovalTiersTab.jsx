import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, Button, TextField, MenuItem, FormControlLabel, Switch } from '@mui/material';
import { useSnackbar } from 'notistack';

import approvalTierService from '../../services/approval-tier.service';
import roleService from '../../services/role.service';
import ConfirmDialog from '../common/ConfirmDialog';
import StandardModal from '../common/StandardModal';
import DataListTable from '../common/DataListTable';
import { getErrorMessage } from '../../utils/errorUtils';
import { useOrgThemeStyles } from '../../pages/config/useOrgThemeStyles';
import { APPROVAL_TIER_ENTITY_OPTIONS } from './approvalTierConstants';
import { getApprovalTierListColumns } from './approvalTierListColumns';
import { sortApprovalTierRows } from './approvalTierListSort';

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
  const { textPrimary, textSecondary, textMuted, cardStyle, actionBtnStyle } = useOrgThemeStyles();

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
      const [t, r] = await Promise.all([approvalTierService.getAll(), roleService.getAll()]);
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

  const openEdit = useCallback((row) => {
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
  }, []);

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

  const handleDeleteClick = useCallback((id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  }, []);

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

  const tierColumns = useMemo(
    () =>
      getApprovalTierListColumns({
        textPrimary,
        actionBtnStyle,
        onEdit: openEdit,
        onDelete: handleDeleteClick,
      }),
    [textPrimary, actionBtnStyle, openEdit, handleDeleteClick]
  );

  const emptyContent = useMemo(
    () => (
      <span style={{ color: textMuted }}>
        Nenhuma alçada cadastrada. A aprovação segue apenas gestores de CC/projeto.
      </span>
    ),
    [textMuted]
  );

  return (
    <>
      <Box sx={{ mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>Alçadas de aprovação</Typography>
          <Typography sx={{ fontSize: '13px', color: textMuted, mt: 0.5, maxWidth: 720 }}>
            Defina faixas de valor e perfis que podem aprovar despesas e custos de projeto. Escopo restrito: apenas itens dos
            centros de custo ou projetos que o usuário gerencia. Escopo global: toda a empresa na faixa de valor (ex.: diretoria
            financeira). Sem alçadas cadastradas, vale apenas a regra atual (gestor de CC / gestor de projeto).
          </Typography>
        </Box>
      </Box>

      <DataListTable
        density="compact"
        shell={{
          title: 'Regras cadastradas',
          titleIcon: 'rule',
          accentColor: '#2563eb',
          count: tiers.length,
          sx: { ...cardStyle, mb: 2 },
          toolbar: (
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
          ),
          tableContainerSx: {
            borderRadius: 0,
            boxShadow: 'none',
          },
        }}
        columns={tierColumns}
        rows={tiers}
        sortRows={sortApprovalTierRows}
        defaultOrderBy="name"
        defaultOrder="asc"
        emptyMessage="Nenhuma alçada cadastrada."
        emptyContent={emptyContent}
        dataTestidTable="tabela-organizacao-alcadas"
        rowsPerPageOptions={[5, 10, 25, 50]}
        rowsPerPageDefault={10}
      />

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
            {APPROVAL_TIER_ENTITY_OPTIONS.map((o) => (
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
