import { useState } from 'react';
import {
  Box, Chip, IconButton, Tooltip, Avatar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, TablePagination
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import StatusChip from '../common/StatusChip';
import { getFileURL } from '../../utils/urlUtils';

const ProjectTasksList = ({ tasks, onTaskClick, onDeleteTask }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Status helpers removed in favor of StatusChip

  const getPriorityLabel = (priority) => {
    const labels = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica' };
    return labels[priority] || priority;
  };

  return (
    <Box className="tasks-list-container">
      <TableContainer>
        <Table className="tasks-list-table">
          <TableHead>
            <TableRow>
              <TableCell>Título</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Prioridade</TableCell>
              <TableCell>Responsável</TableCell>
              <TableCell>Início</TableCell>
              <TableCell>Fim</TableCell>
              {/* Definindo largura fixa e alinhamento para o Header combinar com o Body */}
              <TableCell align="center" width={80}>Anexo</TableCell>
              <TableCell align="right" width={100}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((task) => {
                // Pega o primeiro anexo se existir para download rápido
                const hasAttachments = task.attachments && task.attachments.length > 0;
                const firstAttachment = hasAttachments ? task.attachments[0] : null;

                return (
                  <TableRow key={task.id}>
                    <TableCell className="task-title-cell">{task.title}</TableCell>
                    <TableCell>
                      <StatusChip status={task.status} />
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#475569' }}>
                        <span className={`task-priority-dot ${task.priority}`}></span>
                        {getPriorityLabel(task.priority)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.assignee ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '10px', bgcolor: '#e2e8f0', color: '#475569', fontWeight: 'bold' }}>
                            {task.assignee.name.charAt(0)}
                          </Avatar>
                          <span style={{ fontSize: '13px' }}>{task.assignee.name.split(' ')[0]}</span>
                        </Box>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Não atribuído</span>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: '12px', color: '#64748b' }}>
                      {task.startDate ? format(new Date(task.startDate), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '12px', color: '#64748b' }}>
                      {task.endDate ? format(new Date(task.endDate), 'dd/MM/yyyy') : '-'}
                    </TableCell>

                    {/* Coluna de Anexos Corrigida (Clicável) */}
                    <TableCell align="center" width={80}>
                      {hasAttachments ? (
                        <Tooltip title={`Baixar: ${firstAttachment.fileName}`}>
                          <IconButton
                            href={getFileURL(firstAttachment.fileUrl)}
                            target="_blank"
                            size="small"
                            sx={{ color: '#64748b' }}
                          >
                            <AttachFileIcon fontSize="small" sx={{ transform: 'rotate(45deg)' }} />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>-</span>
                      )}
                    </TableCell>

                    {/* Coluna de Ações Corrigida (Alinhamento) */}
                    <TableCell align="right" width={100}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Tooltip title="Editar">
                          <IconButton size="small" color="primary" onClick={() => onTaskClick(task)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => onDeleteTask(task.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            {tasks.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: '#94a3b8' }}>Nenhuma tarefa encontrada.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={tasks.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Linhas:"
      />
    </Box>
  );
};

export default ProjectTasksList;