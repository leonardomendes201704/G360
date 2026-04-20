const yup = require('yup');

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
/** Estatos aceites na API; inclui Kanban (ON_HOLD) e listas/legacy. */
const PROJECT_TASK_STATUSES = [
    'BACKLOG',
    'TODO',
    'ON_HOLD',
    'IN_PROGRESS',
    'REVIEW',
    'DONE',
    'ARCHIVED',
    'CANCELLED',
];

/**
 * Normaliza variantes (Kanban, drag antigo) antes do oneOf.
 * Ex.: "IN" (split errado) → "IN_PROGRESS"
 */
const normalizeStatusForApi = (v) => {
    if (v == null) return v;
    let s = String(v).trim();
    if (!s) return s;
    // Sublinhado/letras "fullwidth" (ex. ON＿HOLD) → ON_HOLD; alinha cliente/cópia IME com a lista API
    if (typeof s.normalize === 'function') {
        s = s.normalize('NFKC');
    }
    // trim() remove espaços, mas não U+200B (ZWSP) ou outros invisíveis; sem isto, "IN_PROGRESS\u200b" passa 422
    s = s.replace(/[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/g, '');
    s = s.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
    s = s.toUpperCase();
    s = s.replace(/-/g, '_').replace(/\s+/g, '_');
    const shortToFull = {
        IN: 'IN_PROGRESS',
        ON: 'ON_HOLD',
        INP: 'IN_PROGRESS',
        INPROGRESS: 'IN_PROGRESS',
        ONHOLD: 'ON_HOLD',
    };
    if (shortToFull[s]) return shortToFull[s];
    return s;
};

/** PUT parcial: aceitar '' / null; evita 422 quando o cliente reenvia o objecto tarefa (ex.: progress: null, checklist: null, datas vazias). */
const uuidsOrNull = (errMsg) =>
    yup
        .string()
        .transform((v) => (v === undefined ? v : (v === '' || v == null ? null : v)))
        .nullable()
        .test('uuid-or-empty', errMsg, (v) => v == null || /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i.test(String(v)));

const optionalDate = (errMsg) =>
    yup
        .mixed()
        .test('is-date-optional', errMsg, (v) => {
            if (v == null || v === '') return true;
            if (v instanceof Date && !Number.isNaN(v.getTime())) return true;
            const t = new Date(v).getTime();
            return !Number.isNaN(t);
        })
        .transform((v) => {
            if (v == null || v === '') return undefined;
            if (v instanceof Date) return v;
            return new Date(v);
        });

const createProjectTaskSchema = yup.object().shape({
    projectId: yup.string().uuid('ID do projeto inválido').required('ID do projeto é obrigatório'),
    title: yup.string().trim().required('Título é obrigatório'),
    description: yup.string().trim().nullable(),
    assigneeId: yup.string().uuid('ID do atribuído inválido').nullable(),
    priority: yup.string().oneOf(PRIORITIES, 'Prioridade inválida').default('MEDIUM'),
    status: yup
        .string()
        .oneOf(PROJECT_TASK_STATUSES, 'Status inválido')
        .default('TODO'),
    storyPoints: yup.number().integer('Story points deve ser inteiro').nullable(),
    startDate: yup.date().nullable().typeError('Data de início inválida'),
    endDate: yup.date().nullable().typeError('Data de fim inválida'),
    dependencies: yup.array().of(yup.string().uuid('ID de dependência inválido')).default([]),
    progress: yup.number().integer('Progresso deve ser inteiro').min(0).max(100).default(0),
});

/**
 * PUT: só campos opcionais, sem .default de create (evita body parcial a falhar/merge inesperado yup 1 + clone()).
 * Campos inexistentes no corpo → não tocam; status normalizado p/ Kanban.
 */
const updateProjectTaskSchema = yup.object().shape({
    projectId: yup
        .string()
        .transform((v) => (v === undefined || v == null || v === '' ? undefined : v))
        .uuid('ID do projeto inválido')
        .optional(),
    title: yup.string().trim().optional(),
    description: yup.string().trim().nullable().optional(),
    assigneeId: uuidsOrNull('ID do atribuído inválido').optional(),
    priority: yup.string().oneOf(PRIORITIES, 'Prioridade inválida').optional(),
    status: yup
        .mixed()
        .transform((v) => {
            if (v == null || v === '' || v === undefined) return undefined;
            return normalizeStatusForApi(String(v));
        })
        .test('is-status', 'Status inválido', (v) => v == null || v === undefined || (typeof v === 'string' && PROJECT_TASK_STATUSES.includes(v)))
        .optional(),
    storyPoints: yup
        .number()
        .integer('Story points deve ser inteiro')
        .nullable()
        .optional(),
    startDate: optionalDate('Data de início inválida').optional(),
    endDate: optionalDate('Data de fim inválida').optional(),
    dependencies: yup
        .array()
        .of(yup.string().uuid('ID de dependência inválido'))
        .transform((a) => (a == null ? undefined : a))
        .optional()
        .nullable(),
    // progress no Prisma é Int (não null) — rejeitar "limpar" com null; tratar null como omit (parcial)
    progress: yup
        .number()
        .integer('Progresso deve ser inteiro')
        .min(0)
        .max(100)
        .transform((v) => (v === null ? undefined : v))
        .optional(),
    checklist: yup.mixed().nullable().optional(),
});

/** PATCH só para Kanban/atalhos: um único campo, sem tocar em `dependencies`, datas, etc. */
const updateProjectTaskStatusOnlySchema = yup
    .object()
    .shape({
        status: yup
            .string()
            .transform((v) => {
                if (v == null || v === '' || v === undefined) return undefined;
                return normalizeStatusForApi(String(v));
            })
            // `test` em vez de `oneOf` — yup 1.7+ em alguns fluxos afinava pior com oneOf+transform
            .test('status-enum', 'Status inválido', (v) => typeof v === 'string' && PROJECT_TASK_STATUSES.includes(v))
            .required('Status é obrigatório'),
    })
    .noUnknown(true, 'Apenas o campo status é permitido para esta operação.');

module.exports = {
    createProjectTaskSchema,
    updateProjectTaskSchema,
    updateProjectTaskStatusOnlySchema,
    PROJECT_TASK_STATUSES,
    normalizeStatusForApi,
};
