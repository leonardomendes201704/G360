const yup = require('yup');

// --- CREATE CHANGE REQUEST ---
const createChangeRequestSchema = yup.object().shape({
    code: yup.string().trim().required('Código é obrigatório'),
    title: yup.string().trim().required('Título é obrigatório'),
    description: yup.string().trim().required('Descrição é obrigatória'),
    justification: yup.string().trim().required('Justificativa é obrigatória'),
    type: yup.string().oneOf(['NORMAL', 'PADRAO', 'EMERGENCIAL'], 'Tipo inválido').required('Tipo é obrigatório'),
    riskLevel: yup.string().oneOf(['BAIXO', 'MEDIO', 'ALTO', 'CRITICO'], 'Nível de risco inválido'),
    impact: yup.string().oneOf(['MENOR', 'SIGNIFICATIVO', 'MAIOR'], 'Impacto inválido').required('Impacto é obrigatório'),
    scheduledStart: yup.date().required('Data início agendada é obrigatória'),
    scheduledEnd: yup.date()
        .required('Data fim agendada é obrigatória')
        .test('end-after-start', 'Data fim deve ser posterior à data início', function (end) {
            const { scheduledStart } = this.parent;
            if (!scheduledStart || !end) return true;
            return new Date(end) >= new Date(scheduledStart);
        }),
    executionPlan: yup.string().trim().nullable(),
    backoutPlan: yup.string().trim().nullable(),
    testPlan: yup.string().trim().nullable(),
    prerequisites: yup.string().trim().nullable(),
    assetIds: yup.array().of(yup.string().uuid()),
    projectId: yup.string().nullable().transform((v) => (v === '' ? null : v)).uuid('ID do projeto inválido')
});

// --- UPDATE ---
const updateChangeRequestSchema = yup.object().shape({
    title: yup.string().trim(),
    description: yup.string().trim(),
    justification: yup.string().trim(),
    type: yup.string().oneOf(['NORMAL', 'PADRAO', 'EMERGENCIAL']),
    riskLevel: yup.string().oneOf(['BAIXO', 'MEDIO', 'ALTO', 'CRITICO']),
    impact: yup.string().oneOf(['MENOR', 'SIGNIFICATIVO', 'MAIOR']),
    status: yup.string().oneOf(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'APPROVED_WAITING_EXECUTION', 'REJECTED', 'REVISION_REQUESTED', 'EXECUTED', 'FAILED', 'CANCELLED']),
    scheduledStart: yup.date().nullable(),
    scheduledEnd: yup.date().nullable(),
    actualStart: yup.date().nullable(),
    actualEnd: yup.date().nullable(),
    executionPlan: yup.string().trim().nullable(),
    backoutPlan: yup.string().trim().nullable(),
    testPlan: yup.string().trim().nullable(),
    prerequisites: yup.string().trim().nullable(),
    closureNotes: yup.string().trim().nullable(),
    rootCause: yup.string().trim().nullable(),
    lessonsLearned: yup.string().trim().nullable(),
    preventiveActions: yup.string().trim().nullable(),
    projectId: yup.string().nullable().transform((v) => (v === '' ? null : v))
});

// --- REVIEW ---
const reviewChangeSchema = yup.object().shape({
    status: yup.string().oneOf(['APPROVED', 'REJECTED'], 'Status de review inválido').required('Status é obrigatório'),
    comment: yup.string().trim().nullable()
});

module.exports = {
    createChangeRequestSchema,
    updateChangeRequestSchema,
    reviewChangeSchema
};
