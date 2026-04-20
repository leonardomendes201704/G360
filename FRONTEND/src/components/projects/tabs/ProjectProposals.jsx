import { useState, useEffect, useContext } from 'react';
import {
  Box, Button, Typography, Avatar, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
  Add, Article, CompareArrows,
  Star, StarHalf, StarOutline
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { AuthContext } from '../../../contexts/AuthContext';
import { roleIsAdminBypass } from '../../../utils/rbacPermissions';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { getProposals, deleteProposal, updateProposal, submitProposal } from '../../../services/project-details.service';
import { getSuppliers } from '../../../services/supplier.service';
import { getProjectById } from '../../../services/project.service';
import ProposalModal from '../../modals/ProposalModal';
import PaymentConditionModal from '../../modals/PaymentConditionModal';
import StatsCard from '../../common/StatsCard';
import ProjectTabKpiStrip from '../ProjectTabKpiStrip';
import DataListTable from '../../common/DataListTable';
import { getProjectProposalListColumns } from '../projectDetailLists/projectProposalListColumns';
import { sortProjectProposalRows } from '../projectDetailLists/projectProposalListSort';

const ProjectProposals = ({ projectId, projectName }) => {
  const [proposals, setProposals] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [project, setProject] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useContext(AuthContext);
  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';

  // Theme-aware colors
  const cardBg = isDark
    ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)'
    : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const textMuted = isDark ? '#64748b' : '#94a3b8';
  const surfaceBg = isDark ? '#1c2632' : '#f8fafc';
  const borderSubtle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
  const actionBg = isDark ? '#0f1419' : '#ffffff';
  const hoverBg = isDark ? '#161d26' : '#f1f5f9';

  // Verificar se usuário é gestor do projeto ou admin
  const isManager = project?.managerId === user?.id;
  const isPrivileged = (user?.roles || []).some(roleIsAdminBypass);
  const canApprove = isManager || isPrivileged;

  const handleOpenConditionModal = (proposal) => {
    setSelectedProposal(proposal);
    setConditionModalOpen(true);
  };

  const fetchData = async () => {
    try {
      const [propsData, suppData, projectData] = await Promise.all([
        getProposals(projectId),
        getSuppliers(),
        getProjectById(projectId)
      ]);
      setProposals(propsData);
      setSuppliers(suppData);
      setProject(projectData);
    } catch (e) {
      console.error(e);
      enqueueSnackbar('Erro ao carregar propostas.', { variant: 'error' });
    }
  };

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const handleOpenCreate = () => {
    setEditingProposal(null);
    setOpen(true);
  };

  const handleOpenEdit = (prop) => {
    setEditingProposal(prop);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    const proposal = proposals.find(p => p.id === id);
    const isApproved = proposal?.isWinner || proposal?.status === 'APROVADA';

    if (isApproved) {
      // Propostas aprovadas requerem justificativa e só podem ser inativadas
      if (!canApprove) {
        enqueueSnackbar('Apenas gestores podem inativar propostas aprovadas.', { variant: 'warning' });
        return;
      }
      const justification = window.prompt('Esta proposta está aprovada. Informe a justificativa para inativação:');
      if (!justification || justification.trim() === '') {
        enqueueSnackbar('Justificativa obrigatória para inativar proposta aprovada.', { variant: 'warning' });
        return;
      }
      try {
        await deleteProposal(projectId, id, justification);
        fetchData();
        enqueueSnackbar('Proposta inativada com sucesso!', { variant: 'success' });
      } catch (e) {
        const errorMessage = e.response?.data?.message || 'Erro ao inativar proposta.';
        enqueueSnackbar(errorMessage, { variant: 'error' });
      }
    } else {
      // Propostas não aprovadas podem ser excluídas normalmente
      if (!window.confirm('Excluir esta proposta?')) return;
      try {
        await deleteProposal(projectId, id);
        fetchData();
        enqueueSnackbar('Proposta excluída!', { variant: 'success' });
      } catch (e) {
        const errorMessage = e.response?.data?.message || 'Erro ao excluir proposta.';
        enqueueSnackbar(errorMessage, { variant: 'error' });
      }
    }
  };

  const handleSetWinner = async (id) => {
    try {
      await updateProposal(projectId, id, { isWinner: true });
      fetchData();
      enqueueSnackbar('Proposta marcada como vencedora!', { variant: 'success' });
    } catch (e) {
      const errorMessage = e.response?.data?.message || 'Erro ao atualizar proposta.';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  // Submeter proposta para aprovação do gestor
  const handleSubmitForApproval = async (id) => {
    try {
      await submitProposal(projectId, id);
      fetchData();
      enqueueSnackbar('Proposta submetida para aprovação!', { variant: 'success' });
    } catch (e) {
      const errorMessage = e.response?.data?.message || 'Erro ao submeter proposta.';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // Cálculo de KPIs
  const totalProposals = proposals.length;
  const approvedProposals = proposals.filter((p) => p.isWinner).length;
  const pendingProposals = proposals.filter((p) => !p.isWinner && p.status !== 'REJEITADA').length;
  const rejectedProposals = proposals.filter((p) => p.status === 'REJEITADA').length;
  const approvedTotal = proposals
    .filter((p) => p.isWinner)
    .reduce((acc, p) => acc + (p.value || 0), 0);
  const supplierCount = new Set(proposals.map((p) => p.supplierId)).size;

  const getStatusConfig = (proposal) => {
    // Aprovada (isWinner ou status APROVADA)
    if (proposal.isWinner || proposal.status === 'APROVADA') {
      return {
        label: 'Aprovada',
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.2)'
      };
    }
    // Rejeitada
    if (proposal.status === 'REJEITADA') {
      return {
        label: 'Rejeitada',
        color: '#f43f5e',
        bgColor: 'rgba(244, 63, 94, 0.15)',
        borderColor: 'rgba(244, 63, 94, 0.2)'
      };
    }
    // Aguardando Aprovação
    if (proposal.status === 'AGUARDANDO_APROVACAO') {
      return {
        label: 'Aguardando Aprovação',
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgba(59, 130, 246, 0.2)'
      };
    }
    // Devolvida para revisão
    if (proposal.status === 'DEVOLVIDA') {
      return {
        label: 'Devolvida para Revisão',
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.2)'
      };
    }
    // Rascunho (padrão para RASCUNHO ou status indefinido)
    return {
      label: 'Rascunho',
      color: '#94a3b8',
      bgColor: 'rgba(148, 163, 184, 0.15)',
      borderColor: 'rgba(148, 163, 184, 0.2)'
    };
  };

  // Agrupar propostas por fornecedor para tabela comparativa
  const supplierStats = suppliers
    .map((supplier) => {
      const supplierProposals = proposals.filter((p) => p.supplierId === supplier.id);
      const totalValue = supplierProposals.reduce((acc, p) => acc + (p.value || 0), 0);
      return {
        id: supplier.id,
        name: supplier.name,
        initials: supplier.name?.substring(0, 2).toUpperCase() || 'XX',
        proposalCount: supplierProposals.length,
        totalValue,
        avgDeadline: '30 dias', // Pode ser calculado se houver campo de prazo
        rating: 4 // Pode vir do backend
      };
    })
    .filter((s) => s.proposalCount > 0)
    .sort((a, b) => a.totalValue - b.totalValue); // Menor valor primeiro

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} sx={{ fontSize: 16, color: '#f59e0b' }} />);
    }
    if (hasHalfStar) {
      stars.push(<StarHalf key="half" sx={{ fontSize: 16, color: '#f59e0b' }} />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<StarOutline key={`empty-${i}`} sx={{ fontSize: 16, color: '#64748b' }} />);
    }
    return stars;
  };

  const dense = true;

  return (
    <Box sx={{ animation: 'fadeInUp 0.5s ease' }}>
      <ProjectTabKpiStrip columnCount={4}>
        <StatsCard
          dense={dense}
          title="Total"
          value={totalProposals}
          subtitle={`de ${supplierCount} fornecedores`}
          iconName="folder_open"
          hexColor="#2563eb"
        />
        <StatsCard
          dense={dense}
          title="Aprovadas"
          value={approvedProposals}
          subtitle={formatCurrency(approvedTotal)}
          iconName="check_circle"
          hexColor="#10b981"
        />
        <StatsCard
          dense={dense}
          title="Em análise"
          value={pendingProposals}
          subtitle="aguardando decisão"
          iconName="pending_actions"
          hexColor="#f59e0b"
        />
        <StatsCard
          dense={dense}
          title="Rejeitadas"
          value={rejectedProposals}
          subtitle="fora do escopo"
          iconName="cancel"
          hexColor="#f43f5e"
        />
      </ProjectTabKpiStrip>

      {/* Propostas Recebidas Card */}
      <Paper
        elevation={0}
        sx={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: '8px',
          p: 3.5,
          mb: 4
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Article sx={{ color: '#2563eb' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: textPrimary }}>
              Propostas Recebidas
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenCreate}
            sx={{
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)'
              }
            }}
          >
            Nova Proposta
          </Button>
        </Box>

        <DataListTable
          density="compact"
          dataTestidTable="tabela-projeto-propostas"
          shell={{
            hideHeader: true,
            sx: {
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              p: 0,
            },
            tableContainerSx: { maxHeight: 560 },
          }}
          columns={getProjectProposalListColumns({
            colors: {
              textPrimary,
              textSecondary,
              textMuted,
              borderSubtle,
              actionBg,
              hoverBg,
              isDark,
            },
            suppliers,
            getStatusConfig,
            formatCurrency,
            canApprove,
            handleSubmitForApproval,
            handleOpenConditionModal,
            handleOpenEdit,
            handleDelete,
          })}
          rows={proposals}
          sortRows={(rows, orderBy, order) => sortProjectProposalRows(rows, orderBy, order, suppliers)}
          defaultOrderBy="value"
          defaultOrder="desc"
          getDefaultOrderForColumn={(id) => (id === 'value' ? 'desc' : 'asc')}
          resetPaginationKey={proposals.length}
          rowsPerPageDefault={10}
          emptyMessage='Nenhuma proposta cadastrada. Clique em "Nova Proposta" para começar.'
        />
      </Paper>

      {/* Comparativo de Fornecedores */}
      {supplierStats.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: '8px',
            p: 3.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <CompareArrows sx={{ color: '#2563eb' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: textPrimary }}>
              Comparativo de Fornecedores
            </Typography>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    background: surfaceBg,
                    '& th': {
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      color: textMuted,
                      py: 2,
                      borderBottom: `1px solid ${borderSubtle}`
                    },
                    '& th:first-of-type': { borderRadius: '8px' },
                    '& th:last-of-type': { borderRadius: '8px' }
                  }}
                >
                  <TableCell>Fornecedor</TableCell>
                  <TableCell>Propostas</TableCell>
                  <TableCell>Valor Total</TableCell>
                  <TableCell>Prazo Médio</TableCell>
                  <TableCell>Avaliação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {supplierStats.map((supplier, index) => (
                  <TableRow
                    key={supplier.id}
                    sx={{
                      '&:hover': { background: 'rgba(37, 99, 235, 0.05)' },
                      '& td': {
                        py: 2,
                        fontSize: 14,
                        borderBottom: `1px solid ${borderSubtle}`,
                        color: textSecondary
                      }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          {supplier.initials}
                        </Avatar>
                        <Typography sx={{ color: textPrimary }}>{supplier.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{supplier.proposalCount}</TableCell>
                    <TableCell>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          color: index === 0 ? '#10b981' : textPrimary,
                          fontFamily: 'monospace'
                        }}
                      >
                        {formatCurrency(supplier.totalValue)}
                      </Typography>
                    </TableCell>
                    <TableCell>{supplier.avgDeadline}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {renderStars(supplier.rating)}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Modal de Propostas */}
      <ProposalModal
        open={open}
        onClose={() => setOpen(false)}
        onSave={fetchData}
        projectId={projectId}
        projectName={projectName}
        editingProposal={editingProposal}
        suppliers={suppliers}
      />

      {/* Modal de Condição Comercial */}
      <PaymentConditionModal
        open={conditionModalOpen}
        onClose={() => setConditionModalOpen(false)}
        proposal={selectedProposal}
        projectId={projectId}
        onSuccess={fetchData}
      />
    </Box>
  );
};

export default ProjectProposals;
