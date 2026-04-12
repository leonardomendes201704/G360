const express = require('express');
const DepartmentController = require('../controllers/department.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorize('CONFIG', 'READ'), DepartmentController.index);
router.post('/', authorize('CONFIG', 'WRITE'), audit('CONFIG'), DepartmentController.create);
router.put('/:id', authorize('CONFIG', 'WRITE'), audit('CONFIG'), DepartmentController.update);
router.delete('/:id', authorize('CONFIG', 'DELETE'), audit('CONFIG'), DepartmentController.delete);

module.exports = router;