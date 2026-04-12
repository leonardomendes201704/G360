const express = require('express');
const router = express.Router();
const FreezeWindowController = require('../controllers/freeze-window.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

router.use(authMiddleware);

router.post('/', authorize('GMUD', 'SCHEDULE'), audit('GMUD'), FreezeWindowController.create);
router.get('/', authorize('GMUD', 'SCHEDULE'), FreezeWindowController.getAll);
router.put('/:id', authorize('GMUD', 'SCHEDULE'), audit('GMUD'), FreezeWindowController.update);
router.delete('/:id', authorize('GMUD', 'SCHEDULE'), audit('GMUD'), FreezeWindowController.delete);

module.exports = router;
