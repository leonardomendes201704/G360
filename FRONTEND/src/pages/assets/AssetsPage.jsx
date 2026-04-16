import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useSnackbar } from 'notistack';
import { Box, Typography, Button, IconButton, Tooltip, Menu, MenuItem, TextField, Collapse, Checkbox } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import BulkActionsBar from '../../components/common/BulkActionsBar';
import { Delete as DeleteIcon } from '@mui/icons-material';

import { getAssets, createAsset, updateAsset, deleteAsset } from '../../services/asset.service';
import { getLicenses, createLicense, updateLicense, deleteLicense } from '../../services/software-license.service';
import { getReferenceUsers } from '../../services/reference.service';
import { getAssetCategories } from '../../services/asset-category.service';
import { getReferenceSuppliers } from '../../services/reference.service';

import AssetModal from '../../components/modals/AssetModal';
import AssetViewModal from '../../components/modals/AssetViewModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { getErrorMessage } from '../../utils/errorUtils';
import { ThemeContext } from '../../contexts/ThemeContext';
import { AuthContext } from '../../contexts/AuthContext';
import { useUndoToast } from '../../hooks/useUndoToast';

import './AssetsPage.css';

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
  const [showFilters, setShowFilters] = useState(true);
  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#475569';
  const textMuted = isDark ? '#64748b' : '#64748b';
  const surfaceBg = isDark ? '#1c2632' : '#f1f5f9';
  const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)';
  const softBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)';
  const tableHeaderBg = isDark ? '#1c2632' : '#f8fafc';
  const tableRowHover = isDark ? '#1c2632' : '#f1f5f9';
  const iconMuted = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#ffffff';

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
      borderRadius: 2,
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
  };

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteType, setDeleteType] = useState('ASSET');

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
  const handleOpenNew = () => { setSelectedItem(null); setIsViewMode(false); setModalOpen(true); };
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
    borderRadius: '16px'
  };

  const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#3b82f6'];

  return (
    <Box className="assets-page">
      {/* Header */}
      <Box sx={{ ...cardStyle, mb: 3, p: { xs: 2, md: 3 }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: '12px',
            background: 'rgba(37, 99, 235, 0.15)',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb'
          }}>
            <span className="material-icons-round" style={{ fontSize: '24px' }}>inventory_2</span>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>
              Gestão de Ativos
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Toggle */}
          <Box sx={{ display: 'flex', gap: 1, background: surfaceBg, padding: '4px', borderRadius: '12px', border: softBorder, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
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
            <Button data-testid="btn-novo-ativo" onClick={handleOpenNew} sx={{
              padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
            }} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}>
              Novo Ativo
            </Button>
          )}
        </Box>
      </Box>

      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
        <>
          {/* KPI Cards — Circle icon variant */}
          <Box className="assets-kpi-grid">
            {statCards.map((card) => (
              <Box key={card.key} sx={{
                ...cardStyle, p: 2.5, display: 'flex', alignItems: 'center', gap: 2,
                transition: 'all 0.3s ease', cursor: 'pointer',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)' }
              }}>
                <Box sx={{
                  width: 48, height: 48, borderRadius: '50%', background: card.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color,
                  border: `2px solid ${card.color}20`, flexShrink: 0
                }}>
                  <span className="material-icons-round" style={{ fontSize: '22px' }}>{card.icon}</span>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: card.key === 'value' ? '22px' : '26px', fontWeight: 700, color: textPrimary, lineHeight: 1.1 }}>{card.value}</Typography>
                  <Typography sx={{ fontSize: '12px', color: textMuted, mt: 0.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.label}</Typography>
                  <Typography sx={{ fontSize: '11px', color: card.negative ? '#f43f5e' : '#10b981', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                    {card.negative && <span className="material-icons-round" style={{ fontSize: '13px' }}>trending_down</span>}
                    {!card.negative && card.key === 'total' && <span className="material-icons-round" style={{ fontSize: '13px' }}>trending_up</span>}
                    {card.trend}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

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
                        innerRadius: 60, outerRadius: 100, paddingAngle: 2, cornerRadius: 4
                      }]}
                      width={200} height={200} slotProps={{ legend: { hidden: true } }}
                    />
                    <Box>
                      {kpis.categoryDist.slice(0, 10).map((c, i) => (
                        <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: CHART_COLORS[i % CHART_COLORS.length] }} />
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
              <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {kpis.statusDist.length > 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <PieChart
                      series={[{
                        data: kpis.statusDist.map((c, i) => ({ id: c.id, value: c.value, label: c.label, color: CHART_COLORS[i % CHART_COLORS.length] })),
                        innerRadius: 50, outerRadius: 90, paddingAngle: 2, cornerRadius: 4
                      }]}
                      width={180} height={180} slotProps={{ legend: { hidden: true } }}
                    />
                    <Box>
                      {kpis.statusDist.map((c, i) => (
                        <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.2 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <Typography sx={{ color: textSecondary, fontSize: '14px' }}>{c.label}</Typography>
                          <Typography sx={{ color: textPrimary, fontWeight: 600, ml: 'auto' }}>{c.value}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', color: textMuted }}>
                    <span className="material-icons-round" style={{ fontSize: '40px' }}>donut_small</span>
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
                        <Box sx={{ height: 6, borderRadius: 999, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}>
                          <Box sx={{ height: '100%', borderRadius: 999, width: `${Math.round((cc.count / max) * 100)}%`, bgcolor: '#2563eb' }} />
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
                        <Box sx={{ height: 6, borderRadius: 999, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}>
                          <Box sx={{ height: '100%', borderRadius: 999, width: `${Math.round((cc.value / max) * 100)}%`, bgcolor: '#06b6d4' }} />
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
                  <Box key={item.label} sx={{ p: 2, borderRadius: '10px', bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' }}>
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
                    <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: '#2563eb' }} />
                    <Typography sx={{ color: textSecondary, fontSize: '14px' }}>Assinatura</Typography>
                    <Typography sx={{ color: textPrimary, fontWeight: 600, ml: 'auto' }}>{kpis.licenses.subscription}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: '#10b981' }} />
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

          <Box className="assets-charts-grid">
            {/* Qualidade de Cadastro */}
            <Box sx={{ ...cardStyle, p: 3, minHeight: 300 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span className="material-icons-round" style={{ fontSize: '20px', color: '#f59e0b' }}>verified</span>
                  Qualidade de Cadastro
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                {[
                  { label: 'Sem centro de custo', value: kpis.missingCostCenter },
                  { label: 'Sem fornecedor', value: kpis.missingSupplier },
                  { label: 'Sem contrato', value: kpis.missingContract },
                  { label: 'Sem categoria', value: kpis.missingCategory },
                  { label: 'Valor medio por ativo', value: formatCurrency(kpis.avgAssetValue) }
                ].map((item) => (
                  <Box key={item.label} sx={{ p: 2, borderRadius: '10px', bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' }}>
                    <Typography sx={{ color: textMuted, fontSize: '12px' }}>{item.label}</Typography>
                    <Typography sx={{ color: textPrimary, fontWeight: 700, fontSize: '18px' }}>{item.value}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Top Valores */}
            <Box sx={{ ...cardStyle, p: 3, minHeight: 300 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span className="material-icons-round" style={{ fontSize: '20px', color: '#2563eb' }}>emoji_events</span>
                  Top Valores
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography sx={{ color: textMuted, fontSize: '12px', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Ativos
                  </Typography>
                  {kpis.topAssets.map((asset) => (
                    <Box key={asset.id} sx={{ mb: 1.2 }}>
                      <Typography sx={{ color: textSecondary, fontSize: '13px' }}>{asset.name}</Typography>
                      <Typography sx={{ color: textPrimary, fontWeight: 600, fontSize: '13px' }}>{formatCurrency(asset.value)}</Typography>
                    </Box>
                  ))}
                  {kpis.topAssets.length === 0 && (
                    <Typography sx={{ color: textMuted, fontSize: '13px' }}>Sem dados</Typography>
                  )}
                </Box>
                <Box>
                  <Typography sx={{ color: textMuted, fontSize: '12px', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Licenças
                  </Typography>
                  {kpis.topLicenses.map((lic) => (
                    <Box key={lic.id} sx={{ mb: 1.2 }}>
                      <Typography sx={{ color: textSecondary, fontSize: '13px' }}>{lic.name}</Typography>
                      <Typography sx={{ color: textPrimary, fontWeight: 600, fontSize: '13px' }}>{formatCurrency(lic.total)}</Typography>
                    </Box>
                  ))}
                  {kpis.topLicenses.length === 0 && (
                    <Typography sx={{ color: textMuted, fontSize: '13px' }}>Sem dados</Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </>
      )}

      {/* List View */}
      {viewMode === 'list' && (
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
                {(() => {
                  const activeCount = [filters.status, filters.category, searchTerm].filter(Boolean).length;
                  return activeCount > 0 ? (
                    <Box sx={{ px: 1, py: 0.25, borderRadius: '10px', fontSize: '10px', fontWeight: 700, bgcolor: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' }}>{activeCount}</Box>
                  ) : null;
                })()}
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
              <Box sx={{ p: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
                <TextField
                  label="Buscar"
                  placeholder="Buscar por codigo ou nome..."
                  size="small"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={inputSx}
                />
                <TextField
                  select
                  label="Status"
                  size="small"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
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
                  label="Categoria"
                  size="small"
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  sx={inputSx}
                >
                  <MenuItem value="">Todas as categorias</MenuItem>
                  {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </TextField>
              </Box>
            </Collapse>
          </Box>

          {/* Table */}
          <Box sx={{ ...cardStyle, overflow: 'hidden' }}>
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: cardBorder }}>
              <Typography sx={{ fontSize: '18px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                <span className="material-icons-round" style={{ fontSize: '20px', color: '#2563eb' }}>list</span>
                Lista de Ativos
                <span style={{ fontSize: '14px', color: textMuted, fontWeight: 400, marginLeft: '8px' }}>
                  ({filteredAssets.length} itens)
                </span>
              </Typography>
            </Box>

            <BulkActionsBar
              selectedCount={selectedAssetIds.length}
              totalCount={filteredAssets.length}
              onSelectAll={() => setSelectedAssetIds(selectedAssetIds.length === filteredAssets.length ? [] : filteredAssets.map(a => a.id))}
              onClear={() => setSelectedAssetIds([])}
              actions={[{ label: 'Excluir', icon: <DeleteIcon sx={{ fontSize: 16 }} />, onClick: handleBulkDeleteAssets, color: '#ef4444' }]}
            />
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: tableHeaderBg }}>
                    <th style={{ padding: '12px 8px', width: 40, borderBottom: cardBorder }}>
                      <Checkbox
                        size="small"
                        checked={filteredAssets.length > 0 && filteredAssets.every(a => selectedAssetIds.includes(a.id))}
                        indeterminate={filteredAssets.some(a => selectedAssetIds.includes(a.id)) && !filteredAssets.every(a => selectedAssetIds.includes(a.id))}
                        onChange={() => setSelectedAssetIds(filteredAssets.every(a => selectedAssetIds.includes(a.id)) ? [] : filteredAssets.map(a => a.id))}
                        sx={{ color: '#64748b', '&.Mui-checked': { color: '#667eea' }, '&.MuiCheckbox-indeterminate': { color: '#667eea' } }}
                      />
                    </th>
                    {['Ativo', 'Categoria', 'Status', 'Localização', 'Valor', 'Ações'].map((header, i) => (
                      <th key={header} style={{
                        padding: '16px 24px',
                        textAlign: i === 5 ? 'center' : 'left',
                        fontSize: '12px', fontWeight: 600, color: textMuted,
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        borderBottom: cardBorder
                      }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map(asset => {
                    const statusStyle = getStatusStyle(asset.status);
                    const isSelected = selectedAssetIds.includes(asset.id);
                    return (
                      <tr key={asset.id} style={{
                        transition: 'all 0.2s ease', cursor: 'pointer',
                        background: isSelected ? 'rgba(102,126,234,0.08)' : 'transparent'
                      }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = tableRowHover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'rgba(102,126,234,0.08)' : 'transparent'; }}>
                        <td style={{ padding: '8px 8px', borderBottom: cardBorder }} onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            size="small"
                            checked={isSelected}
                            onChange={() => setSelectedAssetIds(prev => isSelected ? prev.filter(id => id !== asset.id) : [...prev, asset.id])}
                            sx={{ color: '#64748b', '&.Mui-checked': { color: '#667eea' } }}
                          />
                        </td>
                        <td style={{ padding: '16px 24px', borderBottom: cardBorder }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '12px',
                              background: 'rgba(37, 99, 235, 0.15)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb'
                            }}>
                              <span className="material-icons-round" style={{ fontSize: '20px' }}>computer</span>
                            </div>
                            <div>
                              <div style={{ color: textPrimary, fontWeight: 600, marginBottom: '2px' }}>{asset.name}</div>
                              <div style={{ color: textMuted, fontSize: '12px' }}>{asset.code}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px', color: textSecondary, fontSize: '14px', borderBottom: cardBorder }}>
                          {asset.category?.name || '-'}
                        </td>
                        <td style={{ padding: '16px 24px', borderBottom: cardBorder }}>
                          <span style={{
                            padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                            background: statusStyle.bg, color: statusStyle.color,
                            display: 'inline-flex', alignItems: 'center', gap: '6px'
                          }}>
                            {getStatusLabel(asset.status)}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', color: textSecondary, fontSize: '14px', borderBottom: cardBorder }}>
                          {asset.location || '-'}
                        </td>
                        <td style={{ padding: '16px 24px', color: textPrimary, fontWeight: 600, fontSize: '14px', borderBottom: cardBorder }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(asset.acquisitionValue || 0)}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center', borderBottom: cardBorder }}>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title="Visualizar">
                              <IconButton size="small" onClick={() => handleOpenView(asset)} sx={{
                                width: 32, height: 32, borderRadius: '8px',
                                background: surfaceBg, border: softBorder, color: textSecondary,
                                '&:hover': { background: 'rgba(37, 99, 235, 0.15)', borderColor: '#2563eb', color: '#2563eb' }
                              }}><span className="material-icons-round" style={{ fontSize: '18px' }}>visibility</span></IconButton>
                            </Tooltip>
                            {canEdit && (
                              <Tooltip title="Editar">
                                <IconButton size="small" onClick={() => handleOpenEdit(asset)} sx={{
                                  width: 32, height: 32, borderRadius: '8px',
                                  background: surfaceBg, border: softBorder, color: textSecondary,
                                  '&:hover': { background: 'rgba(37, 99, 235, 0.15)', borderColor: '#2563eb', color: '#2563eb' }
                                }}><span className="material-icons-round" style={{ fontSize: '18px' }}>edit</span></IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Mais opcoes">
                              <IconButton size="small" onClick={(e) => handleMenuOpen(e, asset)} sx={{
                                width: 32, height: 32, borderRadius: '8px',
                                background: surfaceBg, border: softBorder, color: textSecondary,
                                '&:hover': { background: 'rgba(37, 99, 235, 0.15)', borderColor: '#2563eb', color: '#2563eb' }
                              }}><span className="material-icons-round" style={{ fontSize: '18px' }}>more_vert</span></IconButton>
                            </Tooltip>
                          </Box>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>

            {filteredAssets.length === 0 && !loading && (
              <EmptyState
                icon={<span className="material-icons-round" style={{ fontSize: 'inherit' }}>inventory_2</span>}
                title="Nenhum ativo encontrado"
                description="Ajuste os filtros ou adicione um novo ativo para gerenciar seu inventário de hardware."
                actionLabel="Novo Ativo"
                actionIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
                onAction={handleOpenNew}
              />
            )}
          </Box>
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

          {/* Licenses Table */}
          <Box sx={{ ...cardStyle, overflow: 'hidden' }}>
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: cardBorder }}>
              <Typography sx={{ fontSize: '18px', fontWeight: 600, color: textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}>
                <span className="material-icons-round" style={{ fontSize: '20px', color: '#3b82f6' }}>key</span>
                Licencas de Software
                <span style={{ fontSize: '14px', color: textMuted, fontWeight: 400, marginLeft: '8px' }}>({licenses.filter(l => searchTerm === '' || l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || l.vendor?.toLowerCase().includes(searchTerm.toLowerCase())).length} itens)</span>
              </Typography>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: tableHeaderBg }}>
                    {['Software', 'Fabricante', 'Tipo Licenca', 'Quantidade', 'Expiracao', 'Custo', 'Acoes'].map((header, i) => (
                      <th key={header} style={{
                        padding: '16px 24px',
                        textAlign: i === 6 ? 'center' : 'left',
                        fontSize: '12px', fontWeight: 600, color: textMuted,
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        borderBottom: cardBorder
                      }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {licenses.filter(l => searchTerm === '' || l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || l.vendor?.toLowerCase().includes(searchTerm.toLowerCase())).map(license => {
                    const isExpiring = license.expirationDate && (new Date(license.expirationDate) - new Date()) / (1000 * 60 * 60 * 24) <= 30;
                    const isExpired = license.expirationDate && new Date(license.expirationDate) < new Date();
                    return (
                      <tr key={license.id} style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = tableRowHover}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '16px 24px', borderBottom: cardBorder }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '12px',
                              background: 'rgba(59, 130, 246, 0.15)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6',
                              fontWeight: 600, fontSize: '14px'
                            }}>{license.name?.substring(0, 2).toUpperCase()}</div>
                            <div>
                              <div style={{ color: textPrimary, fontWeight: 600, marginBottom: '2px' }}>{license.name}</div>
                              <div style={{ color: textMuted, fontSize: '12px' }}>{license.licenseKey ? `Chave: ${license.licenseKey.substring(0, 8)}...` : 'Sem chave'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px', color: textSecondary, fontSize: '14px', borderBottom: cardBorder }}>
                          {license.vendor}
                        </td>
                        <td style={{ padding: '16px 24px', borderBottom: cardBorder }}>
                          <span style={{
                            padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                            background: license.licenseType === 'PERPETUA' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                            color: license.licenseType === 'PERPETUA' ? '#10b981' : '#2563eb'
                          }}>{license.licenseType || 'Anual'}</span>
                        </td>
                        <td style={{ padding: '16px 24px', color: textPrimary, fontWeight: 600, fontSize: '14px', borderBottom: cardBorder }}>
                          {license.quantity}
                        </td>
                        <td style={{ padding: '16px 24px', borderBottom: cardBorder }}>
                          {license.expirationDate ? (
                            <span style={{
                              padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                              background: isExpired ? 'rgba(244, 63, 94, 0.15)' : isExpiring ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: isExpired ? '#f43f5e' : isExpiring ? '#f59e0b' : '#10b981'
                            }}>
                              {new Date(license.expirationDate).toLocaleDateString('pt-BR')}
                            </span>
                          ) : (
                            <span style={{ color: textMuted, fontSize: '14px' }}>Perpetua</span>
                          )}
                        </td>
                        <td style={{ padding: '16px 24px', color: textPrimary, fontWeight: 600, fontSize: '14px', borderBottom: cardBorder }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(license.cost || 0)}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center', borderBottom: cardBorder }}>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title="Visualizar">
                              <IconButton size="small" onClick={() => handleOpenView(license)} sx={{
                                width: 32, height: 32, borderRadius: '8px',
                                background: surfaceBg, border: softBorder, color: textSecondary,
                                '&:hover': { background: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6', color: '#3b82f6' }
                              }}><span className="material-icons-round" style={{ fontSize: '18px' }}>visibility</span></IconButton>
                            </Tooltip>
                            {canEdit && (
                              <Tooltip title="Editar">
                                <IconButton size="small" onClick={() => handleOpenEdit(license)} sx={{
                                  width: 32, height: 32, borderRadius: '8px',
                                  background: surfaceBg, border: softBorder, color: textSecondary,
                                  '&:hover': { background: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6', color: '#3b82f6' }
                                }}><span className="material-icons-round" style={{ fontSize: '18px' }}>edit</span></IconButton>
                              </Tooltip>
                            )}
                            {canDeletePerm && (
                              <Tooltip title="Excluir">
                                <IconButton size="small" onClick={() => { setDeleteId(license.id); setDeleteType('LICENSE'); setConfirmOpen(true); }} sx={{
                                  width: 32, height: 32, borderRadius: '8px',
                                  background: surfaceBg, border: softBorder, color: textSecondary,
                                  '&:hover': { background: 'rgba(244, 63, 94, 0.15)', borderColor: '#f43f5e', color: '#f43f5e' }
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

            {licenses.length === 0 && !loading && (
              <EmptyState
                icon={<span className="material-icons-round" style={{ fontSize: 'inherit' }}>key</span>}
                title="Nenhuma licença cadastrada"
                description="Adicione licenças de software para acompanhar validade, custos e uso."
                actionLabel="Nova Licença"
                actionIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
                onAction={handleOpenNew}
              />
            )}
          </Box>
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
            borderRadius: '12px', boxShadow: isDark ? '0 8px 24px rgba(0, 0, 0, 0.4)' : '0 12px 24px rgba(15, 23, 42, 0.08)',
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
      <AssetModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveAsset} onSaveLicense={handleSaveLicense} asset={selectedItem} users={users} categories={categories} isViewMode={isViewMode} />
      <AssetViewModal open={viewModalOpen} onClose={() => setViewModalOpen(false)} asset={selectedItem} onEdit={canEdit ? handleViewToEdit : undefined} />
      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Excluir Ativo" content="Tem certeza que deseja excluir este ativo? Esta acao nao pode ser desfeita." />
    </Box>
  );
};

export default AssetsPage;












