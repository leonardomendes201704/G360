// SYSTEM PERMISSIONS DEFINITION
const PERMISSIONS = {
    // PROJECTS
    PROJECT_READ: { module: 'PROJECTS', action: 'READ', description: 'Visualizar Projetos' },
    PROJECT_WRITE: { module: 'PROJECTS', action: 'WRITE', description: 'Criar/Editar Projetos' },
    PROJECT_DELETE: { module: 'PROJECTS', action: 'DELETE', description: 'Excluir Projetos' },

    // TASKS
    TASK_READ: { module: 'TASKS', action: 'READ', description: 'Visualizar Tarefas' },
    TASK_WRITE: { module: 'TASKS', action: 'WRITE', description: 'Criar/Editar Tarefas' },

    // FINANCE
    FINANCE_READ: { module: 'FINANCE', action: 'READ', description: 'Visualizar Financeiro' },
    FINANCE_WRITE: { module: 'FINANCE', action: 'WRITE', description: 'Gerir Orçamentos/Despesas' },

    // APPROVALS
    APPROVALS_READ: { module: 'APPROVALS', action: 'READ', description: 'Visualizar Minhas Aprovações' },

    // CONFIG
    CONFIG_READ: { module: 'CONFIG', action: 'READ', description: 'Visualizar Configurações' },
    CONFIG_WRITE: { module: 'CONFIG', action: 'WRITE', description: 'Gerir Usuários/Perfis' },
};

module.exports = PERMISSIONS;
