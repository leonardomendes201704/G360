const express = require('express');
const DashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize, authorizeSome, authorizeSuperAdmin } = require('../middlewares/permission.middleware');

const router = express.Router();

/** Painel “colaborador”: qualquer módulo operacional com leitura (ou portal de chamados). */
const COLLABORATOR_DASHBOARD_PERMISSIONS = [
    { module: 'TASKS', action: 'READ' },
    { module: 'HELPDESK', action: 'READ' },
    { module: 'HELPDESK', action: 'CREATE' },
    { module: 'HELPDESK', action: 'VIEW_QUEUE' },
    { module: 'PROJECTS', action: 'READ' },
    { module: 'INCIDENT', action: 'READ' },
    { module: 'GMUD', action: 'READ' },
];

router.use(authMiddleware);

router.get('/financial', authorize('FINANCE', 'READ'), DashboardController.getFinancialSummary);

router.get('/super-admin', authorizeSuperAdmin, DashboardController.getSuperAdminStats);

router.get('/collaborator', authorizeSome(COLLABORATOR_DASHBOARD_PERMISSIONS), DashboardController.getCollaboratorStats);

router.get('/manager', authorize('PROJECTS', 'READ'), DashboardController.getManagerStats);

router.get('/activity', authorize('ACTIVITY_LOG', 'READ'), DashboardController.getActivityFeed);

router.get('/analytics', authorize('PROJECTS', 'READ'), DashboardController.getManagerAnalytics);

module.exports = router;
