const express = require('express');
const IncidentController = require('../controllers/incident.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { audit } = require('../middlewares/audit.middleware');
const { validateUploadedFile } = require('../middlewares/upload-validator.middleware');
const {
    createIncidentSchema, updateIncidentSchema,
    resolveIncidentSchema, assignIncidentSchema,
    addCommentSchema, createCategorySchema
} = require('../validators/incident.validator');

// Upload config
const createUpload = require('../config/upload');
const uploadIncidents = createUpload('incidents');

const router = express.Router();

// Autenticação obrigatória
router.use(authMiddleware);

// --- KPIs e Categorias (antes de rotas com :id) ---
router.get('/kpis', authorize('INCIDENT', 'READ'), IncidentController.getKPIs);
router.get('/categories', authorize('INCIDENT', 'READ'), IncidentController.getCategories);
router.post('/categories', authorize('INCIDENT', 'WRITE'), validate(createCategorySchema), audit('INCIDENT'), IncidentController.createCategory);
router.put('/categories/:id', authorize('INCIDENT', 'WRITE'), audit('INCIDENT'), IncidentController.updateCategory);

// --- CRUD Principal ---
router.get('/', authorize('INCIDENT', 'READ'), IncidentController.index);
router.post('/', authorize('INCIDENT', 'WRITE'), validate(createIncidentSchema), audit('INCIDENT'), IncidentController.create);
router.get('/:id', authorize('INCIDENT', 'READ'), IncidentController.show);
router.put('/:id', authorize('INCIDENT', 'WRITE'), validate(updateIncidentSchema), audit('INCIDENT'), IncidentController.update);
router.delete('/:id', authorize('INCIDENT', 'DELETE'), audit('INCIDENT'), IncidentController.destroy);

// --- Ações de Workflow ---
router.post('/:id/assign', authorize('INCIDENT', 'WRITE'), validate(assignIncidentSchema), audit('INCIDENT'), IncidentController.assign);
router.post('/:id/resolve', authorize('INCIDENT', 'WRITE'), validate(resolveIncidentSchema), audit('INCIDENT'), IncidentController.resolve);
router.post('/:id/close', authorize('INCIDENT', 'WRITE'), audit('INCIDENT'), IncidentController.close);
router.post('/:id/escalate', authorize('INCIDENT', 'ESCALATE'), audit('INCIDENT'), IncidentController.escalate);

// --- Comentários ---
router.get('/:id/comments', authorize('INCIDENT', 'READ'), IncidentController.getComments);
router.post('/:id/comments', authorize('INCIDENT', 'WRITE'), validate(addCommentSchema), audit('INCIDENT'), IncidentController.addComment);

// --- Histórico ---
router.get('/:id/history', authorize('INCIDENT', 'READ'), IncidentController.getHistory);

// --- Anexos ---
router.get('/:id/attachments', authorize('INCIDENT', 'READ'), IncidentController.getAttachments);
router.post('/:id/attachments', authorize('INCIDENT', 'WRITE'), uploadIncidents, validateUploadedFile, audit('INCIDENT'), IncidentController.uploadAttachment);
router.delete('/attachments/:id', authorize('INCIDENT', 'DELETE'), audit('INCIDENT'), IncidentController.deleteAttachment);

module.exports = router;
