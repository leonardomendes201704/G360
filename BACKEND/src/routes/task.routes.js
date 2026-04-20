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
const { createTaskSchema, updateTaskSchema, GENERAL_TASK_STATUSES } = require('../validators/task.validator');
const { normalizeStatusForApi } = require('../validators/project-task.validator');

const router = express.Router();
const uploadTasks = createUpload('tasks'); // Salva em uploads/tasks

const STATUS_ONLY = 'status-only';

/**
 * Kanban / drag: paridade com project-task.routes (validateProjectTaskUpdate).
 * - `?update=status-only` força validação mínima sem Yup (evita 422 com ON_HOLD / clientes com corpo "sujo").
 * - Corpo pode ser reduzido a só `status` quando a intenção é explícita.
 */
const validateGeneralTaskUpdate = (req, res, next) => {
    let b = req.body;
    const isHeaderStatusOnly = String(req.get('X-Task-Update') || '').toLowerCase() === STATUS_ONLY;
    const isQueryStatusOnly = String(req.query?.update || '').toLowerCase() === STATUS_ONLY;
    const isStatusOnlyIntent = isHeaderStatusOnly || isQueryStatusOnly;

    if (b != null && typeof b === 'object' && !Array.isArray(b)) {
        const k = Object.keys(b);
        if (k.length === 1) {
            const name = k[0];
            if (name && name.toLowerCase() === 'status' && name !== 'status') {
                req.body = { status: b[name] };
                b = req.body;
            }
        }
    }
    b = req.body;

    if (isStatusOnlyIntent && b != null && typeof b === 'object' && !Array.isArray(b) && b.status != null) {
        const v = b.status;
        const text = typeof v === 'string' ? v : String(v);
        req.body = { status: text };
        b = req.body;
    }
    b = req.body;

    const keys = b && typeof b === 'object' && !Array.isArray(b) ? Object.keys(b) : [];
    const onlyStatus =
        isStatusOnlyIntent ||
        (keys.length === 1 && keys[0] === 'status' && Object.prototype.hasOwnProperty.call(b, 'status'));

    if (onlyStatus) {
        if (b == null || typeof b !== 'object' || Array.isArray(b) || !Object.prototype.hasOwnProperty.call(b, 'status')) {
            return res.status(422).json({
                status: 'error',
                statusCode: 422,
                errorCode: 'VALIDATION_ERROR',
                message: 'Status é obrigatório',
                errors: [{ field: 'status', message: 'Status é obrigatório' }],
            });
        }
        if (b.status == null || b.status === '') {
            return res.status(422).json({
                status: 'error',
                statusCode: 422,
                errorCode: 'VALIDATION_ERROR',
                message: 'Status é obrigatório',
                errors: [{ field: 'status', message: 'Status é obrigatório' }],
            });
        }
        const keyList = Object.keys(b);
        if (keyList.length !== 1) {
            return res.status(422).json({
                status: 'error',
                statusCode: 422,
                errorCode: 'VALIDATION_ERROR',
                message: 'Apenas o campo status é permitido para esta operação.',
                errors: [{ field: '_', message: 'Apenas o campo status é permitido para esta operação.' }],
            });
        }
        const normalized = normalizeStatusForApi(String(b.status));
        if (!GENERAL_TASK_STATUSES.includes(normalized)) {
            return res.status(422).json({
                status: 'error',
                statusCode: 422,
                errorCode: 'VALIDATION_ERROR',
                message: 'Status inválido',
                errors: [{ field: 'status', message: 'Status inválido' }],
            });
        }
        req.body = { status: normalized };
        return next();
    }
    return validate(updateTaskSchema)(req, res, next);
};

router.use(authMiddleware);

// --- TIME TRACKING (rotas fixas ANTES das rotas com :id) ---
router.get('/time-report', authorize('TASKS', 'READ'), TaskTimeController.report);
router.get('/time-report/export', authorize('TASKS', 'READ'), TaskTimeController.exportReport);
router.get('/time/active', authorize('TASKS', 'READ'), TaskTimeController.active);

// --- TAREFAS ---
router.get('/', authorize('TASKS', 'READ'), TaskController.index);
router.get('/:id', authorize('TASKS', 'READ'), TaskController.show);
router.post('/', authorize('TASKS', 'WRITE'), validate(createTaskSchema), audit('TAREFAS'), TaskController.create);
router.put('/:id', authorize('TASKS', 'WRITE'), validateGeneralTaskUpdate, audit('TAREFAS'), TaskController.update);
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