import { useState, useEffect, useContext } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Typography, Select, MenuItem, Chip, FormControl
} from '@mui/material';
import { Add, Visibility, Edit, Delete, Shield, GridOn, Category, ListAlt } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { getRisks, deleteRisk } from '../../../services/project-details.service';
import RiskModal from '../../modals/RiskModal';
import RiskViewModal from '../../modals/RiskViewModal';
import ConfirmDialog from '../../common/ConfirmDialog';

const ProjectRisks = ({ projectId, autoOpen, onAutoOpenClose }) => {
  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';

  // Theme-aware styles
  const cardBg = isDark ? 'rgba(22, 29, 38, 0.5)' : '#FFFFFF';
  const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)';
  const cardShadow = isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)';
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textSecondary = isDark ? '#64748b' : '#475569';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const surfaceBg = isDark ? '#1c2632' : '#f8fafc';
  const borderSubtle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

  const cardStyle = {
    background: isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#FFFFFF',
    border: cardBorder,
    borderRadius: '8px',
    boxShadow: cardShadow
  };

  const selectSx = {
    bgcolor: surfaceBg,
    border: `1px solid ${borderSubtle}`,
    borderRadius: '8px',
    fontSize: '13px',
    color: textPrimary,
    minWidth: '140px',
    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
    '&:hover': { borderColor: 'rgba(37, 99, 235, 0.3)' },
    '& .MuiSelect-icon': { color: textMuted }
  };
  const [risks, setRisks] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingRisk, setViewingRisk] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, riskId: null });
  const { enqueueSnackbar } = useSnackbar();

  const fetchRisks = async () => {
    try {
      const data = await getRisks(projectId);
      setRisks(data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchRisks(); }, [projectId]);

  useEffect(() => {
    if (autoOpen) {
      setEditingRisk(null);
      setOpen(true);
      if (onAutoOpenClose) onAutoOpenClose();
    }
  }, [autoOpen, onAutoOpenClose]);

  const handleOpen = (risk = null) => {
    setEditingRisk(risk);
    setViewMode(false);
    setOpen(true);
  };

  const handleView = (risk) => {
    setViewingRisk(risk);
    setViewOpen(true);
  };

  const handleViewToEdit = (risk) => {
    setViewOpen(false);
    setEditingRisk(risk);
    setViewMode(false);
    setOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ open: true, riskId: id });
  };

  const handleDeleteConfirm = async () => {
    const id = deleteConfirm.riskId;
    setDeleteConfirm({ open: false, riskId: null });
    try {
      await deleteRisk(projectId, id);
      fetchRisks();
      enqueueSnackbar('Risco excluído', { variant: 'success' });
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || '';
      if (error.response?.status === 403 || errorMsg.toLowerCase().includes('permission') || errorMsg.toLowerCase().includes('permiss')) {
        enqueueSnackbar('Você não tem permissão para excluir este risco', { variant: 'warning' });
      } else {
        enqueueSnackbar('Erro ao excluir risco', { variant: 'error' });
      }
    }
  };

  // Estatísticas
  const stats = {
    total: risks.length,
    critical: risks.filter(r => r.impact === 'CRITICO').length,
    high: risks.filter(r => r.impact === 'ALTO').length,
    medium: risks.filter(r => r.impact === 'MEDIO').length,
    low: risks.filter(r => r.impact === 'BAIXO').length
  };

  const categories = [
    { name: 'Técnico', key: 'technical', icon: 'code', color: '#3b82f6' },
    { name: 'Cronograma', key: 'schedule', icon: 'schedule', color: '#f59e0b' },
    { name: 'Recursos', key: 'resource', icon: 'people', color: '#f43f5e' },
    { name: 'Financeiro', key: 'financial', icon: 'attach_money', color: '#10b981' },
    { name: 'Externo', key: 'external', icon: 'public', color: '#06b6d4' }
  ];

  const categoryStats = categories.map(cat => ({
    ...cat,
    count: risks.filter(r => r.category === cat.key).length
  }));

  // Matriz de Riscos
  const getProbabilityLevel = (prob) => {
    const map = { 'CRITICO': 5, 'MUITO_ALTA': 5, 'ALTA': 4, 'MEDIA': 3, 'BAIXA': 2, 'MUITO_BAIXA': 1 };
    return map[prob] || 0;
  };

  const getImpactLevel = (impact) => {
    const map = { 'MUITO_ALTO': 5, 'ALTO': 4, 'MEDIO': 3, 'BAIXO': 2, 'MUITO_BAIXO': 1, 'CRITICO': 5 };
    return map[impact] || 0;
  };

  const matrixData = Array.from({ length: 5 }, () => Array(5).fill(0));
  risks.forEach(r => {
    const prob = getProbabilityLevel(r.probability);
    const impact = getImpactLevel(r.impact);
    if (prob > 0 && impact > 0) {
      // Y axis = Impact (5 at top = index 0), X axis = Probability
      matrixData[5 - impact][prob - 1]++;
    }
  });

  const getSeverityColor = (row, col) => {
    const score = (5 - row) * col;
    if (score >= 20) return '#dc2626';
    if (score >= 15) return '#f43f5e';
    if (score >= 10) return '#f59e0b';
    if (score >= 5) return '#fcd34d';
    return '#10b981';
  };

  const getProbabilityText = (prob) => {
    const map = { 'MUITO_ALTA': 'Muito Alta', 'ALTA': 'Alta', 'MEDIA': 'Média', 'BAIXA': 'Baixa', 'MUITO_BAIXA': 'Muito Baixa' };
    return map[prob] || prob;
  };

  const getImpactText = (impact) => {
    const map = { 'CRITICO': 'Crítico', 'ALTO': 'Alto', 'MEDIO': 'Médio', 'BAIXO': 'Baixo' };
    return map[impact] || impact;
  };

  const getCategoryTag = (category) => {
    const cat = categories.find(c => c.key === category);
    return cat ? cat.name : 'N/A';
  };

  const getStatusText = (status) => {
    const map = { 'OPEN': 'Ativo', 'MITIGATED': 'Mitigado', 'CLOSED': 'Fechado', 'OCCURRED': 'Ocorreu', 'MONITORING': 'Monitorando' };
    return map[status] || status;
  };

  const getStatusColor = (status) => {
    const map = { 'OPEN': '#f43f5e', 'MONITORING': '#f59e0b', 'MITIGATED': '#10b981', 'CLOSED': '#64748b' };
    return map[status] || '#64748b';
  };

  const getImpactColor = (impact) => {
    const map = { 'CRITICO': '#dc2626', 'ALTO': '#f43f5e', 'MEDIO': '#f59e0b', 'BAIXO': '#10b981' };
    return map[impact] || '#64748b';
  };

  // Filtros
  const filteredRisks = risks.filter(r => {
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  // Stat Card Component
  const StatCard = ({ value, label, color }) => (
    <Box sx={{
      ...cardStyle,
      p: 2.5,
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: color
      }
    }}>
      <Typography sx={{ fontSize: '28px', fontWeight: 700, color: textPrimary }}>{value}</Typography>
      <Typography sx={{ fontSize: '12px', color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</Typography>
    </Box>
  );

  return (
    <Box>
      {/* Section Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Shield sx={{ color: '#f43f5e', fontSize: 28 }} />
          <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>Riscos do Projeto</Typography>
          <Box sx={{
            bgcolor: 'rgba(244, 63, 94, 0.15)',
            color: '#f43f5e',
            px: 1.5,
            py: 0.5,
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600
          }}>
            {risks.length} riscos identificados
          </Box>
        </Box>
        <Button
          onClick={() => handleOpen()}
          startIcon={<Add />}
          sx={{
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            color: 'white',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 600,
            textTransform: 'none',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)' }
          }}
        >
          Novo Risco
        </Button>
      </Box>

      {/* Risk Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, mb: 3 }}>
        <StatCard value={stats.total} label="Total" color="#2563eb" />
        <StatCard value={stats.critical} label="Crítico" color="#dc2626" />
        <StatCard value={stats.high} label="Alto" color="#f43f5e" />
        <StatCard value={stats.medium} label="Médio" color="#f59e0b" />
        <StatCard value={stats.low} label="Baixo" color="#10b981" />
      </Box>

      {/* Risk Overview Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
        {/* Risk Matrix */}
        <Box sx={{ ...cardStyle, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <GridOn sx={{ color: '#2563eb', fontSize: 22 }} />
            <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary }}>Matriz de Calor</Typography>
          </Box>

          <Box sx={{ display: 'flex' }}>
            {/* Y Axis Label */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)', mr: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: textSecondary }}>IMPACTO</Typography>
            </Box>

            <Box sx={{ flex: 1, maxWidth: 450 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.75 }}>
                {matrixData.map((row, rowIdx) =>
                  row.map((count, colIdx) => {
                    const impact = 5 - rowIdx;
                    const prob = colIdx + 1;
                    const score = impact * prob;

                    let cellColor = '#10b981';
                    if (score >= 16) cellColor = '#ef4444';
                    else if (score >= 10) cellColor = '#f97316';
                    else if (score >= 6) cellColor = '#f59e0b';

                    if (isDark) {
                      if (score >= 16) cellColor = 'rgba(239, 68, 68, 0.6)';
                      else if (score >= 10) cellColor = 'rgba(249, 115, 22, 0.6)';
                      else if (score >= 6) cellColor = 'rgba(245, 158, 11, 0.6)';
                      else cellColor = 'rgba(16, 185, 129, 0.6)';
                    }

                    return (
                      <Box
                        key={`${rowIdx}-${colIdx}`}
                        sx={{
                          aspectRatio: '1',
                          borderRadius: '8px',
                          bgcolor: cellColor,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
                          position: 'relative',
                          transition: 'transform 0.2s',
                          '&:hover': { transform: 'scale(1.05)', zIndex: 1 }
                        }}
                      >
                        {count > 0 && (
                          <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: isDark ? '#fff' : 'rgba(0,0,0,0.8)' }}>
                            {count}
                          </Typography>
                        )}
                      </Box>
                    );
                  })
                )}
              </Box>
              {/* X Axis Label */}
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: textSecondary }}>PROBABILIDADE</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Risk by Category */}
        <Box sx={{ ...cardStyle, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <Category sx={{ color: '#2563eb', fontSize: 22 }} />
            <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary }}>Por Categoria</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {categoryStats.map(cat => (
              <Box key={cat.key} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  background: `${cat.color}20`,
                  color: cat.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span className="material-icons-round" style={{ fontSize: 18 }}>{cat.icon}</span>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: '13px', color: textPrimary, mb: 0.5 }}>{cat.name}</Typography>
                  <Box sx={{ height: 6, background: surfaceBg, borderRadius: '8px', overflow: 'hidden' }}>
                    <Box sx={{
                      height: '100%',
                      width: `${(cat.count / Math.max(stats.total, 1)) * 100}%`,
                      background: cat.color,
                      borderRadius: '8px'
                    }} />
                  </Box>
                </Box>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary, minWidth: 20 }}>{cat.count}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Risk Table */}
      <Box sx={{ ...cardStyle, overflow: 'hidden' }}>
        <Box sx={{
          p: 2.5,
          borderBottom: `1px solid ${borderSubtle}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ListAlt sx={{ color: '#2563eb', fontSize: 22 }} />
            <Typography sx={{ fontSize: '16px', fontWeight: 600, color: textPrimary }}>Lista de Riscos</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <FormControl size="small">
              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} sx={selectSx}>
                <MenuItem value="all">Todas as Categorias</MenuItem>
                {categories.map(cat => <MenuItem key={cat.key} value={cat.key}>{cat.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={selectSx}>
                <MenuItem value="all">Todos os Status</MenuItem>
                <MenuItem value="OPEN">Ativo</MenuItem>
                <MenuItem value="MONITORING">Monitorando</MenuItem>
                <MenuItem value="MITIGATED">Mitigado</MenuItem>
                <MenuItem value="CLOSED">Fechado</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)' }}>
                <TableCell sx={{ fontWeight: 600, color: textMuted, borderBottom: `1px solid ${borderSubtle}` }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600, color: textMuted, borderBottom: `1px solid ${borderSubtle}` }}>Descrição</TableCell>
                <TableCell sx={{ fontWeight: 600, color: textMuted, borderBottom: `1px solid ${borderSubtle}` }}>Categoria</TableCell>
                <TableCell sx={{ fontWeight: 600, color: textMuted, borderBottom: `1px solid ${borderSubtle}` }}>Impacto</TableCell>
                <TableCell sx={{ fontWeight: 600, color: textMuted, borderBottom: `1px solid ${borderSubtle}` }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: textMuted, borderBottom: `1px solid ${borderSubtle}` }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRisks.map((risk, idx) => (
                <TableRow key={risk.id} sx={{ '&:hover': { background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' } }}>
                  <TableCell sx={{ color: '#2563eb', fontWeight: 600, borderBottom: `1px solid ${borderSubtle}` }}>
                    RSK-{String(idx + 1).padStart(3, '0')}
                  </TableCell>
                  <TableCell sx={{ color: textPrimary, borderBottom: `1px solid ${borderSubtle}`, maxWidth: 300 }}>
                    {risk.description}
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${borderSubtle}` }}>
                    <Chip
                      label={getCategoryTag(risk.category)}
                      size="small"
                      sx={{
                        bgcolor: `${categories.find(c => c.key === risk.category)?.color || '#64748b'}20`,
                        color: categories.find(c => c.key === risk.category)?.color || '#64748b',
                        fontWeight: 500
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${borderSubtle}` }}>
                    <Chip
                      label={getImpactText(risk.impact)}
                      size="small"
                      sx={{
                        bgcolor: `${getImpactColor(risk.impact)}20`,
                        color: getImpactColor(risk.impact),
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${borderSubtle}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '8px', background: getStatusColor(risk.status) }} />
                      <Typography sx={{ fontSize: '13px', color: textMuted }}>{getStatusText(risk.status)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${borderSubtle}` }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleView(risk)} sx={{ color: textMuted, '&:hover': { color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)' } }}>
                        <Visibility fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleOpen(risk)} sx={{ color: textMuted, '&:hover': { color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)' } }}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteClick(risk.id)} sx={{ color: textMuted, '&:hover': { color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)' } }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRisks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: textSecondary, fontStyle: 'italic', borderBottom: 'none' }}>
                    Nenhum risco registrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <RiskModal
        open={open}
        onClose={() => { setOpen(false); setViewMode(false); }}
        onSave={fetchRisks}
        projectId={projectId}
        riskToEdit={editingRisk}
        viewMode={viewMode}
      />

      <RiskViewModal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        risk={viewingRisk}
        onEdit={handleViewToEdit}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Excluir Risco"
        description="Tem certeza que deseja excluir este risco? Esta ação não pode ser desfeita."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ open: false, riskId: null })}
        confirmText="Excluir"
        confirmColor="error"
      />
    </Box>
  );
};

export default ProjectRisks;
