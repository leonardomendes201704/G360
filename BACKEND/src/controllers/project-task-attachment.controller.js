const fs = require('fs');
const path = require('path');
const ProjectService = require('../services/project.service');
const logger = require('../config/logger');

class ProjectTaskAttachmentController {
  static async create(req, res) {
    const { taskId } = req.params;
    const { userId } = req.user;
    const task = await req.prisma.projectTask.findUnique({ where: { id: taskId }, select: { projectId: true } });
    if (!task) return res.status(404).json({ message: 'Tarefa nao encontrada.' });
    await ProjectService.getById(req.prisma, task.projectId, userId);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'Nenhum ficheiro enviado.' });
    }

    // LÓGICA DE URL: Converter caminho absoluto do sistema para URL relativa
    const uploadsRoot = path.resolve(__dirname, '..', '..'); // Raiz do projeto backend
    const relativePath = path.relative(uploadsRoot, file.path);
    
    // Normaliza barras para funcionar em Windows/Linux na URL
    const fileUrl = `/${relativePath.split(path.sep).join('/')}`;

    const attachment = await req.prisma.projectTaskAttachment.create({
      data: {
        projectTaskId: taskId,
        fileName: file.originalname,
        fileUrl: fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: userId
      }
    });

    return res.status(201).json(attachment);
  }

  static async index(req, res) {
    const { taskId } = req.params;
    const task = await req.prisma.projectTask.findUnique({ where: { id: taskId }, select: { projectId: true } });
    if (!task) return res.status(404).json({ message: 'Tarefa nao encontrada.' });
    await ProjectService.getById(req.prisma, task.projectId, req.user.userId);
    const attachments = await req.prisma.projectTaskAttachment.findMany({
      where: { projectTaskId: taskId },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json(attachments);
  }

  static async delete(req, res) {
    const { id } = req.params;

    const attachment = await req.prisma.projectTaskAttachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Anexo não encontrado.' });
    }

    const task = await req.prisma.projectTask.findUnique({ where: { id: attachment.projectTaskId }, select: { projectId: true } });
    if (!task) return res.status(404).json({ message: 'Tarefa nao encontrada.' });
    await ProjectService.getById(req.prisma, task.projectId, req.user.userId);

    // Deletar arquivo físico
    // fileUrl ex: /uploads/projects/PROJETO/arquivo.png
    // path.join resolve o caminho absoluto correto
    const filePath = path.join(__dirname, '..', '..', attachment.fileUrl);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      logger.error('Erro ao apagar arquivo físico:', err);
    }

    await req.prisma.projectTaskAttachment.delete({ where: { id } });
    return res.status(204).send();
  }
}

module.exports = ProjectTaskAttachmentController;
