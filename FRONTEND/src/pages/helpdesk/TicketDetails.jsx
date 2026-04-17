import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, TextField, Button, CircularProgress,
  Avatar, Divider, Chip, Card, CardContent, IconButton, FormControlLabel, Switch, useTheme,
  FormControl, InputLabel, Select, MenuItem, Rating, Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import LockIcon from '@mui/icons-material/Lock';
import api from '../../services/api';
import ticketService from '../../services/ticket.service';
import { getReferenceUsers } from '../../services/reference.service';
import { getActiveSupportGroups } from '../../services/support-group.service';
import { AuthContext } from '../../contexts/AuthContext';
import { getDepartments } from '../../services/department.service';
import { getCostCenters } from '../../services/cost-center.service';
import {
  getTicketStatusLabel,
  stripTicketTitleStatusSuffix,
  TICKET_STATUS_CHIP_COLOR
} from '../../constants/ticketStatus';

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useContext(AuthContext);
  const theme = useTheme();
  const mode = theme.palette.mode;
  
  const [ticket, setTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [users, setUsers] = useState([]);
  const [triaging, setTriaging] = useState(false);
  const [csatScore, setCsatScore] = useState(0);
  const [csatComment, setCsatComment] = useState('');
  const [csatSending, setCsatSending] = useState(false);
  const [supportGroups, setSupportGroups] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [costCentersList, setCostCentersList] = useState([]);

  const hasAgentPrivilege =
    hasPermission('HELPDESK', 'VIEW_QUEUE') ||
    hasPermission('HELPDESK', 'VIEW_INTERNAL_NOTES') ||
    hasPermission('HELPDESK', 'WRITE_INTERNAL_NOTES');

  useEffect(() => {
    fetchTicket();
  }, [id]);

  useEffect(() => {
    if (!hasAgentPrivilege) return;
    getReferenceUsers()
      .then((list) => setUsers(Array.isArray(list) ? list : []))
      .catch(() => setUsers([]));
    getActiveSupportGroups()
      .then((list) => setSupportGroups(Array.isArray(list) ? list : []))
      .catch(() => setSupportGroups([]));
    getDepartments()
      .then((list) => setDepartmentsList(Array.isArray(list) ? list : []))
      .catch(() => setDepartmentsList([]));
    getCostCenters()
      .then((list) => setCostCentersList(Array.isArray(list) ? list : []))
      .catch(() => setCostCentersList([]));
  }, [hasAgentPrivilege]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const data = await ticketService.getById(id);
      setTicket(data);
    } catch (err) {
      console.error(err);
      alert('Chamado não encontrado.');
      navigate('/portal');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleAssigneeChange = async (assigneeId) => {
    try {
      setTriaging(true);
      await ticketService.patch(id, { assigneeId: assigneeId || null });
      await fetchTicket();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setTriaging(false);
    }
  };

  const handleSupportGroupChange = async (gid) => {
    try {
      setTriaging(true);
      await ticketService.patch(id, { supportGroupId: gid || null });
      await fetchTicket();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setTriaging(false);
    }
  };

  const handlePriorityChange = async (priority) => {
    try {
      setTriaging(true);
      await ticketService.patch(id, { priority });
      await fetchTicket();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setTriaging(false);
    }
  };

  const handleDepartmentChange = async (departmentId) => {
    try {
      setTriaging(true);
      await ticketService.patch(id, { departmentId: departmentId || null });
      await fetchTicket();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setTriaging(false);
    }
  };

  const handleCostCenterChange = async (costCenterId) => {
    try {
      setTriaging(true);
      await ticketService.patch(id, { costCenterId: costCenterId || null });
      await fetchTicket();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setTriaging(false);
    }
  };

  const handleSubmitCsat = async () => {
    if (csatScore < 1) {
      alert('Selecione uma nota de 1 a 5.');
      return;
    }
    try {
      setCsatSending(true);
      await ticketService.submitSatisfaction(id, { score: csatScore, comment: csatComment || undefined });
      await fetchTicket();
      setCsatComment('');
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setCsatSending(false);
    }
  };

  const handleEscalate = async (type) => {
    if (!window.confirm(`Tem certeza que deseja escalar este ticket para a esteira de ${type}?`)) return;
    try {
      if (type === 'Problema') await ticketService.escalateToProblem(id);
      if (type === 'Mudança') await ticketService.escalateToChange(id);
      if (type === 'Projeto') await ticketService.escalateToProject(id, ticket.title);
      alert(`Rotação confirmada! O chamado foi transformado em um(a) ${type}.`);
      fetchTicket();
    } catch(err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    try {
      setSending(true);

      // 1. Upload files if any
      const uploadedAttachments = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        // O ?folder=helpdesk ensina o Backend a guardar isso limpo no Windows Server!
        const res = await api.post(`/uploads?folder=helpdesk&subfolder=${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedAttachments.push({
          fileName: res.data.fileName,
          fileUrl: res.data.fileUrl,
          size: res.data.size,
          mimetype: res.data.mimetype
        });
      }

      // 2. Add message with attachments
      await ticketService.addMessage(id, { 
        content: newMessage || 'Enviou um anexo.', 
        isInternal: isInternalNote,
        attachments: uploadedAttachments
      });
      
      setNewMessage('');
      setIsInternalNote(false);
      setSelectedFiles([]);
      fetchTicket();
    } catch (err) {
      console.error(err);
      alert('Falha ao enviar mensagem ou anexo.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (!ticket) return null;

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
      {/* Sticky Header */}
      <Box sx={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        p: { xs: 2, md: 3 }, mb: 4, borderRadius: 1, 
        bgcolor: mode === 'dark' ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(16px)',
        position: 'sticky', top: 16, zIndex: 1100,
        boxShadow: mode === 'dark' ? '0 4px 30px rgba(0,0,0,0.5)' : '0 4px 30px rgba(0,0,0,0.05)',
        border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
      }}>
        <Box>
          <Typography variant="h5" fontWeight="800" sx={{ letterSpacing: '-0.5px', color: mode==='dark'?'#f8fafc':'#0f172a' }}>
            <span style={{ color: mode==='dark'?'#94a3b8':'#64748b', marginRight: '8px' }}>#{ticket.code}</span>
            {stripTicketTitleStatusSuffix(ticket.title)}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: mode==='dark'?'#94a3b8':'#64748b' }}>
            Aberto em {new Date(ticket.createdAt).toLocaleString()} por <b style={{ color: mode==='dark'?'#e2e8f0':'#334155' }}>{ticket.requester?.name}</b>
          </Typography>
        </Box>
        <Chip
          label={getTicketStatusLabel(ticket.status)}
          color={TICKET_STATUS_CHIP_COLOR[ticket.status] ?? 'default'}
          sx={{ fontWeight: 800, borderRadius: 2, px: 1 }}
        />
      </Box>

      <Grid container spacing={3}>
        {/* Lado Esquerdo: Chat / Timeline */}
        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: '#f9fafb' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Descrição Original</Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{ticket.description}</Typography>
            
            {ticket.customAnswers && Object.keys(ticket.customAnswers).length > 0 && (
              <Box mt={3} pt={2} borderTop="1px dashed #cbd5e1">
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="primary">Informações Adicionais (Formulário do Serviço)</Typography>
                <Grid container spacing={2}>
                  {Object.entries(ticket.customAnswers).map(([key, value]) => {
                    // Try to guess field name from the formSchema in service (not needed if we just print Key-Value, but Key is field_123. Better to extract label if we had it. Since we only stored IDs -> Values, we will just display it as best as we can. Wait, let's look for how we stored it.)
                    return (
                      <Grid item xs={12} sm={6} key={key}>
                         <Typography variant="caption" color="text.secondary" display="block">{key}</Typography>
                         <Typography variant="body2" fontWeight="500">{value?.toString()}</Typography>
                      </Grid>
                    )
                  })}
                </Grid>
              </Box>
            )}
          </Paper>

          <Typography variant="h6" sx={{ mb: 2 }}>Interações</Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            {ticket.messages && ticket.messages.map((msg) => {
              const isMe = msg.user?.id === user?.userId;
              
              if (msg.isInternal && !hasAgentPrivilege) return null; 

              let bubbleBg = isMe ? (mode==='dark'?'#0ea5e9':'#e0f2fe') : (mode==='dark'?'#1e293b':'#ffffff');
              let textColor = isMe ? (mode==='dark'?'#ffffff':'#0369a1') : (mode==='dark'?'#f8fafc':'#1e293b');
              let borderColor = isMe ? 'transparent' : (mode==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)');

              if (msg.isInternal) {
                bubbleBg = mode==='dark'?'rgba(234,179,8,0.1)':'#fefce8'; 
                textColor = mode==='dark'?'#fde047':'#854d0e';
                borderColor = mode==='dark'?'rgba(234,179,8,0.5)':'#fef08a';
              }

              return (
                <Box key={msg.id} display="flex" justifyContent={msg.isInternal ? 'center' : (isMe ? 'flex-end' : 'flex-start')}>
                  {!isMe && !msg.isInternal && <Avatar sx={{ mr: 1.5, width: 36, height: 36, bgcolor: mode==='dark'?'#334155':'#e2e8f0', color: mode==='dark'?'#94a3b8':'#475569', fontWeight: 600 }}>{msg.user?.name?.charAt(0)}</Avatar>}
                  
                  <Box sx={{
                    maxWidth: msg.isInternal ? '90%' : '75%',
                    p: 2.5,
                    borderRadius: 1,
                    bgcolor: bubbleBg,
                    color: textColor,
                    boxShadow: mode==='dark'?'0 4px 20px -5px rgba(0,0,0,0.5)':'0 4px 20px -5px rgba(0,0,0,0.05)',
                    border: `1px solid ${borderColor}`,
                    borderTopRightRadius: isMe && !msg.isInternal ? 4 : 16,
                    borderTopLeftRadius: !isMe && !msg.isInternal ? 4 : 16,
                  }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} gap={3}>
                      <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                        {msg.user?.name} <span style={{ margin: '0 6px' }}>•</span> {new Date(msg.createdAt).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </Typography>
                      {msg.isInternal && (
                        <Chip size="small" icon={<LockIcon sx={{ fontSize: 12, color: 'inherit' }}/>} label="Nota Interna" sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800, bgcolor: mode==='dark'?'rgba(234,179,8,0.2)':'#fef08a', color: 'inherit' }} />
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '1rem', lineHeight: 1.6 }}>{msg.content}</Typography>
                    
                    {/* Attachments rendering */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <Box mt={1}>
                        {msg.attachments.map(att => (
                          <Chip 
                            key={att.id}
                            icon={<InsertDriveFileIcon />} 
                            label={att.fileName} 
                            size="small" 
                            component="a" 
                            href={`http://localhost:8500${att.fileUrl}`} 
                            target="_blank"
                            clickable
                            sx={{ mt: 0.5, mr: 0.5, bgcolor: 'rgba(0,0,0,0.08)' }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                  {isMe && <Avatar sx={{ ml: 1, width: 32, height: 32 }}>{msg.user?.name?.charAt(0)}</Avatar>}
                </Box>
              );
            })}
            {ticket.messages?.length === 0 && (
              <Typography variant="body2" color="text.secondary" align="center">Nenhuma resposta ainda.</Typography>
            )}
          </Box>

          <Paper elevation={1} sx={{ p: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Digite sua resposta ou anexo..."
              variant="outlined"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={ticket.status === 'CLOSED' || sending}
            />

            {selectedFiles.length > 0 && (
              <Box mt={1} display="flex" flexWrap="wrap" gap={0.5}>
                {selectedFiles.map((f, i) => (
                  <Chip key={i} label={f.name} size="small" onDelete={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} />
                ))}
              </Box>
            )}

            <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
              <Box display="flex" alignItems="center">
                <IconButton component="label" disabled={ticket.status === 'CLOSED' || sending}>
                  <AttachFileIcon />
                  <input type="file" hidden multiple onChange={handleFileChange} />
                </IconButton>
                {hasAgentPrivilege && (
                  <FormControlLabel 
                    control={<Switch size="small" checked={isInternalNote} onChange={(e) => setIsInternalNote(e.target.checked)} color="warning" />} 
                    label={<Typography variant="caption" color={isInternalNote ? "warning.main" : "text.secondary"}>Tornar Nota Interna (Ocultada do Usuário)</Typography>}
                  />
                )}
              </Box>

              <Button 
                variant="contained" 
                endIcon={sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                onClick={handleSendMessage}
                disabled={(!newMessage.trim() && selectedFiles.length === 0) || ticket.status === 'CLOSED' || sending}
              >
                Enviar
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Lado Direito: Info de Status */}
        <Grid item xs={12} md={4}>
          <Box sx={{ position: 'sticky', top: 110 }}>
            <Card elevation={1} sx={{ borderRadius: 1, bgcolor: mode==='dark'?'rgba(30,41,59,0.5)':'#ffffff', backdropFilter: 'blur(10px)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="800" sx={{ mb: 3, color: mode==='dark'?'#f8fafc':'#0f172a' }}>Ficha do Chamado</Typography>
              <Box mb={2}>
                <Typography variant="caption" color="text.secondary" display="block">Serviço</Typography>
                <Typography variant="body2" fontWeight="500">{ticket.service?.name || '-'}</Typography>
              </Box>
              <Box mb={2}>
                <Typography variant="caption" color="text.secondary" display="block">Departamento</Typography>
                {hasAgentPrivilege && ticket.status !== 'CLOSED' && departmentsList.length > 0 ? (
                  <FormControl fullWidth size="small" sx={{ mt: 0.5 }} disabled={triaging}>
                    <InputLabel id="ticket-dept-label">Departamento</InputLabel>
                    <Select
                      labelId="ticket-dept-label"
                      label="Departamento"
                      value={ticket.departmentId || ''}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                    >
                      <MenuItem value="">—</MenuItem>
                      {departmentsList.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.code} — {d.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Typography variant="body2" fontWeight="500">
                    {ticket.department ? `${ticket.department.code} — ${ticket.department.name}` : '—'}
                  </Typography>
                )}
              </Box>
              <Box mb={2}>
                <Typography variant="caption" color="text.secondary" display="block">Centro de custo</Typography>
                {hasAgentPrivilege && ticket.status !== 'CLOSED' && costCentersList.length > 0 ? (
                  <FormControl fullWidth size="small" sx={{ mt: 0.5 }} disabled={triaging}>
                    <InputLabel id="ticket-cc-label">Centro de custo</InputLabel>
                    <Select
                      labelId="ticket-cc-label"
                      label="Centro de custo"
                      value={ticket.costCenterId || ''}
                      onChange={(e) => handleCostCenterChange(e.target.value)}
                    >
                      <MenuItem value="">—</MenuItem>
                      {costCentersList.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Typography variant="body2" fontWeight="500">
                    {ticket.costCenter ? `${ticket.costCenter.code} — ${ticket.costCenter.name}` : '—'}
                  </Typography>
                )}
              </Box>
              <Box mb={2}>
                <Typography variant="caption" color="text.secondary" display="block">SLA</Typography>
                {ticket.slaResponseDue || ticket.slaResolveDue ? (
                  <Box sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                    <Typography variant="body2" color={ticket.slaBreached ? 'error' : 'text.primary'}>
                      1ª resposta:{' '}
                      {ticket.slaResponseDue
                        ? new Date(ticket.slaResponseDue).toLocaleString('pt-BR')
                        : '—'}
                      {ticket.respondedAt && (
                        <Chip size="small" label="OK" color="success" sx={{ ml: 1, height: 20 }} />
                      )}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }} color={ticket.slaBreached ? 'error' : 'text.secondary'}>
                      Resolução:{' '}
                      {ticket.slaResolveDue
                        ? new Date(ticket.slaResolveDue).toLocaleString('pt-BR')
                        : '—'}
                    </Typography>
                    {ticket.slaBreached && (
                      <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
                        Prazo de SLA ultrapassado
                      </Alert>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">Sem prazos calculados</Typography>
                )}
              </Box>

              <Box mb={2}>
                <Typography variant="caption" color="text.secondary" display="block">Grupo / fila</Typography>
                {hasAgentPrivilege && ticket.status !== 'CLOSED' && supportGroups.length > 0 ? (
                  <FormControl fullWidth size="small" sx={{ mt: 0.5 }} disabled={triaging}>
                    <InputLabel id="sg-label">Grupo</InputLabel>
                    <Select
                      labelId="sg-label"
                      label="Grupo"
                      value={ticket.supportGroupId || ''}
                      onChange={(e) => handleSupportGroupChange(e.target.value)}
                    >
                      <MenuItem value="">Nenhum</MenuItem>
                      {supportGroups.map((g) => (
                        <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Typography variant="body2">{ticket.supportGroup?.name || '—'}</Typography>
                )}
              </Box>

              <Box mb={2}>
                <Typography variant="caption" color="text.secondary" display="block">Prioridade</Typography>
                {hasAgentPrivilege && ticket.status !== 'CLOSED' ? (
                  <FormControl fullWidth size="small" sx={{ mt: 0.5 }} disabled={triaging}>
                    <Select
                      value={ticket.priority}
                      onChange={(e) => handlePriorityChange(e.target.value)}
                    >
                      {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                        <MenuItem key={p} value={p}>{p}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Typography variant="body2" fontWeight="500">{ticket.priority}</Typography>
                )}
              </Box>
              <Box mb={2}>
                <Typography variant="caption" color="text.secondary" display="block">Técnico atribuído</Typography>
                {hasAgentPrivilege && ticket.status !== 'CLOSED' ? (
                  <FormControl fullWidth size="small" sx={{ mt: 0.5 }} disabled={triaging}>
                    <InputLabel id="assignee-label">Responsável</InputLabel>
                    <Select
                      labelId="assignee-label"
                      label="Responsável"
                      value={ticket.assigneeId || ''}
                      onChange={(e) => handleAssigneeChange(e.target.value)}
                    >
                      <MenuItem value="">Não atribuído</MenuItem>
                      {users.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Box display="flex" alignItems="center" mt={0.5}>
                    {ticket.assignee ? (
                      <>
                        <Avatar sx={{ width: 24, height: 24, mr: 1 }}>{ticket.assignee.name.charAt(0)}</Avatar>
                        <Typography variant="body2">{ticket.assignee.name}</Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Não atribuído</Typography>
                    )}
                  </Box>
                )}
              </Box>

              {ticket.requesterId === (user?.userId || user?.id) &&
                (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') &&
                !ticket.csatAt && (
                  <Box mb={2} sx={{ p: 2, bgcolor: mode === 'dark' ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)', borderRadius: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Como foi o atendimento?
                    </Typography>
                    <Rating
                      value={csatScore}
                      onChange={(_, v) => setCsatScore(v)}
                      size="large"
                    />
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Comentário opcional"
                      value={csatComment}
                      onChange={(e) => setCsatComment(e.target.value)}
                      sx={{ mt: 1 }}
                      multiline
                      rows={2}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      sx={{ mt: 1 }}
                      disabled={csatSending || csatScore < 1}
                      onClick={handleSubmitCsat}
                    >
                      {csatSending ? <CircularProgress size={20} /> : 'Enviar avaliação'}
                    </Button>
                  </Box>
                )}

              {ticket.csatAt && (
                <Box mb={2}>
                  <Typography variant="caption" color="text.secondary" display="block">Satisfação</Typography>
                  <Rating value={ticket.csatScore} readOnly size="small" />
                  {ticket.csatComment && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{ticket.csatComment}</Typography>
                  )}
                </Box>
              )}

              {/* Rastreabilidade L5 (Exibido para todos caso exista vínculo) */}
              {(ticket.problemId || ticket.linkedChangeId || ticket.linkedProjectId) && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, color: mode==='dark'?'#38bdf8':'#0284c7' }}>Rastreabilidade Universal</Typography>
                  {ticket.problemId && <Chip label="Problema Vinculado" color="error" size="small" sx={{ mb: 1, width: '100%', borderRadius: 1, fontWeight: 'bold' }} />}
                  {ticket.linkedChangeId && <Chip label="Mudança Exigida (GMUD)" color="warning" size="small" sx={{ mb: 1, width: '100%', borderRadius: 1, fontWeight: 'bold' }} />}
                  {ticket.linkedProjectId && <Chip label="Demanda de Projeto" color="secondary" size="small" sx={{ width: '100%', borderRadius: 1, fontWeight: 'bold' }} />}
                </>
              )}

              {/* Botões de Triagem do Agente */}
              {hasAgentPrivilege && !ticket.problemId && !ticket.linkedChangeId && !ticket.linkedProjectId && ticket.status !== 'CLOSED' && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, color: 'text.primary' }}>Elevação de Nível ⬈</Typography>
                  <Button fullWidth variant="outlined" color="error" size="small" sx={{ mb: 1, justifyContent: 'flex-start', fontWeight: 600 }} onClick={() => handleEscalate('Problema')}>
                    Promover a Problema
                  </Button>
                  <Button fullWidth variant="outlined" color="warning" size="small" sx={{ mb: 1, justifyContent: 'flex-start', fontWeight: 600 }} onClick={() => handleEscalate('Mudança')}>
                    Solicitar Mudança (GMUD)
                  </Button>
                  <Button fullWidth variant="outlined" color="secondary" size="small" sx={{ justifyContent: 'flex-start', fontWeight: 600 }} onClick={() => handleEscalate('Projeto')}>
                    Gerar Demanda de Projeto
                  </Button>
                </>
              )}

            </CardContent>
          </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TicketDetails;
