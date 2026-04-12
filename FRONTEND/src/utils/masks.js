// g360 _Vdev/frontend/src/utils/masks.js

// Aplica máscara de CPF (000.000.000-00)
export const maskCPF = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '') // Remove tudo o que não é dígito
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

// Aplica máscara de CNPJ (00.000.000/0000-00)
export const maskCNPJ = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

// Aplica máscara de Telefone ( (00) 00000-0000 )
export const maskPhone = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

// Remove a máscara (deixa apenas números para salvar no banco)
export const unmask = (value) => {
  if (!value) return '';
  return value.replace(/\D/g, '');
};

// Helper para formatar na listagem automaticamente
export const formatDocument = (value, type) => {
  if (!value) return '-';
  // Se o tipo vier definido, usa ele. Se não, tenta adivinhar pelo tamanho.
  const cleanValue = unmask(value);
  if (type === 'CPF' || cleanValue.length <= 11) {
    return maskCPF(cleanValue);
  }
  return maskCNPJ(cleanValue);
};