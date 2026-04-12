# Inventário — notificações por e-mail (G360 / ITBM)

**Pré-requisito global:** integração **SMTP** activa por tenant (`integration.type = 'SMTP'`, `isEnabled`). Sem isso, `MailService.sendMail` regista skip e não envia.

**Filtro opcional:** em `integration.config.events`, cada `type` pode ser desactivado (`false`) para não enviar esse evento.

**Correção aplicada:** chamadas que passavam só o objecto de opções a `MailService.sendMail` foram corrigidas para `MailService.sendMail(prisma, { ... })` (financeiro, cron de contrato/licença, jobs de notificação). Sem `prisma`, o envio falhava ao resolver SMTP.

---

## Por módulo / origem

| Módulo | Gatilho | `type` (evento) | Destinatário | Template / HTML |
|--------|---------|-------------------|--------------|-----------------|
| **Help Desk / Tickets** | Criação de chamado | `TICKET_CREATED` | Solicitante | `getTicketCreatedTemplate` |
| **Help Desk** | Mudança de estado | `TICKET_STATUS_UPDATED` | Solicitante | `getTicketUpdateTemplate` |
| **Help Desk** | Mensagem pública do agente | `TICKET_MESSAGE` | Solicitante | `getTicketMessageTemplate` |
| **Projetos** | Atribuição Tech Lead / Manager | (sem type em alguns) / uso de `module: 'PROJECTS'` | Tech lead / manager | `getProjectAssignmentTemplate` |
| **Projetos** | Submissão para aprovação | `PROJECT_APPROVAL_REQUEST` | Gestor do CC | HTML inline (TODO template dedicado) |
| **Projetos** | Aprovação de baseline | `PROJECT_APPROVED` | Criador / manager projeto | `getProjectApprovalOutcomeTemplate` |
| **Projetos** | Rejeição / ajustes | `PROJECT_REJECTED` | Criador / manager | `getProjectApprovalOutcomeTemplate` |
| **Tarefas** | Atribuição / reatribuição | `TASK_ASSIGNED` (ver serviço) | Responsável | `getTaskAssignmentTemplate` |
| **Tarefas** | Conclusão | `TASK_COMPLETED` (ver serviço) | Criador | `getTaskCompletionTemplate` |
| **GMUD** | Aprovação pendente / lembrete | `GMUD_APPROVAL` (ver serviço) | Aprovadores | `getGmudApprovalTemplate` |
| **Incidentes** | Criação | `INCIDENT_CREATED` | Reportador / novo assignee | `getIncidentCreatedTemplate` |
| **Incidentes** | Resolução | `INCIDENT_RESOLVED` | Reportador | `getIncidentResolvedTemplate` |
| **Incidentes** | Novo comentário | `INCIDENT_COMMENT` | Destinatários do fluxo | `getNewCommentTemplate` |
| **Contratos** | Criação / actualização relevante | `CONTRACT_*` | Gestor departamento CC | `getContractActionTemplate` |
| **Contratos** | Cron diário (30/15/7 dias) | `CONTRACT_EXPIRY` | Gestor CC | `getContractExpiryTemplate` |
| **Contratos** | Job 09:00 (30 dias) | `CONTRACT_EXPIRING` | Gestor CC | `getContractExpiryTemplate` |
| **Ativos / Licenças** | Registo de licença | (wrapper genérico) | Configurado no serviço | `getWrapper` + conteúdo |
| **Ativos** | Cron diário (por dia) | `LICENSE_EXPIRY` | Super Admin | `getLicenseExpiryTemplate` |
| **Ativos** | Job 09:00 (30 dias) | `LICENSE_EXPIRING` | Super Admin | `getLicenseExpiryTemplate` |
| **Financeiro** | Nova despesa | `EXPENSE_CREATED` | Gestor do departamento do CC | `getExpenseCreatedTemplate` |
| **Financeiro** | Estouro de orçamento | `BUDGET_OVERFLOW` | Mesmo gestor | `getBudgetOverflowTemplate` |
| **Config global** | Teste de e-mail (admin) | — | Manual | `transporter.sendMail` directo em `global-setting.service` |

---

## Módulos sem e-mail transaccional (só in-app ou N/A)

- **Base de conhecimento:** notificações in-app; sem `MailService` dedicado.
- **Aprovações (esteira genérica):** depende dos fluxos por entidade (project/expense/GMUD já cobrem parte).
- **Notificações in-app** (`NotificationService`): campainha; paralelas ao e-mail onde implementado.
- **Help Desk — SLA estourado:** `CronService.checkTicketSLA` cria **notificação in-app** ao assignee; **não** envia e-mail (comentário no código: integração futura).

---

## Jobs / frequência

| Job | Horário | E-mail |
|-----|---------|--------|
| `CronService` | 08:00 | Contratos (limiares), licenças (limiares) |
| `CronService` | */5 | SLA tickets — só in-app |
| `CronService` | * * * * * | IMAP entrada (respostas a chamados) |
| `NotificationJob` | 08:00 | Tarefas atrasadas/próximas — ver código (principalmente in-app) |
| `NotificationJob` | 09:00 | Licenças 30 dias |
| `NotificationJob` | 1º do mês 07:00 | Orçamento (placeholder) |

---

## Inbound (resposta por e-mail → ticket)

Configuração **IMAP** por tenant. Ver `InboundEmailService` e `DOCUMENTACAO.md`. Assunto deve conter `[HD-AAAA-NNNN]` ou `HD-AAAA-NNNN`.

---

*Última revisão: alinhamento de `MailService.sendMail(prisma, …)` e query de admins em `notification.job.js` (roles Super Admin).*
