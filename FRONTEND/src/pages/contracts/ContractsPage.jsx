import { useState, useEffect, useMemo, useContext } from 'react';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, TextField, MenuItem, useTheme } from '@mui/material';
import FilterAlt from '@mui/icons-material/FilterAlt';
import Refresh from '@mui/icons-material/Refresh';
import FilterDrawer from '../../components/common/FilterDrawer';
import { ThemeContext } from '../../contexts/ThemeContext';
import ContractModal from '../../components/modals/ContractModal';
import AddendumFormModal from '../../components/modals/AddendumFormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import DataListTable from '../../components/common/DataListTable';
import { getContractListColumns } from './contractListColumns';
import { sortContractRows } from './contractListSort';
import { getContractStatus } from './contractListUtils';
import ExportButton from '../../components/common/ExportButton';
import { EXPORT_COLUMNS } from '../../utils/exportUtils';
import { getContracts, createContract, updateContract, deleteContract } from '../../services/contract.service';
import { getErrorMessage } from '../../utils/errorUtils';
import { AuthContext } from '../../contexts/AuthContext';
import StatsCard from '../../components/common/StatsCard';
import KpiGrid from '../../components/common/KpiGrid';
import PageTitleCard from '../../components/common/PageTitleCard';

const CONTRACT_FILTER_DEFAULTS = {
  status: '',
  type: '',
  period: '',
};

const ContractsPage = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ ...CONTRACT_FILTER_DEFAULTS });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState({ ...CONTRACT_FILTER_DEFAULTS });

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [quickAddendumContract, setQuickAddendumContract] = useState(null);

  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  // Theme context
  const { mode } = useContext(ThemeContext);
  const theme = useTheme();
  const { hasPermission } = useContext(AuthContext);
  const isDark = mode === 'dark';
  const canWrite = hasPermission('CONTRACTS', 'CREATE');
  const canEdit = hasPermission('CONTRACTS', 'EDIT_CONTRACT');
  const canAddendum = hasPermission('CONTRACTS', 'ADDENDUM');
  const canDeletePerm = hasPermission('CONTRACTS', 'DELETE');

  // Theme-aware styles
  const textPrimary = mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary;
  const cardBg = mode === 'dark' ? 'rgba(22, 29, 38, 0.5)' : '#FFFFFF';
  const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
  const cardShadow = mode === 'dark' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.07)';
  const surfaceBg = mode === 'dark' ? '#1c2632' : '#FFFFFF';
  const fetchContracts = async () => {
    setLoading(true);
    try {
      const data = await getContracts();
      setContracts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContracts(); }, []);

  // Filter Logic
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const matchesSearch = searchTerm === '' ||
        c.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const status = getContractStatus(c);
      const matchesStatus = filters.status === '' ||
        (filters.status === 'active' && status === 'VIGENTE') ||
        (filters.status === 'pending' && status === 'A VENCER') ||
        (filters.status === 'expired' && status === 'VENCIDO');


      const matchesType = filters.type === '' || c.type === filters.type;

      const matchesPeriod = filters.period === '' ||
        (filters.period === 'current' && status === 'VIGENTE') ||
        (filters.period === 'expiring' && status === 'A VENCER') ||
        (filters.period === 'expired' && status === 'VENCIDO');

      return matchesSearch && matchesStatus && matchesType && matchesPeriod;
    });
  }, [contracts, searchTerm, filters]);

  const listResetKey = useMemo(
    () => [searchTerm, filters.status, filters.type, filters.period, contracts.length].join('|'),
    [searchTerm, filters.status, filters.type, filters.period, contracts.length]
  );

  const activeDrawerFilterCount = useMemo(
    () =>
      (filters.status ? 1 : 0) +
      (filters.type ? 1 : 0) +
      (filters.period ? 1 : 0),
    [filters.status, filters.type, filters.period]
  );

  const drawerInputSx = useMemo(
    () => ({
      '& .MuiOutlinedInput-root': {
        bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
        borderRadius: '8px',
        '& fieldset': { borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)' },
        '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.35)' },
        '&.Mui-focused fieldset': { borderColor: '#2563eb' },
      },
      '& .MuiInputLabel-root': { color: isDark ? '#94a3b8' : '#64748b' },
      '& .MuiSelect-icon': { color: isDark ? '#94a3b8' : '#64748b' },
    }),
    [isDark]
  );

  const openFilterDrawer = () => {
    setDraftFilters({ ...filters });
    setFilterDrawerOpen(true);
  };

  const handleApplyDrawerFilters = () => {
    setFilters({ ...draftFilters });
  };

  const handleClearDrawerOnly = () => {
    setDraftFilters({ ...CONTRACT_FILTER_DEFAULTS });
    setFilters({ ...CONTRACT_FILTER_DEFAULTS });
  };

  const clearAllFilters = () => {
    setFilters({ ...CONTRACT_FILTER_DEFAULTS });
    setDraftFilters({ ...CONTRACT_FILTER_DEFAULTS });
    setSearchTerm('');
  };

  // KPIs
  const kpis = useMemo(() => ({
    total: contracts.length,
    totalValue: contracts.reduce((acc, c) => acc + Number(c.value || 0), 0),
    active: contracts.filter(c => getContractStatus(c) === 'VIGENTE').length,
    expiring: contracts.filter(c => getContractStatus(c) === 'A VENCER').length,
    expired: contracts.filter(c => getContractStatus(c) === 'VENCIDO').length
  }), [contracts]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Handlers
  const handleSave = async (data) => {
    try {
      if (selectedContract) await updateContract(selectedContract.id, data);
      else await createContract(data);
      enqueueSnackbar('Contrato salvo com sucesso!', { variant: 'success' });
      setModalOpen(false);
      fetchContracts();
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e, 'Erro ao salvar contrato.'), { variant: 'error' });
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteContract(deleteId);
      enqueueSnackbar('Contrato excluído com sucesso.', { variant: 'success' });
      fetchContracts();
      setConfirmOpen(false);
      setDeleteId(null);
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e, 'Erro ao excluir contrato.'), { variant: 'error' });
    }
  };

  const handleOpenNew = () => { setSelectedContract(null); setModalOpen(true); };
  const handleOpenEdit = (c) => { setSelectedContract(c); setModalOpen(true); };
  const handleOpenDetails = (c) => { navigate(`/contracts/${c.id}`); };

  // Stat Card Configuration
  const statCards = [
    {
      key: 'total',
      label: 'Total de Contratos',
      value: kpis.total,
      icon: 'description',
      bg: 'rgba(37, 99, 235, 0.15)',
      color: '#2563eb'
    },
    {
      key: 'active',
      label: 'Contratos Ativos',
      value: kpis.active,
      icon: 'check_circle',
      bg: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981'
    },
    {
      key: 'expiring',
      label: 'Vencendo em 30 dias',
      value: kpis.expiring,
      icon: 'schedule',
      bg: 'rgba(244, 63, 94, 0.15)',
      color: '#f43f5e'
    },
    {
      key: 'pending',
      label: 'Pendentes de Renovação',
      value: kpis.expired,
      icon: 'pending',
      bg: 'rgba(245, 158, 11, 0.15)',
      color: '#f59e0b'
    }
  ];

  return (
    <Box>
      <PageTitleCard
        iconName="description"
        title="Gestão de Contratos"
        subtitle="Contratos, aditivos e vigências"
        pushActionsToEnd
        mb={3}
        actions={
          canWrite ? (
            <Button
              data-testid="btn-novo-contrato"
              onClick={handleOpenNew}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
                },
              }}
              startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
            >
              Novo Contrato
            </Button>
          ) : null
        }
      />

      {/* Filtros — barra compacta + drawer (padrão incidentes / projetos) */}
      <Box
        sx={{
          mb: 3,
          borderRadius: '8px',
          bgcolor: isDark ? 'rgba(22, 29, 38, 0.5)' : '#fff',
          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            size="medium"
            startIcon={<FilterAlt />}
            onClick={openFilterDrawer}
            sx={{
              color: isDark ? '#f1f5f9' : '#0f172a',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
            }}
          >
            Filtros
          </Button>
          {activeDrawerFilterCount > 0 ? (
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: 700,
                bgcolor: 'rgba(37, 99, 235, 0.15)',
                color: '#2563eb',
              }}
            >
              {activeDrawerFilterCount}
            </Box>
          ) : null}
        </Box>
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={clearAllFilters}
          sx={{
            color: isDark ? '#94a3b8' : '#64748b',
            textTransform: 'none',
            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
          }}
        >
          Limpar tudo
        </Button>
      </Box>

      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={handleApplyDrawerFilters}
        onClear={handleClearDrawerOnly}
        title="Filtros de contratos"
      >
        <TextField
          select
          fullWidth
          label="Status"
          size="small"
          value={draftFilters.status}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value }))}
          sx={drawerInputSx}
        >
          <MenuItem value="">Todos os status</MenuItem>
          <MenuItem value="active">Ativo</MenuItem>
          <MenuItem value="pending">Pendente</MenuItem>
          <MenuItem value="expired">Expirado</MenuItem>
        </TextField>
        <TextField
          select
          fullWidth
          label="Tipo"
          size="small"
          value={draftFilters.type}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, type: e.target.value }))}
          sx={drawerInputSx}
        >
          <MenuItem value="">Todos os tipos</MenuItem>
          <MenuItem value="SERVICO">Serviço</MenuItem>
          <MenuItem value="PRODUTO">Produto</MenuItem>
          <MenuItem value="LOCACAO">Locação</MenuItem>
          <MenuItem value="MANUTENCAO">Manutenção</MenuItem>
          <MenuItem value="OUTROS">Outros</MenuItem>
        </TextField>
        <TextField
          select
          fullWidth
          label="Período"
          size="small"
          value={draftFilters.period}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, period: e.target.value }))}
          sx={drawerInputSx}
        >
          <MenuItem value="">Todo o período</MenuItem>
          <MenuItem value="current">Vigentes</MenuItem>
          <MenuItem value="expiring">Vencendo em 30 dias</MenuItem>
          <MenuItem value="expired">Expirados</MenuItem>
        </TextField>
      </FilterDrawer>

      <KpiGrid maxColumns={4}>
        {statCards.map((card) => (
          <StatsCard
            key={card.key}
            title={card.label}
            value={card.value}
            iconName={card.icon}
            hexColor={card.color}
          />
        ))}
      </KpiGrid>

      <DataListTable
        dataTestidTable="tabela-contratos"
        shell={{
          title: 'Lista de Contratos',
          titleIcon: 'list',
          accentColor: '#2563eb',
          count: filteredContracts.length,
          sx: {
            borderRadius: '8px',
            background: cardBg,
            backdropFilter: mode === 'dark' ? 'blur(10px)' : 'none',
            border: `1px solid ${borderColor}`,
            boxShadow: cardShadow,
            overflow: 'hidden',
          },
          toolbar: (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <ExportButton data={filteredContracts} columns={EXPORT_COLUMNS.contracts} filename="contratos" compact />
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  background: surfaceBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  padding: '10px 16px',
                  width: 300,
                }}
              >
                <span className="material-icons-round" style={{ fontSize: '20px', color: mode === 'dark' ? '#64748b' : '#94a3b8' }}>search</span>
                <input
                  type="text"
                  placeholder="Buscar contrato..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: mode === 'dark' ? '#f1f5f9' : '#0f172a',
                    fontSize: '14px',
                  }}
                />
              </Box>
            </Box>
          ),
        }}
        columns={getContractListColumns({
          formatCurrency,
          onDetails: handleOpenDetails,
          onEdit: handleOpenEdit,
          onQuickAddendum: (c) => setQuickAddendumContract(c),
          onDelete: handleDeleteClick,
          canEdit,
          canAddendum,
          canDeletePerm,
        })}
        rows={filteredContracts}
        sortRows={sortContractRows}
        defaultOrderBy="period"
        defaultOrder="desc"
        getDefaultOrderForColumn={(id) => (id === 'period' || id === 'value' ? 'desc' : 'asc')}
        resetPaginationKey={listResetKey}
        loading={loading}
        emptyMessage="Nenhum contrato encontrado. Ajuste os filtros ou a pesquisa."
        emptyContent={
          canWrite
            ? (
              <EmptyState
                icon={<span className="material-icons-round" style={{ fontSize: 'inherit' }}>description</span>}
                title="Nenhum contrato encontrado"
                description="Ajuste os filtros ou adicione um novo contrato para começar a gerenciar seus acordos comerciais."
                actionLabel="Novo Contrato"
                actionIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
                onAction={handleOpenNew}
              />
            )
            : undefined
        }
      />

      {/* Modals */}
      <ContractModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onRefresh={fetchContracts}
        contract={selectedContract}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Contrato"
        content="Tem certeza que deseja excluir este contrato? Esta ação pode afetar aditivos e anexos."
      />

      <AddendumFormModal
        open={!!quickAddendumContract}
        onClose={() => setQuickAddendumContract(null)}
        contractId={quickAddendumContract?.id}
        onSaved={() => { setQuickAddendumContract(null); fetchContracts(); }}
      />
    </Box >
  );
};

export default ContractsPage;