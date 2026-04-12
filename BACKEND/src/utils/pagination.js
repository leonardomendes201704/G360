/**
 * Utilitário de paginação padronizada para o G360.
 * 
 * Uso no repository/service:
 *   const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');
 *   
 *   const { skip, take, page, limit } = parsePagination(req.query);
 *   const [data, total] = await Promise.all([
 *     prisma.model.findMany({ ...where, skip, take }),
 *     prisma.model.count({ ...where })
 *   ]);
 *   return buildPaginatedResponse(data, total, page, limit);
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse e normaliza parâmetros de paginação da query string
 * @param {Object} query - req.query
 * @returns {{ skip: number, take: number, page: number, limit: number }}
 */
function parsePagination(query = {}) {
    let page = parseInt(query.page, 10);
    let limit = parseInt(query.limit, 10);

    if (isNaN(page) || page < 1) page = DEFAULT_PAGE;
    if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const skip = (page - 1) * limit;

    return { skip, take: limit, page, limit };
}

/**
 * Constrói resposta paginada padronizada
 * @param {Array} data - Array de resultados
 * @param {number} total - Total de registros (sem paginação)
 * @param {number} page - Página atual
 * @param {number} limit - Itens por página
 * @returns {{ data: Array, meta: { total: number, page: number, limit: number, totalPages: number, hasNext: boolean, hasPrev: boolean } }}
 */
function buildPaginatedResponse(data, total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    };
}

module.exports = {
    DEFAULT_PAGE,
    DEFAULT_LIMIT,
    MAX_LIMIT,
    parsePagination,
    buildPaginatedResponse
};
