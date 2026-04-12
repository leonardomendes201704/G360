const express = require('express');

// --- Route Imports (organized by domain) ---

// Core & Auth
const authRoutes = require('./auth.routes');
const tenantRoutes = require('./tenant.routes');
const userRoutes = require('./user.routes');
const roleRoutes = require('./role.routes');

// Organizational
const departmentRoutes = require('./department.routes');
const costCenterRoutes = require('./cost-center.routes');
const supplierRoutes = require('./supplier.routes');

// Finance
const accountRoutes = require('./account.routes');
const fiscalYearRoutes = require('./fiscal-year.routes');
const budgetRoutes = require('./budget.routes');
// const budgetScenarioRoutes = require('./budget-scenario.routes'); // Feature removed
const budgetComparisonRoutes = require('./budget-comparison.routes');
const expenseRoutes = require('./expense.routes');
const contractRoutes = require('./contract.routes');
const financeDashboardRoutes = require('./finance-dashboard.routes');

// Assets & Licenses
const assetCategoryRoutes = require('./asset-category.routes');
const assetRoutes = require('./asset.routes');
const softwareLicenseRoutes = require('./software-license.routes');

// Project Management
const projectRoutes = require('./project.routes');
const projectTaskRoutes = require('./project-task.routes');
const taskRoutes = require('./task.routes');

// Change Management (GMUD)
const changeRequestRoutes = require('./change-request.routes');
const changeTemplateRoutes = require('./change-template.routes');
const freezeWindowRoutes = require('./freeze-window.routes');

// Incident Management (ITIL)
const incidentRoutes = require('./incident.routes');

// Help Desk & Service Management
const ticketRoutes = require('./ticket.routes');
const serviceCatalogRoutes = require('./service-catalog.routes');
const slaPolicyRoutes = require('./sla-policy.routes');
const problemRoutes = require('./problem.routes');
const helpdeskConfigRoutes = require('./helpdesk-config.routes');
const supportGroupRoutes = require('./support-group.routes');

// Governance & Compliance
const corporateRiskRoutes = require('./corporate-risk.routes');
const approvalRoutes = require('./approval.routes');
const approvalTierRoutes = require('./approval-tier.routes');
const auditLogRoutes = require('./audit-log.routes');

// Knowledge & Communication
const knowledgeBaseRoutes = require('./knowledge-base.routes');
const knowledgeCategoryRoutes = require('./knowledge-category.routes');
const notificationRoutes = require('./notification.routes');

// Infrastructure & Admin
const dashboardRoutes = require('./dashboard.routes');
const integrationRoutes = require('./integration.routes');
const uploadRoutes = require('./upload.routes');
const referenceRoutes = require('./reference.routes');
const globalSettingRoutes = require('./global-setting.routes');

// --- Router Setup ---

const router = express.Router();

// Core & Auth
router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);

// Organizational
router.use('/departments', departmentRoutes);
router.use('/cost-centers', costCenterRoutes);
router.use('/suppliers', supplierRoutes);

// Finance
router.use('/accounts', accountRoutes);
router.use('/fiscal-years', fiscalYearRoutes);
router.use('/budgets', budgetRoutes);
// router.use('/finance', budgetScenarioRoutes); // Feature removed
router.use('/budget-comparison', budgetComparisonRoutes);
router.use('/expenses', expenseRoutes);
router.use('/contracts', contractRoutes);
router.use('/finance-dashboard', financeDashboardRoutes);

// Assets & Licenses
router.use('/asset-categories', assetCategoryRoutes);
router.use('/assets', assetRoutes);
router.use('/software-licenses', softwareLicenseRoutes);

// Project Management
router.use('/projects', projectRoutes);
router.use('/project-tasks', projectTaskRoutes);
router.use('/tasks', taskRoutes);

// Change Management (GMUD)
router.use('/changes', changeRequestRoutes);
router.use('/change-templates', changeTemplateRoutes);
router.use('/freeze-windows', freezeWindowRoutes);

// Incident Management (ITIL)
router.use('/incidents', incidentRoutes);

// Help Desk & Service Management
router.use('/tickets', ticketRoutes);
router.use('/service-catalog', serviceCatalogRoutes);
router.use('/sla-policies', slaPolicyRoutes);
router.use('/problems', problemRoutes);
router.use('/helpdesk-config', helpdeskConfigRoutes);
router.use('/support-groups', supportGroupRoutes);

// Governance & Compliance
router.use('/corporate-risks', corporateRiskRoutes);
router.use('/approvals', approvalRoutes);
router.use('/approval-tiers', approvalTierRoutes);
router.use('/audit-logs', auditLogRoutes);

// Knowledge & Communication
router.use('/knowledge-base', knowledgeBaseRoutes);
router.use('/knowledge-categories', knowledgeCategoryRoutes);
router.use('/notifications', notificationRoutes);

// Infrastructure & Admin
router.use('/dashboard', dashboardRoutes);
router.use('/integrations', integrationRoutes);
router.use('/uploads', uploadRoutes);
router.use('/reference', referenceRoutes);
router.use('/global-settings', globalSettingRoutes);

module.exports = router;
