const yup = require('yup');

const createProjectTaskSchema = yup.object().shape({
    projectId: yup.string().uuid('ID do projeto inválido').required('ID do projeto é obrigatório'),
    title: yup.string().trim().required('Título é obrigatório'),
    description: yup.string().trim().nullable(),
    assigneeId: yup.string().uuid('ID do atribuído inválido').nullable(),
    priority: yup.string().oneOf(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 'Prioridade inválida').default('MEDIUM'),
    status: yup.string().oneOf(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'ARCHIVED'], 'Status inválido').default('TODO'),
    storyPoints: yup.number().integer('Story points deve ser inteiro').nullable(),
    startDate: yup.date().nullable().typeError('Data de início inválida'),
    endDate: yup.date().nullable().typeError('Data de fim inválida'),
    dependencies: yup.array().of(yup.string().uuid('ID de dependência inválido')).default([]),
    progress: yup.number().integer('Progresso deve ser inteiro').min(0).max(100).default(0)
});

const updateProjectTaskSchema = createProjectTaskSchema.clone().shape({
    projectId: yup.string().uuid('ID do projeto inválido'),
    title: yup.string().trim(),
});

module.exports = {
    createProjectTaskSchema,
    updateProjectTaskSchema
};
