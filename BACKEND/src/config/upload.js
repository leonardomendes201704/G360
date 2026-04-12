const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const logger = require('../config/logger');

const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');

// MIME Types Permitidos - Whitelist de Segurança
const allowedMimeTypes = {
  'image/jpeg': true,
  'image/jpg': true,
  'image/png': true,
  'application/pdf': true,
  'application/vnd.ms-excel': true,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
  'application/msword': true,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
  'application/vnd.ms-powerpoint': true,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
  'text/plain': true,
  'text/csv': true,
  'application/csv': true,
  'application/x-csv': true,
  'text/x-csv': true,
  'text/comma-separated-values': true,
  'application/vnd.ms-excel.sheet.macroEnabled.12': true
};

const allowedExtensions = /\.(jpg|jpeg|png|pdf|xls|xlsx|doc|docx|ppt|pptx|txt|csv)$/i;

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = allowedMimeTypes[file.mimetype] || file.mimetype.includes('csv');
  const extOk = allowedExtensions.test(ext);

  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    logger.warn('[UPLOAD BLOCKED]', {
      timestamp: new Date(),
      filename: file.originalname,
      mimetype: file.mimetype,
      ip: req.ip,
      user: req.user?.email || 'anonymous'
    });
    cb(new Error(`Tipo de arquivo não permitido: ${ext}`));
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadsRoot;
    
    // Auto-Roteamento Zero-Touch: BaseUrl e Params
    if (req.baseUrl && req.baseUrl !== '/api/v1/uploads') {
      const moduleName = req.baseUrl.split('/').pop().replace(/[^a-zA-Z0-9-_]/g, '_');
      const subPaths = req.path.split('/').filter(p => Boolean(p) && !p.startsWith(':')).map(p => p.replace(/[^a-zA-Z0-9-_]/g, '_'));
      uploadPath = path.join(uploadsRoot, moduleName, ...subPaths);
    }
    // Rota Genérica ou Forçada (ex: ?folder=app&subfolder=id)
    else if (req.query.folder) {
      const safeFolder = req.query.folder.replace(/[^a-zA-Z0-9-_]/g, '_');
      const safeSubfolder = req.query.subfolder ? req.query.subfolder.replace(/[^a-zA-Z0-9-_]/g, '_') : '';
      uploadPath = path.join(uploadsRoot, safeFolder, safeSubfolder);
    }
    // Rota Antiga Projetos
    else if (req.query.projectName) {
      const safeProjectName = req.query.projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const category = req.query.category ? req.query.category.replace(/[^a-zA-Z0-9-_]/g, '_') : '';
      uploadPath = path.join(uploadsRoot, 'projects', safeProjectName, category);
    }
    // Fallback Factory
    else if (req.uploadSubfolder) {
      uploadPath = path.join(uploadsRoot, req.uploadSubfolder);
    }

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const cleanName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.\./g, '_');

    const ext = path.extname(cleanName);
    const nameWithoutExt = path.basename(cleanName, ext);

    cb(null, `${uniqueSuffix}-${nameWithoutExt}${ext}`);
  }
});

const uploadConfig = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 5
  }
});

const createUpload = (defaultSubfolder) => {
  return (req, res, next) => {
    req.uploadSubfolder = defaultSubfolder;
    return uploadConfig.single('file')(req, res, next);
  };
};

createUpload.config = uploadConfig;
module.exports = createUpload;
