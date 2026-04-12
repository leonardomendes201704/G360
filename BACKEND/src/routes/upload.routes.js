const express = require('express');
const path = require('path');
const createUpload = require('../config/upload');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');

const router = express.Router();

const upload = createUpload('generic');

router.post('/', authMiddleware, authorize('UPLOAD', 'WRITE'), upload, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }

    const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');
    const absolutePath = req.file.path;
    const relativePath = absolutePath.replace(uploadsRoot, '').replace(/\\/g, '/');

    let fileUrl = relativePath.startsWith('/') ? `/uploads${relativePath}` : `/uploads/${relativePath}`;
    fileUrl = fileUrl.replace(/\/\//g, '/');

    return res.status(201).json({
        fileUrl,
        fileName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
    });
});

module.exports = router;
