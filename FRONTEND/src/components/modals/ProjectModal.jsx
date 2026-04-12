import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import { RocketLaunch, Close } from '@mui/icons-material';
import ProjectCreationWizard from './ProjectCreationWizard';
import ProjectEditForm from './ProjectEditForm';

const modalStyles = {
  backdrop: {
    backdropFilter: 'blur(8px)',
    backgroundColor: 'var(--modal-backdrop, rgba(0, 0, 0, 0.7))'
  },
  paper: {
    borderRadius: '16px',
    background: 'var(--modal-gradient)',
    border: '1px solid var(--modal-border)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    color: 'var(--modal-text)',
    maxWidth: '800px',
    width: '100%',
    m: 2,
    height: '90vh',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column'
  },
  title: {
    borderBottom: '1px solid var(--modal-border)',
    padding: '24px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--modal-surface-subtle)'
  }
};

const ProjectModal = ({ open, onClose, onSave, project = null, loading = false }) => {
  // MUI Dialog handles mounting/unmounting animation automatically

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: modalStyles.paper }}
      BackdropProps={{ sx: modalStyles.backdrop }}
      maxWidth="md" // 800px approx
      fullWidth
    >
      {/* Header */}
      <DialogTitle sx={modalStyles.title}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
          }}>
            <RocketLaunch sx={{ color: 'white', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ color: 'var(--modal-text-strong)', fontSize: '18px', fontWeight: 600 }}>
              {project ? (project.name || 'Editar Projeto') : 'Novo Projeto'}
            </Typography>
            <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px' }}>
              {project ? 'Atualize os dados e configurações do projeto' : 'Assistente de criação de projeto'}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: 'var(--modal-text-secondary)',
            borderRadius: '10px',
            '&:hover': { color: 'var(--modal-text)', background: 'var(--modal-surface-hover)' }
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      {/* Content Body */}
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          {project ? (
            <ProjectEditForm
              project={project}
              onSave={onSave}
              onCancel={onClose}
              loading={loading}
            />
          ) : (
            <ProjectCreationWizard
              onSave={onSave}
              onCancel={onClose}
              loading={loading}
            />
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectModal;
