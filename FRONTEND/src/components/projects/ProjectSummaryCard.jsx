import {
    Warning, Timeline as TimelineIcon
} from '@mui/icons-material';
import {
    Avatar, Box, Grid, Paper, Typography
} from '@mui/material';
import { format } from 'date-fns';

const ProjectSummaryCard = ({ project }) => {

    // --- SAFE DATA HANDLING ---
    const startDate = project.startDate ? new Date(project.startDate) : null;
    const endDate = project.endDate ? new Date(project.endDate) : null;

    return (
        <Paper elevation={0} variant="outlined" sx={{ p: 4, borderRadius: '8px', mb: 4, bgcolor: 'white' }}>
            <Grid container spacing={4} alignItems="center" justifyContent="space-between">

                {/* 1. Gerente */}
                <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 48, height: 48, bgcolor: '#e0e7ff', color: '#1e40af', fontWeight: 'bold' }}>
                            {project.manager?.name?.charAt(0) || 'G'}
                        </Avatar>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gerente</Typography>
                            <Typography variant="body1" fontWeight="700" sx={{ lineHeight: 1.2 }}>
                                {project.manager?.name ? project.manager.name.split(' ')[0] + ' ' + (project.manager.name.split(' ')[1] || '') : 'N/A'}
                            </Typography>
                        </Box>
                    </Box>
                </Grid>

                {/* 2. Resp. Técnico */}
                <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 48, height: 48, bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 'bold', fontSize: '1rem' }}>
                            {project.technicalLead?.name?.charAt(0) || project.techLead?.name?.charAt(0) || 'T'}
                        </Avatar>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resp. Técnico</Typography>
                            <Typography variant="body1" fontWeight="700" sx={{ lineHeight: 1.2 }}>
                                {project.technicalLead?.name ? project.technicalLead.name.split(' ')[0] + ' ' + (project.technicalLead.name.split(' ')[1] || '') : (project.techLead?.name ? project.techLead.name.split(' ')[0] + ' ' + (project.techLead.name.split(' ')[1] || '') : 'N/A')}
                            </Typography>
                        </Box>
                    </Box>
                </Grid>

                {/* 3. Prioridade */}
                <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 48, height: 48, borderRadius: '8px', bgcolor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Warning fontSize="small" />
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prioridade</Typography>
                            <Box sx={{
                                display: 'inline-block',
                                px: 1.5, py: 0.3, borderRadius: '8px',
                                bgcolor: project.priority === 'CRITICAL' || project.priority === 'HIGH' ? '#fee2e2' : '#f0fdf4',
                                color: project.priority === 'CRITICAL' || project.priority === 'HIGH' ? '#b91c1c' : '#15803d',
                                fontSize: '0.8rem', fontWeight: 800, mt: 0.2
                            }}>
                                {project.priority || 'NORMAL'}
                            </Box>
                        </Box>
                    </Box>
                </Grid>

                {/* 4. Período */}
                <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 48, height: 48, borderRadius: '8px', bgcolor: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TimelineIcon fontSize="small" />
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Período</Typography>
                            <Typography variant="body2" fontWeight="700" sx={{ lineHeight: 1.2, display: 'block' }}>
                                {startDate ? format(startDate, 'dd/MM') : '?'} - {endDate ? format(endDate, 'dd/MM/yyyy') : '?'}
                            </Typography>
                        </Box>
                    </Box>
                </Grid>

            </Grid>
        </Paper>
    );
};

export default ProjectSummaryCard;
