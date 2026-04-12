const { PrismaClient } = require('@prisma/client');
const ticketService = require('./ticket.service');

class ProblemService {
  static async getAll(prismaClient, query) {
    let where = {};
    if (query.status) where.status = query.status;

    return await prismaClient.problemRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, name: true, avatar: true } },
        incidents: { select: { id: true, code: true, title: true, status: true } }
      }
    });
  }

  static async getById(prismaClient, id) {
    const problem = await prismaClient.problemRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, avatar: true } },
        incidents: true
      }
    });
    if (!problem) throw new Error('Problema não encontrado');
    return problem;
  }

  static async create(prismaClient, data) {
    const total = await prismaClient.problemRequest.count();
    const code = `PRB-${new Date().getFullYear()}-${String(total + 1).padStart(4, '0')}`;

    return await prismaClient.problemRequest.create({
      data: {
        code,
        title: data.title,
        description: data.description,
        priority: data.priority || 'HIGH',
        requesterId: data.requesterId
      }
    });
  }

  static async updateStatus(prismaClient, id, status, rootCause, workaround) {
    const updates = { status };
    if (rootCause) updates.rootCause = rootCause;
    if (workaround) updates.workaround = workaround;
    if (status === 'RESOLVED' || status === 'CLOSED') updates.resolvedAt = new Date();

    const problem = await prismaClient.problemRequest.update({
      where: { id },
      data: updates,
      include: { incidents: true }
    });

    // Se o problema for resolvido e houver workaround/rootcause, auto-resolver todos os incidentes filhos.
    if ((status === 'RESOLVED' || status === 'CLOSED') && problem.incidents && problem.incidents.length > 0) {
      for (const incident of problem.incidents) {
        if (incident.status !== 'RESOLVED' && incident.status !== 'CLOSED') {
          // Add a message to the incident explaining auto-resolution
          await ticketService.addMessage(
            prismaClient,
            incident.id,
            problem.requesterId, // The person who resolved the problem
            `Problema Causa-Raiz [${problem.code}] foi marcado como Resolvido.\nCausa Raiz: ${problem.rootCause || 'N/A'}\nSolução de Contorno: ${problem.workaround || 'N/A'}\nO incidente foi fechado automaticamente de forma massiva.`,
            true // Internal note? Let's make it public so users see why it was resolved.
          );
          await ticketService.updateStatus(prismaClient, incident.id, 'RESOLVED', {});
        }
      }
    }

    return problem;
  }

  static async linkIncident(prismaClient, problemId, ticketId) {
    return await prismaClient.ticket.update({
      where: { id: ticketId },
      data: { problemId }
    });
  }
}

module.exports = ProblemService;
