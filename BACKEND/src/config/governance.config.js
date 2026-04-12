/**
 * Governança de mudanças (GMUD): membros do CAB são usuários com o perfil (Role) indicado.
 * Altere via variável de ambiente para outro nome de perfil no tenant.
 */
module.exports = {
  CAB_MEMBER_ROLE_NAME: process.env.CAB_MEMBER_ROLE_NAME || 'CAB Member',
};
