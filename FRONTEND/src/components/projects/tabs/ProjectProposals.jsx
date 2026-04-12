import { useState, useEffect, useContext } from 'react';
import {
  Box, Button, Chip, Typography, Avatar, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
  Add, Article, Visibility, Download, CompareArrows, CheckCircle,
  Pending, Cancel, FolderOpen, Payments, Event, Business, Delete, Edit,
  Star, StarHalf, StarOutline, EmojiEvents, Send
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

  return (
    <Box sx={{ animation: 'fadeInUp 0.5s ease' }}>
      {/* KPI Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 2.5,
          mb: 4,
          '@keyframes fadeInUp': {
            from: { opacity: 0, transform: 'translateY(20px)' },
            to: { opacity: 1, transform: 'translateY(0)' }
          }
        }}
      >
        {/* Total de Propostas */}
        <Box
          sx={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: '16px',
            p: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2.5,
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
              opacity: 0,
              transition: 'opacity 0.3s'
            },
            '&:hover': {
              transform: 'translateY(-4px)',
              borderColor: 'rgba(37, 99, 235, 0.3)',
              '&::before': { opacity: 1 }
            }
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              background: 'rgba(37, 99, 235, 0.15)',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FolderOpen />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13, color: textSecondary, mb: 0.5 }}>
              Total de Propostas
            </Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 700, color: textPrimary }}>
              {totalProposals}
            </Typography>
            <Typography sx={{ fontSize: 12, color: textMuted, mt: 0.5 }}>
              de {supplierCount} fornecedores
            </Typography>
          </Box>
        </Box>

        {/* Aprovadas */}
        <Box
          sx={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: '16px',
            p: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2.5,
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #10b981, #06b6d4)',
              opacity: 0,
              transition: 'opacity 0.3s'
            },
            '&:hover': {
              transform: 'translateY(-4px)',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              '&::before': { opacity: 1 }
            }
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CheckCircle />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13, color: textSecondary, mb: 0.5 }}>Aprovadas</Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 700, color: textPrimary }}>
              {approvedProposals}
            </Typography>
            <Typography sx={{ fontSize: 12, color: textMuted, mt: 0.5 }}>
              {formatCurrency(approvedTotal)} total
            </Typography>
          </Box>
        </Box>

        {/* Em Análise */}
        <Box
          sx={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: '16px',
            p: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2.5,
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #f59e0b, #f43f5e)',
              opacity: 0,
              transition: 'opacity 0.3s'
            },
            '&:hover': {
              transform: 'translateY(-4px)',
              borderColor: 'rgba(245, 158, 11, 0.3)',
              '&::before': { opacity: 1 }
            }
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Pending />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13, color: textSecondary, mb: 0.5 }}>Em Análise</Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 700, color: textPrimary }}>
              {pendingProposals}
            </Typography>
            <Typography sx={{ fontSize: 12, color: textMuted, mt: 0.5 }}>
              aguardando decisão
            </Typography>
          </Box>
        </Box>

        {/* Rejeitadas */}
        <Box
          sx={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: '16px',
            p: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2.5,
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #f43f5e, #3b82f6)',
              opacity: 0,
              transition: 'opacity 0.3s'
            },
            '&:hover': {
              transform: 'translateY(-4px)',
              borderColor: 'rgba(244, 63, 94, 0.3)',
              '&::before': { opacity: 1 }
            }
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              background: 'rgba(244, 63, 94, 0.15)',
              color: '#f43f5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Cancel />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13, color: textSecondary, mb: 0.5 }}>Rejeitadas</Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 700, color: textPrimary }}>
              {rejectedProposals}
            </Typography>
            <Typography sx={{ fontSize: 12, color: textMuted, mt: 0.5 }}>
              fora do escopo
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Propostas Recebidas Card */}
      <Paper
        elevation={0}
        sx={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: '16px',
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
              borderRadius: 2,
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

        {/* Proposals Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
          {proposals.map((proposal) => {
            const statusConfig = getStatusConfig(proposal);
            const supplier = suppliers.find((s) => s.id === proposal.supplierId);
            const supplierName = supplier?.name || 'Fornecedor não especificado';
            const supplierInitials = supplierName.substring(0, 2).toUpperCase();

            return (
              <Box
                key={proposal.id}
                sx={{
                  background: surfaceBg,
                  border: `1px solid ${borderSubtle}`,
                  borderRadius: '16px',
                  p: 3,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    background: statusConfig.color
                  },
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: 'rgba(37, 99, 235, 0.3)'
                  }
                }}
              >
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 600, color: textPrimary, mb: 0.5 }}>
                      {proposal.description || 'Proposta sem descrição'}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 12, color: textMuted, fontFamily: 'monospace' }}
                    >
                      #{proposal.id}
                    </Typography>
                  </Box>
                  <Chip
                    icon={
                      proposal.isWinner ? (
                        <CheckCircle sx={{ fontSize: 14 }} />
                      ) : proposal.status === 'REJEITADA' ? (
                        <Cancel sx={{ fontSize: 14 }} />
                      ) : (
                        <Pending sx={{ fontSize: 14 }} />
                      )
                    }
                    label={statusConfig.label}
                    size="small"
                    sx={{
                      background: statusConfig.bgColor,
                      color: statusConfig.color,
                      border: `1px solid ${statusConfig.borderColor}`,
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      height: 28,
                      '& .MuiChip-icon': { color: statusConfig.color }
                    }}
                  />
                </Box>

                {/* Supplier Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
                      fontSize: 14,
                      fontWeight: 600
                    }}
                  >
                    {supplierInitials}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 500, color: textPrimary }}>
                      {supplierName}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 12, color: textMuted, fontFamily: 'monospace' }}
                    >
                      {supplier?.cnpj || 'CNPJ não cadastrado'}
                    </Typography>
                  </Box>
                </Box>

                {/* Description */}
                <Typography
                  sx={{
                    fontSize: 14,
                    color: textSecondary,
                    mb: 2.5,
                    lineHeight: 1.5,
                    minHeight: 60
                  }}
                >
                  {proposal.notes || 'Detalhes da proposta comercial...'}
                </Typography>

                {/* Meta Info */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 2,
                    pt: 2,
                    borderTop: `1px solid ${borderSubtle}`,
                    mb: 2
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Payments sx={{ fontSize: 18, color: textMuted }} />
                    <Box>
                      <Typography
                        sx={{
                          fontSize: 11,
                          color: textMuted,
                          textTransform: 'uppercase',
                          mb: 0.25
                        }}
                      >
                        Valor
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: proposal.status === 'REJEITADA' ? '#64748b' : '#10b981',
                          fontFamily: 'monospace',
                          textDecoration: proposal.status === 'REJEITADA' ? 'line-through' : 'none'
                        }}
                      >
                        {formatCurrency(proposal.value)}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {proposal.fileUrl ? (
                      <>
                        <Business sx={{ fontSize: 18, color: textMuted }} />
                        <Box>
                          <Typography
                            sx={{
                              fontSize: 11,
                              color: textMuted,
                              textTransform: 'uppercase',
                              mb: 0.25
                            }}
                          >
                            Anexo
                          </Typography>
                          <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#2563eb' }}>
                            Disponível
                          </Typography>
                        </Box>
                      </>
                    ) : (
                      <>
                        <Event sx={{ fontSize: 18, color: textMuted }} />
                        <Box>
                          <Typography
                            sx={{
                              fontSize: 11,
                              color: textMuted,
                              textTransform: 'uppercase',
                              mb: 0.25
                            }}
                          >
                            Status
                          </Typography>
                          <Typography sx={{ fontSize: 14, fontWeight: 500, color: textPrimary }}>
                            {proposal.isWinner ? 'Vencedora' : 'Análise'}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {/* Botão Submeter - Para propostas em rascunho ou devolvidas */}
                  {(proposal.status === 'RASCUNHO' || proposal.status === 'DEVOLVIDA') && (
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Send sx={{ fontSize: 16 }} />}
                      onClick={() => handleSubmitForApproval(proposal.id)}
                      sx={{
                        background: proposal.status === 'DEVOLVIDA' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: proposal.status === 'DEVOLVIDA' ? '#f59e0b' : '#3b82f6',
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: 13,
                        py: 1.25,
                        borderRadius: 2,
                        boxShadow: 'none',
                        '&:hover': {
                          background: proposal.status === 'DEVOLVIDA' ? '#f59e0b' : '#3b82f6',
                          color: 'white',
                          boxShadow: 'none'
                        }
                      }}
                    >
                      {proposal.status === 'DEVOLVIDA' ? 'Reenviar para Aprovação' : 'Submeter para Aprovação'}
                    </Button>
                  )}
                  {/* Aguardando aprovação do gestor */}
                  {proposal.status === 'AGUARDANDO_APROVACAO' && (
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: 2,
                        p: 1.25,
                      }}
                    >
                      <Typography sx={{ fontSize: 12, color: '#3b82f6', textAlign: 'center' }}>
                        Aguardando aprovação do gestor
                      </Typography>
                    </Box>
                  )}
                  {proposal.isWinner && (
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Payments sx={{ fontSize: 16 }} />}
                      onClick={() => handleOpenConditionModal(proposal)}
                      sx={{
                        background: proposal.paymentCondition
                          ? 'rgba(37, 99, 235, 0.15)'
                          : 'rgba(245, 158, 11, 0.15)',
                        color: proposal.paymentCondition ? '#2563eb' : '#f59e0b',
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: 13,
                        py: 1.25,
                        borderRadius: 2,
                        boxShadow: 'none',
                        '&:hover': {
                          background: proposal.paymentCondition ? '#2563eb' : '#f59e0b',
                          color: 'white',
                          boxShadow: 'none'
                        }
                      }}
                    >
                      {proposal.paymentCondition ? 'Ver Condição' : 'Definir Condição'}
                    </Button>
                  )}
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Edit sx={{ fontSize: 16 }} />}
                    onClick={() => handleOpenEdit(proposal)}
                    sx={{
                      background: actionBg,
                      color: textSecondary,
                      borderColor: borderSubtle,
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: 13,
                      py: 1.25,
                      borderRadius: 2,
                      '&:hover': {
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)',
                        background: hoverBg
                      }
                    }}
                  >
                    Editar
                  </Button>
                  {(!(proposal.isWinner || proposal.status === 'APROVADA') || canApprove) && (
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Delete sx={{ fontSize: 16 }} />}
                      onClick={() => handleDelete(proposal.id)}
                      sx={{
                        background: actionBg,
                        color: '#f43f5e',
                        borderColor: 'rgba(244, 63, 94, 0.2)',
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: 13,
                        py: 1.25,
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: 'rgba(244, 63, 94, 0.3)',
                          background: 'rgba(244, 63, 94, 0.1)'
                        }
                      }}
                    >
                      {(proposal.isWinner || proposal.status === 'APROVADA') ? 'Inativar' : 'Excluir'}
                    </Button>
                  )}
                </Box>
              </Box>
            );
          })}

          {proposals.length === 0 && (
            <Box
              sx={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                py: 8,
                color: textMuted,
                fontStyle: 'italic'
              }}
            >
              Nenhuma proposta cadastrada. Clique em "Nova Proposta" para começar.
            </Box>
          )}
        </Box>
      </Paper>

      {/* Comparativo de Fornecedores */}
      {supplierStats.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: '16px',
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
                    '& th:first-of-type': { borderRadius: '12px 0 0 0' },
                    '& th:last-of-type': { borderRadius: '0 12px 0 0' }
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
