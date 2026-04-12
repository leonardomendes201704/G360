import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, useTheme, CircularProgress, Grid
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import BugReportIcon from '@mui/icons-material/BugReport';
import problemService from '../../services/problem.service';

const STATUS_COLORS = {
  'INVESTIGATING': 'secondary',
  'IDENTIFIED': 'warning',
  'WORKAROUND': 'info',
  'RESOLVED': 'success',
  'CLOSED': 'default'
};

const ProblemManagement = () => {
  const [problems, setProblems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const theme = useTheme();
  const mode = theme.palette.mode;
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('HIGH');
  
  const [selectedProb, setSelectedProb] = useState(null);
  const [pStatus, setPStatus] = useState('');
  const [pRootCause, setPRootCause] = useState('');
  const [pWorkaround, setPWorkaround] = useState('');
  const [linkTicketId, setLinkTicketId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await problemService.getAll();
      setProblems(data);
    } catch(err) { console.error('Error fetching problems', err); }
  };

  const handleCreate = async () => {
    try {
      await problemService.create({ title, description, priority });
      setModalOpen(false);
      setTitle(''); setDescription('');
      fetchData();
    } catch(err) { alert('Erro ao criar problema'); }
  };

  const openManage = (prob) => {
    setSelectedProb(prob);
    setPStatus(prob.status);
    setPRootCause(prob.rootCause || '');
    setPWorkaround(prob.workaround || '');
    setLinkTicketId('');
    setManageModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    try {
      if ((pStatus === 'RESOLVED' || pStatus === 'CLOSED') && window.confirm('Atenção: Marcar como resolvido ou fechado AUTO-RESOLVERÁ TODOS os incidentes (chamados) atrelados a este problema. Continuar?')) {
        await problemService.updateStatus(selectedProb.id, { status: pStatus, rootCause: pRootCause, workaround: pWorkaround });
        setManageModalOpen(false);
        fetchData();
      } else if (pStatus !== 'RESOLVED' && pStatus !== 'CLOSED') {
        await problemService.updateStatus(selectedProb.id, { status: pStatus, rootCause: pRootCause, workaround: pWorkaround });
        setManageModalOpen(false);
        fetchData();
      }
    } catch(err) { alert('Erro ao atualizar problema'); }
  };

  const handleLinkIncident = async () => {
    if (!linkTicketId.trim()) return;
    try {
      await problemService.linkIncident(selectedProb.id, linkTicketId);
      alert('Incidente vinculado com sucesso!');
      setLinkTicketId('');
      fetchData();
      // Update local state to show immediately
      const refreshedProb = await problemService.getById(selectedProb.id);
      setSelectedProb(refreshedProb);
    } catch(err) { alert('Erro ao vincular. Verifique se o ID/GUID do Ticket confere.'); }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Gestão de Problemas (ITIL)</Typography>
        <Button variant="contained" color="secondary" startIcon={<BugReportIcon />} onClick={() => setModalOpen(true)}>Declarar Problema</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Título & Causa</TableCell>
              <TableCell align="center">Incidentes Atrelados</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Gerenciar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {problems.length === 0 ? (
               <TableRow><TableCell colSpan={5} align="center">Nenhum problema crônico registrado.</TableCell></TableRow>
            ) : problems.map(p => (
              <TableRow key={p.id} hover>
                <TableCell><b>{p.code}</b></TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">{p.title}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {p.rootCause ? `Causa: ${p.rootCause.substring(0, 50)}...` : 'Causa em Investigação'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip label={p.incidents?.length || 0} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={p.status} size="small" color={STATUS_COLORS[p.status]} variant="outlined" />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="primary" onClick={() => openManage(p)}><EditIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* CREATE MODAL */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Declarar Novo Problema Crônico</DialogTitle>
        <DialogContent dividers>
          <TextField autoFocus margin="dense" label="Título Resumido" fullWidth value={title} onChange={e => setTitle(e.target.value)} />
          <TextField margin="dense" label="Descrição Evidência" fullWidth multiline rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          <TextField margin="dense" select label="Prioridade/Impacto" fullWidth value={priority} onChange={e => setPriority(e.target.value)}>
             <MenuItem value="MEDIUM">Médio</MenuItem>
             <MenuItem value="HIGH">Alto</MenuItem>
             <MenuItem value="URGENT">Urgente (Crise)</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="secondary" onClick={handleCreate} disabled={!title}>Declarar</Button>
        </DialogActions>
      </Dialog>

      {/* MANAGE MODAL */}
      <Dialog open={manageModalOpen} onClose={() => setManageModalOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: mode==='dark'?'#0f172a':'#f1f5f9' }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">Mission Control: Problema {selectedProb?.code}</Typography>
            <Typography variant="body2" color="text.secondary">{selectedProb?.title}</Typography>
          </Box>
          <Chip label={pStatus} color={STATUS_COLORS[pStatus]} sx={{ fontWeight: 800 }} />
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, bgcolor: mode==='dark'?'#1e293b':'#ffffff', display: 'flex', height: '65vh' }}>
          <Grid container sx={{ height: '100%' }}>
            {/* Lado Esquerdo: Edição do Problema */}
            <Grid item xs={12} md={7} sx={{ p: { xs: 2, md: 4 }, borderRight: `1px solid ${mode==='dark'?'rgba(255,255,255,0.1)':'#e2e8f0'}`, overflowY: 'auto' }}>
              <Typography variant="body2" mb={4} color="text.secondary" sx={{ p: 2, bgcolor: mode==='dark'?'rgba(255,255,255,0.05)':'#f8fafc', borderRadius: 2, borderLeft: '4px solid #6366f1' }}>
                {selectedProb?.description}
              </Typography>

              <Box display="flex" gap={2} mb={4}>
                <TextField size="small" select label="Evolução do Status" fullWidth value={pStatus} onChange={e => setPStatus(e.target.value)}>
                   <MenuItem value="INVESTIGATING">Em Investigação</MenuItem>
                   <MenuItem value="IDENTIFIED">Causa Identificada</MenuItem>
                   <MenuItem value="WORKAROUND">Solução de Contorno Ativa</MenuItem>
                   <MenuItem value="RESOLVED">Resolvido (Fix Release)</MenuItem>
                   <MenuItem value="CLOSED">Encerrado</MenuItem>
                </TextField>
              </Box>

              <TextField margin="normal" label="Causa Raiz (Root Cause)" fullWidth multiline rows={4} value={pRootCause} onChange={e => setPRootCause(e.target.value)} />
              <TextField margin="normal" label="Solução Temporária/Definitiva (Workaround)" fullWidth multiline rows={4} value={pWorkaround} onChange={e => setPWorkaround(e.target.value)} sx={{ mb: 2 }} />
            </Grid>

            {/* Lado Direito: Incidents Vinculados */}
            <Grid item xs={12} md={5} sx={{ bgcolor: mode==='dark'?'rgba(15,23,42,0.3)':'#f8fafc', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ p: 3, borderBottom: `1px solid ${mode==='dark'?'rgba(255,255,255,0.1)':'#e2e8f0'}` }}>
                <Typography variant="subtitle2" fontWeight="bold" color="primary">Vincular Novo Chamado Pai/Filho</Typography>
                <Box display="flex" gap={1} mt={1}>
                  <TextField size="small" placeholder="Ex: ID UUID..." fullWidth value={linkTicketId} onChange={e => setLinkTicketId(e.target.value)} />
                  <Button variant="contained" disableElevation onClick={handleLinkIncident}><LinkIcon /></Button>
                </Box>
              </Box>
              
              <Box sx={{ p: 3, overflowY: 'auto', flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle2" fontWeight="bold">Chamados Afetados ({selectedProb?.incidents?.length || 0})</Typography>
                  {selectedProb?.incidents?.length > 0 && (
                    <Box display="flex" alignItems="center">
                      <CircularProgress variant="determinate" value={(selectedProb.incidents.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length / selectedProb.incidents.length) * 100} size={24} thickness={5} sx={{ mr: 1, color: '#22c55e' }} />
                      <Typography variant="caption" fontWeight="bold" color="success.main">Progresso Real</Typography>
                    </Box>
                  )}
                </Box>
                
                {selectedProb && selectedProb.incidents && selectedProb.incidents.length > 0 ? (
                  <Box display="flex" flexDirection="column" gap={1}>
                    {selectedProb.incidents.map(inc => (
                      <Paper key={inc.id} elevation={0} sx={{ p: 1.5, border: `1px solid ${mode==='dark'?'rgba(255,255,255,0.1)':'#e2e8f0'}`, borderRadius: 2, bgcolor: mode==='dark'?'rgba(255,255,255,0.05)':'#ffffff' }}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" fontWeight="bold">{inc.code}</Typography>
                          <Chip size="small" label={inc.status} sx={{ height: 20, fontSize: '0.65rem' }} color={inc.status==='RESOLVED'||inc.status==='CLOSED'?'success':'warning'} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inc.title}</Typography>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>Nenhum chamado vinculado a este problema.</Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: mode==='dark'?'#0f172a':'#f1f5f9' }}>
          <Button onClick={() => setManageModalOpen(false)}>Sair da Edição</Button>
          <Button variant="contained" color="primary" onClick={handleUpdateStatus}>Salvar Alterações do Problema</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProblemManagement;
