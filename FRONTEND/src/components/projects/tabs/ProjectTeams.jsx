import { useState, useMemo, useContext } from 'react';
import { Box, Typography, Menu, MenuItem } from '@mui/material';
import { People, Groups, Analytics, Task, Code, Palette, BugReport, RocketLaunch, Edit, MoreVert, Visibility, Search, Person, Delete, PersonAdd } from '@mui/icons-material';
import { ThemeContext } from '../../../contexts/ThemeContext';
import './ProjectTeams.css';
import StatsCard from '../../common/StatsCard';
import ProjectTabKpiStrip from '../ProjectTabKpiStrip';
import ProjectMembersTable from '../projectDetailLists/ProjectMembersTable';

const ProjectTeams = ({
    projectId,
    members = [],
    tasks = [],
    onCreateTeam,
    onEditTeam,
    onDeleteTeam,
    onEditMember,
    onViewMember,
    onRemoveMember,
    onAddMember
}) => {
    const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Theme context
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';

    // Theme-aware colors
    const themeColors = {
        cardBg: isDark
            ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)'
            : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
        cardBorder: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)',
        textPrimary: isDark ? '#f1f5f9' : '#1e293b',
        textSecondary: isDark ? '#94a3b8' : '#64748b',
        textMuted: isDark ? '#64748b' : '#94a3b8',
        surfaceBg: isDark ? '#1c2632' : '#f8fafc',
        surfaceHover: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        footerBg: isDark ? '#161d26' : '#f1f5f9',
        borderSubtle: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)',
        inputBg: isDark ? '#1c2632' : '#ffffff',
        inputBorder: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.12)',
        isDark
    };

    // Calcular o status real do membro baseado nas tarefas
    const getMemberStatus = (member) => {
        const memberTasks = tasks.filter(t => {
            const assignee = t.assignedTo || t.assignee;
            if (!assignee) return false;
            if (assignee.id && assignee.id === member.userId) return true;
            if (typeof assignee === 'string' && assignee === member.userId) return true;
            if (assignee.name && member.user?.name && assignee.name.toLowerCase() === member.user.name.toLowerCase()) return true;
            return false;
        });

        const pendingTasks = memberTasks.filter(t =>
            t.status?.toLowerCase() !== 'done' &&
            t.status?.toLowerCase() !== 'concluido' &&
            t.status?.toLowerCase() !== 'concluída' &&
            t.status?.toLowerCase() !== 'completed'
        );

        if (pendingTasks.length > 0) return 'alocado';     // Tem tarefas pendentes
        if (memberTasks.length > 0) return 'ativo';        // Tem tarefas (todas concluídas)
        return 'disponivel';                                // Sem tarefas
    };

    // Enhance members with calculated status
    const membersWithStatus = useMemo(() => {
        return members.map(member => ({
            ...member,
            calculatedStatus: getMemberStatus(member),
            taskCount: tasks.filter(t => {
                const assignee = t.assignedTo || t.assignee;
                if (!assignee) return false;
                if (assignee.id && assignee.id === member.userId) return true;
                if (typeof assignee === 'string' && assignee === member.userId) return true;
                if (assignee.name && member.user?.name && assignee.name.toLowerCase() === member.user.name.toLowerCase()) return true;
                return false;
            }).length
        }));
    }, [members, tasks]);

    // Organize members by team (extraindo do role "Função - Equipe")
    // Apenas equipes REAIS são agrupadas - membros sem equipe ficam apenas na tabela
    const teams = useMemo(() => {
        const teamMap = {};

        membersWithStatus.forEach(member => {
            // Formato do role: "ROLE - TeamName" ou "ROLE|LEADER - TeamName"
            // Primeiro verificamos se tem " - " (indica que tem equipe)
            const hasTeam = member.role?.includes(' - ');

            // Só criar card para equipes REAIS
            if (hasTeam) {
                // Extrair nome da equipe (parte após " - ")
                const teamName = member.role.split(' - ')[1];

                if (!teamMap[teamName]) {
                    teamMap[teamName] = {
                        name: teamName,
                        members: [],
                        icon: getTeamIcon(teamName),
                        gradient: getTeamGradient(teamName),
                        description: getTeamDescription(teamName)
                    };
                }
                teamMap[teamName].members.push(member);
            }
        });

        return Object.values(teamMap);
    }, [membersWithStatus]);

    // Calculate metrics for a team based on real task data
    const getTeamMetrics = (teamMembers) => {
        const memberIds = teamMembers.map(m => m.userId);
        const memberNames = teamMembers.map(m => m.user?.name?.toLowerCase());

        const teamTasks = tasks.filter(t => {
            const assignee = t.assignedTo || t.assignee;
            if (!assignee) return false;

            // Match by userId (if assignee is object with id)
            if (assignee.id && memberIds.includes(assignee.id)) return true;

            // Match by userId directly (if assignee is string userId)
            if (typeof assignee === 'string' && memberIds.includes(assignee)) return true;

            // Match by name (fallback)
            if (assignee.name && memberNames.includes(assignee.name.toLowerCase())) return true;

            return false;
        });

        const totalTasks = teamTasks.length;
        const completedTasks = teamTasks.filter(t =>
            t.status?.toLowerCase() === 'done' ||
            t.status?.toLowerCase() === 'concluido' ||
            t.status?.toLowerCase() === 'concluída' ||
            t.status?.toLowerCase() === 'completed'
        ).length;
        const productivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return { totalTasks, completedTasks, productivity };
    };

    // Calculate statistics
    const stats = useMemo(() => {
        const totalMembers = membersWithStatus.length;
        const activeMembers = membersWithStatus.filter(m => m.calculatedStatus === 'ativo' || m.calculatedStatus === 'alocado').length;
        const totalTeams = teams.length;
        const avgWorkload = membersWithStatus.length > 0
            ? Math.round(membersWithStatus.reduce((sum, m) => sum + (m.taskCount || 0), 0) / membersWithStatus.length)
            : 0;

        return { totalMembers, activeMembers, totalTeams, avgWorkload };
    }, [membersWithStatus, teams]);

    // Filter teams and members
    const filteredMembers = useMemo(() => {
        return membersWithStatus.filter(member => {
            const roleWithoutLeader = member.role?.split('|')[0] || member.role;
            const teamName = roleWithoutLeader?.includes(' - ') ? roleWithoutLeader.split(' - ')[1] : null;
            const matchesTeam = selectedTeamFilter === 'all' || teamName === selectedTeamFilter || (selectedTeamFilter === 'unassigned' && !teamName);
            const matchesStatus = selectedStatusFilter === 'all' || member.calculatedStatus === selectedStatusFilter;
            const matchesSearch = searchQuery === '' ||
                member.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                member.role?.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesTeam && matchesStatus && matchesSearch;
        });
    }, [membersWithStatus, selectedTeamFilter, selectedStatusFilter, searchQuery]);

    const filteredTeams = useMemo(() => {
        return teams.map(team => ({
            ...team,
            members: team.members.filter(member => filteredMembers.includes(membersWithStatus.find(m => m.id === member.id))),
            metrics: getTeamMetrics(team.members)
        })).filter(team => team.members.length > 0 || selectedTeamFilter === team.name);
    }, [teams, filteredMembers, membersWithStatus, selectedTeamFilter, tasks]);

    return (
        <Box sx={{ px: 4, pb: 4 }}>
            {/* Section Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, animation: 'fadeInUp 0.5s ease 0.15s both' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Groups sx={{ color: '#0ea5e9', fontSize: 24 }} />
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>Equipes do Projeto</Typography>
                    <Box sx={{
                        background: 'rgba(14, 165, 233, 0.15)',
                        color: '#0ea5e9',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: '8px',
                        fontSize: 13,
                        fontWeight: 600
                    }}>
                        {teams.length} equipes • {members.length} membros
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <button
                        className="btn btn-secondary"
                        onClick={onAddMember}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '12px 20px', borderRadius: '8px',
                            fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#94a3b8',
                            transition: 'all 0.2s'
                        }}
                    >
                        <PersonAdd fontSize="small" />
                        Adicionar Membro
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={onCreateTeam}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '12px 20px', borderRadius: '8px',
                            fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none',
                            background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Groups fontSize="small" />
                        Nova Equipe
                    </button>
                </Box>
            </Box>

            <ProjectTabKpiStrip columnCount={4}>
                <StatsCard dense title="Membros" value={stats.totalMembers} iconName="people" hexColor="#0ea5e9" />
                <StatsCard dense title="Ativos" value={stats.activeMembers} iconName="person_pin_circle" hexColor="#10b981" />
                <StatsCard dense title="Equipes" value={stats.totalTeams} iconName="groups" hexColor="#3b82f6" />
                <StatsCard
                    dense
                    title="Carga média"
                    value={stats.avgWorkload}
                    subtitle="tarefas / membro"
                    iconName="trending_up"
                    hexColor="#f59e0b"
                />
            </ProjectTabKpiStrip>

            {/* Filters Bar */}
            <Box sx={{
                background: themeColors.cardBg,
                border: `1px solid ${themeColors.cardBorder}`,
                borderRadius: '8px',
                p: 2,
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
                animation: 'fadeInUp 0.5s ease 0.25s both'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 10, color: themeColors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                        Equipe:
                    </Typography>
                    <select
                        value={selectedTeamFilter}
                        onChange={(e) => setSelectedTeamFilter(e.target.value)}
                        style={{
                            background: themeColors.inputBg,
                            border: `1px solid ${themeColors.inputBorder}`,
                            borderRadius: '8px',
                            padding: '8px 32px 8px 12px',
                            fontSize: 13,
                            color: themeColors.textPrimary,
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">Todas as Equipes</option>
                        {teams.map(team => (
                            <option key={team.name} value={team.name}>{team.name}</option>
                        ))}
                    </select>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 10, color: themeColors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                        Status:
                    </Typography>
                    <select
                        value={selectedStatusFilter}
                        onChange={(e) => setSelectedStatusFilter(e.target.value)}
                        style={{
                            background: themeColors.inputBg,
                            border: `1px solid ${themeColors.inputBorder}`,
                            borderRadius: '8px',
                            padding: '8px 32px 8px 12px',
                            fontSize: 13,
                            color: themeColors.textPrimary,
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">Todos</option>
                        <option value="alocado">Alocado</option>
                        <option value="ativo">Ativo</option>
                        <option value="disponivel">Disponível</option>
                    </select>
                </Box>
                <Box sx={{ flex: 1, minWidth: 200, position: 'relative' }}>
                    <Search sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: themeColors.textMuted }} />
                    <input
                        type="text"
                        placeholder="Buscar membro ou equipe..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            background: themeColors.inputBg,
                            border: `1px solid ${themeColors.inputBorder}`,
                            borderRadius: '8px',
                            padding: '8px 12px 8px 40px',
                            fontSize: 13,
                            color: themeColors.textPrimary
                        }}
                    />
                </Box>
            </Box>

            {/* Teams Grid */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                gap: 2.5,
                mb: 5,
                animation: 'fadeInUp 0.5s ease 0.3s both'
            }}>
                {filteredTeams.map((team) => (
                    <TeamCard
                        key={team.name}
                        team={team}
                        themeColors={themeColors}
                        onEdit={() => onEditTeam && onEditTeam(team.name)}
                        onDelete={() => onDeleteTeam && onDeleteTeam(team.name)}
                    />
                ))}
            </Box>

            {/* All Members Table */}
            <Box sx={{ mt: 5, animation: 'fadeInUp 0.5s ease 0.35s both' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Person sx={{ color: '#0ea5e9', fontSize: 24 }} />
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>Todos os Membros</Typography>
                        <Box sx={{
                            background: 'rgba(14, 165, 233, 0.15)',
                            color: '#0ea5e9',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: '8px',
                            fontSize: 13,
                            fontWeight: 600
                        }}>
                            {filteredMembers.length} membros
                        </Box>
                    </Box>
                </Box>

                <ProjectMembersTable
                    members={filteredMembers}
                    teams={teams}
                    themeColors={themeColors}
                    onView={onViewMember}
                    onEdit={onEditMember}
                    onRemove={onRemoveMember}
                />
            </Box>
        </Box>
    );
};

// Helper Components
const TeamCard = ({ team, themeColors, onEdit, onDelete }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const menuOpen = Boolean(anchorEl);

    const handleMenuClick = (event) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleDelete = () => {
        handleMenuClose();
        onDelete && onDelete();
    };

    // Use real metrics from team.metrics (calculated from actual tasks)
    const { totalTasks, completedTasks, productivity } = team.metrics || { totalTasks: 0, completedTasks: 0, productivity: 0 };

    return (
        <Box sx={{
            background: themeColors.cardBg,
            border: `1px solid ${themeColors.cardBorder}`,
            borderRadius: '8px',
            overflow: 'hidden',
            transition: 'all 0.3s',
            '&:hover': {
                borderColor: 'rgba(37, 99, 235, 0.3)',
                boxShadow: '0 0 40px rgba(37, 99, 235, 0.1)'
            }
        }}>
            {/* Header */}
            <Box sx={{
                p: 2.5,
                borderBottom: `1px solid ${themeColors.borderSubtle}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
            }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '8px',
                        background: team.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24
                    }}>
                        {team.icon}
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 600, mb: 0.5, color: themeColors.textPrimary }}>{team.name}</Typography>
                        <Typography variant="body2" sx={{ fontSize: 13, color: themeColors.textMuted }}>{team.description}</Typography>
                    </Box>
                </Box>
                <Box sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: '8px',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    background: 'rgba(14, 165, 233, 0.15)',
                    color: '#0ea5e9',
                    border: '1px solid rgba(14, 165, 233, 0.2)'
                }}>
                    <Groups sx={{ fontSize: 14 }} />
                    {team.members.length} {team.members.length === 1 ? 'membro' : 'membros'}
                </Box>
            </Box>

            {/* Body */}
            <Box sx={{ p: 3 }}>
                {/* Members Section */}
                <Box sx={{ mb: 2.5 }}>
                    <Box sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: themeColors.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        mb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}>
                        <People sx={{ fontSize: 16 }} />
                        Membros ({team.members.length})
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                        {team.members.map((member) => (
                            <MemberItem key={member.id} member={member} themeColors={themeColors} />
                        ))}
                    </Box>
                </Box>

                {/* Metrics Section */}
                <Box>
                    <Box sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: themeColors.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        mb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}>
                        <Analytics sx={{ fontSize: 16 }} />
                        Métricas
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <MetricItem value={`${productivity}% `} label="Produtividade" positive={productivity > 80} themeColors={themeColors} />
                        <MetricItem value={totalTasks} label="Tarefas" themeColors={themeColors} />
                        <MetricItem value={completedTasks} label="Concluídas" positive themeColors={themeColors} />
                    </Box>
                </Box>
            </Box>

            {/* Footer */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                background: themeColors.footerBg,
                borderTop: `1px solid ${themeColors.borderSubtle}`
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Box sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '8px',
                        background: team.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 600
                    }}>
                        {(() => {
                            const leader = team.members.find(m => m.role?.includes('|LEADER')) || team.members[0];
                            return leader?.user?.name?.charAt(0) || 'L';
                        })()}
                    </Box>
                    <Box sx={{ fontSize: 12 }}>
                        <Typography sx={{ color: themeColors.textMuted, fontSize: 12 }}>Líder:</Typography>
                        <Typography sx={{ fontWeight: 600, fontSize: 12, color: themeColors.textPrimary }}>
                            {(() => {
                                const leader = team.members.find(m => m.role?.includes('|LEADER')) || team.members[0];
                                return leader?.user?.name || 'Não definido';
                            })()}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <ActionButton icon={<Edit fontSize="small" />} onClick={onEdit} themeColors={themeColors} />
                    <ActionButton icon={<MoreVert fontSize="small" />} onClick={handleMenuClick} themeColors={themeColors} />
                </Box>

                {/* Context Menu */}
                <Menu
                    anchorEl={anchorEl}
                    open={menuOpen}
                    onClose={handleMenuClose}
                    PaperProps={{
                        sx: {
                            background: '#1a222d',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
                            minWidth: 180
                        }
                    }}
                >
                    <MenuItem
                        onClick={handleDelete}
                        sx={{
                            color: '#f43f5e',
                            fontSize: 14,
                            py: 1.5,
                            '&:hover': {
                                background: 'rgba(244, 63, 94, 0.1)'
                            }
                        }}
                    >
                        <Delete sx={{ fontSize: 18, mr: 1.5 }} />
                        Excluir Equipe
                    </MenuItem>
                </Menu>
            </Box>
        </Box>
    );
};

const MemberItem = ({ member, themeColors }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'alocado': return { bg: '#f59e0b', shadow: '0 0 8px rgba(245, 158, 11, 0.5)' };
            case 'ativo': return { bg: '#10b981', shadow: '0 0 8px rgba(16, 185, 129, 0.5)' };
            default: return { bg: '#64748b', shadow: 'none' };
        }
    };

    const statusStyle = getStatusColor(member.calculatedStatus);
    const avatarGradient = getAvatarGradient(member.user?.name || 'U');

    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            background: themeColors.surfaceBg,
            borderRadius: '8px',
            transition: 'all 0.2s',
            '&:hover': {
                background: themeColors.surfaceHover
            }
        }}>
            <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '8px',
                background: avatarGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 600,
                flexShrink: 0
            }}>
                {member.user?.name?.charAt(0) || 'U'}
            </Box>
            <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 500, color: themeColors.textPrimary }}>{member.user?.name || 'Usuário'}</Typography>
                <Typography sx={{ fontSize: 12, color: themeColors.textMuted }}>
                    {member.role?.split(' - ')[0] || 'Sem função'}
                </Typography>
            </Box>
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: 12,
                color: themeColors.textMuted,
                background: themeColors.footerBg,
                px: 1.25,
                py: 0.5,
                borderRadius: '8px'}}>
                <Task sx={{ fontSize: 14 }} />
                {member.taskCount || 0}
            </Box>
            <Box sx={{
                width: 10,
                height: 10,
                borderRadius: '8px',
                background: statusStyle.bg,
                boxShadow: statusStyle.shadow,
                flexShrink: 0
            }} />
        </Box>
    );
};

const MetricItem = ({ value, label, positive, themeColors }) => (
    <Box sx={{
        flex: 1,
        textAlign: 'center',
        p: 1.5,
        background: themeColors.surfaceBg,
        borderRadius: '8px'}}>
        <Typography variant="h5" sx={{
            fontSize: 20,
            fontWeight: 700,
            color: positive ? '#10b981' : themeColors.textPrimary
        }}>
            {value}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: 11, color: themeColors.textMuted, textTransform: 'uppercase' }}>
            {label}
        </Typography>
    </Box>
);

const ActionButton = ({ icon, onClick, themeColors }) => (
    <Box
        onClick={onClick}
        sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 2,
            py: 1,
            background: themeColors.surfaceBg,
            border: `1px solid ${themeColors.borderSubtle}`,
            borderRadius: '8px',
            color: themeColors.textSecondary,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
                background: 'rgba(37, 99, 235, 0.15)',
                color: '#2563eb',
                borderColor: '#2563eb'
            }
        }}
    >
        {icon}
    </Box>
);

// Helper Functions
const getTeamIcon = (teamName) => {
    const name = teamName.toLowerCase();
    if (name.includes('desen') || name.includes('dev')) return <Code />;
    if (name.includes('design')) return <Palette />;
    if (name.includes('qa') || name.includes('qualidade')) return <BugReport />;
    if (name.includes('product') || name.includes('gestão')) return <RocketLaunch />;
    return <Groups />;
};

const getTeamGradient = (teamName) => {
    const name = teamName.toLowerCase();
    if (name.includes('desen') || name.includes('dev')) return 'linear-gradient(135deg, #2563eb, #3b82f6)';
    if (name.includes('design')) return 'linear-gradient(135deg, #f43f5e, #f59e0b)';
    if (name.includes('qa') || name.includes('qualidade')) return 'linear-gradient(135deg, #10b981, #06b6d4)';
    if (name.includes('product') || name.includes('gestão')) return 'linear-gradient(135deg, #f59e0b, #f43f5e)';
    return 'linear-gradient(135deg, #0ea5e9, #2563eb)';
};

const getTeamDescription = (teamName) => {
    const name = teamName.toLowerCase();
    if (name.includes('desen') || name.includes('dev')) return 'Backend, Frontend e Mobile';
    if (name.includes('design')) return 'UI/UX e Design System';
    if (name.includes('qa') || name.includes('qualidade')) return 'Testes e Qualidade';
    if (name.includes('product') || name.includes('gestão')) return 'Gestão de Produto';
    return 'Equipe de Projeto';
};

const getAvatarGradient = (name) => {
    const gradients = [
        'linear-gradient(135deg, #2563eb, #3b82f6)',
        'linear-gradient(135deg, #10b981, #06b6d4)',
        'linear-gradient(135deg, #f59e0b, #f43f5e)',
        'linear-gradient(135deg, #f43f5e, #3b82f6)',
        'linear-gradient(135deg, #3b82f6, #2563eb)',
        'linear-gradient(135deg, #06b6d4, #10b981)'
    ];
    const index = (name?.charCodeAt(0) || 0) % gradients.length;
    return gradients[index];
};

export default ProjectTeams;
