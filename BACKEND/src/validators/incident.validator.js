const yup = require('yup');

// --- CREATE INCIDENT ---
const createIncidentSchema = yup.object().shape({
    title: yup.string().trim().required('Título é obrigatório'),
    description: yup.string().trim().required('Descrição é obrigatória'),
    categoryId: yup.string().uuid('Categoria inválida').required('Categoria é obrigatória'),
    impact: yup.string().oneOf(['BAIXO', 'MEDIO', 'ALTO', 'CRITICO'], 'Impacto inválido').default('MEDIO'),
    urgency: yup.string().oneOf(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'], 'Urgência inválida').default('MEDIA'),
    assigneeId: yup.string().uuid('ID do responsável inválido').nullable(),
    relatedAssetId: yup.string().uuid('ID do ativo inválido').nullable(),
    relatedChangeId: yup.string().uuid('ID da mudança inválido').nullable()
});

// --- UPDATE INCIDENT ---
const updateIncidentSchema = yup.object().shape({
    title: yup.string().trim(),
    description: yup.string().trim(),
    categoryId: yup.string().uuid('Categoria inválida'),
    impact: yup.string().oneOf(['BAIXO', 'MEDIO', 'ALTO', 'CRITICO'], 'Impacto inválido'),
    urgency: yup.string().oneOf(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'], 'Urgência inválida'),
    status: yup.string().oneOf(['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'], 'Status inválido'),
    assigneeId: yup.string().uuid().nullable(),
    rootCause: yup.string().trim().nullable(),
    solution: yup.string().trim().nullable(),
    workaround: yup.string().trim().nullable()
});

// --- RESOLVE ---
const resolveIncidentSchema = yup.object().shape({
    solution: yup.string().trim().required('Solução é obrigatória para resolver'),
    rootCause: yup.string().trim().nullable()
});

// --- ASSIGN ---
const assignIncidentSchema = yup.object().shape({
    assigneeId: yup.string().uuid('ID do responsável inválido').required('assigneeId é obrigatório')
});

// --- COMMENT ---
const addCommentSchema = yup.object().shape({
    content: yup.string().trim().required('Conteúdo do comentário é obrigatório'),
    isInternal: yup.boolean().default(false)
});

// --- CATEGORY ---
const createCategorySchema = yup.object().shape({
    name: yup.string().trim().required('Nome da categoria é obrigatório'),
    description: yup.string().trim().nullable(),
    slaResponse: yup.number().integer().positive().default(480),
    slaResolve: yup.number().integer().positive().default(1440),
    color: yup.string().trim().default('#6366f1'),
    icon: yup.string().trim().default('warning')
});

module.exports = {
    createIncidentSchema,
    updateIncidentSchema,
    resolveIncidentSchema,
    assignIncidentSchema,
    addCommentSchema,
    createCategorySchema
};
