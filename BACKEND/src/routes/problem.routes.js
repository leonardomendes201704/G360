const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const ProblemController = require('../controllers/problem.controller');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/', authorize('PROBLEM', 'READ'), ProblemController.index);
router.get('/:id', authorize('PROBLEM', 'READ'), ProblemController.show);
router.post('/', authorize('PROBLEM', 'DECLARE'), audit('PROBLEM'), ProblemController.create);
router.patch('/:id/status', authorize('PROBLEM', 'MASS_RESOLUTION'), audit('PROBLEM'), ProblemController.updateStatus);
router.post('/:id/link', authorize('PROBLEM', 'LINK_ORPHANS'), audit('PROBLEM'), ProblemController.linkIncident);

module.exports = router;
