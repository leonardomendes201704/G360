const express = require('express');
const ContractController = require('../controllers/contract.controller');
const ContractDetailsController = require('../controllers/contract-details.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const createUpload = require('../config/upload');
const { audit } = require('../middlewares/audit.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createContractSchema, updateContractSchema } = require('../validators/contract.validator');

const router = express.Router();
const upload = createUpload('contracts'); // Pasta uploads/contracts

router.use(authMiddleware);

// --- Rotas Principais (CRUD Contrato) ---
router.get('/', authorize('CONTRACTS', 'READ'), ContractController.index);
router.get('/:id', authorize('CONTRACTS', 'READ'), ContractController.show);
router.post('/', authorize('CONTRACTS', 'CREATE'), validate(createContractSchema), audit('CONTRACTS'), ContractController.create);
router.put('/:id', authorize('CONTRACTS', 'EDIT_CONTRACT'), validate(updateContractSchema), audit('CONTRACTS'), ContractController.update);
router.delete('/:id', authorize('CONTRACTS', 'DELETE'), audit('CONTRACTS'), ContractController.delete);

// --- ANEXOS ---
router.get('/:id/attachments', authorize('CONTRACTS', 'READ'), ContractDetailsController.getAttachments);
router.post('/:id/attachments', authorize('CONTRACTS', 'ATTACH'), upload, audit('CONTRACTS'), ContractDetailsController.uploadAttachment);
router.delete('/attachments/:attachmentId', authorize('CONTRACTS', 'ATTACH'), audit('CONTRACTS'), ContractDetailsController.deleteAttachment);

// --- ADITIVOS ---
router.get('/:id/addendums', authorize('CONTRACTS', 'READ'), ContractDetailsController.getAddendums);
router.post('/:id/addendums', authorize('CONTRACTS', 'ADDENDUM'), upload, audit('CONTRACTS'), ContractDetailsController.createAddendum);
router.put('/addendums/:addendumId', authorize('CONTRACTS', 'ADDENDUM'), upload, audit('CONTRACTS'), ContractDetailsController.updateAddendum);
router.delete('/addendums/:addendumId', authorize('CONTRACTS', 'ADDENDUM'), audit('CONTRACTS'), ContractDetailsController.deleteAddendum);

module.exports = router;