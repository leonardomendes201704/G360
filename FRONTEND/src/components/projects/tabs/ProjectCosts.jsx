import { useState, useEffect, useMemo, useContext } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Typography, IconButton, Tooltip, Avatar, TextField, InputAdornment
} from '@mui/material';
import {
  Add, Description, Edit, Delete, CheckCircle, AttachMoney,
  TrendingUp, TrendingDown, PendingActions, Savings, Visibility,
  Search, FilterList, AccountBalanceWallet, Analytics, PieChart, ReceiptLong, HourglassEmpty
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { getProjectCosts, deleteProjectCost, createProjectCost, updateProjectCost } from '../../../services/project-details.service';
import { submitCostForApproval } from '../../../services/project.service';
import ExpenseModal from '../../modals/ExpenseModal';
import ConfirmDialog from '../../common/ConfirmDialog';
import { getFileURL } from '../../../utils/urlUtils';

// =====================================================
// DESIGN SYSTEM - DYNAMIC THEME COLORS
// =====================================================
const getColors = (isDark) => ({
  bgPrimary: isDark ? '#0f1419' : '#ffffff',
  bgSecondary: isDark ? '#161d26' : '#f8fafc',
  bgTertiary: isDark ? '#1c2632' : '#f1f5f9',
  bgCard: isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#FFFFFF',
  borderSubtle: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)',
  borderGlow: 'rgba(37, 99, 235, 0.3)',
  textPrimary: isDark ? '#f1f5f9' : '#0f172a',
  textSecondary: isDark ? '#94a3b8' : '#475569',
  textMuted: isDark ? '#64748b' : '#64748b',
  cardShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)',
  // Accent colors remain constant across themes
  accentIndigo: '#2563eb',
  accentIndigoSoft: 'rgba(37, 99, 235, 0.15)',
  accentEmerald: '#10b981',
  accentEmeraldSoft: 'rgba(16, 185, 129, 0.15)',
  accentAmber: '#f59e0b',
  accentAmberSoft: 'rgba(245, 158, 11, 0.15)',
  accentRose: '#f43f5e',
  accentRoseSoft: 'rgba(244, 63, 94, 0.15)',
  accentCyan: '#06b6d4',
  accentCyanSoft: 'rgba(6, 182, 212, 0.15)',
  accentViolet: '#3b82f6',
  accentVioletSoft: 'rgba(59, 130, 246, 0.15)',
});

// =====================================================
// CATEGORY CONFIG (uses colors passed as parameter)
// =====================================================
const getCategoryConfigFn = (colors, type) => {
  const categoryConfig = {
    MATERIAL: {
      label: 'Material',
      color: colors.accentCyan,
      bgColor: colors.accentCyanSoft,
      borderColor: 'rgba(6, 182, 212, 0.2)',
    },
    SERVICO: {
      label: 'Serviço',
      color: colors.accentViolet,
      bgColor: colors.accentVioletSoft,
      borderColor: 'rgba(59, 130, 246, 0.2)',
    },
    MAO_OBRA: {
      label: 'Mão de Obra',
      color: colors.accentAmber,
      bgColor: colors.accentAmberSoft,
      borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    EQUIPAMENTO: {
      label: 'Equipamento',
      color: colors.accentEmerald,
      bgColor: colors.accentEmeraldSoft,
      borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    OPEX: {
      label: 'OPEX',
      color: colors.accentViolet,
      bgColor: colors.accentVioletSoft,
      borderColor: 'rgba(59, 130, 246, 0.2)',
    },
    CAPEX: {
      label: 'CAPEX',
      color: colors.accentCyan,
      bgColor: colors.accentCyanSoft,
      borderColor: 'rgba(6, 182, 212, 0.2)',
    },
  };
  return categoryConfig[type] || {
    label: type || 'Outros',
    color: colors.textMuted,
    bgColor: 'rgba(100, 116, 139, 0.15)',
    borderColor: 'rgba(100, 116, 139, 0.2)',
  };
};

// =====================================================
// STATUS CONFIG (uses colors passed as parameter)
// =====================================================
const getStatusConfigFn = (colors, status) => {
  const configs = {
    APROVADO: {
      label: 'Aprovado',
      color: colors.accentEmerald,
      bgColor: colors.accentEmeraldSoft,
      borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    PAGO: {
      label: 'Pago',
      color: colors.accentEmerald,
      bgColor: colors.accentEmeraldSoft,
      borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    REALIZADO: {
      label: 'Realizado',
      color: colors.accentEmerald,
      bgColor: colors.accentEmeraldSoft,
      borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    PREVISTO: {
      label: 'Previsto',
      color: colors.accentAmber,
      bgColor: colors.accentAmberSoft,
      borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    NAO_PREVISTO: {
      label: 'Não Previsto',
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.15)',
      borderColor: 'rgba(249, 115, 22, 0.2)',
    },
    PENDENTE: {
      label: 'Pendente',
      color: colors.accentAmber,
      bgColor: colors.accentAmberSoft,
      borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    CANCELADO: {
      label: 'Cancelado',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    RETURNED: {
      label: 'Devolvido p/ Ajuste',
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.15)',
      borderColor: 'rgba(249, 115, 22, 0.2)',
    },
    AGUARDANDO_APROVACAO: {
      label: 'Aguardando Aprovação',
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.15)',
      borderColor: 'rgba(59, 130, 246, 0.2)',
    },
  };
  return configs[status] || configs.PREVISTO;
};

// =====================================================
// KPI CARD COMPONENT (receives colors as prop)
// =====================================================
const KPICard = ({ icon: Icon, label, value, subtitle, colorType = 'indigo', changeText, changePositive, colors }) => {
  const colorMap = {
    indigo: {
      gradient: 'linear-gradient(90deg, #2563eb, #3b82f6)',
      soft: colors.accentIndigoSoft,
      main: colors.accentIndigo,
      hoverBorder: 'rgba(37, 99, 235, 0.3)',
    },
    rose: {
      gradient: 'linear-gradient(90deg, #3b82f6, #f43f5e)',
      soft: colors.accentRoseSoft,
      main: colors.accentRose,
      hoverBorder: 'rgba(244, 63, 94, 0.3)',
    },
    emerald: {
      gradient: 'linear-gradient(90deg, #10b981, #06b6d4)',
      soft: colors.accentEmeraldSoft,
      main: colors.accentEmerald,
      hoverBorder: 'rgba(16, 185, 129, 0.3)',
    },
    amber: {
      gradient: 'linear-gradient(90deg, #f59e0b, #f43f5e)',
      soft: colors.accentAmberSoft,
      main: colors.accentAmber,
      hoverBorder: 'rgba(245, 158, 11, 0.3)',
    },
  };

  const c = colorMap[colorType];

  return (
    <Box
      sx={{
        background: colors.bgCard,
        border: `1px solid ${colors.borderSubtle}`,
        borderRadius: '8px',
        p: 3,
        boxShadow: colors.cardShadow,
        display: 'flex',
        alignItems: 'center',
        gap: 2.5,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: c.gradient,
          opacity: 0,
          transition: 'opacity 0.3s',
        },
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: c.hoverBorder,
          boxShadow: '0 0 40px rgba(37, 99, 235, 0.1)',
          '&::before': { opacity: 1 },
        },
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '8px',
          background: c.soft,
          color: c.main,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon />
      </Box>
      <Box>
        <Typography sx={{ fontSize: 13, color: colors.textMuted, mb: 0.5 }}>{label}</Typography>
        <Typography sx={{ fontSize: 26, fontWeight: 700, color: colors.textPrimary, fontFamily: 'monospace' }}>
          {value}
        </Typography>
        {changeText && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            {changePositive !== undefined && (
              changePositive ? (
                <CheckCircle sx={{ fontSize: 14, color: colors.accentEmerald }} />
              ) : (
                <TrendingUp sx={{ fontSize: 14, color: colors.accentRose }} />
              )
            )}
            <Typography sx={{ fontSize: 12, color: changePositive ? colors.accentEmerald : (changePositive === false ? colors.accentRose : colors.textMuted) }}>
              {changeText}
            </Typography>
          </Box>
        )}
        {subtitle && !changeText && (
          <Typography sx={{ fontSize: 12, color: colors.textMuted, mt: 0.5 }}>{subtitle}</Typography>
        )}
      </Box>
    </Box>
  );
};

// =====================================================
// BUDGET PROGRESS CARD (receives colors as prop)
// =====================================================
const BudgetProgressCard = ({ totalBudget, usedAmount, committedAmount, formatCurrency, colors, isDark }) => {
  const available = totalBudget - usedAmount - committedAmount;
  const usagePercent = totalBudget > 0 ? ((usedAmount / totalBudget) * 100).toFixed(1) : 0;

  return (
    <Paper
      elevation={0}
      sx={{
        background: colors.bgCard,
        border: `1px solid ${colors.borderSubtle}`,
        borderRadius: '8px',
        p: 3.5,
        mb: 4,
        boxShadow: colors.cardShadow,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Analytics sx={{ color: colors.accentIndigo }} />
        <Typography sx={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary }}>
          Consumo do Orçamento
        </Typography>
      </Box>

      {/* Progress Bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography sx={{ fontSize: 14, color: colors.textSecondary }}>
            Utilização do orçamento
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>
            {usagePercent}% utilizado
          </Typography>
        </Box>
        <Box
          sx={{
            height: 16,
            background: colors.bgTertiary,
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${Math.min(usagePercent, 100)}%`,
              background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
              borderRadius: '8px',
              transition: 'width 1s ease',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                animation: 'shimmer 2s infinite',
              },
              '@keyframes shimmer': {
                '0%': { transform: 'translateX(-100%)' },
                '100%': { transform: 'translateX(100%)' },
              },
            }}
          />
        </Box>
      </Box>

      {/* Breakdown */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            background: colors.bgTertiary,
            borderRadius: '8px',
          }}
        >
          <Box sx={{ width: 12, height: 12, borderRadius: '8px', background: colors.accentViolet, flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 12, color: colors.textMuted, mb: 0.25 }}>Realizado</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>{formatCurrency(usedAmount)}</Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            background: colors.bgTertiary,
            borderRadius: '8px',
          }}
        >
          <Box sx={{ width: 12, height: 12, borderRadius: '8px', background: colors.accentAmber, flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 12, color: colors.textMuted, mb: 0.25 }}>Comprometido</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>{formatCurrency(committedAmount)}</Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            background: colors.bgTertiary,
            borderRadius: '8px',
          }}
        >
          <Box sx={{ width: 12, height: 12, borderRadius: '8px', background: colors.accentEmerald, flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 12, color: colors.textMuted, mb: 0.25 }}>Disponível</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>{formatCurrency(available)}</Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

// =====================================================
// DISTRIBUTION CARD (Donut Chart) - receives colors as prop
// =====================================================
const DistributionCard = ({ expenses, formatCurrency, colors, isDark }) => {
  // Agrupar por categoria
  const categoryData = useMemo(() => {
    const grouped = {};
    let total = 0;

    // Filtrar apenas custos aprovados/realizados (excluir cancelados e pendentes)
    const approvedExpenses = expenses.filter(exp =>
      exp.status === 'APROVADO' || exp.status === 'PAGO' || exp.status === 'REALIZADO'
    );

    approvedExpenses.forEach((exp) => {
      const cat = exp.type || 'OUTROS';
      if (!grouped[cat]) {
        grouped[cat] = 0;
      }
      grouped[cat] += Number(exp.amount) || 0;
      total += Number(exp.amount) || 0;
    });

    // Converter para array com percentuais
    const entries = Object.entries(grouped).map(([key, value]) => ({
      category: key,
      value,
      percent: total > 0 ? ((value / total) * 100).toFixed(0) : 0,
      config: getCategoryConfigFn(colors, key),
    }));

    // Ordenar por valor (maior primeiro)
    entries.sort((a, b) => b.value - a.value);

    return { entries, total };
  }, [expenses, colors]);

  // Gerar conic-gradient
  const donutGradient = useMemo(() => {
    if (categoryData.entries.length === 0) return isDark ? '#1c2632' : '#f1f5f9';

    let currentDeg = 0;
    const segments = [];

    categoryData.entries.forEach((item) => {
      const percent = parseFloat(item.percent);
      const startDeg = currentDeg;
      const endDeg = currentDeg + (percent * 3.6); // 360deg / 100%
      segments.push(`${item.config.color} ${startDeg}deg ${endDeg}deg`);
      currentDeg = endDeg;
    });

    return `conic-gradient(${segments.join(', ')})`;
  }, [categoryData]);

  if (expenses.length === 0) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        background: colors.bgCard,
        border: `1px solid ${colors.borderSubtle}`,
        borderRadius: '8px',
        p: 3.5,
        mt: 4,
        boxShadow: colors.cardShadow,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <PieChart sx={{ color: colors.accentIndigo }} />
        <Typography sx={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary }}>
          Distribuição por Categoria
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
        }}
      >
        {/* Donut Chart */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              width: 200,
              height: 200,
              borderRadius: '8px',
              background: donutGradient,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 120,
                height: 120,
                background: isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : colors.bgSecondary,
                borderRadius: '8px',
              },
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                zIndex: 1,
              }}
            >
              <Typography sx={{ fontSize: 24, fontWeight: 700, color: colors.textPrimary }}>
                {categoryData.entries.length}
              </Typography>
              <Typography sx={{ fontSize: 12, color: colors.textMuted }}>Categorias</Typography>
            </Box>
          </Box>
        </Box>

        {/* Legend */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {categoryData.entries.map((item) => (
            <Box
              key={item.category}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                background: colors.bgTertiary,
                borderRadius: '8px',
              }}
            >
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '8px',
                  background: item.config.color,
                  flexShrink: 0,
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>
                  {item.config.label}
                </Typography>
                <Typography sx={{ fontSize: 12, color: colors.textMuted }}>
                  {formatCurrency(item.value)}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary }}>
                {item.percent}%
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};

// =====================================================
// SUPPLIER DISTRIBUTION CARD
// =====================================================
const supplierColors = [
  '#2563eb', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16'
];

const SupplierDistributionCard = ({ expenses, formatCurrency, colors, isDark }) => {
  // Agrupar por fornecedor
  const supplierData = useMemo(() => {
    const grouped = {};
    let total = 0;

    // Filtrar apenas custos aprovados/realizados
    const approvedExpenses = expenses.filter(exp =>
      exp.status === 'APROVADO' || exp.status === 'PAGO' || exp.status === 'REALIZADO'
    );

    approvedExpenses.forEach((exp) => {
      const supplierId = exp.supplierId || 'SEM_FORNECEDOR';
      const supplierName = exp.supplier?.name || 'Sem Fornecedor';

      if (!grouped[supplierId]) {
        grouped[supplierId] = { name: supplierName, value: 0 };
      }
      grouped[supplierId].value += Number(exp.amount) || 0;
      total += Number(exp.amount) || 0;
    });

    // Converter para array com percentuais
    const entries = Object.entries(grouped).map(([key, data], index) => ({
      supplierId: key,
      name: data.name,
      value: data.value,
      percent: total > 0 ? ((data.value / total) * 100).toFixed(1) : 0,
      color: supplierColors[index % supplierColors.length],
    }));

    // Ordenar por valor (maior primeiro)
    entries.sort((a, b) => b.value - a.value);

    return { entries, total };
  }, [expenses]);

  // Gerar conic-gradient para o donut chart
  const donutGradient = useMemo(() => {
    if (supplierData.entries.length === 0) return isDark ? '#1c2632' : '#f1f5f9';

    let currentDeg = 0;
    const segments = [];

    supplierData.entries.forEach((item) => {
      const percent = parseFloat(item.percent);
      const startDeg = currentDeg;
      const endDeg = currentDeg + (percent * 3.6);
      segments.push(`${item.color} ${startDeg}deg ${endDeg}deg`);
      currentDeg = endDeg;
    });

    return `conic-gradient(${segments.join(', ')})`;
  }, [supplierData]);

  if (supplierData.entries.length === 0) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        background: colors.bgCard,
        border: `1px solid ${colors.borderSubtle}`,
        borderRadius: '8px',
        p: 3.5,
        mt: 3,
        boxShadow: colors.cardShadow,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <AccountBalanceWallet sx={{ color: colors.accentViolet }} />
        <Typography sx={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary }}>
          Custo por Fornecedor
        </Typography>
        <Chip
          label={`${supplierData.entries.length} fornecedores`}
          size="small"
          sx={{
            ml: 'auto',
            background: colors.accentVioletSoft,
            color: colors.accentViolet,
            fontWeight: 500,
            fontSize: 11,
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
        }}
      >
        {/* Donut Chart */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              width: 200,
              height: 200,
              borderRadius: '8px',
              background: donutGradient,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 120,
                height: 120,
                background: isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : colors.bgSecondary,
                borderRadius: '8px',
              },
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                zIndex: 1,
              }}
            >
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary }}>
                {formatCurrency(supplierData.total)}
              </Typography>
              <Typography sx={{ fontSize: 11, color: colors.textMuted }}>Total Realizado</Typography>
            </Box>
          </Box>
        </Box>

        {/* Legend - Lista de Fornecedores */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 220, overflowY: 'auto' }}>
          {supplierData.entries.map((item) => (
            <Box
              key={item.supplierId}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                background: colors.bgTertiary,
                borderRadius: '8px',
                border: `1px solid ${colors.borderSubtle}`,
              }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '8px',
                  background: item.color,
                  flexShrink: 0,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: colors.textPrimary,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.name}
                </Typography>
                <Typography sx={{ fontSize: 11, color: colors.textMuted }}>
                  {formatCurrency(item.value)}
                </Typography>
              </Box>
              <Chip
                label={`${item.percent}%`}
                size="small"
                sx={{
                  background: `${item.color}20`,
                  color: item.color,
                  fontWeight: 600,
                  fontSize: 11,
                  minWidth: 50,
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};

// =====================================================
// MAIN COMPONENT
// =====================================================
const ProjectCosts = ({ projectId, budget, projectName, onProjectUpdate }) => {
  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';
  const colors = getColors(isDark);
  const getCategoryConfig = (type) => getCategoryConfigFn(colors, type);
  const getStatusConfig = (status) => getStatusConfigFn(colors, status);

  const [expenses, setExpenses] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const fetchData = async () => {
    try {
      const costsData = await getProjectCosts(projectId);
      setExpenses(costsData);
    } catch (e) {
      console.error(e);
      enqueueSnackbar('Erro ao carregar dados financeiros.', { variant: 'error' });
    }
  };

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const handleOpenCreate = () => {
    setEditingExpense(null);
    setOpen(true);
  };

  const handleOpenEdit = (exp) => {
    setEditingExpense(exp);
    setOpen(true);
  };

  const handleDelete = (expense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteProjectCost(projectId, expenseToDelete.id);
      fetchData();
      enqueueSnackbar('Custo excluído', { variant: 'success' });
      if (onProjectUpdate) onProjectUpdate();
    } catch (e) {
      enqueueSnackbar('Erro ao excluir', { variant: 'error' });
    } finally {
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    }
  };

  const handleSubmitForApproval = async (id) => {
    try {
      await submitCostForApproval(projectId, id, {});
      enqueueSnackbar('Custo submetido para aprovação!', { variant: 'success' });
      fetchData();
      if (onProjectUpdate) onProjectUpdate();
    } catch (e) {
      console.error(e);
      const errorMessage = e.response?.data?.message || 'Erro ao submeter custo para aprovação.';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleSave = async (data) => {
    try {
      if (editingExpense) {
        await updateProjectCost(projectId, editingExpense.id, data);
        enqueueSnackbar('Custo atualizado com sucesso!', { variant: 'success' });
      } else {
        await createProjectCost(projectId, data);
        enqueueSnackbar('Custo lançado com sucesso!', { variant: 'success' });
      }

      setOpen(false);
      fetchData();
      if (onProjectUpdate) onProjectUpdate();
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Erro ao salvar custo.', { variant: 'error' });
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // Cálculo de KPIs financeiros
  const totalBudget = Number(budget) || 0;
  // Custos realizados/pagos (efetivamente gastos)
  const approvedExpenses = expenses
    .filter((exp) => exp.status === 'APROVADO' || exp.status === 'PAGO' || exp.status === 'REALIZADO')
    .reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
  // Custos pendentes de aprovação
  const pendingExpenses = expenses
    .filter((exp) => exp.status === 'PREVISTO' || exp.status === 'NAO_PREVISTO' || exp.status === 'PENDENTE' || exp.status === 'AGUARDANDO_APROVACAO' || exp.status === 'RETURNED')
    .reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
  const pendingCount = expenses.filter((exp) => exp.status === 'PREVISTO' || exp.status === 'NAO_PREVISTO' || exp.status === 'PENDENTE' || exp.status === 'AGUARDANDO_APROVACAO' || exp.status === 'RETURNED').length;
  const savings = totalBudget - approvedExpenses;
  const savingsPercentage = totalBudget > 0 ? ((savings / totalBudget) * 100).toFixed(1) : 0;
  const usagePercent = totalBudget > 0 ? ((approvedExpenses / totalBudget) * 100).toFixed(1) : 0;

  // Filtrar expenses
  const filteredExpenses = useMemo(() => {
    if (!searchTerm) return expenses;
    const term = searchTerm.toLowerCase();
    return expenses.filter(
      (exp) =>
        exp.description?.toLowerCase().includes(term) ||
        exp.invoiceNumber?.toLowerCase().includes(term) ||
        exp.supplier?.name?.toLowerCase().includes(term) ||
        exp.type?.toLowerCase().includes(term)
    );
  }, [expenses, searchTerm]);

  return (
    <Box sx={{ animation: 'fadeInUp 0.5s ease', '@keyframes fadeInUp': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
      {/* KPI Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 2.5,
          mb: 4,
        }}
      >
        <KPICard
          icon={AccountBalanceWallet}
          label="Orçamento Total"
          value={formatCurrency(totalBudget)}
          colorType="indigo"
          colors={colors}
        />
        <KPICard
          icon={TrendingDown}
          label="Custo Realizado"
          value={formatCurrency(approvedExpenses)}
          colorType="rose"
          changeText={`${usagePercent}% do orçamento`}
          changePositive={false}
          colors={colors}
        />
        <KPICard
          icon={Savings}
          label="Saldo Disponível"
          value={formatCurrency(savings)}
          colorType="emerald"
          changeText={`${savingsPercentage}% restante`}
          changePositive={true}
          colors={colors}
        />
        <KPICard
          icon={HourglassEmpty}
          label="Pendente Aprovação"
          value={formatCurrency(pendingExpenses)}
          colorType="amber"
          changeText={`${pendingCount} itens aguardando`}
          colors={colors}
        />
      </Box>

      {/* Budget Progress Card */}
      <BudgetProgressCard
        totalBudget={totalBudget}
        usedAmount={approvedExpenses}
        committedAmount={pendingExpenses}
        formatCurrency={formatCurrency}
        colors={colors}
        isDark={isDark}
      />

      {/* Costs Table */}
      <Paper
        elevation={0}
        sx={{
          background: colors.bgCard,
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            borderBottom: `1px solid ${colors.borderSubtle}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ReceiptLong sx={{ color: colors.accentIndigo }} />
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary }}>
              Lançamentos de Custos
            </Typography>
          </Box>
        </Box>

        {/* Toolbar */}
        <Box
          sx={{
            p: 2.5,
            borderBottom: `1px solid ${colors.borderSubtle}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1.25,
                background: colors.bgTertiary,
                border: `1px solid ${colors.borderSubtle}`,
                borderRadius: '8px',
                width: 280,
              }}
            >
              <Search sx={{ color: colors.textMuted, fontSize: 20 }} />
              <TextField
                variant="standard"
                placeholder="Buscar custo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{ disableUnderline: true }}
                sx={{
                  flex: 1,
                  '& .MuiInputBase-input': {
                    color: colors.textPrimary,
                    fontSize: 14,
                    '&::placeholder': { color: colors.textMuted, opacity: 1 },
                  },
                }}
              />
            </Box>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              sx={{
                background: colors.bgTertiary,
                border: `1px solid ${colors.borderSubtle}`,
                borderRadius: '8px',
                color: colors.textSecondary,
                textTransform: 'none',
                px: 2,
                py: 1.25,
                '&:hover': {
                  background: 'linear-gradient(145deg, #1e2835 0%, #19212b 100%)',
                  color: colors.textPrimary,
                  borderColor: colors.borderSubtle,
                },
              }}
            >
              Filtros
            </Button>
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
              px: 2.5,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)',
              },
            }}
          >
            Novo Custo
          </Button>
        </Box>

        {/* Table */}
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow
                sx={{
                  background: colors.bgTertiary,
                  '& th': {
                    fontWeight: 600,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: colors.textMuted,
                    py: 1.75,
                    borderBottom: `1px solid ${colors.borderSubtle}`,
                  },
                }}
              >
                <TableCell>ID</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Data</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredExpenses.map((exp, index) => {
                const statusConfig = getStatusConfig(exp.status);
                const catConfig = getCategoryConfig(exp.type);
                const costId = `#CST-${String(index + 1).padStart(3, '0')}`;

                return (
                  <TableRow
                    key={exp.id}
                    sx={{
                      '&:hover': { background: 'rgba(37, 99, 235, 0.05)' },
                      '& td': {
                        py: 2,
                        fontSize: 14,
                        borderBottom: `1px solid ${colors.borderSubtle}`,
                        color: colors.textSecondary,
                      },
                    }}
                  >
                    <TableCell>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: colors.textMuted }}>
                        {costId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 500, color: colors.textPrimary }}>{exp.description}</Typography>
                      {exp.invoiceNumber && (
                        <Typography sx={{ fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' }}>
                          NF: {exp.invoiceNumber}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={catConfig.label}
                        size="small"
                        sx={{
                          background: catConfig.bgColor,
                          color: catConfig.color,
                          border: `1px solid ${catConfig.borderColor}`,
                          fontWeight: 500,
                          fontSize: 12,
                          borderRadius: '8px',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: colors.textPrimary }}>
                      {format(new Date(exp.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 600, fontFamily: 'monospace', color: colors.textPrimary }}>
                        {formatCurrency(exp.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusConfig.label}
                        size="small"
                        sx={{
                          background: statusConfig.bgColor,
                          color: statusConfig.color,
                          border: `1px solid ${statusConfig.borderColor}`,
                          fontWeight: 600,
                          fontSize: 11,
                          textTransform: 'uppercase',
                          borderRadius: '8px',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {exp.fileUrl && (
                          <Tooltip title="Ver Anexo">
                            <IconButton
                              size="small"
                              href={getFileURL(exp.fileUrl)}
                              target="_blank"
                              sx={{ color: colors.textMuted, '&:hover': { background: colors.bgTertiary, color: colors.textPrimary } }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(exp.status === 'PREVISTO' || exp.status === 'NAO_PREVISTO' || exp.status === 'RETURNED') && (
                          <Tooltip title={exp.status === 'RETURNED' ? 'Reenviar para Aprovação' : 'Submeter para Aprovação'}>
                            <IconButton
                              size="small"
                              onClick={() => handleSubmitForApproval(exp.id)}
                              sx={{ color: colors.textMuted, '&:hover': { background: colors.bgTertiary, color: colors.accentAmber } }}
                            >
                              <PendingActions fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {/* Bloquear edição/exclusão para custos aprovados */}
                        {!['APROVADO', 'REALIZADO', 'PAGO'].includes(exp.status) && (
                          <>
                            <Tooltip title="Editar">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEdit(exp)}
                                sx={{ color: colors.textMuted, '&:hover': { background: colors.bgTertiary, color: colors.textPrimary } }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(exp)}
                                sx={{ color: colors.textMuted, '&:hover': { background: colors.bgTertiary, color: colors.accentRose } }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '8px',
                          background: colors.accentIndigoSoft,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 3,
                        }}
                      >
                        <ReceiptLong sx={{ fontSize: 40, color: colors.accentIndigo }} />
                      </Box>
                      <Typography sx={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary, mb: 1 }}>
                        Nenhum custo cadastrado
                      </Typography>
                      <Typography sx={{ fontSize: 14, color: colors.textMuted, maxWidth: 360, textAlign: 'center', mb: 3 }}>
                        Comece adicionando os custos do projeto para acompanhar o orçamento e as despesas.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleOpenCreate}
                        sx={{
                          background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontWeight: 600,
                          px: 3,
                        }}
                      >
                        Lançar Primeiro Custo
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Distribution Card */}
      <DistributionCard expenses={expenses} formatCurrency={formatCurrency} colors={colors} isDark={isDark} />

      {/* Supplier Distribution Card */}
      <SupplierDistributionCard expenses={expenses} formatCurrency={formatCurrency} colors={colors} isDark={isDark} />

      {/* Modal */}
      <ExpenseModal
        open={open}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        projectId={projectId}
        projectName={projectName}
        expense={editingExpense}
        isProjectContext={true}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Excluir Lançamento"
        content={`Deseja realmente excluir o lançamento "${expenseToDelete?.description || ''}"? Esta ação não pode ser desfeita.`}
        onConfirm={confirmDelete}
        onClose={() => { setDeleteDialogOpen(false); setExpenseToDelete(null); }}
        confirmText="Excluir"
        cancelText="Cancelar"
        confirmColor="error"
        variant="danger"
      />
    </Box>
  );
};

export default ProjectCosts;
