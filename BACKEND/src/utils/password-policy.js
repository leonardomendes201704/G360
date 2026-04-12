/**
 * Política de Senhas G360
 * Validação centralizada para uso em backend e frontend
 */

const PASSWORD_POLICY = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

/**
 * Valida uma senha contra a política definida
 * @param {string} password - Senha a ser validada
 * @returns {{ valid: boolean, errors: string[] }} - Resultado da validação
 */
function validatePassword(password) {
    const errors = [];

    if (!password) {
        return { valid: false, errors: ['Senha é obrigatória'] };
    }

    // Tamanho mínimo
    if (password.length < PASSWORD_POLICY.minLength) {
        errors.push(`Senha deve ter no mínimo ${PASSWORD_POLICY.minLength} caracteres`);
    }

    // Tamanho máximo
    if (password.length > PASSWORD_POLICY.maxLength) {
        errors.push(`Senha deve ter no máximo ${PASSWORD_POLICY.maxLength} caracteres`);
    }

    // Letra maiúscula
    if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }

    // Letra minúscula
    if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Senha deve conter pelo menos uma letra minúscula');
    }

    // Número
    if (PASSWORD_POLICY.requireNumbers && !/[0-9]/.test(password)) {
        errors.push('Senha deve conter pelo menos um número');
    }

    // Caractere especial
    if (PASSWORD_POLICY.requireSpecialChars) {
        const specialRegex = new RegExp(`[${PASSWORD_POLICY.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
        if (!specialRegex.test(password)) {
            errors.push('Senha deve conter pelo menos um caractere especial (!@#$%^&*...)');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Retorna a descrição da política de senhas para exibição
 */
function getPasswordPolicyDescription() {
    const rules = [];
    rules.push(`Mínimo de ${PASSWORD_POLICY.minLength} caracteres`);
    if (PASSWORD_POLICY.requireUppercase) rules.push('Pelo menos uma letra maiúscula');
    if (PASSWORD_POLICY.requireLowercase) rules.push('Pelo menos uma letra minúscula');
    if (PASSWORD_POLICY.requireNumbers) rules.push('Pelo menos um número');
    if (PASSWORD_POLICY.requireSpecialChars) rules.push('Pelo menos um caractere especial');
    return rules;
}

module.exports = {
    PASSWORD_POLICY,
    validatePassword,
    getPasswordPolicyDescription
};
