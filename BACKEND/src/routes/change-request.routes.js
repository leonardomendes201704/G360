const express = require('express');
const ChangeRequestController = require('../controllers/change-request.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { audit } = require('../middlewares/audit.middleware');
const { validateUploadedFile } = require('../middlewares/upload-validator.middleware');
const { createChangeRequestSchema, updateChangeRequestSchema } = require('../validators/change-request.validator');

const ChangeAttachmentController = require('../controllers/change-attachment.controller');
const createUpload = require('../config/upload');
const uploadAttachments = createUpload('change-requests');

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorize('GMUD', 'READ'), ChangeRequestController.index);
router.post('/', authorize('GMUD', 'CREATE'), validate(createChangeRequestSchema), audit('GMUD'), ChangeRequestController.create);

// --- GOVERNANCE: Schedule Conflict Detection & FSC ---
router.get('/schedule/conflicts', authorize('GMUD', 'SCHEDULE'), ChangeRequestController.checkConflicts);
router.get('/schedule/forward', authorize('GMUD', 'SCHEDULE'), ChangeRequestController.getForwardSchedule);
router.get('/schedule/high-concentration', authorize('GMUD', 'SCHEDULE'), ChangeRequestController.getHighConcentrationDays);

// --- METRICS: Dashboard e Relatórios ---
router.get('/metrics', authorize('GMUD', 'READ'), ChangeRequestController.getMetrics);
router.get('/metrics/pir', authorize('GMUD', 'READ'), ChangeRequestController.getPIRReport);
router.get('/metrics/trends', authorize('GMUD', 'READ'), ChangeRequestController.getTrends);

// CRUD
router.get('/:id', authorize('GMUD', 'READ'), ChangeRequestController.show);
router.put('/:id', authorize('GMUD', 'EDIT_CHANGE'), validate(updateChangeRequestSchema), audit('GMUD'), ChangeRequestController.update);
router.delete('/:id', authorize('GMUD', 'DELETE'), audit('GMUD'), ChangeRequestController.delete);

router.post('/:id/approvers', authorize('GMUD', 'APPROVE'), audit('GMUD'), ChangeRequestController.addApprover);
router.post('/:id/review', authorize('GMUD', 'APPROVE'), audit('GMUD'), ChangeRequestController.review);

// --- ANEXOS ---
router.post('/:changeId/attachments', authorize('GMUD', 'ATTACH'), uploadAttachments, validateUploadedFile, audit('GMUD'), ChangeAttachmentController.create);
router.get('/:changeId/attachments', authorize('GMUD', 'READ'), ChangeAttachmentController.index);
router.delete('/attachments/:id', authorize('GMUD', 'ATTACH'), audit('GMUD'), ChangeAttachmentController.delete);

module.exports = router;
