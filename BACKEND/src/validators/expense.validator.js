const yup = require('yup');

const emptyToNull = (v, o) => (o === '' ? null : v);

const validTypes = ['OPEX', 'CAPEX', 'SERVICO', 'MATERIAL', 'EQUIPAMENTO', 'MAO_OBRA'];

const createExpenseSchema = yup.object().shape({
    description: yup.string().trim().required('Descrição é obrigatória'),
    amount: yup.number().positive('Valor deve ser positivo').required('Valor é obrigatório'),
    date: yup.date().required('Data de competência é obrigatória').typeError('Data inválida'),
    type: yup.string().oneOf(validTypes, 'Tipo inválido').required('Tipo é obrigatório'),
    costCenterId: yup.string().uuid('ID do centro de custo inválido').required('Centro de Custo é obrigatório'),
    accountId: yup.string().uuid('ID da conta inválido').nullable().transform(emptyToNull),
    status: yup.string().default('PREVISTO'),
    dueDate: yup.date().nullable().transform(emptyToNull),
    paymentDate: yup.date().nullable().transform(emptyToNull),
    invoiceNumber: yup.string().trim().nullable(),
    supplierId: yup.string().uuid('ID do fornecedor inválido').nullable().transform(emptyToNull),
    contractId: yup.string().uuid('ID do contrato inválido').nullable().transform(emptyToNull),
    approvalStatus: yup.string().nullable()
});

const updateExpenseSchema = createExpenseSchema.clone().shape({
    description: yup.string().trim(),
    amount: yup.number().positive('Valor deve ser positivo'),
    date: yup.date().typeError('Data inválida'),
    type: yup.string().oneOf(validTypes, 'Tipo inválido'),
    costCenterId: yup.string().uuid('ID do centro de custo inválido'),
});

module.exports = {
    createExpenseSchema,
    updateExpenseSchema
};
