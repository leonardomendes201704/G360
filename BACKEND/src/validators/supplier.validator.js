const yup = require('yup');

const createSupplierSchema = yup.object().shape({
    name: yup.string().trim().required('Razão Social/Nome é obrigatório'),
    tradeName: yup.string().trim().nullable(),
    document: yup.string().trim().required('CNPJ/CPF é obrigatório'),
    documentType: yup.string().oneOf(['CNPJ', 'CPF', 'FOREIGN'], 'Tipo de documento inválido').required('Tipo de documento é obrigatório'),
    email: yup.string().email('Email inválido').nullable(),
    phone: yup.string().trim().nullable(),
    contactName: yup.string().trim().nullable(),
    category: yup.string().trim().nullable(),
    status: yup.string().oneOf(['ATIVO', 'PENDENTE', 'INATIVO']).default('ATIVO'),
    rating: yup.number().min(1).max(5).nullable().default(5),
    classification: yup.string().oneOf(['CRITICO', 'ESTRATEGICO', 'OPERACIONAL', 'OUTROS'], 'Classificação inválida').default('OUTROS'),
    country: yup.string().trim().nullable(),
    state: yup.string().trim().nullable(),
    city: yup.string().trim().nullable(),
    address: yup.string().trim().nullable(),
    zipCode: yup.string().trim().nullable(),
    bankName: yup.string().trim().nullable(),
    bankAgency: yup.string().trim().nullable(),
    bankAccount: yup.string().trim().nullable(),
    bankAccountType: yup.string().trim().nullable(),
    notes: yup.string().trim().nullable()
});

const updateSupplierSchema = createSupplierSchema.clone().shape({
    name: yup.string().trim(),
    document: yup.string().trim(),
    documentType: yup.string().oneOf(['CNPJ', 'CPF', 'FOREIGN'], 'Tipo de documento inválido'),
});

module.exports = {
    createSupplierSchema,
    updateSupplierSchema
};
