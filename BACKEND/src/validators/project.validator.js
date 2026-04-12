const yup = require('yup');

// --- CREATE ---
const createProjectSchema = yup.object().shape({
    code: yup.string().trim(),
    name: yup.string().trim().required('Nome é obrigatório'),
    description: yup.string().trim(),
    type: yup.string().oneOf(['INTERNO', 'CLIENTE', 'MELHORIA', 'INOVACAO'], 'Tipo inválido').required('Tipo é obrigatório'),
    status: yup.string().oneOf(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
    priority: yup.string().oneOf(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    startDate: yup.date().nullable(),
    endDate: yup.date()
        .nullable()
        .test('end-after-start', 'Data de término deve ser posterior à data de início', function (endDate) {
            const { startDate } = this.parent;
            if (!startDate || !endDate) return true;
            return new Date(endDate) >= new Date(startDate);
        }),
    actualStartDate: yup.date().nullable(),
    actualEndDate: yup.date().nullable(),
    budget: yup.number().positive('Orçamento deve ser positivo').nullable(),
    managerId: yup.string().uuid('ID do gerente inválido').nullable(),
    techLeadId: yup.string().uuid('ID do tech lead inválido').nullable(),
    area: yup.string().trim().nullable(),
    departmentId: yup.string().uuid().nullable(),
    costCenterId: yup.string().uuid().nullable(),
    approvalStatus: yup.string().oneOf(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED']).default('DRAFT')
});

// --- UPDATE (all fields optional) ---
const updateProjectSchema = createProjectSchema.clone().shape({
    name: yup.string().trim(),
    type: yup.string().oneOf(['INTERNO', 'CLIENTE', 'MELHORIA', 'INOVACAO'], 'Tipo inválido'),
});

// --- REJECT ---
const rejectProjectSchema = yup.object().shape({
    reason: yup.string().trim().required('Motivo da rejeição é obrigatório'),
    requiresAdjustment: yup.boolean().default(false)
});

// --- ADD MEMBER ---
const addMemberSchema = yup.object().shape({
    userId: yup.string().uuid('ID do usuário inválido').required('ID do usuário é obrigatório'),
    role: yup.string().trim().required('Papel é obrigatório')
});

module.exports = {
    createProjectSchema,
    updateProjectSchema,
    rejectProjectSchema,
    addMemberSchema
};
