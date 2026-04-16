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
  LinearProgress
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

import StandardModal from '../../components/common/StandardModal';

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const STATUS_COLORS = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  WAITING_USER: 'secondary',
  RESOLVED: 'success',
  CLOSED: 'default'
};

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

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        gap={2}
        sx={{ mb: 2 }}
      >
        <Typography variant="h5" fontWeight="700" sx={{ letterSpacing: '-0.5px' }}>
          Meus Chamados ({tickets.length})
        </Typography>
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={openWizard} sx={{ flexShrink: 0 }}>
          Novo ticket
        </Button>
      </Stack>
      <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 1 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'grey.50' }}>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Título</TableCell>
              <TableCell>Serviço</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ação</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Você não possui chamados em aberto.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell fontWeight="bold">{t.code}</TableCell>
                  <TableCell>{t.title}</TableCell>
                  <TableCell>{t.service?.name || '-'}</TableCell>
                  <TableCell>{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip label={t.status} color={STATUS_COLORS[t.status]} size="small" />
                  </TableCell>
                  <TableCell>
                    <Button component={RouterLink} to={`/portal/tickets/${t.id}`} variant="outlined" size="small">
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
