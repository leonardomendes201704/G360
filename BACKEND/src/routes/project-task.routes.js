const express = require('express');
const ProjectTaskController = require('../controllers/project-task.controller');
const ProjectTaskCommentController = require('../controllers/project-task-comment.controller');
const ProjectTaskAttachmentController = require('../controllers/project-task-attachment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const createUpload = require('../config/upload');
const { audit } = require('../middlewares/audit.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
    createProjectTaskSchema,
    updateProjectTaskSchema,
    normalizeStatusForApi,
} = require('../validators/project-task.validator');
const { authorize } = require('../middlewares/permission.middleware');

const router = express.Router();
const uploadTasks = createUpload('project-tasks');

/** Igual a `PROJECT_TASK_STATUSES` no validador; literal aqui para o `PUT` status-only não depender de módulo em cache. */
const STATUS_ALLOW = Object.freeze([
    'BACKLOG',
    'TODO',
    'ON_HOLD',
    'IN_PROGRESS',
    'REVIEW',
    'DONE',
    'ARCHIVED',
    'CANCELLED',
]);

/**
 * Kanban: corpo `{ status }` só — validador mínimo (evita 422 de nulls noutros campos).
 * Modal: mais chaves — `updateProjectTaskSchema` (PUT é sempre o mesmo: `/project-tasks/:id`, nunca outra rota).
 */
const STATUS_ONLY_HEADER = 'status-only';

const validateProjectTaskUpdate = (req, res, next) => {
    let b = req.body;
    const isHeaderStatusOnly = String(req.get('X-Project-Task-Update') || '')
        .toLowerCase() === STATUS_ONLY_HEADER;
    // Query evita CORS (preflight a bloquear cabeçalho custom) — preferir no browser
    const isQueryStatusOnly = String(req.query?.update || '')
        .toLowerCase() === STATUS_ONLY_HEADER;
    const isStatusOnlyIntent = isHeaderStatusOnly || isQueryStatusOnly;

    // Corpo com uma única chave (ex.: "Status" em vez de "status") — alinhar a `status` para o Yup
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
    // Kanban / drag: `?update=status-only` ou header; pode existir lixo/echo no corpo; usar só { status }.
    if (isStatusOnlyIntent && b != null && typeof b === 'object' && !Array.isArray(b) && b.status != null) {
        const v = b.status;
        const text = typeof v === 'string' ? v : String(v);
        req.body = { status: text };
        b = req.body;
    }
    b = req.body;
    // Qualquer corpo { status } (uma chave) OU intenção explícita via query/header: não usar Yup.
    // O Kanban manda { status } sem o Yup 1.7 que em alguns nós 422; não depender de ?query em cache antigo.
    const keys = b && typeof b === 'object' && !Array.isArray(b) ? Object.keys(b) : [];
    const onlyStatus =
        isStatusOnlyIntent ||
        (keys.length === 1 && keys[0] === 'status' && Object.prototype.hasOwnProperty.call(b, 'status'));
    if (onlyStatus) {
        // Não passar por Yup (yup 1.7+ em alguns processos ainda 422 a "ON_HOLD" válido); validar aqui
        b = req.body;
        if (b == null || typeof b !== 'object' || Array.isArray(b) || !Object.prototype.hasOwnProperty.call(b, 'status')) {
            return res.status(422).json({
                status: 'error',
                statusCode: 422,
                errorCode: 'VALIDATION_ERROR',
                message: 'Status é obrigatório',
                errors: [{ field: 'status', message: 'Status é obrigatório' }],
            });
        }
        if (b.status == null) {
            return res.status(422).json({
                status: 'error',
                statusCode: 422,
                errorCode: 'VALIDATION_ERROR',
                message: 'Status é obrigatório',
                errors: [{ field: 'status', message: 'Status é obrigatório' }],
            });
        }
        const k = Object.keys(b);
        if (k.length !== 1) {
            return res.status(422).json({
                status: 'error',
                statusCode: 422,
                errorCode: 'VALIDATION_ERROR',
                message: 'Apenas o campo status é permitido para esta operação.',
                errors: [
                    { field: '_', message: 'Apenas o campo status é permitido para esta operação.' },
                ],
            });
        }
        const normalized = normalizeStatusForApi(String(b.status));
        if (!STATUS_ALLOW.includes(normalized)) {
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
    return validate(updateProjectTaskSchema)(req, res, next);
};

router.use(authMiddleware);

router.post('/', authorize('PROJECTS', 'WRITE'), validate(createProjectTaskSchema), audit('TASKS'), ProjectTaskController.create);
router.get('/project/:projectId', authorize('PROJECTS', 'READ'), ProjectTaskController.indexByProject);
router.put('/:id', authorize('PROJECTS', 'WRITE'), validateProjectTaskUpdate, audit('TASKS'), ProjectTaskController.update);
router.delete('/:id', authorize('PROJECTS', 'DELETE'), audit('TASKS'), ProjectTaskController.delete);

router.get('/:taskId/comments', authorize('PROJECTS', 'READ'), ProjectTaskCommentController.index);
router.post('/:taskId/comments', authorize('PROJECTS', 'WRITE'), audit('TASKS'), ProjectTaskCommentController.create);
router.delete('/comments/:id', authorize('PROJECTS', 'DELETE'), audit('TASKS'), ProjectTaskCommentController.delete);

router.get('/:taskId/attachments', authorize('PROJECTS', 'READ'), ProjectTaskAttachmentController.index);
router.post('/:taskId/attachments', authorize('PROJECTS', 'WRITE'), uploadTasks, audit('TASKS'), ProjectTaskAttachmentController.create);
router.delete('/attachments/:id', authorize('PROJECTS', 'DELETE'), audit('TASKS'), ProjectTaskAttachmentController.delete);

module.exports = router;
