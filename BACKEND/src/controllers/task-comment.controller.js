const yup = require('yup');
const TaskService = require('../services/task.service');

class TaskCommentController {
  static async create(req, res) {
    try {
      const { taskId } = req.params;
      const { userId } = req.user;
      await TaskService.getById(req.prisma, taskId, userId);
      
      const schema = yup.object().shape({
        content: yup.string().required('Conteúdo é obrigatório')
      });

      await schema.validate(req.body);

      const comment = await req.prisma.taskComment.create({
        data: {
          content: req.body.content,
          taskId: taskId,
          userId: userId
        },
        include: {
          user: { select: { id: true, name: true, avatar: true } }
        }
      });

      return res.status(201).json(comment);
    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      return res.status(500).json({ message: error.message });
    }
  }

  static async index(req, res) {
    const { taskId } = req.params;
    await TaskService.getById(req.prisma, taskId, req.user.userId);
    const comments = await req.prisma.taskComment.findMany({
      where: { taskId: taskId },
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

    const comment = await req.prisma.taskComment.findUnique({ where: { id } });
    if (!comment) return res.status(404).json({ message: 'Comentário não encontrado' });
    await TaskService.getById(req.prisma, comment.taskId, userId);

    if (comment.userId !== userId) {
        return res.status(403).json({ message: 'Sem permissão para excluir este comentário' });
    }

    await req.prisma.taskComment.delete({ where: { id } });
    return res.status(204).send();
  }
}

module.exports = TaskCommentController;
