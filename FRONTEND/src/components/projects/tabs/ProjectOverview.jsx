import { useMemo } from 'react';
import { Box } from '@mui/material';
import { differenceInDays, isValid } from 'date-fns';

// Import Custom Mockup Components
import KPICardsGrid from '../KPICardsGrid';
import MacroTimelineCard from '../MacroTimelineCard';
import QuickActionsGrid from '../QuickActionsGrid';

const ProjectOverview = ({ project, tasks = [], risks = [], activities = [], onAction }) => {

  return (
    <Box>
      {/* 1. KPI CARDS GRID (Exact Mockup) */}
      <KPICardsGrid project={project} tasks={tasks} risks={risks} />

      {/* 2. MACRO TIMELINE (Exact Mockup) */}
      <MacroTimelineCard project={project} />

      {/* 3. QUICK ACTIONS (Exact Mockup) */}
      <QuickActionsGrid
        onNewTask={() => onAction('newTask')}
        onNewRisk={() => onAction('newRisk')}
        onNewMinute={() => onAction('newMinute')}
        onAddMember={() => onAction('newMember')}
        onAddCost={() => onAction('newCost')}
        onAddProposal={() => onAction('newProposal')}
        onAddFollowUp={() => onAction('newFollowUp')}
      />
    </Box>
  );
};

export default ProjectOverview;