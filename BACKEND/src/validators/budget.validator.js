const yup = require('yup');

const createBudgetSchema = yup.object().shape({
    name: yup.string().trim().required('Nome é obrigatório'),
    fiscalYearId: yup.string().uuid('ID do ano fiscal inválido').required('Ano fiscal é obrigatório'),
    description: yup.string().trim(),
    type: yup.string().oneOf(['OPEX', 'CAPEX', 'MIXED'], 'Tipo inválido').default('MIXED'),
    isOBZ: yup.boolean().default(false)
});

const updateBudgetSchema = createBudgetSchema.clone().shape({
    name: yup.string().trim(),
    fiscalYearId: yup.string().uuid('ID do ano fiscal inválido'),
});

const duplicateBudgetSchema = yup.object().shape({
    newName: yup.string().trim().required('O novo nome é obrigatório')
});

const addBudgetItemSchema = yup.object().shape({
    accountId: yup.string().uuid('ID da conta inválido').required('Conta Contábil é obrigatória'),
    costCenterId: yup.string().uuid('ID do centro de custo inválido').nullable(),
    supplierId: yup.string().uuid('ID do fornecedor inválido').nullable(),
    projectId: yup.string().uuid('ID do projeto inválido').nullable(),
    description: yup.string().trim(),
    justification: yup.string().trim().nullable(),
    priority: yup.string().oneOf(['ESSENCIAL', 'IMPORTANTE', 'DESEJAVEL', '', null], 'Prioridade inválida').nullable(),
    isNewExpense: yup.boolean().default(true),
    jan: yup.number().default(0),
    feb: yup.number().default(0),
    mar: yup.number().default(0),
    apr: yup.number().default(0),
    may: yup.number().default(0),
    jun: yup.number().default(0),
    jul: yup.number().default(0),
    aug: yup.number().default(0),
    sep: yup.number().default(0),
    oct: yup.number().default(0),
    nov: yup.number().default(0),
    dec: yup.number().default(0)
});

module.exports = {
    createBudgetSchema,
    updateBudgetSchema,
    duplicateBudgetSchema,
    addBudgetItemSchema
};
