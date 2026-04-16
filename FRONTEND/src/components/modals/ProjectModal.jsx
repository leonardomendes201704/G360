import React from 'react';
import { Box } from '@mui/material';
import ProjectCreationWizard from './ProjectCreationWizard';
import ProjectEditForm from './ProjectEditForm';
import StandardModal from '../common/StandardModal';

const ProjectModal = ({ open, onClose, onSave, project = null, loading = false }) => {
  const title = project ? (project.name || 'Editar Projeto') : 'Novo Projeto';
  const subtitle = project
    ? 'Atualize os dados e configurações do projeto'
    : 'Assistente de criação de projeto';

  return (
    <StandardModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon="rocket_launch"
      size="wide"
      loading={loading}
      contentSx={{
        p: 0,
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
    </StandardModal>
  );
};

export default ProjectModal;
