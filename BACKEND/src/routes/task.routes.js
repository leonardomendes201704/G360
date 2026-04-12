const express = require('express');
const TaskController = require('../controllers/task.controller');
const TaskCommentController = require('../controllers/task-comment.controller');
const TaskAttachmentController = require('../controllers/task-attachment.controller');
const TaskTimeController = require('../controllers/task-time.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const createUpload = require('../config/upload');
const { audit } = require('../middlewares/audit.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createTaskSchema, updateTaskSchema } = require('../validators/task.validator');

const router = express.Router();
const uploadTasks = createUpload('tasks'); // Salva em uploads/tasks

router.use(authMiddleware);

// --- TIME TRACKING (rotas fixas ANTES das rotas com :id) ---
router.get('/time-report', authorize('TASKS', 'READ'), TaskTimeController.report);
router.get('/time-report/export', authorize('TASKS', 'READ'), TaskTimeController.exportReport);
router.get('/time/active', authorize('TASKS', 'READ'), TaskTimeController.active);

// --- TAREFAS ---
router.get('/', authorize('TASKS', 'READ'), TaskController.index);
router.get('/:id', authorize('TASKS', 'READ'), TaskController.show);
router.post('/', authorize('TASKS', 'WRITE'), validate(createTaskSchema), audit('TAREFAS'), TaskController.create);
router.put('/:id', authorize('TASKS', 'WRITE'), validate(updateTaskSchema), audit('TAREFAS'), TaskController.update);
router.delete('/:id', authorize('TASKS', 'DELETE'), audit('TAREFAS'), TaskController.delete);

// --- TIME TRACKING (por tarefa) ---
router.post('/:id/time/start', authorize('TASKS', 'WRITE'), TaskTimeController.start);
router.post('/:id/time/stop', authorize('TASKS', 'WRITE'), TaskTimeController.stop);
router.get('/:id/time', authorize('TASKS', 'READ'), TaskTimeController.history);

// --- COMENTÁRIOS ---
router.get('/:taskId/comments', authorize('TASKS', 'READ'), TaskCommentController.index);
router.post('/:taskId/comments', authorize('TASKS', 'WRITE'), audit('TAREFAS'), TaskCommentController.create);
router.delete('/comments/:id', authorize('TASKS', 'DELETE'), audit('TAREFAS'), TaskCommentController.delete);

// --- ANEXOS ---
router.get('/:taskId/attachments', authorize('TASKS', 'READ'), TaskAttachmentController.index);
router.post('/:taskId/attachments', authorize('TASKS', 'WRITE'), uploadTasks, audit('TAREFAS'), TaskAttachmentController.create);
router.delete('/attachments/:id', authorize('TASKS', 'DELETE'), audit('TAREFAS'), TaskAttachmentController.delete);

module.exports = router;