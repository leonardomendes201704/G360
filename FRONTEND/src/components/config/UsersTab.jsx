import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import userService from '../../services/user.service';
import UserModal from '../../components/modals/UserModal';
import UserImportModal from '../../components/modals/UserImportModal';
import ConfirmDialog from '../common/ConfirmDialog';
import DataListTable from '../common/DataListTable';
import { getErrorMessage } from '../../utils/errorUtils';
import { useOrgThemeStyles } from '../../pages/config/useOrgThemeStyles';
import { getUserListColumns } from './userListColumns';
import { sortUserRows } from './userListSort';

const UsersTab = () => {
  const { textMuted, cardStyle } = useOrgThemeStyles();
  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const loadData = async () => {
    try {
      const data = await userService.getAll();
      setUsers(data);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(getErrorMessage(error, 'Erro ao carregar usuários.'), { variant: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = useCallback((user) => {
    setEditData(user);
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
      await userService.delete(deleteId);
      loadData();
      enqueueSnackbar('Usuário excluído com sucesso.', { variant: 'success' });
      setConfirmOpen(false);
      setDeleteId(null);
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Erro ao excluir usuário.'), { variant: 'error' });
    }
  };

  const handleToggleStatus = useCallback(
    async (user) => {
      try {
        await userService.toggleStatus(user.id);
        enqueueSnackbar(`Usuário ${user.isActive ? 'inativado' : 'ativado'} com sucesso.`, { variant: 'success' });
        loadData();
      } catch (error) {
        console.error(error);
        enqueueSnackbar('Erro ao alterar status.', { variant: 'error' });
      }
    },
    [enqueueSnackbar]
  );

  const userColumns = useMemo(
    () =>
      getUserListColumns({
        onEdit: handleEdit,
        onDelete: handleDeleteClick,
        onToggleStatus: handleToggleStatus,
      }),
    [handleEdit, handleDeleteClick, handleToggleStatus]
  );

  const emptyContent = useMemo(
    () => (
      <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
        <Typography sx={{ color: textMuted }}>Nenhum usuário encontrado.</Typography>
      </Box>
    ),
    [textMuted]
  );

  return (
    <Box>
      <DataListTable
        density="compact"
        shell={{
          title: 'Usuários do sistema',
          titleIcon: 'people',
          accentColor: '#2563eb',
          count: users.length,
          sx: { ...cardStyle, mb: 2 },
          toolbar: (
            <Box display="flex" gap={2} flexWrap="wrap" justifyContent="flex-end">
              <Button startIcon={<Add />} variant="outlined" onClick={() => setImportModalOpen(true)}>
                Importar do Azure
              </Button>
              <Button data-testid="user-add-local" startIcon={<Add />} variant="contained" onClick={handleAdd}>
                Novo usuário local
              </Button>
            </Box>
          ),
          tableContainerSx: {
            borderRadius: 0,
            boxShadow: 'none',
          },
        }}
        columns={userColumns}
        rows={users}
        sortRows={sortUserRows}
        defaultOrderBy="user"
        defaultOrder="asc"
        emptyMessage="Nenhum usuário encontrado."
        emptyContent={emptyContent}
        dataTestidTable="tabela-organizacao-usuarios"
        rowsPerPageOptions={[5, 10, 25, 50]}
        rowsPerPageDefault={10}
      />
      <UserModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={loadData} editData={editData} />
      {importModalOpen && (
        <UserImportModal open={importModalOpen} onClose={() => setImportModalOpen(false)} onSuccess={loadData} />
      )}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir usuário"
        content="Tem certeza que deseja excluir este usuário?"
      />
    </Box>
  );
};

export default UsersTab;
