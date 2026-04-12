const prisma = require('../config/database');

class TaskTimeController {
    // POST /tasks/:id/time/start — Inicia sessão de timer
    async start(req, res) {
        try {
            const { id: taskId } = req.params;
            const userId = req.user.userId || req.user.id;
            const prisma = req.prisma;

            // Verifica se tarefa existe e se o user é o assignee
            const task = await prisma.task.findUnique({ where: { id: taskId } });
            if (!task) return res.status(404).json({ message: 'Tarefa não encontrada.' });
            if (task.assigneeId !== userId) {
                return res.status(403).json({ message: 'Apenas o responsável pode iniciar o timer.' });
            }

            // Verifica se já tem sessão aberta (qualquer tarefa)
            const activeSession = await prisma.taskTimeLog.findFirst({
                where: { userId, endedAt: null }
            });
            if (activeSession) {
                return res.status(409).json({
                    message: 'Você já tem um timer ativo. Pare o timer atual antes de iniciar outro.',
                    activeTaskId: activeSession.taskId
                });
            }

            const log = await prisma.taskTimeLog.create({
                data: { taskId, userId },
                include: { task: { select: { id: true, title: true } } }
            });

            res.status(201).json(log);
        } catch (error) {
            console.error('[TaskTime.start]', error);
            res.status(500).json({ message: 'Erro ao iniciar timer.' });
        }
    }

    // POST /tasks/:id/time/stop — Para sessão ativa
    async stop(req, res) {
        try {
            const { id: taskId } = req.params;
            const userId = req.user.userId || req.user.id;
            const { notes } = req.body || {};
            const prisma = req.prisma;

            const activeLog = await prisma.taskTimeLog.findFirst({
                where: { taskId, userId, endedAt: null }
            });
            if (!activeLog) {
                return res.status(404).json({ message: 'Nenhum timer ativo para esta tarefa.' });
            }

            const endedAt = new Date();
            const duration = Math.round((endedAt - new Date(activeLog.startedAt)) / 1000);

            const updated = await prisma.taskTimeLog.update({
                where: { id: activeLog.id },
                data: { endedAt, duration, ...(notes ? { notes } : {}) },
                include: { task: { select: { id: true, title: true } } }
            });

            res.json(updated);
        } catch (error) {
            console.error('[TaskTime.stop]', error);
            res.status(500).json({ message: 'Erro ao parar timer.' });
        }
    }

    // GET /tasks/:id/time — Logs + total acumulado
    async history(req, res) {
        try {
            const { id: taskId } = req.params;
            const prisma = req.prisma;

            const logs = await prisma.taskTimeLog.findMany({
                where: { taskId },
                include: { user: { select: { id: true, name: true, email: true } } },
                orderBy: { startedAt: 'desc' }
            });

            const totalSeconds = logs.reduce((sum, l) => sum + (l.duration || 0), 0);

            res.json({ logs, totalSeconds });
        } catch (error) {
            console.error('[TaskTime.history]', error);
            res.status(500).json({ message: 'Erro ao buscar histórico.' });
        }
    }

    // GET /tasks/:id/time/active — Sessão ativa do user atual
    async active(req, res) {
        try {
            const userId = req.user.userId || req.user.id;
            const prisma = req.prisma;

            const activeLog = await prisma.taskTimeLog.findFirst({
                where: { userId, endedAt: null },
                include: { task: { select: { id: true, title: true, status: true } } }
            });

            res.json(activeLog || null);
        } catch (error) {
            console.error('[TaskTime.active]', error);
            res.status(500).json({ message: 'Erro ao buscar timer ativo.' });
        }
    }

    // GET /tasks/time-report — Relatório com filtros
    async report(req, res) {
        try {
            const { startDate, endDate, userId, taskId } = req.query;
            const prisma = req.prisma;

            const where = { endedAt: { not: null } };
            if (startDate) where.startedAt = { ...(where.startedAt || {}), gte: new Date(startDate) };
            if (endDate) where.startedAt = { ...(where.startedAt || {}), lte: new Date(endDate + 'T23:59:59') };
            if (userId) where.userId = userId;
            if (taskId) where.taskId = taskId;

            const logs = await prisma.taskTimeLog.findMany({
                where,
                include: {
                    task: { select: { id: true, title: true, status: true, priority: true } },
                    user: { select: { id: true, name: true, email: true } }
                },
                orderBy: { startedAt: 'desc' }
            });

            const totalSeconds = logs.reduce((sum, l) => sum + (l.duration || 0), 0);

            // Agrupar por usuário
            const byUser = {};
            logs.forEach(l => {
                const uid = l.userId;
                if (!byUser[uid]) byUser[uid] = { user: l.user, totalSeconds: 0, sessions: 0 };
                byUser[uid].totalSeconds += l.duration || 0;
                byUser[uid].sessions += 1;
            });

            // Agrupar por tarefa
            const byTask = {};
            logs.forEach(l => {
                const tid = l.taskId;
                if (!byTask[tid]) byTask[tid] = { task: l.task, totalSeconds: 0, sessions: 0 };
                byTask[tid].totalSeconds += l.duration || 0;
                byTask[tid].sessions += 1;
            });

            res.json({
                logs,
                totalSeconds,
                totalSessions: logs.length,
                byUser: Object.values(byUser),
                byTask: Object.values(byTask)
            });
        } catch (error) {
            console.error('[TaskTime.report]', error);
            res.status(500).json({ message: 'Erro ao gerar relatório.' });
        }
    }

    // GET /tasks/time-report/export?format=csv|xlsx
    async exportReport(req, res) {
        try {
            const { startDate, endDate, userId, taskId, format: fmt = 'csv' } = req.query;
            const prisma = req.prisma;

            const where = { endedAt: { not: null } };
            if (startDate) where.startedAt = { ...(where.startedAt || {}), gte: new Date(startDate) };
            if (endDate) where.startedAt = { ...(where.startedAt || {}), lte: new Date(endDate + 'T23:59:59') };
            if (userId) where.userId = userId;
            if (taskId) where.taskId = taskId;

            const logs = await prisma.taskTimeLog.findMany({
                where,
                include: {
                    task: { select: { title: true, status: true } },
                    user: { select: { name: true, email: true } }
                },
                orderBy: { startedAt: 'asc' }
            });

            const formatDuration = (seconds) => {
                const h = Math.floor(seconds / 3600);
                const m = Math.floor((seconds % 3600) / 60);
                const s = seconds % 60;
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            };

            const rows = logs.map(l => ({
                Tarefa: l.task?.title || '',
                Colaborador: l.user?.name || l.user?.email || '',
                Início: new Date(l.startedAt).toLocaleString('pt-BR'),
                Fim: l.endedAt ? new Date(l.endedAt).toLocaleString('pt-BR') : '',
                'Duração (HH:MM:SS)': formatDuration(l.duration || 0),
                'Duração (min)': Math.round((l.duration || 0) / 60),
                Notas: l.notes || ''
            }));

            if (fmt === 'xlsx') {
                // Excel export using basic tab-separated values (compatible with Excel)
                const header = Object.keys(rows[0] || {}).join('\t');
                const body = rows.map(r => Object.values(r).join('\t')).join('\n');
                const content = `${header}\n${body}`;

                res.setHeader('Content-Type', 'application/vnd.ms-excel');
                res.setHeader('Content-Disposition', `attachment; filename="relatorio_horas_${Date.now()}.xls"`);
                res.send(content);
            } else {
                // CSV export
                const header = Object.keys(rows[0] || {}).join(';');
                const body = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
                const bom = '\uFEFF'; // BOM para encoding correto no Excel
                const content = bom + `${header}\n${body}`;

                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="relatorio_horas_${Date.now()}.csv"`);
                res.send(content);
            }
        } catch (error) {
            console.error('[TaskTime.export]', error);
            res.status(500).json({ message: 'Erro ao exportar relatório.' });
        }
    }
}

module.exports = new TaskTimeController();
