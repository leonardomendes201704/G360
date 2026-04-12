const express = require('express');
const ProjectTaskController = require('../controllers/project-task.controller');
const ProjectTaskCommentController = require('../controllers/project-task-comment.controller');
const ProjectTaskAttachmentController = require('../controllers/project-task-attachment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const createUpload = require('../config/upload');
const { audit } = require('../middlewares/audit.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createProjectTaskSchema, updateProjectTaskSchema } = require('../validators/project-task.validator');
const { authorize } = require('../middlewares/permission.middleware');

const router = express.Router();
const uploadTasks = createUpload('project-tasks');

router.use(authMiddleware);

router.post('/', authorize('PROJECTS', 'WRITE'), validate(createProjectTaskSchema), audit('TASKS'), ProjectTaskController.create);
router.get('/project/:projectId', authorize('PROJECTS', 'READ'), ProjectTaskController.indexByProject);
router.put('/:id', authorize('PROJECTS', 'WRITE'), validate(updateProjectTaskSchema), audit('TASKS'), ProjectTaskController.update);
router.delete('/:id', authorize('PROJECTS', 'DELETE'), audit('TASKS'), ProjectTaskController.delete);

router.get('/:taskId/comments', authorize('PROJECTS', 'READ'), ProjectTaskCommentController.index);
router.post('/:taskId/comments', authorize('PROJECTS', 'WRITE'), audit('TASKS'), ProjectTaskCommentController.create);
router.delete('/comments/:id', authorize('PROJECTS', 'DELETE'), audit('TASKS'), ProjectTaskCommentController.delete);

router.get('/:taskId/attachments', authorize('PROJECTS', 'READ'), ProjectTaskAttachmentController.index);
router.post('/:taskId/attachments', authorize('PROJECTS', 'WRITE'), uploadTasks, audit('TASKS'), ProjectTaskAttachmentController.create);
router.delete('/attachments/:id', authorize('PROJECTS', 'DELETE'), audit('TASKS'), ProjectTaskAttachmentController.delete);

module.exports = router;
