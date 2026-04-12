const yup = require('yup');

const createContractSchema = yup.object().shape({
    supplierId: yup.string().uuid('ID do fornecedor inválido').required('Fornecedor é obrigatório'),
    costCenterId: yup.string().uuid('ID do centro de custo inválido').nullable(),
    accountId: yup.string().uuid('ID da conta inválido').nullable(),
    number: yup.string().trim().required('Número do contrato é obrigatório'),
    description: yup.string().trim().required('Descrição é obrigatória'),
    type: yup.string().trim().required('Tipo é obrigatório'),
    monthlyValue: yup.number().nullable(),
    readjustmentRate: yup.number().nullable(),
    signatureDate: yup.date().nullable(),
    value: yup.number().when('monthlyValue', {
        is: (val) => !val || val === 0,
        then: () => yup.number().required('Valor Total é obrigatório (ou informe o mensal)'),
        otherwise: () => yup.number().nullable()
    }),
    startDate: yup.date().required('Data de início é obrigatória').typeError('Data de início inválida'),
    endDate: yup.date().required('Data de fim é obrigatória').typeError('Data de fim inválida'),
    alertDays: yup.number().integer('Dias de alerta deve ser inteiro').default(30),
    autoRenew: yup.boolean().default(false)
});

const updateContractSchema = createContractSchema.clone().shape({
    supplierId: yup.string().uuid('ID do fornecedor inválido'),
    number: yup.string().trim(),
    description: yup.string().trim(),
    type: yup.string().trim(),
    startDate: yup.date().typeError('Data de início inválida'),
    endDate: yup.date().typeError('Data de fim inválida'),
});

module.exports = {
    createContractSchema,
    updateContractSchema
};
