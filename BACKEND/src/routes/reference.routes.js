/**
 * Reference Routes — dados leves para lookups (dropdowns), cada rota amarrada ao módulo correspondente.
 */

const express = require('express');
const ReferenceController = require('../controllers/reference.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize, authorizeSome } = require('../middlewares/permission.middleware');
const { tenantResolver } = require('../middlewares/tenant-resolver.middleware');
const { referenceLimiter } = require('../middlewares/rate-limit.middleware');

const router = express.Router();

/** Quem pode pedir centros de custo escopados ao usuário (formulários operacionais). */
const REFERENCE_MY_COST_CENTER_PERMISSIONS = [
    { module: 'CONFIG', action: 'READ' },
    { module: 'FINANCE', action: 'READ' },
    { module: 'HELPDESK', action: 'READ' },
    { module: 'HELPDESK', action: 'CREATE' },
    { module: 'HELPDESK', action: 'VIEW_QUEUE' },
    { module: 'INCIDENT', action: 'READ' },
    { module: 'PROJECTS', action: 'READ' },
    { module: 'TASKS', action: 'READ' },
    { module: 'GMUD', action: 'READ' },
    { module: 'CONTRACTS', action: 'READ' },
    { module: 'ASSETS', action: 'READ' },
    { module: 'RISKS', action: 'READ' },
    { module: 'PROBLEM', action: 'READ' },
];

/** Lista mínima de usuários para atribuição (dropdowns) — quem cria tarefa/incidente/projeto precisa ver a equipe sem ser admin de Config. */
const REFERENCE_USERS_FOR_ASSIGNMENT_PERMISSIONS = [
    { module: 'CONFIG', action: 'READ' },
    { module: 'TASKS', action: 'READ' },
    { module: 'TASKS', action: 'WRITE' },
    { module: 'PROJECTS', action: 'READ' },
    { module: 'PROJECTS', action: 'CREATE' },
    { module: 'INCIDENT', action: 'READ' },
    { module: 'INCIDENT', action: 'WRITE' },
    { module: 'HELPDESK', action: 'READ' },
    { module: 'HELPDESK', action: 'CREATE' },
    { module: 'HELPDESK', action: 'VIEW_QUEUE' },
    { module: 'RISKS', action: 'READ' },
    { module: 'RISKS', action: 'WRITE' },
    { module: 'PROBLEM', action: 'READ' },
    { module: 'GMUD', action: 'READ' },
    { module: 'GMUD', action: 'WRITE' },
    { module: 'ASSETS', action: 'READ' },
    { module: 'CONTRACTS', action: 'READ' },
    { module: 'FINANCE', action: 'READ' },
];

router.use(authMiddleware);
router.use(tenantResolver());
router.use(referenceLimiter);

router.get('/suppliers', authorize('SUPPLIERS', 'READ'), ReferenceController.getSuppliers);
router.get('/accounts', authorize('FINANCE', 'READ'), ReferenceController.getAccounts);
router.get('/cost-centers', authorize('CONFIG', 'READ'), ReferenceController.getCostCenters);
router.get('/my-cost-centers', authorizeSome(REFERENCE_MY_COST_CENTER_PERMISSIONS), ReferenceController.getMyCostCenters);
router.get('/contracts', authorize('CONTRACTS', 'READ'), ReferenceController.getContracts);
router.get('/users', authorizeSome(REFERENCE_USERS_FOR_ASSIGNMENT_PERMISSIONS), ReferenceController.getUsers);

module.exports = router;
