import { useMemo, useState } from 'react';
import { Menu, MenuItem } from '@mui/material';
import { Delete } from '@mui/icons-material';
import DataListTable from '../../common/DataListTable';
import { getProjectMemberListColumns, getTeamForMember } from './projectMemberListColumns';
import { sortProjectMemberRows } from './projectMemberListSort';

/**
 * Lista compacta de membros (DataListTable) + menu Remover — substitui a grelha CSS antiga.
 */
export default function ProjectMembersTable({ members, teams, themeColors, onView, onEdit, onRemove }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  const rows = useMemo(
    () =>
      members.map((m) => ({
        ...m,
        __teamName: getTeamForMember(m, teams).name,
        __roleLabel: m.role?.split('|')[0]?.split(' - ')[0] || 'Sem função',
      })),
    [members, teams]
  );

  const handleMenuOpen = (event, member) => {
    setMenuAnchor(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedMember(null);
  };

  const handleRemove = () => {
    if (onRemove && selectedMember) onRemove(selectedMember);
    handleMenuClose();
  };

  return (
    <>
      <DataListTable
        density="compact"
        dataTestidTable="tabela-projeto-membros"
        shell={{
          hideHeader: true,
          sx: {
            background: themeColors.cardBg,
            border: `1px solid ${themeColors.cardBorder}`,
            borderRadius: '8px',
            overflow: 'hidden',
          },
          tableContainerSx: { maxHeight: 480 },
        }}
        columns={getProjectMemberListColumns({
          themeColors,
          teams,
          onView,
          onEdit,
          onOpenMenu: handleMenuOpen,
        })}
        rows={rows}
        sortRows={sortProjectMemberRows}
        defaultOrderBy="member"
        defaultOrder="asc"
        rowsPerPageDefault={15}
        emptyMessage="Nenhum membro nesta vista."
      />
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            background: '#1a222d',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          },
        }}
      >
        <MenuItem
          onClick={handleRemove}
          sx={{
            color: '#ef4444',
            fontSize: 14,
            gap: 1.5,
            '&:hover': { background: 'rgba(239, 68, 68, 0.1)' },
          }}
        >
          <Delete fontSize="small" />
          Remover do Projeto
        </MenuItem>
      </Menu>
    </>
  );
}
