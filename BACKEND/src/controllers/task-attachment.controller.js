const fs = require('fs');
const path = require('path');
const TaskService = require('../services/task.service');
const logger = require('../config/logger');

class TaskAttachmentController {
  static async create(req, res) {
    const { taskId } = req.params;
    await TaskService.getById(req.prisma, taskId, req.user.userId);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'Nenhum ficheiro enviado.' });
    }

    // URL relativa
    const uploadsRoot = path.resolve(__dirname, '..', '..');
    const relativePath = path.relative(uploadsRoot, file.path);
    const fileUrl = `/${relativePath.split(path.sep).join('/')}`;

    const attachment = await req.prisma.taskAttachment.create({
      data: {
        taskId: taskId,
        fileName: file.originalname,
        fileUrl: fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype
      }
    });

    return res.status(201).json(attachment);
  }

  static async index(req, res) {
    const { taskId } = req.params;
    await TaskService.getById(req.prisma, taskId, req.user.userId);
    const attachments = await req.prisma.taskAttachment.findMany({
      where: { taskId: taskId },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json(attachments);
  }

  static async delete(req, res) {
    const { id } = req.params;

    const attachment = await req.prisma.taskAttachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Anexo não encontrado.' });
    }

    await TaskService.getById(req.prisma, attachment.taskId, req.user.userId);

    const filePath = path.join(__dirname, '..', '..', attachment.fileUrl);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      logger.error('Erro ao apagar arquivo físico:', err);
    }

    await req.prisma.taskAttachment.delete({ where: { id } });
    return res.status(204).send();
  }
}

module.exports = TaskAttachmentController;
