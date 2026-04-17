import { useState, useEffect, useMemo, useContext } from 'react';
import { useSnackbar } from 'notistack';
import { Box, Typography, Button, IconButton, Tooltip, TextField, MenuItem, Checkbox } from '@mui/material';
import { FilterAlt, Refresh, Delete as DeleteIcon } from '@mui/icons-material';
import BulkActionsBar from '../../components/common/BulkActionsBar';
import StatsCard from '../../components/common/StatsCard';
import KpiGrid from '../../components/common/KpiGrid';
import FilterDrawer from '../../components/common/FilterDrawer';

import { ThemeContext } from '../../contexts/ThemeContext';
import SupplierModal from '../../components/modals/SupplierModal';
import SupplierViewModal from '../../components/modals/SupplierViewModal';
import EmptyState from '../../components/common/EmptyState';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../../services/supplier.service';
import { clearReferenceCache } from '../../services/reference.service';
import { formatDocument, maskPhone } from '../../utils/masks';
import { getErrorMessage } from '../../utils/errorUtils';
import { AuthContext } from '../../contexts/AuthContext';
import usePersistedFilters from '../../hooks/usePersistedFilters';
import { useUndoToast } from '../../hooks/useUndoToast';

import './SuppliersPage.css';

const SUPPLIER_DRAWER_DEFAULTS = {
  status: '',
  category: '',
  rating: '',
};

const SuppliersPage = () => {
  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';
  const { hasPermission } = useContext(AuthContext);
  const canWrite = hasPermission('SUPPLIERS', 'CREATE');
  const canEdit = hasPermission('SUPPLIERS', 'EDIT_SUPPLIER');
  const canDeletePerm = hasPermission('SUPPLIERS', 'DELETE');

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState({ ...SUPPLIER_DRAWER_DEFAULTS });

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { enqueueSnackbar } = useSnackbar();
  const { deleteWithUndo } = useUndoToast();
  const [selectedIds, setSelectedIds] = useState([]);

  const [filters, setFilters, clearFilters] = usePersistedFilters('suppliers', {
    ...SUPPLIER_DRAWER_DEFAULTS,
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (e) {
      console.error(e);
      enqueueSnackbar(getErrorMessage(e, 'Erro ao carregar fornecedores.'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  // Filter Logic
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchesSearch = searchTerm === '' ||
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.tradeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.document?.includes(searchTerm);

      const matchesStatus = filters.status === '' ||
        (filters.status === 'active' && (s.status === 'ATIVO' || !s.status)) ||
        (filters.status === 'pending' && s.status === 'PENDENTE') ||
        (filters.status === 'inactive' && s.status === 'INATIVO');

      const matchesCategory = filters.category === '' || s.category === filters.category;
      const supplierRating = s.rating || 5;
      const matchesRating = filters.rating === '' || supplierRating === parseInt(filters.rating);

      return matchesSearch && matchesStatus && matchesCategory && matchesRating;
    });
  }, [suppliers, searchTerm, filters]);

  const activeDrawerFilterCount = useMemo(
    () =>
      (filters.status ? 1 : 0) +
      (filters.category ? 1 : 0) +
      (filters.rating ? 1 : 0),
    [filters.status, filters.category, filters.rating]
  );

  const drawerInputSx = useMemo(
    () => ({
      '& .MuiOutlinedInput-root': {
        bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
        borderRadius: 2,
        color: isDark ? '#f1f5f9' : '#0f172a',
        '& fieldset': { borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)' },
        '&:hover fieldset': { borderColor: 'rgba(6, 182, 212, 0.5)' },
        '&.Mui-focused fieldset': { borderColor: '#06b6d4' },
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
    setDraftFilters({ ...SUPPLIER_DRAWER_DEFAULTS });
    setFilters({ ...SUPPLIER_DRAWER_DEFAULTS });
  };

  const clearAllFilters = () => {
    clearFilters();
    setDraftFilters({ ...SUPPLIER_DRAWER_DEFAULTS });
    setSearchTerm('');
  };

  // KPIs
  const kpis = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter(s => s.status === 'ATIVO' || !s.status).length,
    pending: suppliers.filter(s => s.status === 'PENDENTE').length,
    inactive: suppliers.filter(s => s.status === 'INATIVO').length
  }), [suppliers]);

  // Rating distribution
  const ratingStats = useMemo(() => {
    const stats = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    suppliers.forEach(s => {
      const rating = s.rating || 5;
      if (stats[rating] !== undefined) stats[rating]++;
    });
    return stats;
  }, [suppliers]);

  // Handlers
  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (selectedSupplier) await updateSupplier(selectedSupplier.id, data);
      else await createSupplier(data);
      clearReferenceCache();
      enqueueSnackbar('Fornecedor salvo com sucesso!', { variant: 'success' });
      setModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Erro ao salvar fornecedor.'), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (supplier) => {
    setSuppliers(prev => prev.filter(s => s.id !== supplier.id));
    setSelectedIds(prev => prev.filter(id => id !== supplier.id));
    deleteWithUndo({
      message: 'Fornecedor excluído',
      onConfirm: async () => { await deleteSupplier(supplier.id); clearReferenceCache(); },
      onRefresh: fetchSuppliers,
    });
  };

  const handleBulkDelete = () => {
    const ids = [...selectedIds];
    setSuppliers(prev => prev.filter(s => !ids.includes(s.id)));
    setSelectedIds([]);
    deleteWithUndo({
      message: `${ids.length} fornecedores excluídos`,
      onConfirm: async () => { await Promise.allSettled(ids.map(id => deleteSupplier(id))); clearReferenceCache(); },
      onRefresh: fetchSuppliers,
    });
  };

  const handleOpenNew = () => { setSelectedSupplier(null); setIsViewMode(false); setModalOpen(true); };
  const handleOpenEdit = (sup) => { setSelectedSupplier(sup); setIsViewMode(false); setModalOpen(true); };
  const handleOpenView = (sup) => { setSelectedSupplier(sup); setViewModalOpen(true); };
  const handleViewToEdit = (sup) => { setViewModalOpen(false); setSelectedSupplier(sup); setIsViewMode(false); setModalOpen(true); };

  // Get supplier initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Render rating stars
  const renderRating = (rating = 5) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className="material-icons-round"
          style={{
            fontSize: '16px',
            color: i <= rating ? '#f59e0b' : '#64748b'
          }}
        >
          {i <= rating ? 'star' : 'star_border'}
        </span>
      );
    }
    return <div style={{ display: 'flex', gap: '2px' }}>{stars}</div>;
  };

  // Status Badge Styles
  const getStatusStyle = (status) => {
    switch (status) {
      case 'ATIVO': return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Ativo', icon: '' };
      case 'PENDENTE': return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'Pendente', icon: '' };
      case 'INATIVO': return { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', label: 'Inativo', icon: '' };
      default: return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Ativo', icon: '' };
    }
  };

  // Stat Card Configuration
  const statCards = [
    { key: 'total', label: 'Total de Fornecedores', value: kpis.total, icon: 'store', bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' },
    { key: 'active', label: 'Fornecedores Ativos', value: kpis.active, icon: 'check_circle', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    { key: 'inactive', label: 'Inativos', value: kpis.inactive, icon: 'block', bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }
  ];

  // Theme-aware styles
  const cardStyle = {
    background: isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#FFFFFF',
    border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: '16px',
    boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)'
  };

  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textSecondary = isDark ? '#64748b' : '#475569';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const tableBorder = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.08)';
  const tableHeaderBg = isDark ? '#1c2632' : '#f8fafc';
  const tableRowHover = isDark ? '#1c2632' : '#f1f5f9';

  return (
    <Box className="suppliers-page">
      {/* Header */}
      <Box sx={{ ...cardStyle, mb: 3, p: { xs: 2, md: 3 }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: '12px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4'
          }}>
            <span className="material-icons-round" style={{ fontSize: '24px' }}>store</span>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>
              Gestão de Fornecedores
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
          {canWrite && (
            <Button onClick={handleOpenNew} sx={{
              padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
            }} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}>
              Novo Fornecedor
            </Button>
          )}
        </Box>
      </Box>

      {/* Filtros — barra compacta + drawer */}
      <Box
        sx={{
          mb: 3,
          borderRadius: '16px',
          bgcolor: isDark ? 'rgba(22, 29, 38, 0.5)' : '#fff',
          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
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
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: 700,
                bgcolor: 'rgba(6, 182, 212, 0.15)',
                color: '#06b6d4',
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
            ml: { xs: 0, sm: 'auto' },
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
        title="Filtros de fornecedores"
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
          <MenuItem value="">Todos os Status</MenuItem>
          <MenuItem value="active">Ativo</MenuItem>
          <MenuItem value="pending">Pendente de Aprovação</MenuItem>
          <MenuItem value="inactive">Inativo</MenuItem>
        </TextField>
        <TextField
          select
          fullWidth
          label="Categoria"
          size="small"
          value={draftFilters.category}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, category: e.target.value }))}
          sx={drawerInputSx}
        >
          <MenuItem value="">Todas as Categorias</MenuItem>
          <MenuItem value="TECNOLOGIA">Tecnologia</MenuItem>
          <MenuItem value="SERVICOS">Serviços</MenuItem>
          <MenuItem value="INFRAESTRUTURA">Infraestrutura</MenuItem>
          <MenuItem value="CONSULTORIA">Consultoria</MenuItem>
        </TextField>
        <TextField
          select
          fullWidth
          label="Avaliação"
          size="small"
          value={draftFilters.rating}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, rating: e.target.value }))}
          sx={drawerInputSx}
        >
          <MenuItem value="">Todas as Avaliações</MenuItem>
          <MenuItem value="5">***** 5 estrelas</MenuItem>
          <MenuItem value="4">**** 4+ estrelas</MenuItem>
          <MenuItem value="3">*** 3+ estrelas</MenuItem>
        </TextField>
      </FilterDrawer>

      <KpiGrid maxColumns={3}>
        {statCards.map((card) => {
          const pct = suppliers.length > 0 ? Math.round((card.value / suppliers.length) * 100) : 0;
          return (
            <StatsCard
              key={card.key}
              title={card.label}
              value={card.value}
              iconName={card.icon}
              hexColor={card.color}
              subtitle={suppliers.length > 0 ? `${pct}% do total` : undefined}
            />
          );
        })}
      </KpiGrid>

      {/* Rating Distribution Card */}
      <Box sx={{
          ...cardStyle, p: 3,
          transition: 'all 0.3s ease', cursor: 'pointer',
          '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)' }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b'
            }}>
              <span className="material-icons-round" style={{ fontSize: '24px' }}>star</span>
            </Box>
            <Typography sx={{ fontSize: '13px', color: textSecondary }}>Fornecedores por Avaliação</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[5, 4, 3, 2, 1].map((stars) => (
              <Box key={stars} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: '2px', minWidth: 90 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className="material-icons-round"
                      style={{ fontSize: '14px', color: i <= stars ? '#f59e0b' : '#64748b' }}
                    >
                      {i <= stars ? 'star' : 'star_border'}
                    </span>
                  ))}
                </Box>
                <Box sx={{
                  flex: 1, height: 8, borderRadius: '4px',
                  background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden'
                }}>
                  <Box sx={{
                    width: `${kpis.total > 0 ? (ratingStats[stars] / kpis.total) * 100 : 0}%`,
                    height: '100%', borderRadius: '4px',
                    background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                    transition: 'width 0.5s ease'
                  }} />
                </Box>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary, minWidth: 24, textAlign: 'right' }}>
                  {ratingStats[stars]}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

      {/* Table Section */}
      <Box sx={{ ...cardStyle, overflow: 'hidden' }}>
        <Box sx={{
          p: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid ' + tableBorder,
          flexWrap: 'wrap',
          gap: 2,
        }}
        >
          <Typography sx={{ fontSize: '18px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
            <span className="material-icons-round" style={{ fontSize: '20px', color: '#06b6d4' }}>list</span>
            Lista de Fornecedores
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flex: '1 1 240px',
              justifyContent: 'flex-end',
              minWidth: 0,
              maxWidth: 400,
              ml: { xs: 0, md: 2 },
              background: isDark ? '#1c2632' : '#f8fafc',
              border: '1px solid ' + tableBorder,
              borderRadius: '12px',
              padding: '10px 16px',
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '20px', color: textMuted }}>search</span>
            <input
              type="text"
              placeholder="Buscar por nome, fantasia ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: isDark ? '#f1f5f9' : '#0f172a',
                fontSize: '14px',
              }}
            />
          </Box>
        </Box>

        <BulkActionsBar
          selectedCount={selectedIds.length}
          totalCount={filteredSuppliers.length}
          onSelectAll={() => setSelectedIds(selectedIds.length === filteredSuppliers.length ? [] : filteredSuppliers.map(s => s.id))}
          onClear={() => setSelectedIds([])}
          actions={[
            { label: 'Excluir', icon: <DeleteIcon sx={{ fontSize: 16 }} />, onClick: handleBulkDelete, color: '#ef4444' }
          ]}
        />
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: tableHeaderBg }}>
                <th style={{ padding: '12px 8px', width: 40, borderBottom: '1px solid ' + tableBorder }}>
                  <Checkbox
                    size="small"
                    checked={filteredSuppliers.length > 0 && filteredSuppliers.every(s => selectedIds.includes(s.id))}
                    indeterminate={filteredSuppliers.some(s => selectedIds.includes(s.id)) && !filteredSuppliers.every(s => selectedIds.includes(s.id))}
                    onChange={() => {
                      const allSelected = filteredSuppliers.every(s => selectedIds.includes(s.id));
                      setSelectedIds(allSelected ? [] : filteredSuppliers.map(s => s.id));
                    }}
                    sx={{ color: '#64748b', '&.Mui-checked': { color: '#667eea' }, '&.MuiCheckbox-indeterminate': { color: '#667eea' } }}
                  />
                </th>
                {['Fornecedor', 'Categoria', 'Contato Principal', 'Telefone', 'Avaliação', 'Status', 'Ações'].map((header, i) => (
                  <th key={header} style={{
                    padding: '16px 24px',
                    textAlign: i === 6 ? 'center' : 'left',
                    fontSize: '12px', fontWeight: 600, color: textMuted,
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                    borderBottom: '1px solid ' + tableBorder
                  }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map(supplier => {
                const statusStyle = getStatusStyle(supplier.status);
                const isSelected = selectedIds.includes(supplier.id);
                return (
                  <tr key={supplier.id} style={{
                    transition: 'all 0.2s ease', cursor: 'pointer',
                    background: isSelected ? 'rgba(102, 126, 234, 0.08)' : 'transparent',
                    outline: isSelected ? '1px solid rgba(102, 126, 234, 0.25)' : 'none'
                  }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = tableRowHover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'rgba(102, 126, 234, 0.08)' : 'transparent'; }}>
                    <td style={{ padding: '8px 8px', borderBottom: '1px solid ' + tableBorder }} onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        size="small"
                        checked={isSelected}
                        onChange={() => setSelectedIds(prev => isSelected ? prev.filter(id => id !== supplier.id) : [...prev, supplier.id])}
                        sx={{ color: '#64748b', '&.Mui-checked': { color: '#667eea' } }}
                      />
                    </td>
                    <td style={{ padding: '20px 24px', borderBottom: '1px solid ' + tableBorder }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '12px',
                          background: 'rgba(6, 182, 212, 0.15)',
                          border: '1px solid rgba(6, 182, 212, 0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 600, color: '#06b6d4', fontSize: '14px'
                        }}>{getInitials(supplier.name)}</div>
                        <div>
                          <div style={{ color: textPrimary, fontWeight: 600, marginBottom: '2px' }}>{supplier.name}</div>
                          <div style={{ color: textSecondary, fontSize: '12px' }}>CNPJ: {formatDocument(supplier.document)}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '20px 24px', borderBottom: '1px solid ' + tableBorder }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                        background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6'
                      }}>{supplier.category || 'Tecnologia'}</span>
                    </td>
                    <td style={{ padding: '20px 24px', fontSize: '14px', color: textSecondary, borderBottom: '1px solid ' + tableBorder }}>
                      {supplier.contactName || supplier.tradeName || '-'}
                    </td>
                    <td style={{ padding: '20px 24px', fontSize: '14px', color: textSecondary, borderBottom: '1px solid ' + tableBorder }}>
                      {supplier.phone ? maskPhone(supplier.phone) : '-'}
                    </td>
                    <td style={{ padding: '20px 24px', borderBottom: '1px solid ' + tableBorder }}>
                      {renderRating(supplier.rating || 5)}
                    </td>
                    <td style={{ padding: '20px 24px', borderBottom: '1px solid ' + tableBorder }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                        background: statusStyle.bg, color: statusStyle.color
                      }}>{statusStyle.icon} {statusStyle.label}</span>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center', borderBottom: '1px solid ' + tableBorder }}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="Visualizar">
                          <IconButton size="small" onClick={() => handleOpenView(supplier)} sx={{
                            width: 32, height: 32, borderRadius: '8px',
                            border: '1px solid ' + tableBorder, color: textSecondary,
                            '&:hover': { background: isDark ? '#1c2632' : '#f1f5f9', borderColor: '#06b6d4', color: '#06b6d4' }
                          }}><span className="material-icons-round" style={{ fontSize: '18px' }}>visibility</span></IconButton>
                        </Tooltip>
                        {canEdit && (
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => handleOpenEdit(supplier)} sx={{
                              width: 32, height: 32, borderRadius: '8px',
                              border: '1px solid ' + tableBorder, color: textSecondary,
                              '&:hover': { background: isDark ? '#1c2632' : '#f1f5f9', borderColor: '#06b6d4', color: '#06b6d4' }
                            }}><span className="material-icons-round" style={{ fontSize: '18px' }}>edit</span></IconButton>
                          </Tooltip>
                        )}
                        {canDeletePerm && (
                          <Tooltip title="Excluir">
                            <IconButton size="small" onClick={() => handleDeleteClick(supplier)} sx={{
                              width: 32, height: 32, borderRadius: '8px',
                              border: '1px solid ' + tableBorder, color: textSecondary,
                              '&:hover': { background: isDark ? '#1c2632' : '#f1f5f9', borderColor: '#f43f5e', color: '#f43f5e' }
                            }}><span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span></IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>

        {filteredSuppliers.length === 0 && !loading && (
          <EmptyState
            icon={<span className="material-icons-round" style={{ fontSize: 'inherit' }}>store</span>}
            title="Nenhum fornecedor encontrado"
            description="Ajuste os filtros ou adicione um novo fornecedor para gerenciar seus parceiros comerciais."
            actionLabel="Novo Fornecedor"
            actionIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
            onAction={handleOpenNew}
          />
        )}
      </Box>

      {/* Modals */}
      <SupplierModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        supplier={selectedSupplier}
        loading={saving}
        isViewMode={isViewMode}
      />

      <SupplierViewModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        supplier={selectedSupplier}
        onEdit={canEdit ? handleViewToEdit : undefined}
      />
    </Box>
  );
};

export default SuppliersPage;
