const express = require('express');
const KnowledgeBaseController = require('../controllers/knowledge-base.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const createUpload = require('../config/upload');
const { sanitizeRichText } = require('../middlewares/sanitize.middleware');
const { validateUploadedFile } = require('../middlewares/upload-validator.middleware');
const { audit } = require('../middlewares/audit.middleware');

const router = express.Router();

// Configure upload middleware with the folder 'knowledge'
const upload = createUpload('knowledge');

// Rich text fields que aceitam HTML seguro
const richTextSanitizer = sanitizeRichText(['content', 'description']);

// All routes require authentication
router.use(authMiddleware);

// --- Knowledge Base Routes ---

// Dashboard & Stats - READ permission
router.get('/dashboard', authorize('KB', 'READ'), KnowledgeBaseController.getDashboardStats);

// List - READ permission
router.get('/', authorize('KB', 'READ'), KnowledgeBaseController.index);

// Create - WRITE permission (with rich text sanitize + upload validation)
router.post('/', authorize('KB', 'CREATE'), upload, validateUploadedFile, richTextSanitizer, audit('KB'), KnowledgeBaseController.create);

// Update - WRITE permission
router.put('/:id', authorize('KB', 'EDIT_ARTICLE'), upload, validateUploadedFile, richTextSanitizer, audit('KB'), KnowledgeBaseController.update);

// Show - READ permission
router.get('/:id', authorize('KB', 'READ'), KnowledgeBaseController.show);

// Delete - DELETE permission
router.delete('/:id', authorize('KB', 'DELETE'), audit('KB'), KnowledgeBaseController.delete);

module.exports = router;
