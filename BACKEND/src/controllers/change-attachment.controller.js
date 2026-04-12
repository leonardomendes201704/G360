const fs = require('fs');
const path = require('path');
const ChangeRequestService = require('../services/change-request.service');
const logger = require('../config/logger');

class ChangeAttachmentController {
    static async create(req, res) {
        const { changeId } = req.params;
        const { userId } = req.user;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'Nenhum ficheiro enviado.' });
        }

        await ChangeRequestService.getById(req.prisma, changeId, userId);

        const uploadsRoot = path.resolve(__dirname, '..', '..');
        const relativePath = path.relative(uploadsRoot, file.path);
        const fileUrl = `/${relativePath.split(path.sep).join('/')}`;

        try {
            const attachment = await req.prisma.changeAttachment.create({
                data: {
                    changeRequestId: changeId,
                    fileName: file.originalname,
                    fileUrl: fileUrl,
                    fileSize: file.size,
                    mimeType: file.mimetype,
                    uploadedBy: userId
                }
            });

            return res.status(201).json(attachment);
        } catch (error) {
            logger.error(error);
            return res.status(500).json({ message: 'Erro ao salvar anexo.' });
        }
    }

    static async index(req, res) {
        const { changeId } = req.params;
        await ChangeRequestService.getById(req.prisma, changeId, req.user.userId);
        const attachments = await req.prisma.changeAttachment.findMany({
            where: { changeRequestId: changeId },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(attachments);
    }

    static async delete(req, res) {
        const { id } = req.params;

        const attachment = await req.prisma.changeAttachment.findUnique({
            where: { id }
        });

        if (!attachment) {
            return res.status(404).json({ message: 'Anexo não encontrado.' });
        }

        await ChangeRequestService.getById(req.prisma, attachment.changeRequestId, req.user.userId);

        const filePath = path.join(__dirname, '..', '..', attachment.fileUrl);

        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (err) {
            logger.error('Erro ao apagar arquivo físico:', err);
        }

        await req.prisma.changeAttachment.delete({ where: { id } });
        return res.status(204).send();
    }
}

module.exports = ChangeAttachmentController;





