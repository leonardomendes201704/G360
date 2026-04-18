import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, Paper, Button,
  TextField, MenuItem, Chip, useTheme, CircularProgress, Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import BugReportIcon from '@mui/icons-material/BugReport';
import problemService from '../../services/problem.service';
import StandardModal from '../../components/common/StandardModal';
import DataListTable from '../../components/common/DataListTable';
import { getProblemColumns } from './problemListColumns';
import { sortProblemsRows } from './problemListSort';

const STATUS_COLORS = {
  'INVESTIGATING': 'secondary',
  'IDENTIFIED': 'warning',
  'WORKAROUND': 'info',
  'RESOLVED': 'success',
  'CLOSED': 'default'
};

const ProblemManagement = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    try {
      const data = await problemService.getAll();
      setProblems(data);
    } catch (err) {
      console.error('Error fetching problems', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await problemService.create({ title, description, priority });
      setModalOpen(false);
      setTitle(''); setDescription('');
      fetchData();
    } catch(err) { alert('Erro ao criar problema'); }
  };

  const openManage = useCallback((prob) => {
    setSelectedProb(prob);
    setPStatus(prob.status);
    setPRootCause(prob.rootCause || '');
    setPWorkaround(prob.workaround || '');
    setLinkTicketId('');
    setManageModalOpen(true);
  }, []);

  const problemColumns = useMemo(() => getProblemColumns({ onManage: openManage }), [openManage]);

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
      <DataListTable
        shell={{
          title: 'Gestão de Problemas (ITIL)',
          titleIcon: 'bug_report',
          accentColor: '#7c3aed',
          count: problems.length,
          sx: { mb: 3 },
          toolbar: (
            <Button variant="contained" color="secondary" startIcon={<BugReportIcon />} onClick={() => setModalOpen(true)}>
              Declarar Problema
            </Button>
          ),
        }}
        columns={problemColumns}
        rows={problems}
        sortRows={sortProblemsRows}
        defaultOrderBy="code"
        defaultOrder="desc"
        getDefaultOrderForColumn={(id) => (id === 'incidentCount' ? 'desc' : 'asc')}
        loading={loading}
        emptyMessage="Nenhum problema crônico registrado."
        rowsPerPageDefault={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        onRowClick={openManage}
      />

      <StandardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Declarar Novo Problema Crônico"
        icon="bug_report"
        size="form"
        actions={[
          { label: 'Cancelar', onClick: () => setModalOpen(false) },
          { label: 'Declarar', onClick: handleCreate, color: 'secondary', disabled: !title },
        ]}
      >
          <TextField autoFocus margin="dense" label="Título Resumido" fullWidth value={title} onChange={e => setTitle(e.target.value)} />
          <TextField margin="dense" label="Descrição Evidência" fullWidth multiline rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          <TextField margin="dense" select label="Prioridade/Impacto" fullWidth value={priority} onChange={e => setPriority(e.target.value)}>
             <MenuItem value="MEDIUM">Médio</MenuItem>
             <MenuItem value="HIGH">Alto</MenuItem>
             <MenuItem value="URGENT">Urgente (Crise)</MenuItem>
          </TextField>
      </StandardModal>

      <StandardModal
        open={manageModalOpen}
        onClose={() => setManageModalOpen(false)}
        title={`Mission Control · ${selectedProb?.code || ''}`}
        subtitle={selectedProb?.title}
        icon="engineering"
        size="wide"
        contentSx={{ p: 0 }}
        footer={
          <>
            <Button onClick={() => setManageModalOpen(false)}>Sair da Edição</Button>
            <Button variant="contained" color="primary" onClick={handleUpdateStatus}>Salvar Alterações do Problema</Button>
          </>
        }
      >
        <>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
          <Chip label={pStatus} color={STATUS_COLORS[pStatus]} sx={{ fontWeight: 800 }} />
        </Box>
        <Box sx={{ bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', display: 'flex', minHeight: 'min(65vh, 560px)', maxHeight: '65vh' }}>
          <Grid container sx={{ height: '100%' }}>
            {/* Lado Esquerdo: Edição do Problema */}
            <Grid item xs={12} md={7} sx={{ p: { xs: 2, md: 4 }, borderRight: `1px solid ${mode==='dark'?'rgba(255,255,255,0.1)':'#e2e8f0'}`, overflowY: 'auto' }}>
              <Typography variant="body2" mb={4} color="text.secondary" sx={{ p: 2, bgcolor: mode==='dark'?'rgba(255,255,255,0.05)':'#f8fafc', borderRadius: '8px', borderLeft: '4px solid #6366f1' }}>
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
                      <Paper key={inc.id} elevation={0} sx={{ p: 1.5, border: `1px solid ${mode==='dark'?'rgba(255,255,255,0.1)':'#e2e8f0'}`, borderRadius: '8px', bgcolor: mode==='dark'?'rgba(255,255,255,0.05)':'#ffffff' }}>
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
        </Box>
        </>
      </StandardModal>
    </Box>
  );
};

export default ProblemManagement;
