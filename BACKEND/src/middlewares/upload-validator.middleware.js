const fileType = require('file-type');
const fs = require('fs');
const path = require('path');

/**
 * Middleware pós-upload que valida o MIME-type REAL do arquivo
 * usando magic bytes (cabeçalho binário), não confiando apenas
 * na extensão ou no Content-Type do browser.
 * 
 * Uso:
 *   const createUpload = require('../config/upload');
 *   const { validateUploadedFile } = require('../middlewares/upload-validator.middleware');
const logger = require('../config/logger');
 *   
 *   router.post('/files', upload, validateUploadedFile, controller.create);
 */

// Mapeamento de extensões para MIME-types reais esperados
const EXPECTED_MIMES = {
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword', 'application/x-cfb'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
    '.xls': ['application/vnd.ms-excel', 'application/x-cfb'],
    '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
    '.ppt': ['application/vnd.ms-powerpoint', 'application/x-cfb'],
    '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip'],
    '.csv': null, // CSV é texto puro, file-type não detecta — skip
    '.txt': null  // Texto puro, file-type não detecta — skip
};

const validateUploadedFile = async (req, res, next) => {
    // Se não tem arquivo, passa direto (file é opcional em alguns endpoints)
    if (!req.file) return next();

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    // Extensões de texto puro — file-type não consegue detectar
    if (EXPECTED_MIMES[ext] === null) return next();

    try {
        const result = await fileType.fromFile(filePath);

        // Se file-type não detectou nada e não é arquivo de texto
        if (!result) {
            // Permitir se for extensão conhecida de texto (csv, txt, etc.)
            if (['.csv', '.txt'].includes(ext)) return next();

            // Limpar arquivo suspeito
            try { fs.unlinkSync(filePath); } catch (_) { }
            return res.status(400).json({
                message: 'Não foi possível verificar o tipo do arquivo. Envie um arquivo válido.',
                errorCode: 'INVALID_FILE_TYPE'
            });
        }

        const expectedMimes = EXPECTED_MIMES[ext];
        if (expectedMimes && !expectedMimes.includes(result.mime)) {
            // MIME real não coincide com a extensão — possivelmente arquivo malicioso
            try { fs.unlinkSync(filePath); } catch (_) { }
            logger.warn('[UPLOAD BLOCKED] MIME mismatch:', {
                originalName: req.file.originalname,
                declaredMime: req.file.mimetype,
                realMime: result.mime,
                extension: ext,
                user: req.user?.email || 'anonymous',
                ip: req.ip
            });

            return res.status(400).json({
                message: `O conteúdo do arquivo não corresponde à extensão ${ext}. Envie um arquivo válido.`,
                errorCode: 'FILE_MIME_MISMATCH'
            });
        }

        // Tudo OK — enriquecer req.file com o tipo real
        req.file.detectedMime = result.mime;
        next();
    } catch (err) {
        logger.error('[UPLOAD VALIDATION ERROR]', err.message);
        // Fail-closed: rejeitar upload se validação falhar (segurança)
        try { fs.unlinkSync(filePath); } catch (_) { }
        return res.status(400).json({
            message: 'Erro na validação do arquivo. Tente novamente.',
            errorCode: 'UPLOAD_VALIDATION_FAILED'
        });
    }
};

module.exports = { validateUploadedFile };
