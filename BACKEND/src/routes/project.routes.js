const express = require('express');
const ProjectController = require('../controllers/project.controller');
const ProjectDetailsController = require('../controllers/project-details.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const createUpload = require('../config/upload');
const { validateUploadedFile } = require('../middlewares/upload-validator.middleware');
const { audit } = require('../middlewares/audit.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createProjectSchema, updateProjectSchema } = require('../validators/project.validator');

const router = express.Router();
const upload = createUpload('projects');

router.use(authMiddleware);

// --- Rotas Base do Projeto ---
router.get('/', authorize('PROJECTS', 'READ'), ProjectController.index);
router.post('/', authorize('PROJECTS', 'CREATE'), validate(createProjectSchema), audit('PROJECTS'), ProjectController.create);
router.get('/:id', authorize('PROJECTS', 'READ'), ProjectController.show);
router.put('/:id', authorize('PROJECTS', 'WRITE'), validate(updateProjectSchema), audit('PROJECTS'), ProjectController.update);
router.delete('/:id', authorize('PROJECTS', 'DELETE_PROJECT'), audit('PROJECTS'), ProjectController.delete);

// --- Membros ---
router.post('/:id/members', authorize('PROJECTS', 'WRITE'), ProjectController.addMember);
router.put('/:id/members/:userId', authorize('PROJECTS', 'WRITE'), ProjectController.updateMember);
router.delete('/:id/members/:userId', authorize('PROJECTS', 'DELETE'), ProjectController.removeMember);

// --- Workflow de Aprovação ---
router.post('/:id/submit-approval', authorize('PROJECTS', 'WRITE'), ProjectController.submitForApproval);
router.post('/:id/approve', authorize('PROJECTS', 'APPROVE_BASELINE'), ProjectController.approveProject);
router.post('/:id/reject', authorize('PROJECTS', 'APPROVE_BASELINE'), ProjectController.rejectProject);

// --- ROTAS DE DETALHES (ABAS) ---

// 1. Riscos
router.get('/:id/risks', authorize('PROJECTS', 'READ'), ProjectDetailsController.getRisks);
router.post('/:id/risks', authorize('PROJECTS', 'WRITE'), ProjectDetailsController.createRisk);
router.put('/:id/risks/:riskId', authorize('PROJECTS', 'WRITE'), ProjectDetailsController.updateRisk);
router.delete('/:id/risks/:riskId', authorize('PROJECTS', 'DELETE'), ProjectDetailsController.deleteRisk);

// 2. Atas de Reunião
router.get('/:id/minutes', authorize('PROJECTS', 'READ'), ProjectDetailsController.getMinutes);
router.post('/:id/minutes', authorize('PROJECTS', 'WRITE'), upload, validateUploadedFile, audit('PROJECTS'), ProjectDetailsController.uploadMinute);
router.put('/:id/minutes/:minuteId', authorize('PROJECTS', 'WRITE'), upload, validateUploadedFile, audit('PROJECTS'), ProjectDetailsController.updateMinute);
router.delete('/:id/minutes/:minuteId', authorize('PROJECTS', 'DELETE'), audit('PROJECTS'), ProjectDetailsController.deleteMinute);

// Aprovação de Atas
router.post('/:id/minutes/:minuteId/submit', authorize('PROJECTS', 'WRITE'), ProjectDetailsController.submitMinute);
router.post('/:id/minutes/:minuteId/approve', authorize('PROJECTS', 'WRITE'), ProjectDetailsController.approveMinute);
router.post('/:id/minutes/:minuteId/reject', authorize('PROJECTS', 'WRITE'), ProjectDetailsController.rejectMinute);


// 3. Propostas
router.get('/:id/proposals', authorize('PROJECTS', 'READ'), ProjectDetailsController.getProposals);
router.post('/:id/proposals', authorize('PROJECTS', 'WRITE'), upload, validateUploadedFile, audit('PROJECTS'), ProjectDetailsController.createProposal);
router.put('/:id/proposals/:proposalId', authorize('PROJECTS', 'WRITE'), ProjectDetailsController.updateProposal);
router.delete('/:id/proposals/:proposalId', authorize('PROJECTS', 'DELETE'), ProjectDetailsController.deleteProposal);
router.post('/:id/proposals/:proposalId/submit', authorize('PROJECTS', 'WRITE'), ProjectDetailsController.submitProposal);

// Condição comercial e geração de custos
router.post('/:id/proposals/:proposalId/payment-condition', authorize('PROJECTS', 'WRITE'), ProjectDetailsController.setPaymentCondition);
router.post('/:id/proposals/:proposalId/generate-costs', authorize('PROJECTS', 'WRITE'), ProjectDetailsController.generateCostsFromProposal);

// 4. Follow-Up Semanal
router.get('/:id/followups', authorize('PROJECTS', 'READ'), ProjectDetailsController.getFollowUps);
router.post('/:id/followups', authorize('PROJECTS', 'WRITE'), ProjectDetailsController.createFollowUp);
router.put('/:id/followups/:followUpId', authorize('PROJECTS', 'WRITE'), ProjectDetailsController.updateFollowUp);
router.delete('/:id/followups/:followUpId', authorize('PROJECTS', 'DELETE'), ProjectDetailsController.deleteFollowUp);
router.post('/:id/followups/:followUpId/complete', authorize('PROJECTS', 'WRITE'), ProjectDetailsController.completeFollowUp);
router.post('/:id/followups/:followUpId/reschedule', authorize('PROJECTS', 'WRITE'), ProjectDetailsController.rescheduleFollowUp);

// 5. Atividades Recentes
router.get('/:id/activities', authorize('PROJECTS', 'READ'), ProjectDetailsController.getActivities);

// 6. Custos do Projeto
router.get('/:id/costs', authorize('PROJECTS', 'READ'), ProjectDetailsController.getCosts);
router.post('/:id/costs', authorize('PROJECTS', 'WRITE'), upload, validateUploadedFile, audit('PROJECTS'), ProjectDetailsController.createCost);
router.put('/:id/costs/:costId', authorize('PROJECTS', 'WRITE'), upload, validateUploadedFile, audit('PROJECTS'), ProjectDetailsController.updateCost);
router.delete('/:id/costs/:costId', authorize('PROJECTS', 'DELETE'), audit('PROJECTS'), ProjectDetailsController.deleteCost);

// Workflow de aprovação de custos
router.post('/:id/costs/:costId/submit', authorize('PROJECTS', 'WRITE'), upload, validateUploadedFile, audit('PROJECTS'), ProjectDetailsController.submitCostForApproval);
router.post('/:id/costs/:costId/approve', authorize('PROJECTS', 'APPROVE_FINANCIAL'), ProjectDetailsController.approveCost);
router.post('/:id/costs/:costId/reject', authorize('PROJECTS', 'APPROVE_FINANCIAL'), ProjectDetailsController.rejectCost);

module.exports = router;