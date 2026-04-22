const yup = require('yup');
const { normalizeStatusForApi } = require('./project-task.validator');

/** Kanban (Tarefas gerais) + listas/legacy; paridade com PROJECT_TASK_STATUSES (inclui BACKLOG). */
const GENERAL_TASK_STATUSES = [
    'BACKLOG',
    'TODO',
    'ON_HOLD',
    'IN_PROGRESS',
    'REVIEW',
    'DONE',
    'ARCHIVED',
    'CANCELLED',
];

const createTaskSchema = yup.object().shape({
    title: yup.string().trim().required('Título é obrigatório'),
    description: yup.string().trim(),
    status: yup
        .string()
        .transform((v) => {
            if (v == null || v === '' || v === undefined) return 'TODO';
            return normalizeStatusForApi(String(v));
        })
        .oneOf(GENERAL_TASK_STATUSES, 'Status inválido')
        .default('TODO'),
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
    // PUT { status: 'ON_HOLD' } (Kanban): oneOf+transform (yup 1.7) — paridade com project-task.validator
    status: yup
        .mixed()
        .transform((v) => {
            if (v == null || v === '' || v === undefined) return undefined;
            return normalizeStatusForApi(String(v));
        })
        .test(
            'is-status',
            'Status inválido',
            (v) => v == null || v === undefined || (typeof v === 'string' && GENERAL_TASK_STATUSES.includes(v))
        )
        .optional(),
});

module.exports = {
    createTaskSchema,
    updateTaskSchema,
    GENERAL_TASK_STATUSES,
};
