/**
 * GMUDs cujo conteúdo de planejamento não pode mais ser alterado após fecho
 * (alinhado a `change-request.service.js` — update bloqueado).
 */
export const GMUD_NO_FURTHER_EDIT_STATUSES = Object.freeze(['EXECUTED', 'FAILED', 'CANCELLED']);

/**
 * @param {string|undefined} status
 * @returns {boolean}
 */
export function isGmudPostClosureReadOnly(status) {
    if (!status) return false;
    return GMUD_NO_FURTHER_EDIT_STATUSES.includes(String(status).toUpperCase());
}
