import React, { useState, useEffect, useMemo, forwardRef } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  TextField,
  InputAdornment,
  Slide,
  useTheme,
  Stack,
  Card,
  CardActionArea,
  IconButton,
  LinearProgress,
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ticketService from '../../services/ticket.service';
import serviceCatalogService from '../../services/service-catalog.service';
import { getAssets } from '../../services/asset.service';
import KnowledgeBaseService from '../../services/knowledge-base.service';
import { getActiveSupportGroups } from '../../services/support-group.service';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SearchIcon from '@mui/icons-material/Search';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

import StandardModal from '../../components/common/StandardModal';
import FilterDrawer from '../../components/common/FilterDrawer';
import StatsCard from '../../components/common/StatsCard';
import KpiGrid from '../../components/common/KpiGrid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  TicketStatus,
  getTicketStatusLabel,
  stripTicketTitleStatusSuffix,
  TICKET_STATUS_CHIP_COLOR,
  TICKET_STATUS_LABEL_PT,
  getTicketStatusSortIndex,
  getTicketStatusThemeColor
} from '../../constants/ticketStatus';

const DEFAULT_PORTAL_FILTERS = { status: 'ALL', serviceId: '', categoryId: '' };

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const PortalPage = () => {
  const [tickets, setTickets] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState('category');
  const [wizardCategoryId, setWizardCategoryId] = useState(null);
  const [wizardSearch, setWizardSearch] = useState('');

  const theme = useTheme();
  const mode = theme.palette.mode;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [relatedAssetId, setRelatedAssetId] = useState('');
  const [creating, setCreating] = useState(false);
  const [suggestedArticles, setSuggestedArticles] = useState([]);
  const [customAnswers, setCustomAnswers] = useState({});
  const [formSchemaFields, setFormSchemaFields] = useState([]);
  const [supportGroups, setSupportGroups] = useState([]);
  const [supportGroupId, setSupportGroupId] = useState('');

  const [listSearch, setListSearch] = useState('');
  const [appliedFilters, setAppliedFilters] = useState(() => ({ ...DEFAULT_PORTAL_FILTERS }));
  const [draftFilters, setDraftFilters] = useState(() => ({ ...DEFAULT_PORTAL_FILTERS }));
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (title.length > 3) {
      const timer = setTimeout(async () => {
        try {
          const res = await KnowledgeBaseService.findAll({ search: title });
          setSuggestedArticles(res.articles || res || []);
        } catch (err) {
          console.error('Erro na deflexão de FAQ', err);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    setSuggestedArticles([]);
  }, [title]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ticketsRes, servicesRes, categoriesRes, assetsRes, groupsRes] = await Promise.all([
        ticketService.getAll().catch((e) => {
          console.error('Tickets fail', e);
          return [];
        }),
        serviceCatalogService.getAll().catch((e) => {
          console.error('Catalog fail', e);
          return [];
        }),
        serviceCatalogService.getCategories().catch((e) => {
          console.error('Categ fail', e);
          return [];
        }),
        getAssets().catch((e) => {
          console.error('Assets fail', e);
          return [];
        }),
        getActiveSupportGroups().catch(() => [])
      ]);
      setTickets(ticketsRes);
      setServices(servicesRes);
      setCategories(categoriesRes);
      setAssets(assetsRes);
      setSupportGroups(Array.isArray(groupsRes) ? groupsRes : []);
    } catch (err) {
      console.error('Error fetching portal data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicket = (svc) => {
    setSelectedService(svc);
    setTitle(`Solicitação: ${svc.name}`);
    setDescription('');
    setRelatedAssetId('');
    setSupportGroupId('');
    setCustomAnswers({});

    let parsedFields = [];
    if (svc.formSchema) {
      try {
        parsedFields = typeof svc.formSchema === 'string' ? JSON.parse(svc.formSchema) : svc.formSchema;
        if (!Array.isArray(parsedFields)) parsedFields = [];
      } catch (e) {
        parsedFields = [];
      }
    }
    setFormSchemaFields(parsedFields);

    setModalOpen(true);
  };

  const handleSubmit = async () => {
    for (const field of formSchemaFields) {
      if (field.required && !customAnswers[field.id]) {
        return alert(`O campo "${field.label}" é obrigatório preencher.`);
      }
    }

    try {
      setCreating(true);
      await ticketService.create({
        title,
        description,
        categoryId: selectedService.categoryId,
        serviceId: selectedService.id,
        relatedAssetId: relatedAssetId || null,
        customAnswers,
        supportGroupId: supportGroupId || undefined
      });
      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao abrir chamado.');
    } finally {
      setCreating(false);
    }
  };

  const categoryIdsInCatalog = useMemo(() => new Set(categories.map((c) => c.id)), [categories]);

  const wizardCategoryRows = useMemo(() => {
    const rows = categories.map((c) => ({
      id: c.id,
      name: c.name,
      count: services.filter((s) => s.categoryId === c.id).length
    }));
    const orphan = services.filter(
      (s) => !s.categoryId || !categoryIdsInCatalog.has(s.categoryId)
    );
    if (orphan.length) {
      rows.push({ id: '__other', name: 'Demais serviços', count: orphan.length });
    }
    return rows
      .filter((r) => r.count > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [categories, services, categoryIdsInCatalog]);

  const wizardServices = useMemo(() => {
    const q = wizardSearch.trim().toLowerCase();
    let list = services;
    if (wizardCategoryId === '__other') {
      list = services.filter(
        (s) => !s.categoryId || !categoryIdsInCatalog.has(s.categoryId)
      );
    } else if (wizardCategoryId) {
      list = services.filter((s) => s.categoryId === wizardCategoryId);
    }
    if (!q) return list;
    return list.filter((s) => {
      const name = (s.name || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [services, wizardCategoryId, wizardSearch, categoryIdsInCatalog]);

  const wizardCategoryLabel = useMemo(() => {
    if (!wizardCategoryId) return '';
    const row = wizardCategoryRows.find((r) => r.id === wizardCategoryId);
    return row?.name || '';
  }, [wizardCategoryId, wizardCategoryRows]);

  const openWizard = () => {
    setWizardOpen(true);
    setWizardStep('category');
    setWizardCategoryId(null);
    setWizardSearch('');
  };

  const handleWizardClose = () => {
    setWizardOpen(false);
    setWizardStep('category');
    setWizardCategoryId(null);
    setWizardSearch('');
  };

  const pickWizardCategory = (id) => {
    setWizardCategoryId(id);
    setWizardStep('service');
    setWizardSearch('');
  };

  const selectServiceFromWizard = (svc) => {
    setWizardOpen(false);
    setWizardStep('category');
    setWizardCategoryId(null);
    setWizardSearch('');
    handleOpenTicket(svc);
  };

  const portalKpis = useMemo(() => {
    const list = tickets;
    return {
      total: list.length,
      open: list.filter((t) => t.status === TicketStatus.OPEN).length,
      inProgress: list.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
      waiting: list.filter((t) => t.status === TicketStatus.WAITING_USER).length,
      resolved: list.filter((t) => t.status === TicketStatus.RESOLVED).length,
      closed: list.filter((t) => t.status === TicketStatus.CLOSED).length
    };
  }, [tickets]);

  const ticketServiceOptions = useMemo(() => {
    const map = new Map();
    tickets.forEach((t) => {
      if (t.service?.id) {
        map.set(t.service.id, t.service.name || String(t.service.id));
      }
    });
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
      .map(([id, name]) => ({ id, name }));
  }, [tickets]);

  const ticketCategoryOptions = useMemo(() => {
    const map = new Map();
    tickets.forEach((t) => {
      const cid = t.service?.categoryId;
      if (!cid) return;
      const name =
        t.service?.category?.name ||
        categories.find((c) => c.id === cid)?.name ||
        cid;
      map.set(cid, name);
    });
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
      .map(([id, name]) => ({ id, name }));
  }, [tickets, categories]);

  const filteredTickets = useMemo(() => {
    let list = tickets;
    const { status, serviceId, categoryId } = appliedFilters;
    if (status !== 'ALL') {
      list = list.filter((t) => t.status === status);
    }
    if (serviceId) {
      list = list.filter((t) => t.service?.id === serviceId);
    }
    if (categoryId) {
      list = list.filter((t) => t.service?.categoryId === categoryId);
    }
    const q = listSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const code = (t.code || '').toLowerCase();
        const title = stripTicketTitleStatusSuffix(t.title || '').toLowerCase();
        const svc = (t.service?.name || '').toLowerCase();
        return code.includes(q) || title.includes(q) || svc.includes(q);
      });
    }
    return list;
  }, [tickets, appliedFilters, listSearch]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (appliedFilters.status !== 'ALL') n += 1;
    if (appliedFilters.serviceId) n += 1;
    if (appliedFilters.categoryId) n += 1;
    return n;
  }, [appliedFilters]);

  const hasListRefinement =
    activeFilterCount > 0 || Boolean(listSearch.trim());

  const openFilterDrawer = () => {
    setDraftFilters({ ...appliedFilters });
    setFilterDrawerOpen(true);
  };

  const applyFiltersFromDrawer = () => {
    setAppliedFilters({ ...draftFilters });
  };

  const clearDrawerFilters = () => {
    setDraftFilters({ ...DEFAULT_PORTAL_FILTERS });
  };

  const clearAllListRefinements = () => {
    setListSearch('');
    setAppliedFilters({ ...DEFAULT_PORTAL_FILTERS });
    setDraftFilters({ ...DEFAULT_PORTAL_FILTERS });
  };

  const applyKpiStatusFilter = (status) => {
    setAppliedFilters({ ...DEFAULT_PORTAL_FILTERS, status });
    setListSearch('');
  };

  useEffect(() => {
    setPage(0);
  }, [listSearch, appliedFilters]);

  const handleRequestSort = (property) => {
    if (orderBy === property) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(property);
      setOrder(property === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const sortedTickets = useMemo(() => {
    const list = [...filteredTickets];
    const mult = order === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let cmp = 0;
      switch (orderBy) {
        case 'code':
          cmp = String(a.code || '').localeCompare(String(b.code || ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
          break;
        case 'title':
          cmp = stripTicketTitleStatusSuffix(a.title || '').localeCompare(
            stripTicketTitleStatusSuffix(b.title || ''),
            'pt-BR',
            { sensitivity: 'base' }
          );
          break;
        case 'service':
          cmp = String(a.service?.name || '').localeCompare(String(b.service?.name || ''), 'pt-BR', {
            sensitivity: 'base'
          });
          break;
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'status': {
          const ia = getTicketStatusSortIndex(a.status);
          const ib = getTicketStatusSortIndex(b.status);
          cmp = ia - ib;
          if (cmp === 0) {
            cmp = String(a.code || '').localeCompare(String(b.code || ''), 'pt-BR', { numeric: true });
          }
          break;
        }
        default:
          cmp = 0;
      }
      return mult * cmp;
    });
    return list;
  }, [filteredTickets, orderBy, order]);

  const paginatedTickets = useMemo(
    () => sortedTickets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sortedTickets, page, rowsPerPage]
  );

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedTickets.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [sortedTickets.length, rowsPerPage, page]);

  if (loading) {
    return (
      <Box p={4} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
      {/* HERO */}
      <Box
        sx={{
          mb: 3,
          pt: 4,
          pb: 5,
          px: { xs: 2, sm: 4 },
          borderRadius: 1,
          textAlign: 'center',
          background:
            mode === 'dark'
              ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)'
              : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow:
            mode === 'dark' ? '0 10px 40px -10px rgba(0,0,0,0.5)' : '0 10px 40px -10px rgba(14,165,233,0.2)'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            left: -50,
            width: 250,
            height: 250,
            background: 'radial-gradient(circle, rgba(56,189,248,0.4) 0%, rgba(255,255,255,0) 70%)',
            filter: 'blur(30px)'
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -50,
            right: -50,
            width: 300,
            height: 300,
            background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(255,255,255,0) 70%)',
            filter: 'blur(40px)'
          }}
        />

        <Typography
          variant="h4"
          fontWeight="800"
          sx={{ mb: 1.5, color: mode === 'dark' ? '#f8fafc' : '#0f172a', letterSpacing: '-0.5px' }}
        >
          Olá, como podemos ajudar?
        </Typography>
        <Typography
          variant="body1"
          sx={{
            mb: 0,
            color: mode === 'dark' ? '#94a3b8' : '#475569',
            fontWeight: 400,
            maxWidth: '560px',
            mx: 'auto'
          }}
        >
          Acompanhe seus chamados abaixo. Para abrir uma nova solicitação, use o botão &quot;Novo ticket&quot; — você
          escolhe a categoria e o serviço em poucos passos.
        </Typography>
      </Box>

      <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 1.5 }}>
        Indicadores
      </Typography>
      <KpiGrid maxColumns={6} mb={3} clampChildHeight={false} gap={2}>
        <StatsCard
          title="Total"
          value={portalKpis.total}
          iconName="confirmation_number"
          hexColor={theme.palette.primary.main}
          titleLineClamp={2}
          active={
            appliedFilters.status === 'ALL' &&
            !appliedFilters.serviceId &&
            !appliedFilters.categoryId &&
            !listSearch.trim()
          }
          onClick={() => applyKpiStatusFilter('ALL')}
        />
        <StatsCard
          title={TICKET_STATUS_LABEL_PT[TicketStatus.OPEN]}
          value={portalKpis.open}
          iconName="fiber_new"
          hexColor={getTicketStatusThemeColor(theme, TicketStatus.OPEN)}
          titleLineClamp={2}
          active={appliedFilters.status === TicketStatus.OPEN}
          onClick={() => applyKpiStatusFilter(TicketStatus.OPEN)}
        />
        <StatsCard
          title={TICKET_STATUS_LABEL_PT[TicketStatus.IN_PROGRESS]}
          value={portalKpis.inProgress}
          iconName="pending_actions"
          hexColor={getTicketStatusThemeColor(theme, TicketStatus.IN_PROGRESS)}
          titleLineClamp={2}
          active={appliedFilters.status === TicketStatus.IN_PROGRESS}
          onClick={() => applyKpiStatusFilter(TicketStatus.IN_PROGRESS)}
        />
        <StatsCard
          title={TICKET_STATUS_LABEL_PT[TicketStatus.WAITING_USER]}
          value={portalKpis.waiting}
          iconName="hourglass_empty"
          hexColor={getTicketStatusThemeColor(theme, TicketStatus.WAITING_USER)}
          titleLineClamp={2}
          active={appliedFilters.status === TicketStatus.WAITING_USER}
          onClick={() => applyKpiStatusFilter(TicketStatus.WAITING_USER)}
        />
        <StatsCard
          title={TICKET_STATUS_LABEL_PT[TicketStatus.RESOLVED]}
          value={portalKpis.resolved}
          iconName="task_alt"
          hexColor={getTicketStatusThemeColor(theme, TicketStatus.RESOLVED)}
          titleLineClamp={2}
          active={appliedFilters.status === TicketStatus.RESOLVED}
          onClick={() => applyKpiStatusFilter(TicketStatus.RESOLVED)}
        />
        <StatsCard
          title={TICKET_STATUS_LABEL_PT[TicketStatus.CLOSED]}
          value={portalKpis.closed}
          iconName="lock"
          hexColor={getTicketStatusThemeColor(theme, TicketStatus.CLOSED)}
          titleLineClamp={2}
          active={appliedFilters.status === TicketStatus.CLOSED}
          onClick={() => applyKpiStatusFilter(TicketStatus.CLOSED)}
        />
      </KpiGrid>

      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: mode === 'dark' ? 'rgba(30,41,59,0.35)' : 'grey.50'
        }}
      >
        <Stack spacing={2}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por código, título ou serviço..."
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" fontSize="small" />
                </InputAdornment>
              )
            }}
            inputProps={{ 'aria-label': 'Buscar chamados' }}
          />
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            gap={1.5}
          >
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Badge color="primary" badgeContent={activeFilterCount} invisible={activeFilterCount === 0}>
                <Button
                  variant="outlined"
                  size="medium"
                  startIcon={<FilterAltIcon />}
                  onClick={openFilterDrawer}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Filtros
                </Button>
              </Badge>
              {hasListRefinement ? (
                <Button size="small" variant="text" onClick={clearAllListRefinements} sx={{ textTransform: 'none' }}>
                  Limpar tudo
                </Button>
              ) : null}
            </Stack>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={openWizard}
              sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 700 }}
            >
              Novo ticket
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={2} sx={{ mb: 2 }} flexWrap="wrap">
        <Typography variant="h5" fontWeight="700" sx={{ letterSpacing: '-0.5px' }}>
          Meus Chamados
          <Typography component="span" variant="body2" color="text.secondary" fontWeight={600} sx={{ ml: 1 }}>
            ({filteredTickets.length}
            {hasListRefinement && tickets.length !== filteredTickets.length
              ? ` de ${tickets.length}`
              : ''}
            )
          </Typography>
        </Typography>
      </Stack>

      <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 1 }}>
        <Table size="medium">
          <TableHead sx={{ bgcolor: 'grey.50' }}>
            <TableRow>
              <TableCell sortDirection={orderBy === 'code' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'code'}
                  direction={orderBy === 'code' ? order : 'asc'}
                  onClick={() => handleRequestSort('code')}
                >
                  Código
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === 'title' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'title'}
                  direction={orderBy === 'title' ? order : 'asc'}
                  onClick={() => handleRequestSort('title')}
                >
                  Título
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === 'service' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'service'}
                  direction={orderBy === 'service' ? order : 'asc'}
                  onClick={() => handleRequestSort('service')}
                >
                  Serviço
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === 'createdAt' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'createdAt'}
                  direction={orderBy === 'createdAt' ? order : 'asc'}
                  onClick={() => handleRequestSort('createdAt')}
                >
                  Data
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === 'status' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleRequestSort('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ width: 56 }}>
                Ação
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Você ainda não possui chamados. Use &quot;Novo ticket&quot; para abrir uma solicitação.
                </TableCell>
              </TableRow>
            ) : filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Nenhum chamado corresponde à busca ou aos filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              paginatedTickets.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{t.code}</TableCell>
                  <TableCell>{stripTicketTitleStatusSuffix(t.title)}</TableCell>
                  <TableCell>{t.service?.name || '-'}</TableCell>
                  <TableCell>{new Date(t.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <Chip
                      label={getTicketStatusLabel(t.status)}
                      color={TICKET_STATUS_CHIP_COLOR[t.status] ?? 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ width: 56 }}>
                    <IconButton
                      component={RouterLink}
                      to={`/portal/tickets/${t.id}`}
                      size="small"
                      color="primary"
                      aria-label="Ver chamado"
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {tickets.length > 0 && filteredTickets.length > 0 ? (
          <TablePagination
            component="div"
            count={sortedTickets.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Linhas por página"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          />
        ) : null}
      </TableContainer>

      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={applyFiltersFromDrawer}
        onClear={clearDrawerFilters}
        title="Filtros dos chamados"
      >
        <FormControl fullWidth size="small">
          <InputLabel id="portal-filter-status">Status</InputLabel>
          <Select
            labelId="portal-filter-status"
            label="Status"
            value={draftFilters.status}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value={TicketStatus.OPEN}>{TICKET_STATUS_LABEL_PT[TicketStatus.OPEN]}</MenuItem>
            <MenuItem value={TicketStatus.IN_PROGRESS}>{TICKET_STATUS_LABEL_PT[TicketStatus.IN_PROGRESS]}</MenuItem>
            <MenuItem value={TicketStatus.WAITING_USER}>{TICKET_STATUS_LABEL_PT[TicketStatus.WAITING_USER]}</MenuItem>
            <MenuItem value={TicketStatus.RESOLVED}>{TICKET_STATUS_LABEL_PT[TicketStatus.RESOLVED]}</MenuItem>
            <MenuItem value={TicketStatus.CLOSED}>{TICKET_STATUS_LABEL_PT[TicketStatus.CLOSED]}</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel id="portal-filter-service">Serviço</InputLabel>
          <Select
            labelId="portal-filter-service"
            label="Serviço"
            value={draftFilters.serviceId || ''}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, serviceId: e.target.value }))}
          >
            <MenuItem value="">Todos os serviços</MenuItem>
            {ticketServiceOptions.map((opt) => (
              <MenuItem key={opt.id} value={opt.id}>
                {opt.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel id="portal-filter-cat">Categoria</InputLabel>
          <Select
            labelId="portal-filter-cat"
            label="Categoria"
            value={draftFilters.categoryId || ''}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, categoryId: e.target.value }))}
          >
            <MenuItem value="">Todas as categorias</MenuItem>
            {ticketCategoryOptions.map((opt) => (
              <MenuItem key={opt.id} value={opt.id}>
                {opt.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FilterDrawer>

      <Dialog
        open={wizardOpen}
        onClose={handleWizardClose}
        maxWidth="md"
        fullWidth
        TransitionComponent={Transition}
        aria-labelledby="portal-wizard-title"
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
            backgroundImage: 'none',
            border: 1,
            borderColor: 'divider',
            boxShadow: mode === 'dark' ? 24 : '0 25px 50px -12px rgba(15, 23, 42, 0.18)'
          }
        }}
      >
        <Box
          sx={{
            background:
              mode === 'dark'
                ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)'
                : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            color: mode === 'dark' ? '#f8fafc' : '#0f172a'
          }}
        >
          <LinearProgress
            variant="determinate"
            value={wizardStep === 'category' ? 45 : 100}
            sx={{
              height: 3,
              borderRadius: 0,
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)',
              '& .MuiLinearProgress-bar': { borderRadius: 0, bgcolor: 'primary.main' }
            }}
          />
          <Stack direction="row" alignItems="flex-start" sx={{ px: 2.5, py: 2.5, gap: 1 }}>
            {wizardStep === 'service' && (
              <IconButton
                onClick={() => {
                  setWizardStep('category');
                  setWizardCategoryId(null);
                  setWizardSearch('');
                }}
                aria-label="Voltar para categorias"
                sx={{
                  mt: 0.25,
                  color: 'inherit',
                  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)',
                  '&:hover': { bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.85)' }
                }}
              >
                <ArrowBackIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1.2, fontWeight: 600 }}>
                {wizardStep === 'category' ? 'Passo 1 de 2' : 'Passo 2 de 2'}
              </Typography>
              <Typography id="portal-wizard-title" variant="h5" fontWeight={800} sx={{ lineHeight: 1.25, mt: 0.25 }}>
                {wizardStep === 'category' ? 'Novo chamado' : wizardCategoryLabel}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  opacity: mode === 'dark' ? 0.88 : 0.92,
                  maxWidth: 520
                }}
              >
                {wizardStep === 'category'
                  ? 'Escolha uma categoria para ver os serviços disponíveis.'
                  : 'Selecione o serviço. Você poderá descrever o pedido no próximo passo.'}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
          {wizardStep === 'category' && (
            <>
              {wizardCategoryRows.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma categoria com serviços disponível no momento.
                  </Typography>
                </Paper>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                    gap: 1.5
                  }}
                >
                  {wizardCategoryRows.map((row) => (
                    <Card
                      key={row.id}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        borderColor: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'divider',
                        transition: 'transform 0.15s, box-shadow 0.2s, border-color 0.2s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: 2,
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      <CardActionArea
                        onClick={() => pickWizardCategory(row.id)}
                        aria-label={`Categoria ${row.name}, ${row.count} serviço${row.count !== 1 ? 's' : ''}`}
                        sx={{ p: 2, alignItems: 'stretch', display: 'block' }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 1.5,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: mode === 'dark' ? 'rgba(56,189,248,0.14)' : 'primary.main',
                              color: mode === 'dark' ? 'primary.light' : 'primary.contrastText'
                            }}
                          >
                            <FolderOpenIcon />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.25 }}>
                              {row.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              {row.count} serviço{row.count !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                          <ChevronRightIcon sx={{ color: 'action.active', flexShrink: 0 }} />
                        </Stack>
                      </CardActionArea>
                    </Card>
                  ))}
                </Box>
              )}
            </>
          )}

          {wizardStep === 'service' && (
            <Stack spacing={2}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar serviço por nome ou descrição..."
                value={wizardSearch}
                onChange={(e) => setWizardSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  )
                }}
              />
              {wizardServices.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhum serviço encontrado. Ajuste a busca ou volte e escolha outra categoria.
                  </Typography>
                </Paper>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                    gap: 1.5
                  }}
                >
                  {wizardServices.map((svc) => (
                    <Card
                      key={svc.id}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        height: '100%',
                        borderColor: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'divider',
                        bgcolor: mode === 'dark' ? 'rgba(30,41,59,0.35)' : 'background.paper',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        '&:hover': { borderColor: 'primary.main', boxShadow: mode === 'dark' ? 4 : 2 }
                      }}
                    >
                      <CardActionArea
                        onClick={() => selectServiceFromWizard(svc)}
                        aria-label={`Serviço ${svc.name}`}
                        sx={{ p: 2, height: '100%', alignItems: 'flex-start' }}
                      >
                        <Stack direction="row" spacing={1.25} alignItems="flex-start">
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 1.5,
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: mode === 'dark' ? 'rgba(56,189,248,0.14)' : 'primary.main',
                              color: mode === 'dark' ? 'primary.light' : 'primary.contrastText'
                            }}
                          >
                            <span className="material-icons-round" style={{ fontSize: 22 }}>
                              {svc.icon || 'support_agent'}
                            </span>
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1.35 }}>
                              {svc.name}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mt: 0.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {svc.description?.trim() || '—'}
                            </Typography>
                          </Box>
                          <ChevronRightIcon sx={{ color: 'action.active', flexShrink: 0, mt: 0.25 }} />
                        </Stack>
                      </CardActionArea>
                    </Card>
                  ))}
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <StandardModal
        open={modalOpen}
        onClose={() => !creating && setModalOpen(false)}
        title={`Solicitar: ${selectedService?.name || ''}`}
        subtitle="Preencha os detalhes do seu problema ou requerimento para enviarmos à equipe técnica."
        icon="support_agent"
        size="form"
        loading={creating}
        actions={[
          { label: 'Cancelar', onClick: () => setModalOpen(false), disabled: creating },
          { label: 'Abrir Chamado', onClick: handleSubmit, disabled: creating || !title || !description },
        ]}
      >
          <TextField
            autoFocus
            margin="dense"
            label="Título Resumido"
            fullWidth
            variant="outlined"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={creating}
          />

          {suggestedArticles.length > 0 && (
            <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: '#f0f9ff', borderColor: '#bae6fd' }}>
              <Typography variant="body2" fontWeight="bold" color="primary" sx={{ mb: 1 }}>
                Artigos sugeridos (Isto resolve seu problema?)
              </Typography>
              {suggestedArticles.slice(0, 3).map((art) => (
                <Box key={art.id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <MenuBookIcon fontSize="small" sx={{ mr: 1, color: '#38bdf8' }} />
                  <a
                    href="/knowledge"
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: 'none', color: '#0369a1', fontSize: '0.875rem' }}
                  >
                    {art.title}
                  </a>
                </Box>
              ))}
            </Paper>
          )}

          <TextField
            margin="dense"
            label="Descreva os detalhes..."
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={creating}
            sx={{ mt: 2, mb: 2 }}
          />

          {formSchemaFields.map((field) => {
            if (field.type === 'select') {
              const opts =
                typeof field.options === 'string'
                  ? field.options.split(/,|\n/).map((s) => s.trim()).filter(Boolean)
                  : Array.isArray(field.options)
                    ? field.options
                    : [];

              return (
                <TextField
                  key={field.id}
                  select
                  margin="dense"
                  fullWidth
                  variant="outlined"
                  label={field.label + (field.required ? ' *' : '')}
                  value={customAnswers[field.id] || ''}
                  onChange={(e) => setCustomAnswers({ ...customAnswers, [field.id]: e.target.value })}
                  SelectProps={{ native: true }}
                >
                  <option value="">-- Selecione --</option>
                  {opts.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </TextField>
              );
            }
            return (
              <TextField
                key={field.id}
                margin="dense"
                fullWidth
                variant="outlined"
                label={field.label + (field.required ? ' *' : '')}
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                InputLabelProps={field.type === 'date' ? { shrink: true } : {}}
                multiline={field.type === 'textarea'}
                rows={field.type === 'textarea' ? 3 : 1}
                value={customAnswers[field.id] || ''}
                onChange={(e) => setCustomAnswers({ ...customAnswers, [field.id]: e.target.value })}
              />
            );
          })}

          {supportGroups.length > 0 && (
            <TextField
              select
              fullWidth
              margin="dense"
              variant="outlined"
              label="Equipe / grupo de atendimento (opcional)"
              value={supportGroupId}
              onChange={(e) => setSupportGroupId(e.target.value)}
              disabled={creating}
              sx={{ mt: 1 }}
              SelectProps={{ native: true }}
            >
              <option value="">-- Automático / sem preferência --</option>
              {supportGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </TextField>
          )}

          <TextField
            select
            fullWidth
            margin="dense"
            variant="outlined"
            label="Hardware ou Ativo Relacionado (Opcional)"
            value={relatedAssetId}
            onChange={(e) => setRelatedAssetId(e.target.value)}
            disabled={creating}
            SelectProps={{ native: true }}
          >
            <option value="">-- Nenhum --</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.code} - {asset.name}
              </option>
            ))}
          </TextField>
      </StandardModal>
    </Box>
  );
};

export default PortalPage;
