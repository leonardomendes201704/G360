const express = require('express');
const router = express.Router();
const CorporateRiskController = require('../controllers/corporate-risk.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

router.use(authMiddleware);

router.get('/', authorize('RISKS', 'READ'), CorporateRiskController.findAll);
router.get('/metrics/heatmap', authorize('RISKS', 'READ'), CorporateRiskController.getHeatmap);
router.get('/:id', authorize('RISKS', 'READ'), CorporateRiskController.findById);
router.post('/', authorize('RISKS', 'CREATE'), audit('RISKS'), CorporateRiskController.create);
router.put('/:id', authorize('RISKS', 'EDIT_RISK'), audit('RISKS'), CorporateRiskController.update);
router.delete('/:id', authorize('RISKS', 'DELETE'), audit('RISKS'), CorporateRiskController.delete);

module.exports = router;
