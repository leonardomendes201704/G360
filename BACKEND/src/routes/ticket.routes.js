const express = require('express');
const router = express.Router();
const TicketController = require('../controllers/ticket.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize, authorizeAny } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

router.use(authMiddleware);

// Abertura de chamado (portal)
router.post('/', authorize('HELPDESK', 'CREATE'), audit('HELPDESK'), TicketController.create);

// Lista: fila global (VIEW_QUEUE) ou apenas próprios (READ)
router.get('/', authorizeAny('HELPDESK', ['READ', 'VIEW_QUEUE']), TicketController.index);

// Métricas (MTTR, fila, SLA) — fila global ou âmbito de gestor (READ + diretor/CC)
router.get(
  '/metrics/overview',
  authorizeAny('HELPDESK', ['READ', 'VIEW_QUEUE']),
  TicketController.metrics
);

// Export CSV (fila)
router.get('/export', authorize('HELPDESK', 'VIEW_QUEUE'), TicketController.exportCsv);

// Detalhe: participante ou fila global
router.get('/:id', authorizeAny('HELPDESK', ['READ', 'VIEW_QUEUE']), TicketController.show);

// Triagem: prioridade, responsável, categoria
router.patch('/:id', authorize('HELPDESK', 'UPDATE_STATUS'), audit('HELPDESK'), TicketController.update);

// CSAT (solicitante)
router.post(
  '/:id/satisfaction',
  authorizeAny('HELPDESK', ['READ', 'CREATE']),
  audit('HELPDESK'),
  TicketController.submitCsat
);

// Mensagens: participante ou agente; permissão base HELPDESK
router.post(
    '/:id/messages',
    authorizeAny('HELPDESK', ['READ', 'CREATE', 'MESSAGE', 'VIEW_QUEUE']),
    audit('HELPDESK'),
    TicketController.addMessage
);

// Transições de status / SLA
router.patch('/:id/status', authorize('HELPDESK', 'UPDATE_STATUS'), audit('HELPDESK'), TicketController.updateStatus);

router.post('/:id/escalate/problem', authorize('HELPDESK', 'ESCALATE_PROBLEM'), audit('HELPDESK'), TicketController.escalateProblem);
router.post('/:id/escalate/change', authorize('HELPDESK', 'ESCALATE_CHANGE'), audit('HELPDESK'), TicketController.escalateChange);
router.post('/:id/escalate/project', authorize('HELPDESK', 'ESCALATE_PROJECT'), audit('HELPDESK'), TicketController.escalateProject);

module.exports = router;
