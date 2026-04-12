const yup = require('yup');
const ProjectService = require('../services/project.service');

class ProjectTaskCommentController {
  static async create(req, res) {
    const { taskId } = req.params;
    const { userId } = req.user;
    const task = await req.prisma.projectTask.findUnique({ where: { id: taskId }, select: { projectId: true } });
    if (!task) return res.status(404).json({ message: 'Tarefa nao encontrada.' });
    await ProjectService.getById(req.prisma, task.projectId, userId);
    
    const schema = yup.object().shape({
      content: yup.string().required()
    });

    await schema.validate(req.body);

    const comment = await req.prisma.projectTaskComment.create({
      data: {
        content: req.body.content,
        projectTaskId: taskId,
        userId: userId
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });

    return res.status(201).json(comment);
  }

  static async index(req, res) {
    const { taskId } = req.params;
    const task = await req.prisma.projectTask.findUnique({ where: { id: taskId }, select: { projectId: true } });
    if (!task) return res.status(404).json({ message: 'Tarefa nao encontrada.' });
    await ProjectService.getById(req.prisma, task.projectId, req.user.userId);
    const comments = await req.prisma.projectTaskComment.findMany({
      where: { projectTaskId: taskId },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json(comments);
  }

  static async delete(req, res) {
    const { id } = req.params;
    const { userId } = req.user;

    const comment = await req.prisma.projectTaskComment.findUnique({ where: { id } });
    if (!comment) return res.status(404).json({ message: 'Comentário não encontrado' });
    const task = await req.prisma.projectTask.findUnique({ where: { id: comment.projectTaskId }, select: { projectId: true } });
    if (!task) return res.status(404).json({ message: 'Tarefa nao encontrada.' });
    await ProjectService.getById(req.prisma, task.projectId, userId);

    // Regra: Só pode deletar o próprio comentário (ou admin, mas por enquanto só o dono)
    if (comment.userId !== userId) {
        return res.status(403).json({ message: 'Sem permissão para excluir este comentário' });
    }

    await req.prisma.projectTaskComment.delete({ where: { id } });
    return res.status(204).send();
  }
}

module.exports = ProjectTaskCommentController;
