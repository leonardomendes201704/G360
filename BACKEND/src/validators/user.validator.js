const yup = require('yup');

const emptyToNull = (v, o) => (o === '' ? null : v);

const createUserSchema = yup.object().shape({
    name: yup.string().trim().required('Nome é obrigatório'),
    email: yup.string().email('Email inválido').required('Email é obrigatório'),
    password: yup.string().min(6, 'Senha deve ter no mínimo 6 caracteres').required('Senha é obrigatória'),
    departmentId: yup.string().nullable().transform(emptyToNull).uuid('ID do departamento inválido'),
    costCenterId: yup.string().nullable().transform(emptyToNull).uuid('ID do centro de custo inválido'),
    roleIds: yup.array().of(yup.string().uuid('ID de perfil inválido')).optional()
});

const updateUserSchema = yup.object().shape({
    name: yup.string().trim(),
    email: yup.string().email('Email inválido'),
    password: yup.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    departmentId: yup.string().nullable().transform(emptyToNull).uuid('ID do departamento inválido'),
    costCenterId: yup.string().nullable().transform(emptyToNull).uuid('ID do centro de custo inválido'),
    roleIds: yup.array().of(yup.string().uuid('ID de perfil inválido')).optional()
});

const importAzureUsersSchema = yup.object().shape({
    users: yup.array()
        .of(yup.object().shape({
            name: yup.string().trim().required('Nome é obrigatório'),
            email: yup.string().email('Email inválido').required('Email é obrigatório'),
            azureId: yup.string().trim(),
            roleId: yup.string().uuid('ID de perfil inválido')
        }))
        .min(1, 'Lista de usuários não pode ser vazia')
        .required('Lista de usuários é obrigatória')
});

module.exports = {
    createUserSchema,
    updateUserSchema,
    importAzureUsersSchema
};
