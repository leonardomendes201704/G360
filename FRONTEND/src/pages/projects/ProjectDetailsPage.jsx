import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Tabs, Tab, CircularProgress,
    Alert, Snackbar, Button, Divider
} from '@mui/material';
import {
    RocketLaunch, Assignment, MonetizationOn, Description,
    Group, Warning, CalendarToday, AccessTime, PlaylistAddCheck
} from '@mui/icons-material';

import {
    getProjectById, updateProject, deleteProject,
    submitForApproval, addProjectMember, updateProjectMember, removeProjectMember
} from '../../services/project.service';
import { getSuppliers } from '../../services/supplier.service';
import { createProjectTask, createProjectCost } from '../../services/project-details.service';

import DarkProjectHeader from '../../components/projects/DarkProjectHeader';
import DarkTabsNavigation from '../../components/projects/DarkTabsNavigation';
import ProjectInfoCard from '../../components/projects/ProjectInfoCard';
import ProjectSummaryCard from '../../components/projects/ProjectSummaryCard';
import ProjectTimeline from '../../components/projects/ProjectTimeline';
import KPICardsGrid from '../../components/projects/KPICardsGrid';
import MacroTimelineCard from '../../components/projects/MacroTimelineCard';
import QuickActionsGrid from '../../components/projects/QuickActionsGrid';
import ProjectModal from '../../components/modals/ProjectModal';
import RiskModal from '../../components/modals/RiskModal';
import MinuteModal from '../../components/modals/MinuteModal';
import ExpenseModal from '../../components/modals/ExpenseModal';
import ProposalModal from '../../components/modals/ProposalModal';
import FollowUpModal from '../../components/modals/FollowUpModal';
import ProjectTaskModal from '../../components/modals/ProjectTaskModal';
import MemberModal from '../../components/modals/MemberModal';
import TeamModal from '../../components/modals/TeamModal';

// Tabs
import DarkTasksTab from '../../components/projects/tabs/DarkTasksTab';
import ProjectCosts from '../../components/projects/tabs/ProjectCosts';
import ProjectProposals from '../../components/projects/tabs/ProjectProposals';
import ProjectTeams from '../../components/projects/tabs/ProjectTeams';
import ProjectRisks from '../../components/projects/tabs/ProjectRisks';
import ProjectMinutes from '../../components/projects/tabs/ProjectMinutes';
import ProjectFollowUp from '../../components/projects/tabs/ProjectFollowUp';
import ProjectOverview from '../../components/projects/tabs/ProjectOverview';
import RecentActivities from '../../components/projects/RecentActivities';


const ProjectDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();

    // Map tab names to indices
    const tabMap = {
        'overview': 0,
        'tasks': 1,
        'risks': 2,
        'minutes': 3,
        'costs': 4,
        'financial': 4, // alias
        'proposals': 5,
        'teams': 6,
        'followup': 7
    };

    const initialTab = tabMap[searchParams.get('tab')] || 0;
    const [tabValue, setTabValue] = useState(initialTab);
    const [modalOpen, setModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

    // Reference data for modals
    const [suppliers, setSuppliers] = useState([]);

    // Quick Action Modal States
    const [riskModalOpen, setRiskModalOpen] = useState(false);
    const [minuteModalOpen, setMinuteModalOpen] = useState(false);
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [proposalModalOpen, setProposalModalOpen] = useState(false);
    const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [memberModalOpen, setMemberModalOpen] = useState(false);
    const [teamModalOpen, setTeamModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [memberToEdit, setMemberToEdit] = useState(null);
    const [memberViewMode, setMemberViewMode] = useState(false);

    const fetchProject = async () => {
        try {
            setLoading(true);
            const [projectData, suppliersData] = await Promise.all([
                getProjectById(id),
                getSuppliers().catch(() => [])
            ]);
            setProject(projectData);
            setSuppliers(suppliersData);
        } catch (err) {
            console.error(err);
            setError('Erro ao carregar projeto.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchProject();
    }, [id]);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleEdit = () => {
        setModalOpen(true);
    };

    const handleSaveProject = async (data) => {
        try {
            await updateProject(id, data);
            setModalOpen(false);
            fetchProject();
            setToast({ open: true, message: 'Projeto atualizado com sucesso!', severity: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ open: true, message: 'Erro ao atualizar projeto.', severity: 'error' });
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Tem certeza que deseja excluir este projeto?')) {
            try {
                await deleteProject(id);
                navigate('/projects');
            } catch (err) {
                console.error(err);
                setToast({ open: true, message: 'Erro ao excluir projeto.', severity: 'error' });
            }
        }
    };

    // --- Workflow Handlers ---

    const handleSubmitApproval = async () => {
        try {
            if (!window.confirm('Confirma a submissão deste projeto para aprovação?')) return;
            await submitForApproval(id);
            fetchProject();
            setToast({ open: true, message: 'Projeto submetido para aprovação!', severity: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ open: true, message: err.response?.data?.message || 'Erro ao submeter projeto.', severity: 'error' });
        }
    };

    // --- Quick Action Handlers ---
    const handleNewTask = () => setTaskModalOpen(true);
    const handleNewRisk = () => setRiskModalOpen(true);
    const handleNewMinute = () => setMinuteModalOpen(true);
    const handleAddCost = () => setExpenseModalOpen(true);
    const handleAddProposal = () => setProposalModalOpen(true);
    const handleAddFollowUp = () => setFollowUpModalOpen(true);
    const handleAddMember = () => { setMemberToEdit(null); setMemberViewMode(false); setMemberModalOpen(true); };
    const handleCreateTeam = () => { setEditingTeam(null); setTeamModalOpen(true); };

    const handleViewMember = (member) => {
        setMemberToEdit(member);
        setMemberViewMode(true);
        setMemberModalOpen(true);
    };

    const handleEditMember = (member) => {
        setMemberToEdit(member);
        setMemberViewMode(false);
        setMemberModalOpen(true);
    };

    const handleRemoveMember = async (member) => {
        if (!window.confirm(`Tem certeza que deseja remover ${member.user?.name || 'este membro'} do projeto?`)) return;
        try {
            await removeProjectMember(project.id, member.userId);
            fetchProject();
            setToast({ open: true, message: 'Membro removido com sucesso!', severity: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ open: true, message: 'Erro ao remover membro', severity: 'error' });
        }
    };

    const handleEditTeam = (teamName) => {
        // Find team data from members
        const teamMembers = project.members?.filter(m => m.role?.includes(` - ${teamName}`)) || [];
        const leaderMember = teamMembers.find(m => m.role?.includes('|LEADER'));
        setEditingTeam({
            name: teamName,
            members: teamMembers,
            leaderId: leaderMember?.userId || teamMembers[0]?.userId
        });
        setTeamModalOpen(true);
    };

    const handleDeleteTeam = async (teamName) => {
        if (!window.confirm(`Tem certeza que deseja excluir a equipe "${teamName}"?`)) return;
        try {
            // Remove team from member roles
            const teamMembers = project.members?.filter(m => m.role?.includes(` - ${teamName}`)) || [];
            const updates = teamMembers.map(async (member) => {
                const newRole = member.role?.split(' - ')[0]?.replace('|LEADER', '') || 'Membro';
                await updateProjectMember(project.id, member.userId, newRole);
            });
            await Promise.all(updates);
            fetchProject();
            setToast({ open: true, message: 'Equipe excluída com sucesso!', severity: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ open: true, message: 'Erro ao excluir equipe', severity: 'error' });
        }
    };

    // Note: handleApprove and handleReject removed
    // Approvals are centralized in "Minhas Aprovações" module

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a' }}>
                <CircularProgress sx={{ color: '#2563eb' }} />
            </Box>
        );
    }

    if (!project) return null;

    // Lock Logic: Pending Approval projects are Read-Only
    const isPending = project.approvalStatus === 'PENDING_APPROVAL';
    const isLocked = isPending;

    const LockedOverlay = ({ children }) => (
        <Box sx={{ position: 'relative' }}>
            {isLocked && (
                <Box sx={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    zIndex: 10, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'all' // Blocks clicks
                }}>
                    <Box sx={{
                        background: '#1e293b', border: '1px solid rgba(245, 158, 11, 0.2)',
                        p: 3, borderRadius: '12px', textAlign: 'center'
                    }}>
                        <Typography sx={{ color: '#f59e0b', fontWeight: 600, mb: 1 }}>
                            <Warning sx={{ verticalAlign: 'bottom', mr: 1 }} />
                            Aguardando Aprovação
                        </Typography>
                        <Typography sx={{ color: '#94a3b8', fontSize: '14px' }}>
                            Edições estão bloqueadas enquanto o projeto está em análise.
                        </Typography>
                    </Box>
                </Box>
            )}
            <Box sx={isLocked ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                {children}
            </Box>
        </Box>
    );

    return (
        <Box sx={{ minHeight: '100vh', pb: 8 }}>
            <Box>
                <DarkProjectHeader
                    project={project}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onSubmit={handleSubmitApproval}
                />

                {/* Global Alert for Pending Status */}
                {isPending && (
                    <Alert severity="warning" sx={{ mb: 3, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        Este projeto está <strong>Pendente de Aprovação</strong>. Algumas funcionalidades estão temporariamente bloqueadas.
                    </Alert>
                )}

                <DarkTabsNavigation
                    tabValue={tabValue}
                    setTabValue={setTabValue}
                    tasks={project?.tasks || []}
                    risks={project?.risks || []}
                    project={project}
                />

                <Box sx={{ mt: 4 }}>
                    {tabValue === 0 && (
                        <Box className="fade-in-up">
                            <ProjectInfoCard project={project} />
                            <KPICardsGrid
                                project={project}
                                tasks={project?.tasks || []}
                                risks={project?.risks || []}
                            />
                            <Box sx={{ mt: 4 }}>
                                <MacroTimelineCard project={project} />
                            </Box>
                            <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '3fr 1fr' }, gap: 3, alignItems: 'stretch' }}>
                                <QuickActionsGrid
                                    onNewTask={handleNewTask}
                                    onNewRisk={handleNewRisk}
                                    onNewMinute={handleNewMinute}
                                    onAddMember={handleAddMember}
                                    onAddCost={handleAddCost}
                                    onAddProposal={handleAddProposal}
                                    onAddFollowUp={handleAddFollowUp}
                                />
                                <Box sx={{ position: 'relative', minHeight: '100%' }}>
                                    <Box sx={{ position: 'absolute', inset: 0 }}>
                                        <RecentActivities projectId={project.id} />
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {tabValue === 1 && (
                        <LockedOverlay>
                            <DarkTasksTab project={project} />
                        </LockedOverlay>
                    )}

                    {tabValue === 2 && (
                        <LockedOverlay>
                            <ProjectRisks projectId={project.id} />
                        </LockedOverlay>
                    )}

                    {tabValue === 3 && (
                        <LockedOverlay>
                            <ProjectMinutes projectId={project.id} projectName={project.name} />
                        </LockedOverlay>
                    )}

                    {tabValue === 4 && (
                        <LockedOverlay>
                            <ProjectCosts projectId={project.id} budget={project.budget} projectName={project.name} onProjectUpdate={fetchProject} />
                        </LockedOverlay>
                    )}

                    {tabValue === 5 && (
                        <LockedOverlay>
                            <ProjectProposals projectId={project.id} projectName={project.name} />
                        </LockedOverlay>
                    )}

                    {tabValue === 6 && (
                        <LockedOverlay>
                            <ProjectTeams
                                projectId={project.id}
                                members={project.members || []}
                                tasks={project.tasks || []}
                                onAddMember={handleAddMember}
                                onCreateTeam={handleCreateTeam}
                                onEditTeam={handleEditTeam}
                                onDeleteTeam={handleDeleteTeam}
                                onViewMember={handleViewMember}
                                onEditMember={handleEditMember}
                                onRemoveMember={handleRemoveMember}
                            />
                        </LockedOverlay>
                    )}

                    {tabValue === 7 && (
                        <ProjectFollowUp projectId={id} projectMembers={project.members || []} />
                    )}
                </Box>
            </Box>

            <ProjectModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveProject}
                project={project}
            />

            {/* Quick Action Modals */}
            <RiskModal
                open={riskModalOpen}
                onClose={() => setRiskModalOpen(false)}
                onSave={() => { setRiskModalOpen(false); fetchProject(); }}
                projectId={project.id}
            />

            <MinuteModal
                open={minuteModalOpen}
                onClose={() => setMinuteModalOpen(false)}
                onSave={() => { setMinuteModalOpen(false); fetchProject(); }}
                projectId={project.id}
                projectName={project.name}
            />

            <ExpenseModal
                open={expenseModalOpen}
                onClose={() => setExpenseModalOpen(false)}
                onSave={async (data) => {
                    try {
                        await createProjectCost(project.id, data);
                        setExpenseModalOpen(false);
                        fetchProject();
                        setToast({ open: true, message: 'Custo adicionado com sucesso!', severity: 'success' });
                    } catch (err) {
                        console.error(err);
                        const status = err?.response?.status;
                        const backendMessage = err?.response?.data?.message;
                        const message = backendMessage || (status === 403
                            ? 'Sem permissão para lançar custos neste projeto.'
                            : 'Erro ao adicionar custo.');
                        setToast({ open: true, message, severity: 'error' });
                    }
                }}
                isProjectContext={true}
            />

            <ProposalModal
                open={proposalModalOpen}
                onClose={() => setProposalModalOpen(false)}
                onSave={() => { setProposalModalOpen(false); fetchProject(); }}
                projectId={project.id}
                projectName={project.name}
                suppliers={suppliers}
            />

            <FollowUpModal
                open={followUpModalOpen}
                onClose={() => setFollowUpModalOpen(false)}
                onSave={() => { setFollowUpModalOpen(false); fetchProject(); }}
                projectId={project.id}
                users={(project.members || []).map(m => ({ id: m.userId || m.user?.id, name: m.user?.name || 'Membro' })).filter(u => u.id)}
            />

            <ProjectTaskModal
                open={taskModalOpen}
                onClose={() => setTaskModalOpen(false)}
                onSave={async (taskData) => {
                    try {
                        await createProjectTask(project.id, taskData);
                        setTaskModalOpen(false);
                        fetchProject();
                        setToast({ open: true, message: 'Tarefa criada com sucesso!', severity: 'success' });
                    } catch (err) {
                        console.error(err);
                        setToast({ open: true, message: 'Erro ao criar tarefa', severity: 'error' });
                    }
                }}
                projectId={project.id}
                allTasks={project.tasks || []}
            />

            {memberModalOpen && (
                <MemberModal
                    open={memberModalOpen}
                    onClose={() => { setMemberModalOpen(false); setMemberToEdit(null); setMemberViewMode(false); }}
                    memberToEdit={memberToEdit}
                    readOnly={memberViewMode}
                    onSave={async (memberData) => {
                        try {
                            if (memberToEdit) {
                                await updateProjectMember(project.id, memberToEdit.userId, memberData.role);
                                setToast({ open: true, message: 'Membro atualizado com sucesso!', severity: 'success' });
                            } else {
                                await addProjectMember(project.id, memberData);
                                setToast({ open: true, message: 'Membro adicionado com sucesso!', severity: 'success' });
                            }
                            setMemberModalOpen(false);
                            setMemberToEdit(null);
                            setMemberViewMode(false);
                            fetchProject();
                        } catch (err) {
                            console.error(err);
                            setToast({ open: true, message: memberToEdit ? 'Erro ao atualizar membro' : 'Erro ao adicionar membro', severity: 'error' });
                        }
                    }}
                />
            )}

            {teamModalOpen && (
                <TeamModal
                    open={teamModalOpen}
                    onClose={() => { setTeamModalOpen(false); setEditingTeam(null); }}
                    team={editingTeam}
                    projectMembers={project.members || []}
                    onSave={async (teamData) => {
                        try {
                            // If editing, first remove old team from all old members
                            if (editingTeam?.name && editingTeam.name !== teamData.name) {
                                const oldTeamMembers = project.members?.filter(m => m.role?.includes(` - ${editingTeam.name}`)) || [];
                                for (const member of oldTeamMembers) {
                                    if (!teamData.memberIds.includes(member.userId)) {
                                        const newRole = member.role?.split(' - ')[0]?.replace('|LEADER', '') || 'Membro';
                                        await updateProjectMember(project.id, member.userId, newRole);
                                    }
                                }
                            }

                            // Update member roles to include team name
                            const updates = teamData.memberIds.map(async (userId) => {
                                const member = project.members.find(m => m.userId === userId);
                                if (member) {
                                    const isLeader = userId === teamData.leaderId;
                                    const currentRolePart = member.role?.split(' - ')[0]?.replace('|LEADER', '') || 'Membro';
                                    const newRole = isLeader
                                        ? `${currentRolePart}|LEADER - ${teamData.name}`
                                        : `${currentRolePart} - ${teamData.name}`;
                                    await updateProjectMember(project.id, userId, newRole);
                                }
                            });
                            await Promise.all(updates);
                            setTeamModalOpen(false);
                            setEditingTeam(null);
                            fetchProject();
                            setToast({ open: true, message: editingTeam ? 'Equipe atualizada com sucesso!' : 'Equipe criada com sucesso!', severity: 'success' });
                        } catch (err) {
                            console.error(err);
                            setToast({ open: true, message: 'Erro ao salvar equipe', severity: 'error' });
                        }
                    }}
                />
            )}

            <Snackbar
                open={toast.open}
                autoHideDuration={6000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%' }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ProjectDetailsPage;
