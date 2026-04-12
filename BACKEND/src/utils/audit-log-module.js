const path = require('path');
const fs = require('fs');

const matrixPath = path.join(__dirname, '../../../rbac-matrix.json');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const RBAC_MODULE_KEYS = new Set(Object.keys(matrix.modules));

/** Valores legados (rotas, serviços, payloads) → chave canônica da rbac-matrix.json */
const LEGACY_TO_CANONICAL = {
  ORCAMENTO: 'FINANCE',
  DESPESAS: 'FINANCE',
  ANO_FISCAL: 'FINANCE',
  CONTAS: 'FINANCE',
  CENTROS_CUSTO: 'CONFIG',
  BASE_CONHECIMENTO: 'KB',
  INTEGRACOES: 'CONFIG',
  NOTIFICACOES: 'NOTIFICATIONS',
  PROJETOS: 'PROJECTS',
  USUARIOS: 'CONFIG',
  DEPARTAMENTOS: 'CONFIG',
  PERMISSOES: 'CONFIG',
  GOVERNANCA: 'GMUD',
  APROVACOES: 'APPROVALS',
  INCIDENTES: 'INCIDENT',
  RISCOS: 'RISKS',
  ATIVOS: 'ASSETS',
  CONTRATOS: 'CONTRACTS',
  FORNECEDORES: 'SUPPLIERS',
  ADMIN: 'CONFIG',
  PROJECT: 'PROJECTS',
  FINANCEIRO: 'FINANCE',
  TAREFAS: 'TASKS',
};

/**
 * Normaliza o campo `module` do AuditLog para uma chave existente em rbac-matrix.json.
 * @param {string|null|undefined} raw
 * @returns {string|null|undefined}
 */
function normalizeAuditLogModule(raw) {
  if (raw == null || raw === '') return raw;
  const s = String(raw);
  if (RBAC_MODULE_KEYS.has(s)) return s;
  const upper = s.toUpperCase();
  if (RBAC_MODULE_KEYS.has(upper)) return upper;
  if (LEGACY_TO_CANONICAL[s]) return LEGACY_TO_CANONICAL[s];
  if (LEGACY_TO_CANONICAL[upper]) return LEGACY_TO_CANONICAL[upper];
  return s;
}

/** Valores de `module` no banco que devem casar com o mesmo filtro que a chave canônica */
function auditLogModuleQueryVariants(rawFilter) {
  const canonical = normalizeAuditLogModule(rawFilter);
  const variants = new Set([canonical]);
  for (const [legacy, c] of Object.entries(LEGACY_TO_CANONICAL)) {
    if (c === canonical) variants.add(legacy);
  }
  return [...variants];
}

module.exports = {
  normalizeAuditLogModule,
  auditLogModuleQueryVariants,
  RBAC_MODULE_KEYS,
  LEGACY_TO_CANONICAL,
};
