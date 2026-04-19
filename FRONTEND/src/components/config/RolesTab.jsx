import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import roleService from '../../services/role.service';
import RoleModal from '../../components/modals/RoleModal';
import ConfirmDialog from '../common/ConfirmDialog';
import DataListTable from '../common/DataListTable';
import { getErrorMessage } from '../../utils/errorUtils';
import { useOrgThemeStyles } from '../../pages/config/useOrgThemeStyles';
import { getRoleListColumns } from './roleListColumns';
import { sortRoleRows } from './roleListSort';

const RolesTab = () => {
  const { textMuted, cardStyle } = useOrgThemeStyles();
  const [roles, setRoles] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const loadData = async () => {
    try {
      const data = await roleService.getAll();
      setRoles(data);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(getErrorMessage(error, 'Erro ao carregar perfis.'), { variant: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = useCallback((role) => {
    setEditData(role);
    setModalOpen(true);
  }, []);
  const handleAdd = () => {
    setEditData(null);
    setModalOpen(true);
  };

  const handleDeleteClick = useCallback((id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await roleService.delete(deleteId);
      loadData();
      enqueueSnackbar('Perfil excluído com sucesso.', { variant: 'success' });
      setConfirmOpen(false);
      setDeleteId(null);
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Erro ao excluir perfil.'), { variant: 'error' });
    }
  };

  const roleColumns = useMemo(
    () =>
      getRoleListColumns({
        onEdit: handleEdit,
        onDelete: handleDeleteClick,
      }),
    [handleEdit, handleDeleteClick]
  );

  const emptyContent = useMemo(
    () => (
      <span style={{ color: textMuted }}>Nenhum perfil encontrado.</span>
    ),
    [textMuted]
  );

  return (
    <>
      <DataListTable
        density="compact"
        shell={{
          title: 'Perfis de acesso',
          titleIcon: 'shield',
          accentColor: '#2563eb',
          count: roles.length,
          sx: { ...cardStyle, mb: 2 },
          toolbar: (
            <Button data-testid="role-add" startIcon={<Add />} variant="contained" onClick={handleAdd}>
              Novo perfil
            </Button>
          ),
          tableContainerSx: {
            borderRadius: 0,
            boxShadow: 'none',
          },
        }}
        columns={roleColumns}
        rows={roles}
        sortRows={sortRoleRows}
        defaultOrderBy="name"
        defaultOrder="asc"
        emptyMessage="Nenhum perfil encontrado."
        emptyContent={emptyContent}
        dataTestidTable="tabela-organizacao-perfis"
        rowsPerPageOptions={[5, 10, 25, 50]}
        rowsPerPageDefault={10}
      />
      <RoleModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={loadData} editData={editData} />
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir perfil"
        content="Tem certeza? Usuários com este perfil perderão o acesso."
      />
    </>
  );
};

export default RolesTab;
