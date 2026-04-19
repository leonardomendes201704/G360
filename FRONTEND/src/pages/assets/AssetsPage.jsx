import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useSnackbar } from 'notistack';
import { Box, Typography, Button, IconButton, Tooltip, Menu, MenuItem, TextField, Collapse } from '@mui/material';
import FilterAlt from '@mui/icons-material/FilterAlt';
import Refresh from '@mui/icons-material/Refresh';
import FilterDrawer from '../../components/common/FilterDrawer';
import { PieChart } from '@mui/x-charts/PieChart';
import BulkActionsBar from '../../components/common/BulkActionsBar';

import { getAssets, createAsset, updateAsset, deleteAsset } from '../../services/asset.service';
import { getLicenses, createLicense, updateLicense, deleteLicense } from '../../services/software-license.service';
import { getReferenceUsers } from '../../services/reference.service';
import { getAssetCategories, createAssetCategory, updateAssetCategory } from '../../services/asset-category.service';
import { getReferenceSuppliers } from '../../services/reference.service';

import AssetModal from '../../components/modals/AssetModal';
import AssetCategoryModal from '../../components/modals/AssetCategoryModal';
import AssetViewModal from '../../components/modals/AssetViewModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DataListTable from '../../components/common/DataListTable';
import EmptyState from '../../components/common/EmptyState';
import { getAssetColumns } from './assetListColumns';
import { sortAssetRows } from './assetListSort';
import { getLicenseColumns } from './licenseListColumns';
import { sortLicenseRows } from './licenseListSort';
import { getErrorMessage } from '../../utils/errorUtils';
import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';
import { useUndoToast } from '../../hooks/useUndoToast';

import StatsCard from '../../components/common/StatsCard';
import KpiGrid from '../../components/common/KpiGrid';
import PageTitleCard from '../../components/common/PageTitleCard';
import './AssetsPage.css';

const ASSET_LIST_DRAWER_DEFAULTS = { status: '', category: '', search: '' };

const AssetsPage = () => {
  const { hasPermission } = useContext(AuthContext);
  const canWrite = hasPermission('ASSETS', 'CREATE');
  const canEdit = hasPermission('ASSETS', 'EDIT_ASSET');
  const canDeletePerm = hasPermission('ASSETS', 'DELETE');
  const [viewMode, setViewMode] = useState('dashboard'); // dashboard ou list
  const [assets, setAssets] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: '', category: '' });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [draftListFilters, setDraftListFilters] = useState(ASSET_LIST_DRAWER_DEFAULTS);
  const [showFilters, setShowFilters] = useState(true);
  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#475569';
  const textMuted = isDark ? '#64748b' : '#64748b';
  const surfaceBg = isDark ? '#1c2632' : '#f1f5f9';
  const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)';
  const softBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)';
  const iconMuted = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#ffffff';

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
      borderRadius: '8px',
      color: textPrimary,
      height: '40px',
      '& fieldset': { borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.12)' },
      '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.5)' },
      '&.Mui-focused fieldset': { borderColor: '#2563eb' }
    },
    '& .MuiInputLabel-root': { color: textSecondary },
    '& .MuiSelect-icon': { color: textSecondary }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ status: '', category: '' });
    setDraftListFilters(ASSET_LIST_DRAWER_DEFAULTS);
  };

  const openAssetListFilterDrawer = () => {
    setDraftListFilters({ status: filters.status, category: filters.category, search: searchTerm });
    setFilterDrawerOpen(true);
  };

  const handleApplyAssetListFilters = () => {
    setFilters({ status: draftListFilters.status, category: draftListFilters.category });
    setSearchTerm(draftListFilters.search);
  };

  const handleClearAssetListDrawer = () => {
    setDraftListFilters({ ...ASSET_LIST_DRAWER_DEFAULTS });
    setFilters({ status: '', category: '' });
    setSearchTerm('');
  };

  const activeAssetListFilterCount = [filters.status, filters.category, searchTerm].filter(Boolean).length;

  const assetListResetKey = useMemo(
    () => `${viewMode}|${searchTerm}|${filters.status}|${filters.category}`,
    [viewMode, searchTerm, filters.status, filters.category]
  );
  const licenseListResetKey = useMemo(
    () => `${viewMode}|${searchTerm}`,
    [viewMode, searchTerm]
  );

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  /** Só criação: 'HARDWARE' | 'LICENSE' — usado com `defaultCreateType` no `AssetModal` selecionada pelo toggle da página e pelos vazios. */
  const [createModalKind, setCreateModalKind] = useState('HARDWARE');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteType, setDeleteType] = useState('ASSET');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuAsset, setMenuAsset] = useState(null);

  const { enqueueSnackbar } = useSnackbar();
  const { deleteWithUndo } = useUndoToast();
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetsData, licData, usersData, catsData, suppsData] = await Promise.all([
        getAssets(), getLicenses(), getReferenceUsers(), getAssetCategories(), getReferenceSuppliers()
      ]);
      setAssets(assetsData);
      setLicenses(licData);
      setUsers(usersData);
      setCategories(catsData);
      setSuppliers(suppsData);
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Erro ao carregar dados.'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // KPIs with real trend calculation
  const kpis = useMemo(() => {
    const totalValue = assets.reduce((acc, curr) => acc + (Number(curr.acquisitionValue) || 0), 0);
    const active = assets.filter(a => a.status === 'PROPRIO' || a.status === 'LOCADO' || a.status === 'ATIVO').length;
    const maintenance = assets.filter(a => a.status === 'MANUTENCAO').length;
    const inactive = assets.filter(a => a.status === 'DESATIVADO' || a.status === 'INATIVO').length;

    // Calculate trend (assets created this month vs last month)
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthAssets = assets.filter(a => new Date(a.createdAt) >= thisMonth).length;
    const lastMonthAssets = assets.filter(a => {
      const d = new Date(a.createdAt);
      return d >= lastMonth && d <= lastMonthEnd;
    }).length;

    let totalTrend;
    if (lastMonthAssets === 0) {
      totalTrend = thisMonthAssets > 0 ? `+${thisMonthAssets} novos` : 'Sem novos';
    } else {
      const pct = Math.round(((thisMonthAssets - lastMonthAssets) / lastMonthAssets) * 100);
      totalTrend = pct >= 0 ? `+${pct}% este mes` : `${pct}% este mes`;
    }

    const categoryDist = categories.map(cat => ({
      id: cat.id, label: cat.name,
      value: assets.filter(a => a.categoryId === cat.id).length
    })).sort((a, b) => b.value - a.value);
    const categoryChartData = categoryDist.filter(c => c.value > 0);

    const statusMap = {
      PROPRIO: 'Ativo',
      ATIVO: 'Ativo',
      LOCADO: 'Alugado',
      MANUTENCAO: 'Manutenção',
      DESATIVADO: 'Inativo',
      INATIVO: 'Inativo'
    };
    const statusDist = Object.values(assets.reduce((acc, asset) => {
      const label = statusMap[asset.status] || asset.status || 'Outro';
      if (!acc[label]) acc[label] = { id: label, label, value: 0 };
      acc[label].value += 1;
      return acc;
    }, {})).sort((a, b) => b.value - a.value);

    const costCenterMap = assets.reduce((acc, asset) => {
      const name = asset.costCenter?.name || 'Sem Centro de Custo';
      const code = asset.costCenter?.code ? `${asset.costCenter.code} - ` : '';
      const key = `${code}${name}`;
      if (!acc[key]) acc[key] = { label: key, count: 0, value: 0 };
      acc[key].count += 1;
      acc[key].value += Number(asset.acquisitionValue) || 0;
      return acc;
    }, {});
    const costCenterDist = Object.values(costCenterMap).sort((a, b) => b.count - a.count);
    const costCenterValueDist = Object.values(costCenterMap).sort((a, b) => b.value - a.value);

    const avgAssetValue = assets.length > 0 ? totalValue / assets.length : 0;
    const missingCostCenter = assets.filter(a => !(a.costCenterId || a.costCenter?.id)).length;
    const missingSupplier = assets.filter(a => !(a.supplierId || a.supplier?.id)).length;
    const missingContract = assets.filter(a => !(a.contractId || a.contract?.id)).length;
    const missingCategory = assets.filter(a => !a.categoryId).length;

    const topAssets = [...assets]
      .map(a => ({ id: a.id, name: a.name, value: Number(a.acquisitionValue) || 0, status: a.status }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const licenseTotals = licenses.reduce((acc, curr) => {
      const qty = Number(curr.quantity) || 0;
      const used = Number(curr.usedQuantity) || 0;
      acc.quantity += qty;
      acc.used += used;
      acc.totalCost += (Number(curr.cost) || 0) * (qty || 1);
      return acc;
    }, { quantity: 0, used: 0, totalCost: 0 });

    const topLicenses = [...licenses]
      .map(l => ({ id: l.id, name: l.name, vendor: l.vendor, total: (Number(l.cost) || 0) * (Number(l.quantity) || 1) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const splitLicenses = {
      subscription: licenses.filter(l => l.licenseType === 'ASSINATURA').length,
      perpetual: licenses.filter(l => l.licenseType === 'PERPETUA').length,
      totalCost: licenses.reduce((acc, curr) => acc + (Number(curr.cost) * (Number(curr.quantity) || 1) || 0), 0),
      expiring: licenses.filter(l => l.expirationDate && (new Date(l.expirationDate) - new Date()) / (1000 * 60 * 60 * 24) <= 30).length,
      expired: licenses.filter(l => l.expirationDate && new Date(l.expirationDate) < new Date()).length
    };

    return {
      total: assets.length,
      active,
      maintenance,
      inactive,
      totalValue,
      categoryDist,
      categoryChartData,
      statusDist,
      costCenterDist,
      costCenterValueDist,
      avgAssetValue,
      missingCostCenter,
      missingSupplier,
      missingContract,
      missingCategory,
      topAssets,
      licenseTotals,
      topLicenses,
      totalTrend,
      licenses: {
        total: licenses.length,
        ...splitLicenses
      }
    };
  }, [assets, categories, licenses]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchesSearch = searchTerm === '' ||
        a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.code?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filters.status === '' || a.status === filters.status;
      const matchesCategory = filters.category === '' || a.categoryId === filters.category;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [assets, searchTerm, filters]);

  const filteredLicenses = useMemo(() => {
    return licenses.filter(l =>
      searchTerm === '' ||
      l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [licenses, searchTerm]);

  // Handlers
  const handleSaveAsset = async (data) => {
    try {
      if (selectedItem && selectedItem.id) { await updateAsset(selectedItem.id, data); enqueueSnackbar('Ativo atualizado!', { variant: 'success' }); }
      else { await createAsset(data); enqueueSnackbar('Ativo criado!', { variant: 'success' }); }
      setModalOpen(false); loadData();
    } catch (error) { enqueueSnackbar('Erro ao salvar ativo', { variant: 'error' }); }
  };

  const handleSaveLicense = async (data) => {
    try {
      if (selectedItem && selectedItem.id) { await updateLicense(selectedItem.id, data); enqueueSnackbar('Licença atualizada!', { variant: 'success' }); }
      else { await createLicense(data); enqueueSnackbar('Licença criada!', { variant: 'success' }); }
      setModalOpen(false); loadData();
    } catch (error) { enqueueSnackbar('Erro ao salvar licença', { variant: 'error' }); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      if (deleteType === 'ASSET') await deleteAsset(deleteId);
      else await deleteLicense(deleteId);
      enqueueSnackbar('Excluido com sucesso!', { variant: 'success' });
      loadData(); setConfirmOpen(false); setDeleteId(null);
    } catch (error) { enqueueSnackbar('Erro ao excluir', { variant: 'error' }); }
  };

  const handleMenuOpen = (event, asset) => { setAnchorEl(event.currentTarget); setMenuAsset(asset); };
  const handleMenuClose = () => { setAnchorEl(null); setMenuAsset(null); };

  const handleOpenView = (item) => { setSelectedItem(item); setViewModalOpen(true); handleMenuClose(); };
  const handleViewToEdit = (item) => { setViewModalOpen(false); setSelectedItem(item); setIsViewMode(false); setModalOpen(true); };
  const handleOpenEdit = (item) => { setSelectedItem(item); setIsViewMode(false); setModalOpen(true); handleMenuClose(); };
  const openCreateModal = (kind) => {
    setCreateModalKind(kind);
    setSelectedItem(null);
    setIsViewMode(false);
    setModalOpen(true);
  };
  const handleOpenNew = () => openCreateModal(viewMode === 'licenses' ? 'LICENSE' : 'HARDWARE');

  const handleOpenCategories = () => {
    setEditingCategory(null);
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (data) => {
    try {
      if (editingCategory?.id) {
        await updateAssetCategory(editingCategory.id, data);
        enqueueSnackbar('Categoria atualizada!', { variant: 'success' });
      } else {
        await createAssetCategory(data);
        enqueueSnackbar('Categoria criada!', { variant: 'success' });
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
      loadData();
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Erro ao salvar categoria.'), { variant: 'error' });
    }
  };

  const handleDeleteClick = (asset) => {
    handleMenuClose();
    setAssets(prev => prev.filter(a => a.id !== asset.id));
    setSelectedAssetIds(prev => prev.filter(id => id !== asset.id));
    deleteWithUndo({
      message: 'Ativo excluído',
      onConfirm: () => deleteAsset(asset.id),
      onRefresh: loadData,
    });
  };

  const handleBulkDeleteAssets = () => {
    const ids = [...selectedAssetIds];
    setAssets(prev => prev.filter(a => !ids.includes(a.id)));
    setSelectedAssetIds([]);
    deleteWithUndo({
      message: `${ids.length} ativos excluídos`,
      onConfirm: () => Promise.allSettled(ids.map(id => deleteAsset(id))),
      onRefresh: loadData,
    });
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(val || 0);
  const getStatusLabel = (status) => {
    const map = { PROPRIO: 'Ativo', LOCADO: 'Alugado', MANUTENCAO: 'Manutenção', DESATIVADO: 'Inativo', ATIVO: 'Ativo', INATIVO: 'Inativo' };
    return map[status] || status;
  };
  const getStatusStyle = (status) => {
    switch (status) {
      case 'PROPRIO': case 'ATIVO': return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' };
      case 'LOCADO': return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
      case 'MANUTENCAO': return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
      case 'DESATIVADO': case 'INATIVO': return { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' };
      default: return { bg: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' };
    }
  };

  // Stat Cards Config
  const statCards = [
    { key: 'total', label: 'Total de Ativos', value: kpis.total, icon: 'inventory_2', bg: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', trend: kpis.totalTrend },
    { key: 'licenses', label: 'Total de Licenças', value: kpis.licenses.total, icon: 'key', bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', trend: `${formatCurrency(kpis.licenses.totalCost)}/ano` },
    { key: 'active', label: 'Ativos Ativos', value: kpis.active, icon: 'check_circle', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', trend: `${kpis.total > 0 ? Math.round((kpis.active / kpis.total) * 100) : 0}% do total` },
    { key: 'maintenance', label: 'Em Manutenção', value: kpis.maintenance, icon: 'build', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', trend: `${kpis.total > 0 ? Math.round((kpis.maintenance / kpis.total) * 100) : 0}% do total` },
    // { key: 'inactive', label: 'Inativos', value: kpis.inactive, icon: 'block', bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', trend: `${kpis.total > 0 ? Math.round((kpis.inactive / kpis.total) * 100) : 0}% do total`, negative: true },
    { key: 'value', label: 'Valor Patrimônio', value: formatCurrency(kpis.totalValue), icon: 'account_balance_wallet', bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', trend: 'Hardware apenas' }
  ];

  // Styles
  const cardStyle = {
    background: cardBg,
    border: cardBorder,
    borderRadius: '8px'
  };

  const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#3b82f6'];

  /** Donuts «Distribuição por Categoria» e «Ativos por Situação» — mesmas dimensões */
  const assetDonutPieSize = { width: 200, height: 200 };
  const assetDonutPieRadii = { innerRadius: 60, outerRadius: 100, paddingAngle: 2, cornerRadius: 4 };

  return (
    <Box className="assets-page">
      <PageTitleCard
        iconName="inventory_2"
        title="Gestão de Ativos"
        subtitle="Hardware, licenças e patrimônio"
        pushActionsToEnd
        mb={3}
        actions={
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Toggle */}
          <Box sx={{ display: 'flex', gap: 1, background: surfaceBg, padding: '4px', borderRadius: '8px', border: softBorder, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <button
              onClick={() => setViewMode('dashboard')}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: viewMode === 'dashboard' ? '#2563eb' : 'transparent',
                color: viewMode === 'dashboard' ? 'white' : '#94a3b8',
                display: 'flex', alignItems: 'center', gap: '6px',
                cursor: 'pointer', fontSize: '14px', fontWeight: 500
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '18px' }}>analytics</span>
              Dashboard
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: viewMode === 'list' ? '#2563eb' : 'transparent',
                color: viewMode === 'list' ? 'white' : '#94a3b8',
                display: 'flex', alignItems: 'center', gap: '6px',
                cursor: 'pointer', fontSize: '14px', fontWeight: 500
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '18px' }}>computer</span>
              Hardware
            </button>
            <button
              onClick={() => setViewMode('licenses')}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: viewMode === 'licenses' ? '#2563eb' : 'transparent',
                color: viewMode === 'licenses' ? 'white' : '#94a3b8',
                display: 'flex', alignItems: 'center', gap: '6px',
                cursor: 'pointer', fontSize: '14px', fontWeight: 500
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '18px' }}>key</span>
              Licenças
            </button>
          </Box>
          {canWrite && (
            <>
              <Button
                data-testid="btn-gerir-categorias"
                onClick={handleOpenCategories}
                variant="outlined"
                sx={{
                  padding: '12px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15, 23, 42, 0.2)', color: textPrimary,
                  '&:hover': { borderColor: '#2563eb', background: 'rgba(37, 99, 235, 0.08)' }
                }}
                startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>category</span>}
              >
                Categorias
              </Button>
              <Button
                data-testid="btn-novo-ativo"
                onClick={handleOpenNew}
                sx={{
              padding: '12px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
            }} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}>
              {viewMode === 'licenses' ? 'Nova licença' : 'Novo ativo'}
            </Button>
            </>
          )}
        </Box>
        }
      />

      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
        <>
          <KpiGrid maxColumns={5}>
            {statCards.map((card) => (
              <StatsCard
                key={card.key}
                title={card.label}
                value={card.value}
                iconName={card.icon}
                hexColor={card.color}
                subtitle={card.trend}
              />
            ))}
          </KpiGrid>

          {/* Charts Row */}
          <Box className="assets-charts-grid" sx={{ mb: 3 }}>
            {/* Distribuicao por Categoria */}
            <Box sx={{ ...cardStyle, p: 3, minHeight: 360 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span className="material-icons-round" style={{ fontSize: '20px', color: '#2563eb' }}>pie_chart</span>
                  Distribuição por Categoria
                </Typography>
                <IconButton size="small" sx={{ color: textSecondary }}>
                  <span className="material-icons-round" style={{ fontSize: '20px' }}>more_vert</span>
                </IconButton>
              </Box>
              <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {kpis.categoryChartData.length > 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <PieChart
                      series={[{
                        data: kpis.categoryChartData.map((c, i) => ({ id: c.id, value: c.value, label: c.label, color: CHART_COLORS[i % CHART_COLORS.length] })),
                        ...assetDonutPieRadii
                      }]}
                      width={assetDonutPieSize.width} height={assetDonutPieSize.height} slotProps={{ legend: { hidden: true } }}
                    />
                    <Box>
                      {kpis.categoryDist.slice(0, 10).map((c, i) => (
                        <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '8px', bgcolor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <Typography sx={{ color: textSecondary, fontSize: '14px' }}>{c.label}</Typography>
                          <Typography sx={{ color: textPrimary, fontWeight: 600, ml: 'auto' }}>{c.value}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', color: textMuted }}>
                    <span className="material-icons-round" style={{ fontSize: '48px' }}>pie_chart</span>
                    <Typography sx={{ mt: 1 }}>Sem dados disponiveis</Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Ativos por Situacao */}
            <Box sx={{ ...cardStyle, p: 3, minHeight: 360 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span className="material-icons-round" style={{ fontSize: '20px', color: '#10b981' }}>donut_small</span>
                  Ativos por Situação
                </Typography>
              </Box>
              <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {kpis.statusDist.length > 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <PieChart
                      series={[{
                        data: kpis.statusDist.map((c, i) => ({ id: c.id, value: c.value, label: c.label, color: CHART_COLORS[i % CHART_COLORS.length] })),
                        ...assetDonutPieRadii
                      }]}
                      width={assetDonutPieSize.width} height={assetDonutPieSize.height} slotProps={{ legend: { hidden: true } }}
                    />
                    <Box>
                      {kpis.statusDist.map((c, i) => (
                        <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '8px', bgcolor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <Typography sx={{ color: textSecondary, fontSize: '14px' }}>{c.label}</Typography>
                          <Typography sx={{ color: textPrimary, fontWeight: 600, ml: 'auto' }}>{c.value}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', color: textMuted }}>
                    <span className="material-icons-round" style={{ fontSize: '48px' }}>donut_small</span>
                    <Typography sx={{ mt: 1 }}>Sem dados disponiveis</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          <Box className="assets-charts-grid" sx={{ mb: 3 }}>
            {/* Centro de Custo */}
            <Box sx={{ ...cardStyle, p: 3, minHeight: 340 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span className="material-icons-round" style={{ fontSize: '20px', color: '#06b6d4' }}>account_tree</span>
                  Centro de Custo
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                <Box>
                  <Typography sx={{ color: textMuted, fontSize: '12px', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Ativos por Centro
                  </Typography>
                  {kpis.costCenterDist.slice(0, 6).map((cc) => {
                    const max = kpis.costCenterDist[0]?.count || 1;
                    return (
                      <Box key={`${cc.label}-count`} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography sx={{ color: textSecondary, fontSize: '13px' }}>{cc.label}</Typography>
                          <Typography sx={{ color: textPrimary, fontSize: '13px', fontWeight: 600 }}>{cc.count}</Typography>
                        </Box>
                        <Box sx={{ height: 6, borderRadius: '8px', bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}>
                          <Box sx={{ height: '100%', borderRadius: '8px', width: `${Math.round((cc.count / max) * 100)}%`, bgcolor: '#2563eb' }} />
                        </Box>
                      </Box>
                    );
                  })}
                  {kpis.costCenterDist.length === 0 && (
                    <Typography sx={{ color: textMuted, fontSize: '13px' }}>Sem dados</Typography>
                  )}
                </Box>
                <Box>
                  <Typography sx={{ color: textMuted, fontSize: '12px', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Valor por Centro
                  </Typography>
                  {kpis.costCenterValueDist.slice(0, 6).map((cc) => {
                    const max = kpis.costCenterValueDist[0]?.value || 1;
                    return (
                      <Box key={`${cc.label}-value`} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography sx={{ color: textSecondary, fontSize: '13px' }}>{cc.label}</Typography>
                          <Typography sx={{ color: textPrimary, fontSize: '13px', fontWeight: 600 }}>{formatCurrency(cc.value)}</Typography>
                        </Box>
                        <Box sx={{ height: 6, borderRadius: '8px', bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}>
                          <Box sx={{ height: '100%', borderRadius: '8px', width: `${Math.round((cc.value / max) * 100)}%`, bgcolor: '#06b6d4' }} />
                        </Box>
                      </Box>
                    );
                  })}
                  {kpis.costCenterValueDist.length === 0 && (
                    <Typography sx={{ color: textMuted, fontSize: '13px' }}>Sem dados</Typography>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Indicadores de Licencas */}
            <Box sx={{ ...cardStyle, p: 3, minHeight: 340 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span className="material-icons-round" style={{ fontSize: '20px', color: '#3b82f6' }}>key</span>
                  Indicadores de Licenças
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                {[
                  { label: 'Total', value: kpis.licenses.total },
                  { label: 'Vencendo (30d)', value: kpis.licenses.expiring },
                  { label: 'Vencidas', value: kpis.licenses.expired },
                  { label: 'Custo total', value: `${formatCurrency(kpis.licenses.totalCost)}/ano` }
                ].map((item) => (
                  <Box key={item.label} sx={{ p: 2, borderRadius: '8px', bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' }}>
                    <Typography sx={{ color: textMuted, fontSize: '12px' }}>{item.label}</Typography>
                    <Typography sx={{ color: textPrimary, fontWeight: 700, fontSize: '18px' }}>{item.value}</Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {(kpis.licenses.subscription + kpis.licenses.perpetual) > 0 ? (
                  <PieChart
                    series={[{
                      data: [
                        { id: 'ASSINATURA', value: kpis.licenses.subscription, label: 'Assinatura', color: '#2563eb' },
                        { id: 'PERPETUA', value: kpis.licenses.perpetual, label: 'Perpétua', color: '#10b981' }
                      ],
                      innerRadius: 45, outerRadius: 80, paddingAngle: 2, cornerRadius: 4
                    }]}
                    width={160} height={160} slotProps={{ legend: { hidden: true } }}
                  />
                ) : (
                  <Box sx={{ width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textMuted }}>
                    <span className="material-icons-round" style={{ fontSize: '40px' }}>key</span>
                  </Box>
                )}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.2 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '8px', bgcolor: '#2563eb' }} />
                    <Typography sx={{ color: textSecondary, fontSize: '14px' }}>Assinatura</Typography>
                    <Typography sx={{ color: textPrimary, fontWeight: 600, ml: 'auto' }}>{kpis.licenses.subscription}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '8px', bgcolor: '#10b981' }} />
                    <Typography sx={{ color: textSecondary, fontSize: '14px' }}>Perpétua</Typography>
                    <Typography sx={{ color: textPrimary, fontWeight: 600, ml: 'auto' }}>{kpis.licenses.perpetual}</Typography>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ color: textMuted, fontSize: '12px' }}>Uso de licenças</Typography>
                    <Typography sx={{ color: textPrimary, fontWeight: 700 }}>
                      {kpis.licenseTotals.quantity > 0 ? `${Math.round((kpis.licenseTotals.used / kpis.licenseTotals.quantity) * 100)}%` : '0%'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>

          <Box className="assets-charts-grid" sx={{ mb: 3 }}>
            {/* Qualidade de Cadastro */}
            <Box sx={{ ...cardStyle, p: 3, minWidth: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span className="material-icons-round" style={{ fontSize: '20px', color: '#f59e0b' }}>verified</span>
                  Qualidade de Cadastro
                </Typography>
              </Box>
              <KpiGrid maxColumns={2} mb={0} clampChildHeight={false} gap={2}>
                <StatsCard titleLineClamp={2} title="Sem centro de custo" value={kpis.missingCostCenter} iconName="account_balance" hexColor="#f59e0b" subtitle="Ativos sem CC" />
                <StatsCard titleLineClamp={2} title="Sem fornecedor" value={kpis.missingSupplier} iconName="storefront" hexColor="#ea580c" />
                <StatsCard titleLineClamp={2} title="Sem contrato" value={kpis.missingContract} iconName="description" hexColor="#dc2626" />
                <StatsCard titleLineClamp={2} title="Sem categoria" value={kpis.missingCategory} iconName="label_off" hexColor="#64748b" />
                <StatsCard titleLineClamp={2} title="Valor medio por ativo" value={formatCurrency(kpis.avgAssetValue)} iconName="payments" hexColor="#06b6d4" />
              </KpiGrid>
            </Box>

            {/* Top Valores */}
            <Box sx={{ ...cardStyle, p: 3, minWidth: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span className="material-icons-round" style={{ fontSize: '20px', color: '#2563eb' }}>emoji_events</span>
                  Top Valores
                </Typography>
              </Box>
              <Typography sx={{ color: textMuted, fontSize: '12px', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Ativos
              </Typography>
              {kpis.topAssets.length > 0 ? (
                <KpiGrid maxColumns={3} mb={3} clampChildHeight={false} gap={2}>
                  {kpis.topAssets.map((asset, i) => (
                    <StatsCard
                      key={asset.id}
                      titleLineClamp={2}
                      title={asset.name}
                      value={formatCurrency(asset.value)}
                      iconName="computer"
                      hexColor={CHART_COLORS[i % CHART_COLORS.length]}
                      subtitle={`Pos. ${i + 1} · maior valor`}
                    />
                  ))}
                </KpiGrid>
              ) : (
                <Typography sx={{ color: textMuted, fontSize: '13px', mb: 3 }}>Sem dados</Typography>
              )}
              <Typography sx={{ color: textMuted, fontSize: '12px', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Licenças
              </Typography>
              {kpis.topLicenses.length > 0 ? (
                <KpiGrid maxColumns={3} mb={0} clampChildHeight={false} gap={2}>
                  {kpis.topLicenses.map((lic, i) => (
                    <StatsCard
                      key={lic.id}
                      titleLineClamp={2}
                      title={lic.name}
                      value={formatCurrency(lic.total)}
                      iconName="key"
                      hexColor={CHART_COLORS[i % CHART_COLORS.length]}
                      subtitle={lic.vendor ? `${lic.vendor} · Pos. ${i + 1}` : `Pos. ${i + 1}`}
                    />
                  ))}
                </KpiGrid>
              ) : (
                <Typography sx={{ color: textMuted, fontSize: '13px' }}>Sem dados</Typography>
              )}
            </Box>
          </Box>
        </>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
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
                onClick={openAssetListFilterDrawer}
                sx={{
                  color: textPrimary,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                }}
              >
                Filtros
              </Button>
              {activeAssetListFilterCount > 0 ? (
                <Box sx={{ px: 1, py: 0.25, borderRadius: '8px', fontSize: '10px', fontWeight: 700, bgcolor: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' }}>
                  {activeAssetListFilterCount}
                </Box>
              ) : null}
            </Box>
            <Button
              size="small"
              startIcon={<Refresh />}
              onClick={clearFilters}
              sx={{
                color: textSecondary,
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
            onApply={handleApplyAssetListFilters}
            onClear={handleClearAssetListDrawer}
            title="Filtros de ativos"
          >
            <TextField
              fullWidth
              label="Buscar"
              placeholder="Buscar por codigo ou nome..."
              size="small"
              value={draftListFilters.search}
              onChange={(e) => setDraftListFilters((prev) => ({ ...prev, search: e.target.value }))}
              sx={inputSx}
            />
            <TextField
              select
              fullWidth
              label="Status"
              size="small"
              value={draftListFilters.status}
              onChange={(e) => setDraftListFilters((prev) => ({ ...prev, status: e.target.value }))}
              sx={inputSx}
            >
              <MenuItem value="">Todos os status</MenuItem>
              <MenuItem value="PROPRIO">Ativo</MenuItem>
              <MenuItem value="LOCADO">Alugado</MenuItem>
              <MenuItem value="MANUTENCAO">Em Manutenção</MenuItem>
              <MenuItem value="DESATIVADO">Inativo</MenuItem>
            </TextField>
            <TextField
              select
              fullWidth
              label="Categoria"
              size="small"
              value={draftListFilters.category}
              onChange={(e) => setDraftListFilters((prev) => ({ ...prev, category: e.target.value }))}
              sx={inputSx}
            >
              <MenuItem value="">Todas as categorias</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
          </FilterDrawer>

          <DataListTable
            shell={{
              title: 'Lista de Ativos',
              titleIcon: 'list',
              accentColor: '#2563eb',
              count: filteredAssets.length,
              sx: { ...cardStyle, overflow: 'hidden' },
            }}
            columns={getAssetColumns({
              textPrimary,
              textSecondary,
              textMuted,
              surfaceBg,
              softBorder,
              getStatusLabel,
              getStatusStyle,
              canEdit,
              selectedIds: selectedAssetIds,
              setSelectedIds: setSelectedAssetIds,
              onView: handleOpenView,
              onEdit: handleOpenEdit,
              onOpenMenu: handleMenuOpen,
            })}
            rows={filteredAssets}
            sortRows={sortAssetRows}
            defaultOrderBy="assetName"
            defaultOrder="asc"
            getDefaultOrderForColumn={(id) => (id === 'acquisitionValue' ? 'desc' : 'asc')}
            loading={loading}
            emptyMessage="Nenhum ativo com os filtros atuais."
            emptyContent={
              !loading && assets.length === 0
                ? (
                    <EmptyState
                      icon={<span className="material-icons-round" style={{ fontSize: 'inherit' }}>inventory_2</span>}
                      title="Nenhum ativo encontrado"
                      description="Ajuste os filtros ou adicione um novo ativo para gerenciar seu inventário de hardware."
                      actionLabel="Novo ativo"
                      actionIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
                      onAction={() => openCreateModal('HARDWARE')}
                    />
                  )
                : undefined
            }
            rowsPerPageDefault={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            resetPaginationKey={assetListResetKey}
            onRowClick={handleOpenView}
            isRowSelected={(a) => selectedAssetIds.includes(a.id)}
            renderBeforeTable={({ paginatedRows }) => (
              <BulkActionsBar
                selectedCount={selectedAssetIds.length}
                totalCount={paginatedRows.length}
                onSelectAll={() => {
                  const pageIds = paginatedRows.map((a) => a.id);
                  const allOn = pageIds.length > 0 && pageIds.every((id) => selectedAssetIds.includes(id));
                  if (allOn) {
                    setSelectedAssetIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                  } else {
                    setSelectedAssetIds(pageIds);
                  }
                }}
                onClearAll={() => setSelectedAssetIds([])}
                allSelected={
                  paginatedRows.length > 0 && paginatedRows.every((a) => selectedAssetIds.includes(a.id))
                }
                actions={[
                  { label: 'Excluir', icon: 'delete', onClick: handleBulkDeleteAssets, color: '#ef4444' },
                ]}
              />
            )}
          />
        </>
      )}

      {/* Licenses View */}
      {viewMode === 'licenses' && (
        <>
          {/* Filters - Padrao A Premium */}
          <Box sx={{ ...cardStyle, mb: 3, overflow: 'hidden' }}>
            <Box sx={{
              p: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: showFilters ? softBorder : 'none'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: textPrimary }}>
                <span className="material-icons-round" style={{ fontSize: '20px' }}>filter_list</span>
                <Typography fontWeight={600}>Filtros</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  onClick={clearFilters}
                  sx={{
                    color: textSecondary,
                    textTransform: 'none',
                    '&:hover': { bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)' }
                  }}
                  startIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>refresh</span>}
                >
                  Limpar
                </Button>
                <IconButton size="small" onClick={() => setShowFilters(!showFilters)} sx={{ color: textSecondary }}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>
                    {showFilters ? 'expand_less' : 'expand_more'}
                  </span>
                </IconButton>
              </Box>
            </Box>
            <Collapse in={showFilters}>
              <Box sx={{ p: 3 }}>
                <TextField
                  label="Buscar"
                  placeholder="Buscar licenca por nome ou fabricante..."
                  size="small"
                  fullWidth
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={inputSx}
                />
              </Box>
            </Collapse>
          </Box>

          <DataListTable
            shell={{
              title: 'Licenças de software',
              titleIcon: 'key',
              accentColor: '#3b82f6',
              count: filteredLicenses.length,
              sx: { ...cardStyle, overflow: 'hidden' },
            }}
            columns={getLicenseColumns({
              textPrimary,
              textSecondary,
              textMuted,
              surfaceBg,
              softBorder,
              canEdit,
              canDelete: canDeletePerm,
              onView: handleOpenView,
              onEdit: handleOpenEdit,
              onDelete: (lic) => {
                setDeleteId(lic.id);
                setDeleteType('LICENSE');
                setConfirmOpen(true);
              },
            })}
            rows={filteredLicenses}
            sortRows={sortLicenseRows}
            defaultOrderBy="expirationSort"
            defaultOrder="desc"
            getDefaultOrderForColumn={(id) =>
              id === 'expirationSort' || id === 'cost' || id === 'quantity' ? 'desc' : 'asc'
            }
            loading={loading}
            emptyMessage={
              licenses.length === 0
                ? 'Nenhuma licença cadastrada.'
                : 'Nenhuma licença corresponde ao termo de busca atual.'
            }
            emptyContent={
              !loading && licenses.length === 0
                ? (
                    <EmptyState
                      icon={<span className="material-icons-round" style={{ fontSize: 'inherit' }}>key</span>}
                      title="Nenhuma licença cadastrada"
                      description="Adicione licenças de software para acompanhar validade, custos e uso."
                      actionLabel="Nova licença"
                      actionIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
                      onAction={() => openCreateModal('LICENSE')}
                    />
                  )
                : undefined
            }
            rowsPerPageDefault={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            resetPaginationKey={licenseListResetKey}
            onRowClick={handleOpenView}
          />
        </>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: surfaceBg, border: softBorder,
            borderRadius: '8px', boxShadow: isDark ? '0 8px 24px rgba(0, 0, 0, 0.4)' : '0 12px 24px rgba(15, 23, 42, 0.08)',
            '& .MuiMenuItem-root': {
              color: textSecondary, fontSize: '14px', gap: 1.5, py: 1.5, px: 2,
              '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.1)', color: textPrimary }
            }
          }
        }}
      >
        <MenuItem onClick={() => menuAsset && handleOpenView(menuAsset)}>
          <span className="material-icons-round" style={{ fontSize: '18px' }}>visibility</span> Ver Detalhes
        </MenuItem>
        {canEdit && (
          <MenuItem onClick={() => menuAsset && handleOpenEdit(menuAsset)}>
            <span className="material-icons-round" style={{ fontSize: '18px' }}>edit</span> Editar
          </MenuItem>
        )}
        {canDeletePerm && (
          <MenuItem onClick={() => menuAsset && handleDeleteClick(menuAsset)} sx={{ '&:hover': { color: '#f43f5e !important', bgcolor: 'rgba(244, 63, 94, 0.1) !important' } }}>
            <span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span> Excluir
          </MenuItem>
        )}
      </Menu>

      {/* Modals */}
      <AssetCategoryModal
        open={categoryModalOpen}
        onClose={() => { setCategoryModalOpen(false); setEditingCategory(null); }}
        onSave={handleSaveCategory}
        category={editingCategory}
      />
      <AssetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveAsset}
        onSaveLicense={handleSaveLicense}
        asset={selectedItem}
        defaultCreateType={createModalKind}
        users={users}
        categories={categories}
        isViewMode={isViewMode}
      />
      <AssetViewModal open={viewModalOpen} onClose={() => setViewModalOpen(false)} asset={selectedItem} onEdit={canEdit ? handleViewToEdit : undefined} />
      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Excluir Ativo" content="Tem certeza que deseja excluir este ativo? Esta acao nao pode ser desfeita." />
    </Box>
  );
};

export default AssetsPage;












