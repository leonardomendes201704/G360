const yup = require('yup');

const createTaskSchema = yup.object().shape({
    title: yup.string().trim().required('Título é obrigatório'),
    description: yup.string().trim(),
    status: yup.string().oneOf(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'ARCHIVED'], 'Status inválido').default('TODO'),
    priority: yup.string().oneOf(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 'Prioridade inválida').required('Prioridade é obrigatória'),
    dueDate: yup.date().required('Data de vencimento é obrigatória').typeError('Data inválida'),
    assigneeId: yup.string().uuid('ID do atribuído inválido').required('Atribuído a é obrigatório'),
    isPersonal: yup.boolean().default(false),
    riskId: yup.string().uuid('ID de risco inválido').nullable(),
    checklist: yup.array().of(
        yup.object().shape({
            id: yup.string(),
            text: yup.string(),
            done: yup.boolean()
        })
    ).nullable()
});

const updateTaskSchema = createTaskSchema.clone().shape({
    title: yup.string().trim(),
    priority: yup.string().oneOf(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 'Prioridade inválida'),
    dueDate: yup.date().typeError('Data inválida'),
    assigneeId: yup.string().uuid('ID do atribuído inválido'),
});

module.exports = {
    createTaskSchema,
    updateTaskSchema
};
