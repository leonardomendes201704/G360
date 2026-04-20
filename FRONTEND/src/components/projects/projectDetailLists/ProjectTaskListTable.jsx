import { useState } from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import DataListTable from '../../common/DataListTable';
import { getProjectTaskListColumns } from './projectTaskListColumns';
import { sortProjectTaskRows } from './projectTaskListSort';

/**
 * Vista lista compacta de tarefas do projeto (`DataListTable` + menu de ações).
 */
export default function ProjectTaskListTable({
  tasks,
  onTaskClick,
  onTaskDelete,
  onTaskToggle,
  theme: t,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuTask, setMenuTask] = useState(null);

  const handleMenuOpen = (event, task) => {
    setAnchorEl(event.currentTarget);
    setMenuTask(task);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuTask(null);
  };

  return (
    <>
      <DataListTable
        density="compact"
        dataTestidTable="tabela-projeto-tarefas"
        shell={{
          hideHeader: true,
          sx: {
            background: t.containerBg,
            backdropFilter: t.isDark ? 'blur(10px)' : 'none',
            border: t.containerBorder,
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: t.cardShadow,
          },
          tableContainerSx: { maxHeight: 600 },
        }}
        columns={getProjectTaskListColumns({
          textPrimary: t.textPrimary,
          textSecondary: t.textSecondary,
          textMuted: t.textMuted,
          surfaceBg: t.surfaceBg,
          checkboxBorder: t.checkboxBorder,
          onTaskToggle,
          onOpenMenu: handleMenuOpen,
        })}
        rows={tasks}
        sortRows={sortProjectTaskRows}
        defaultOrderBy="deadline"
        defaultOrder="asc"
        getDefaultOrderForColumn={(id) =>
          id === 'deadline' || id === 'priority' || id === 'status' ? 'desc' : 'asc'
        }
        onRowClick={(task) => onTaskClick(task)}
        resetPaginationKey={tasks.length}
        rowsPerPageDefault={15}
        emptyMessage="Nenhuma tarefa encontrada."
      />
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: t.menuBg,
            border: t.menuBorder,
            color: t.menuText,
            boxShadow: t.isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.15)',
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuTask) onTaskClick(menuTask);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <span className="material-icons-round" style={{ color: t.textSecondary, fontSize: 18 }}>
              edit
            </span>
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuTask) onTaskDelete(menuTask.id);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <span className="material-icons-round" style={{ color: '#f43f5e', fontSize: 18 }}>
              delete
            </span>
          </ListItemIcon>
          <ListItemText sx={{ color: '#f43f5e' }}>Excluir</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
