import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { Box, Button, Typography, Autocomplete, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import userService from '../../services/user.service';
import roleService from '../../services/role.service';
import ConfirmDialog from '../common/ConfirmDialog';
import StandardModal from '../common/StandardModal';
import DataListTable from '../common/DataListTable';
import { ThemeContext } from '../../contexts/ThemeContext';
import { useOrgThemeStyles } from '../../pages/config/useOrgThemeStyles';
import { getCabMemberListColumns } from '../config/cabMemberListColumns';
import { sortCabMemberRows } from '../config/cabMemberListSort';

const CabMembersTab = () => {
  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';
  const { textPrimary, textMuted, cardStyle, actionBtnStyle } = useOrgThemeStyles();
  const inputBg = isDark ? '#1c2632' : '#ffffff';
  const inputBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.12)';

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      background: inputBg,
      color: textPrimary,
      '& fieldset': { borderColor: inputBorder },
    },
    '& .MuiInputLabel-root': { color: textMuted },
  };

  const { enqueueSnackbar } = useSnackbar();
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const users = await userService.getAll();
      const cabMembers = users.filter((u) => u.roles && u.roles.some((r) => r.name === 'CAB Member'));
      setMembers(cabMembers);
      setAllUsers(users);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddMember = async () => {
    if (!selectedUser) return;
    try {
      const currentRoles = selectedUser.roles ? selectedUser.roles.map((r) => r.id) : [];
      const roles = await roleService.getAll();
      const cabRole = roles.find((r) => r.name === 'CAB Member');
      if (cabRole) {
        const newRoles = [...new Set([...currentRoles, cabRole.id])];
        await userService.updateUser(selectedUser.id, { roleIds: newRoles });
        enqueueSnackbar('Membro adicionado ao CAB com sucesso!', { variant: 'success' });
        setOpenModal(false);
        setSelectedUser(null);
        fetchMembers();
      } else {
        enqueueSnackbar('Erro: Perfil "CAB Member" não encontrado no sistema.', { variant: 'error' });
      }
    } catch (error) {
      enqueueSnackbar('Erro ao adicionar membro.', { variant: 'error' });
    }
  };

  const handleRemoveClick = useCallback((user) => {
    setUserToRemove(user);
    setConfirmOpen(true);
  }, []);

  const handleConfirmRemove = async () => {
    if (!userToRemove) return;
    setConfirmOpen(false);
    try {
      const currentRoles = userToRemove.roles ? userToRemove.roles.map((r) => r.id) : [];
      const roles = await roleService.getAll();
      const cabRole = roles.find((r) => r.name === 'CAB Member');
      if (cabRole) {
        const newRoles = currentRoles.filter((rid) => rid !== cabRole.id);
        await userService.updateUser(userToRemove.id, { roleIds: newRoles });
        enqueueSnackbar('Membro removido do CAB.', { variant: 'success' });
        fetchMembers();
      }
    } catch (error) {
      enqueueSnackbar('Erro ao remover membro.', { variant: 'error' });
    } finally {
      setUserToRemove(null);
    }
  };

  const cabColumns = useMemo(
    () =>
      getCabMemberListColumns({
        textPrimary,
        actionBtnStyle,
        onRemove: handleRemoveClick,
      }),
    [textPrimary, actionBtnStyle, handleRemoveClick]
  );

  const emptyContent = useMemo(
    () => (
      <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
        <span
          className="material-icons-round"
          style={{ fontSize: '64px', color: textMuted, opacity: 0.5, display: 'block', marginBottom: '16px' }}
        >
          groups
        </span>
        <Typography sx={{ color: textMuted, fontSize: '16px' }}>Nenhum membro definido para o comitê</Typography>
      </Box>
    ),
    [textMuted]
  );

  return (
    <>
      <DataListTable
        density="compact"
        loading={loading}
        shell={{
          title: 'Change Advisory Board (CAB)',
          titleIcon: 'groups',
          accentColor: '#2563eb',
          count: members.length,
          sx: { ...cardStyle, mb: 2 },
          toolbar: (
            <Button
              onClick={() => setOpenModal(true)}
              sx={{
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                flexShrink: 0,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)',
                },
              }}
              startIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>person_add</span>}
            >
              Adicionar membro
            </Button>
          ),
          tableContainerSx: {
            borderRadius: 0,
            boxShadow: 'none',
          },
        }}
        columns={cabColumns}
        rows={members}
        sortRows={sortCabMemberRows}
        defaultOrderBy="name"
        defaultOrder="asc"
        emptyMessage="Nenhum membro definido para o comitê."
        emptyContent={emptyContent}
        dataTestidTable="tabela-organizacao-cab"
        rowsPerPageOptions={[5, 10, 25, 50]}
        rowsPerPageDefault={10}
      />

      <StandardModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Adicionar membro ao CAB"
        icon="group_add"
        size="form"
        actions={[
          { label: 'Cancelar', onClick: () => setOpenModal(false) },
          { label: 'Adicionar', onClick: handleAddMember, disabled: !selectedUser },
        ]}
      >
        <Autocomplete
          options={allUsers.filter((u) => !members.some((m) => m.id === u.id))}
          getOptionLabel={(option) => `${option.name} (${option.email})`}
          value={selectedUser}
          onChange={(e, v) => setSelectedUser(v)}
          renderInput={(params) => <TextField {...params} label="Selecione o usuário" fullWidth sx={inputSx} />}
          sx={{ '& .MuiAutocomplete-listbox': { background: inputBg } }}
        />
      </StandardModal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setUserToRemove(null);
        }}
        onConfirm={handleConfirmRemove}
        title="Remover do CAB"
        content={`Tem certeza que deseja remover ${userToRemove?.name || 'este membro'} do CAB?`}
      />
    </>
  );
};

export default CabMembersTab;
