/**
 * Permissões padrão alinhadas a rbac-matrix.json (seed de tenant e referência).
 *
 * Múltiplos perfis no mesmo usuário: o backend faz a UNIÃO das permissões de todos
 * os perfis (ver userMatchesPermission em permission-check.js — basta uma role conceder).
 */
const path = require('path');
const rbac = require(path.join(__dirname, '..', '..', '..', 'rbac-matrix.json'));

function actionsForModule(modKey) {
    const mod = rbac.modules[modKey];
    if (!mod?.actions) return [];
    return mod.actions.map((a) => ({ module: modKey, action: a.key }));
}

function permissionsForModules(modKeys) {
    return modKeys.flatMap((k) => actionsForModule(k));
}

function dedupePermissions(list) {
    const seen = new Set();
    return list.filter((p) => {
        const k = `${p.module}:${p.action}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

/**
 * Gestor de área: todas as ações dos módulos operacionais + aprovações + log + transversais.
 * CONFIG: apenas READ (ver usuários/organização e perfis), sem WRITE/DELETE de administração.
 */
const MANAGER_MODULE_KEYS = [
    'HELPDESK',
    'INCIDENT',
    'PROBLEM',
    'PROJECTS',
    'GMUD',
    'FINANCE',
    'CONTRACTS',
    'SUPPLIERS',
    'ASSETS',
    'TASKS',
    'KB',
    'RISKS',
    'APPROVALS',
    'ACTIVITY_LOG',
    'NOTIFICATIONS',
    'UPLOAD',
];

/**
 * Colaborador: visão READ nos módulos operacionais + executar tarefas + portal de chamados
 * + enxergar esteira (READ) e abrir RFC. Sem financeiro, sem CONFIG administrativo.
 * Aprovar na esteira: exige outro perfil (ex.: CAB) ou permissão APPROVALS WRITE manual.
 */
const COLLAB_READ_MODULES = [
    'PROJECTS',
    'TASKS',
    'GMUD',
    'INCIDENT',
    'CONTRACTS',
    'SUPPLIERS',
    'ASSETS',
    'KB',
    'RISKS',
    'HELPDESK',
    'PROBLEM',
];

/** Ações extras do colaborador além do READ por módulo (matriz). */
const COLLABORATOR_EXTRA_ACTIONS = [
    { module: 'HELPDESK', action: 'CREATE' },
    { module: 'HELPDESK', action: 'MESSAGE' },
    { module: 'TASKS', action: 'WRITE' },
    { module: 'GMUD', action: 'CREATE' },
    { module: 'APPROVALS', action: 'READ' },
    { module: 'ACTIVITY_LOG', action: 'READ' },
];

/**
 * CAB: leitura ampla (incl. tarefas e financeiro para contexto) + GMUD completo
 * + votar aprovações na esteira + escalar incidente quando aplicável.
 */
const CAB_READ_MODULES = [
    'PROJECTS',
    'TASKS',
    'INCIDENT',
    'CONTRACTS',
    'SUPPLIERS',
    'ASSETS',
    'KB',
    'RISKS',
    'HELPDESK',
    'PROBLEM',
    'FINANCE',
    'APPROVALS',
    'ACTIVITY_LOG',
];

function getManagerDefaultPermissions() {
    const base = permissionsForModules(MANAGER_MODULE_KEYS);
    base.push({ module: 'CONFIG', action: 'READ' });
    return dedupePermissions(base);
}

function getCollaboratorDefaultPermissions() {
    const read = COLLAB_READ_MODULES.flatMap((m) => [{ module: m, action: 'READ' }]);
    const crossCutting = actionsForModule('NOTIFICATIONS').concat(actionsForModule('UPLOAD'));
    return dedupePermissions([...read, ...COLLABORATOR_EXTRA_ACTIONS, ...crossCutting]);
}

function getCabDefaultPermissions() {
    const reads = CAB_READ_MODULES.flatMap((m) => [{ module: m, action: 'READ' }]);
    const gmudFull = actionsForModule('GMUD');
    const merged = [...reads];
    for (const p of gmudFull) {
        if (!merged.some((x) => x.module === p.module && x.action === p.action)) {
            merged.push(p);
        }
    }
    merged.push({ module: 'APPROVALS', action: 'WRITE' });
    merged.push({ module: 'INCIDENT', action: 'ESCALATE' });
    const crossCutting = actionsForModule('NOTIFICATIONS').concat(actionsForModule('UPLOAD'));
    return dedupePermissions([...merged, ...crossCutting]);
}

module.exports = {
    rbac,
    actionsForModule,
    permissionsForModules,
    dedupePermissions,
    getManagerDefaultPermissions,
    getCollaboratorDefaultPermissions,
    getCabDefaultPermissions,
};
