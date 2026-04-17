import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rows = [
  [1, 'AccountModal.jsx', 'Plano de contas / conta.', 'Financeiro → contas; criar ou editar.'],
  [2, 'AddendumFormModal.jsx', 'Acréscimo/supressão contratual.', 'Contratos / addendums.'],
  [3, 'AddendumViewModal.jsx', 'Visualização addendum.', 'Abrir addendum existente.'],
  [4, 'AddMemberModal.jsx', 'Membro na equipa.', 'Equipas / projeto → adicionar.'],
  [5, 'ApprovalDetailsModal.jsx', 'Detalhes de aprovação.', 'Aprovações → ver detalhe.'],
  [6, 'AssetCategoryModal.jsx', 'Categoria de ativo.', 'Ativos / categorias.'],
  [7, 'AssetMaintenanceModal.jsx', 'Manutenção de ativo.', 'Ativo → manutenção.'],
  [8, 'AssetModal.jsx', 'Criar/editar ativo.', 'Página ativos.'],
  [9, 'AssetViewModal.jsx', 'Ver ativo.', 'Visualizar ativo.'],
  [10, 'AzureConfigModal.jsx', 'Azure AD (Entra ID).', 'Config → Integrações → Azure.'],
  [11, 'BudgetImportModal.jsx', 'Importar orçamento.', 'Orçamento → importar.'],
  [12, 'BudgetItemModal.jsx', 'Linha de orçamento.', 'Detalhe orçamento → linha.'],
  [13, 'BudgetModal.jsx', 'Orçamento.', 'Módulo orçamentos.'],
  [14, 'ChangeModal.jsx', 'GMUD (mudança).', 'ITSM mudanças → nova/editar.'],
  [15, 'ChangeViewModal.jsx', 'Ver GMUD.', 'Lista mudanças.'],
  [16, 'ContractCreationWizard.jsx', 'Assistente novo contrato.', 'Contratos → novo.'],
  [17, 'ContractModal.jsx', 'Contrato.', 'Contratos.'],
  [18, 'CostCenterModal.jsx', 'Centro de custo.', 'Config / CC.'],
  [19, 'DepartmentModal.jsx', 'Departamento.', 'Organização / dept.'],
  [20, 'ExpenseApprovalModal.jsx', 'Aprovar despesa.', 'Despesas / aprovar.'],
  [21, 'ExpenseModal.jsx', 'Detalhe despesa.', 'Lista despesas.'],
  [22, 'FiscalYearModal.jsx', 'Ano fiscal.', 'Config → ano fiscal.'],
  [23, 'FollowUpModal.jsx', 'Follow-up.', 'Fluxo com follow-up.'],
  [24, 'GlobalRiskModal.jsx', 'Risco (wizard).', 'Riscos.'],
  [25, 'IncidentCreateModal.jsx', 'Criar incidente.', 'ITSM → novo incidente.'],
  [26, 'IncidentModal.jsx', 'Incidente (edição).', 'Abrir incidente.'],
  [27, 'IncidentViewModal.jsx', 'Ver incidente.', 'Lista incidentes.'],
  [28, 'KnowledgeBaseModal.jsx', 'Artigo KB.', 'Base conhecimento.'],
  [29, 'LdapConfigModal.jsx', 'LDAP.', 'Config → LDAP.'],
  [30, 'MemberModal.jsx', 'Membro equipa.', 'Gestão equipa.'],
  [31, 'MinuteModal.jsx', 'Ata.', 'Módulo atas.'],
  [32, 'NotificationsModal.jsx', 'Notificações.', 'Preferências alertas.'],
  [33, 'PaymentConditionModal.jsx', 'Condição pagamento.', 'Cadastros.'],
  [34, 'ProjectModal.jsx', 'Projeto.', 'Projetos.'],
  [35, 'ProjectTaskModal.jsx', 'Tarefa projeto.', 'Projeto → tarefa.'],
  [36, 'ProposalModal.jsx', 'Proposta comercial.', 'Propostas.'],
  [37, 'RescheduleModal.jsx', 'Reagendar.', 'Fluxo reagendar.'],
  [38, 'RiskModal.jsx', 'Risco.', 'Riscos.'],
  [39, 'RiskViewModal.jsx', 'Ver risco.', 'Lista riscos.'],
  [40, 'RoleModal.jsx', 'Perfil (role).', 'Config → perfis.'],
  [41, 'SmtpConfigModal.jsx', 'SMTP.', 'Config email.'],
  [42, 'SubmitExpenseModal.jsx', 'Submeter despesa.', 'Despesas → enviar.'],
  [43, 'SupplierModal.jsx', 'Fornecedor.', 'Fornecedores.'],
  [44, 'SupplierViewModal.jsx', 'Ver fornecedor.', 'Lista.'],
  [45, 'TaskModal.jsx', 'Tarefa.', 'Tarefas.'],
  [46, 'TeamModal.jsx', 'Equipa.', 'Equipas.'],
  [47, 'TenantModal.jsx', 'Empresa (tenant).', 'Super-admin empresas.'],
  [48, 'UserImportModal.jsx', 'Importar utilizadores.', 'Utilizadores → importar.'],
  [49, 'UserModal.jsx', 'Utilizador.', 'Config → utilizadores.'],
];

const batch01 = '../../FRONTEND/e2e/modal-evidence-batch-01.spec.ts-snapshots/';
const batch02 = '../../FRONTEND/e2e/modal-evidence-batch-02.spec.ts-snapshots/';
const batch03 = '../../FRONTEND/e2e/modal-evidence-batch-03.spec.ts-snapshots/';
const snaps = {
  1: `${batch01}modal-evidence-01-account-shell-chromium-win32.png`,
  2: `${batch01}modal-evidence-02-addendum-form-shell-chromium-win32.png`,
  3: `${batch01}modal-evidence-03-addendum-view-shell-chromium-win32.png`,
  4: `${batch01}modal-evidence-04-add-member-shell-chromium-win32.png`,
  5: `${batch01}modal-evidence-05-approval-details-shell-chromium-win32.png`,
  6: `${batch02}modal-evidence-06-asset-category-shell-chromium-win32.png`,
  7: `${batch02}modal-evidence-07-asset-maintenance-shell-chromium-win32.png`,
  8: `${batch02}modal-evidence-08-asset-modal-shell-chromium-win32.png`,
  9: `${batch02}modal-evidence-09-asset-view-shell-chromium-win32.png`,
  10: `${batch02}modal-evidence-10-azure-config-shell-chromium-win32.png`,
  11: `${batch03}modal-evidence-11-budget-import-shell-chromium-win32.png`,
  12: `${batch03}modal-evidence-12-budget-item-shell-chromium-win32.png`,
  13: `${batch03}modal-evidence-13-budget-modal-shell-chromium-win32.png`,
  14: `${batch03}modal-evidence-14-change-modal-shell-chromium-win32.png`,
  15: `${batch03}modal-evidence-15-change-view-shell-chromium-win32.png`,
  22: '../../FRONTEND/e2e/organization-standard-modals.spec.ts-snapshots/org-modal-fiscal-year-shell-chromium-win32.png',
  40: '../../FRONTEND/e2e/organization-standard-modals.spec.ts-snapshots/org-modal-role-shell-chromium-win32.png',
  47: '../../FRONTEND/e2e/organization-standard-modals.spec.ts-snapshots/org-modal-tenant-shell-chromium-win32.png',
  49: '../../FRONTEND/e2e/organization-standard-modals.spec.ts-snapshots/org-modal-user-shell-chromium-win32.png',
};

let html = '';
for (const [n, f, d, t] of rows) {
  const src = snaps[n];
  const id = String(n).padStart(2, '0');
  html += `  <article class="modal-tile" id="modal-${id}">\n`;
  html += `    <div class="tile-head"><span class="tile-num">${id}</span> <code class="path">${f}</code></div>\n`;
  html += `    <div class="tile-visual${src ? ' has-img' : ''}">\n`;
  if (src) {
    html += `      <span class="badge-snap">Playwright</span>\n`;
    html += `      <img src="${src}" alt="Evidência ${f}" />\n`;
  } else {
    html += `      <span class="badge-pend">Pendente</span>\n`;
    html += `      <div class="tile-pending-inner"><span class="pending-ico" aria-hidden="true">▣</span>Espaço reservado para <strong>captura de ecrã</strong><br />(colar imagem no HTML ou anexar no PDF)</div>\n`;
  }
  html += `    </div>\n`;
  html += `    <div class="tile-foot"><strong>\u00E2mbito:</strong> ${d}<br /><strong>Como testar:</strong> ${t}</div>\n`;
  html += `  </article>\n`;
}
fs.writeFileSync(path.join(__dirname, '_modal-grid-fragment.html'), html, 'utf8');
