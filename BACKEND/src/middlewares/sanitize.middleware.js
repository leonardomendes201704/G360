const DOMPurify = require('isomorphic-dompurify');

/**
 * Middleware de sanitização de input contra XSS.
 * 
 * Uso:
 *   const { sanitize, sanitizeRichText } = require('../middlewares/sanitize.middleware');
 *   
 *   // Sanitiza todos os campos string do body (remove TODO HTML)
 *   router.post('/users', sanitize(), controller.create);
 *   
 *   // Sanitiza mas permite HTML seguro (bold, italic, links, listas)
 *   router.put('/articles/:id', sanitizeRichText(['content', 'description']), controller.update);
 */

// Tags e atributos permitidos para campos rich-text
const ALLOWED_TAGS = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
    'ul', 'ol', 'li',
    'a', 'img',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div', 'sub', 'sup'
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel', 'class'];

const ENUM_LIKE_BYPASS = new Set([
    'status',
    'priority',
    'type',
    'role',
    'state',
    'code',
    'codePrefix',
    'codeSuffix',
    'codePattern',
    'codeTemplate',
]);

/**
 * Sanitiza recursivamente campos string (remove HTML com DOMPurify).
 * Chaves em ENUM_LIKE_BYPASS (ex.: `status`) só recebem trim — o DOMPurify pode
 * corromper valores de enum; o yup ainda valida. `key` ausente (itens de array) usa DOMPurify.
 * @param {string} [key] – nome da chave
 */
function sanitizeValue(value, key) {
    if (typeof value === 'string' && key != null && ENUM_LIKE_BYPASS.has(String(key))) {
        return value.trim();
    }
    if (typeof value === 'string') {
        return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        return sanitizeObject(value);
    }
    return value;
}

function sanitizeObject(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = sanitizeValue(value, key);
    }
    return result;
}

/**
 * Middleware que sanitiza todo o req.body removendo HTML.
 * Ideal para endpoints que não aceitam rich text.
 */
const sanitize = () => {
    return (req, _res, next) => {
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }
        next();
    };
};

/**
 * Middleware que sanitiza req.body mas preserva HTML seguro
 * nos campos especificados (richTextFields).
 * Os demais campos têm todo HTML removido.
 * 
 * @param {string[]} richTextFields - campos que aceitam HTML (ex: ['content', 'description'])
 */
const sanitizeRichText = (richTextFields = []) => {
    return (req, _res, next) => {
        if (req.body && typeof req.body === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(req.body)) {
                if (richTextFields.includes(key) && typeof value === 'string') {
                    // Permite HTML seguro
                    sanitized[key] = DOMPurify.sanitize(value, {
                        ALLOWED_TAGS,
                        ALLOWED_ATTR,
                        ALLOW_DATA_ATTR: false
                    });
                } else {
                    sanitized[key] = sanitizeValue(value, key);
                }
            }
            req.body = sanitized;
        }
        next();
    };
};

module.exports = { sanitize, sanitizeRichText };
