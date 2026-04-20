import { Box, Typography } from '@mui/material';
import { Edit, Groups, MoreVert, Person, Visibility } from '@mui/icons-material';

export function getTeamForMember(member, teams) {
  const roleWithoutLeader = member.role?.split('|')[0] || member.role;
  const hasTeam = roleWithoutLeader?.includes(' - ');
  if (hasTeam) {
    const teamName = roleWithoutLeader.split(' - ')[1];
    return teams.find((t) => t.name === teamName) || { name: teamName, icon: <Groups fontSize="small" /> };
  }
  return { name: 'Sem alocação', icon: <Person fontSize="small" /> };
}

const getAvatarGradient = (name) => {
  const gradients = [
    'linear-gradient(135deg, #2563eb, #3b82f6)',
    'linear-gradient(135deg, #10b981, #06b6d4)',
    'linear-gradient(135deg, #f59e0b, #f43f5e)',
    'linear-gradient(135deg, #f43f5e, #3b82f6)',
    'linear-gradient(135deg, #3b82f6, #2563eb)',
    'linear-gradient(135deg, #06b6d4, #10b981)',
  ];
  const index = (name?.charCodeAt(0) || 0) % gradients.length;
  return gradients[index];
};

const TableActionButton = ({ icon, onClick, themeColors, ...rest }) => (
  <Box
    onClick={onClick}
    {...rest}
    sx={{
      width: 32,
      height: 32,
      borderRadius: '8px',
      background: themeColors.surfaceBg,
      border: `1px solid ${themeColors.borderSubtle}`,
      color: themeColors.textMuted,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
      '&:hover': {
        background: 'rgba(37, 99, 235, 0.15)',
        color: '#2563eb',
        borderColor: '#2563eb',
      },
    }}
  >
    {icon}
  </Box>
);

/**
 * Colunas `DataListTable` — membros (aba Equipe).
 */
export function getProjectMemberListColumns({ themeColors, teams, onView, onEdit, onOpenMenu }) {
  return [
    {
      id: 'member',
      label: 'Membro',
      width: '26%',
      minWidth: 160,
      sortable: true,
      accessor: (r) => r.user?.name || '',
      render: (member) => {
        const avatarGradient = getAvatarGradient(member.user?.name || 'U');
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: avatarGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {member.user?.name?.charAt(0) || 'U'}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 500, fontSize: '0.75rem', color: themeColors.textPrimary }}>
                {member.user?.name || 'Usuário'}
              </Typography>
              <Typography sx={{ fontSize: '0.65rem', color: themeColors.textMuted }}>{member.user?.email || '—'}</Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      id: 'team',
      label: 'Equipe',
      width: '20%',
      minWidth: 120,
      sortable: true,
      accessor: (r) => r.__teamName || '',
      render: (member) => {
        const team = getTeamForMember(member, teams);
        return (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.25,
              py: 0.5,
              background: team.name === 'Sem alocação' ? 'rgba(100, 116, 139, 0.15)' : themeColors.surfaceBg,
              borderRadius: '8px',
              fontSize: '0.7rem',
              color: team.name === 'Sem alocação' ? themeColors.textSecondary : '#0ea5e9',
              width: 'fit-content',
              fontStyle: team.name === 'Sem alocação' ? 'italic' : 'normal',
            }}
          >
            {team.icon}
            {team.name}
          </Box>
        );
      },
    },
    {
      id: 'role',
      label: 'Função',
      width: '18%',
      minWidth: 100,
      sortable: true,
      accessor: (r) => r.__roleLabel || '',
      render: (member) => (
        <Typography sx={{ fontSize: '0.7rem', color: themeColors.textSecondary }}>{member.__roleLabel}</Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: '14%',
      minWidth: 100,
      sortable: true,
      accessor: (r) => r.calculatedStatus || '',
      render: (member) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '8px',
              background:
                member.calculatedStatus === 'alocado'
                  ? '#f59e0b'
                  : member.calculatedStatus === 'ativo'
                    ? '#10b981'
                    : '#64748b',
              boxShadow:
                member.calculatedStatus === 'alocado'
                  ? '0 0 8px rgba(245, 158, 11, 0.5)'
                  : member.calculatedStatus === 'ativo'
                    ? '0 0 8px rgba(16, 185, 129, 0.5)'
                    : 'none',
            }}
          />
          <Typography sx={{ fontSize: '0.7rem', color: themeColors.textSecondary, textTransform: 'capitalize' }}>
            {member.calculatedStatus === 'alocado' ? 'Alocado' : member.calculatedStatus === 'ativo' ? 'Ativo' : 'Disponível'}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      align: 'right',
      width: '14%',
      minWidth: 120,
      sortable: false,
      render: (member) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }} onClick={(e) => e.stopPropagation()}>
          <TableActionButton icon={<Visibility sx={{ fontSize: 18 }} />} onClick={() => onView?.(member)} themeColors={themeColors} />
          <TableActionButton
            data-testid="project-member-edit"
            icon={<Edit sx={{ fontSize: 18 }} />}
            onClick={() => onEdit?.(member)}
            themeColors={themeColors}
          />
          <TableActionButton icon={<MoreVert sx={{ fontSize: 18 }} />} onClick={(e) => onOpenMenu(e, member)} themeColors={themeColors} />
        </Box>
      ),
    },
  ];
}
