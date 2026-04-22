const ExpenseService = require('../services/expense.service');
const yup = require('yup');
const logger = require('../config/logger');

class ExpenseController {
  static async create(req, res) {
    try {
      // Verificar se existe orçamento aprovado para o ano da despesa
      const date = new Date(req.body.date);
      const year = date.getFullYear();

      const approvedBudget = await req.prisma.budget.findFirst({
        where: {
          fiscalYear: { year },
          status: 'APPROVED'
        }
      });

      if (!approvedBudget) {
        return res.status(400).json({
          error: `Não é possível criar despesas para ${year}. Não há orçamento aprovado para este ano fiscal. Aprove um orçamento primeiro.`
        });
      }

      // Categorias expandidas para incluir tipos de custo de projeto
      const validTypes = ['OPEX', 'CAPEX', 'SERVICO', 'MATERIAL', 'EQUIPAMENTO', 'MAO_OBRA'];

      const schema = yup.object().shape({
        description: yup.string().required('Descrição é obrigatória'),
        amount: yup.number().required('Valor é obrigatório'),
        date: yup.date().required('Data de competência é obrigatória'),
        type: yup.string().oneOf(validTypes).required('Tipo é obrigatório'),

        // Centro de Custo sempre obrigatório
        costCenterId: yup.string().uuid().required('Centro de Custo é obrigatório'),

        // Conta Contábil opcional
        accountId: yup.string().uuid().nullable().transform((v, o) => (o === '' ? null : v)),


        // Campos Opcionais — status restrito (aprovação via fluxo dedicado)
        status: yup
          .string()
          .oneOf(['PREVISTO', 'AGUARDANDO_APROVACAO'], 'Status inválido na criação')
          .default('PREVISTO'),
        dueDate: yup.date().nullable().transform((v, o) => (o === '' ? null : v)),
        paymentDate: yup.date().nullable().transform((v, o) => (o === '' ? null : v)),
        invoiceNumber: yup.string().nullable(),

        supplierId: yup.string().uuid().nullable().transform((v, o) => (o === '' ? null : v)),
        contractId: yup.string().uuid().nullable().transform((v, o) => (o === '' ? null : v)),
        approvalStatus: yup
          .string()
          .nullable()
          .oneOf([null, 'PLANNED', 'UNPLANNED'], 'Âmbito da despesa inválido'),
      });


      // 1. Valida e limpa campos desconhecidos (remove o que não estiver no schema)
      const validData = await schema.validate(req.body, { stripUnknown: true });

      // 2. Adiciona dados do Arquivo (se houver)
      if (req.file) {
        validData.fileUrl = `/uploads/expenses/${req.file.filename}`;
        validData.fileName = req.file.originalname;
      }

      // 2.1 Ensure approvalStatus is passed (Safety against Yup stripUnknown)
      if (req.body.approvalStatus) {
        validData.approvalStatus = req.body.approvalStatus;
      }

      // 3. Adiciona Tenant e Usuário
      validData.tenantId = req.user.tenantId;
      validData.createdBy = req.user.userId;

      // 4. Chama o Serviço com UM argumento (Objeto Completo)
      const expense = await ExpenseService.create(req.prisma, validData);

      return res.status(201).json(expense);

    } catch (error) {
      logger.error(error);
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      return res.status(500).json({ error: 'Erro ao criar despesa.' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;

      // Categorias expandidas
      const validTypes = ['OPEX', 'CAPEX', 'SERVICO', 'MATERIAL', 'EQUIPAMENTO', 'MAO_OBRA'];

      const schema = yup.object().shape({
        description: yup.string(),
        amount: yup.number(),
        date: yup.date(),
        type: yup.string().oneOf(validTypes),
        status: yup
          .string()
          .oneOf(
            ['PREVISTO', 'AGUARDANDO_APROVACAO', 'RETURNED', 'APROVADO', 'APPROVED', 'PAGO', 'AGUARDANDO_EXCLUSAO'],
            'Status de despesa inválido'
          ),
        accountId: yup.string().uuid().nullable().transform((v, o) => (o === '' ? null : v)),
        costCenterId: yup.string().uuid().nullable().transform((v, o) => (o === '' ? null : v)),
        dueDate: yup.date().nullable().transform((v, o) => (o === '' ? null : v)),
        paymentDate: yup.date().nullable().transform((v, o) => (o === '' ? null : v)),
        invoiceNumber: yup.string().nullable(),
        supplierId: yup.string().uuid().nullable().transform((v, o) => (o === '' ? null : v)),
        contractId: yup.string().uuid().nullable().transform((v, o) => (o === '' ? null : v)),
        approvalStatus: yup
          .string()
          .nullable()
          .oneOf([null, 'PLANNED', 'UNPLANNED'], 'Âmbito da despesa inválido'),
      });


      const validData = await schema.validate(req.body, { stripUnknown: true });

      if (req.file) {
        validData.fileUrl = `/uploads/expenses/${req.file.filename}`;
        validData.fileName = req.file.originalname;
      }

      // Ensure approvalStatus is passed (Safety against Yup stripUnknown)
      if (req.body.approvalStatus) {
        validData.approvalStatus = req.body.approvalStatus;
      }

      const prior = await req.prisma.expense.findUnique({
        where: { id },
        include: {
          costCenter: { include: { manager: true } },
        },
      });

      // Validação Estrita para Pagamento
      if (validData.status === 'PAGO') {
        if (!validData.invoiceNumber && !req.body.invoiceNumber) return res.status(400).json({ error: 'Para confirmar pagamento, é obrigatório informar o número da Nota Fiscal.' });
        if (!validData.dueDate && !req.body.dueDate) return res.status(400).json({ error: 'Para confirmar pagamento, é obrigatório informar a Data de Vencimento.' });

        // Se paymentDate não vier, usar data atual? O requisito diz "Deixando informações em branco". Vamos exigir.
        // Se o usuario setar PAGO e não mandar paymentDate, podemos assumir hoje ou exigir.
        // "TORNAR CAMPOS OBRIGATÓRIOS PARA CONFIRMAR COMO PAGA" - implica que o usuario deve preencher.
        // O campo paymentDate no frontend geralmente é preenchido automaticamente ao clicar "Pagar", mas aqui validamos.
      }

      // Update continua recebendo ID e Tenant separados por segurança
      const expense = await ExpenseService.update(req.prisma, id, req.user.tenantId, { ...validData, userId: req.user.userId });

      if (
        prior &&
        ['PREVISTO', 'RETURNED'].includes(prior.status) &&
        expense.status === 'AGUARDANDO_APROVACAO'
      ) {
        const NotificationService = require('../services/notification.service');
        const { notifyExpenseTierApprovers } = require('../services/approval-tier.service');
        if (prior.costCenter?.managerId) {
          await NotificationService.createNotification(
            req.prisma,
            prior.costCenter.managerId,
            'Despesa Pendente de Aprovação',
            `Uma despesa de R$ ${expense.amount} aguarda sua aprovação.`,
            'INFO',
            '/approvals'
          );
        }
        await notifyExpenseTierApprovers(req.prisma, { ...prior, ...expense }, {
          alreadyNotifiedManagerId: prior.costCenter?.managerId || undefined,
        });
      }

      return res.status(200).json(expense);

    } catch (error) {
      logger.error(error);
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      return res.status(500).json({ error: 'Erro ao atualizar despesa.' });
    }
  }

  static async index(req, res) {
    try {
      const expenses = await ExpenseService.getAll(req.prisma, req.user.tenantId, req.query, req.user);
      return res.status(200).json(expenses);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar despesas.' });
    }
  }

  static async show(req, res) {
    try {
      const expense = await ExpenseService.getById(req.prisma, req.params.id, req.user.tenantId, req.user.userId);
      return res.status(200).json(expense);
    } catch (error) {
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }
  }

  static async delete(req, res) {
    try {
      await ExpenseService.delete(req.prisma, req.params.id, req.user.tenantId, req.user.userId);
      return res.status(204).send();
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      return res.status(500).json({ error: 'Erro ao excluir.' });
    }
  }

  // Submeter despesa para aprovação
  static async submitForApproval(req, res) {
    try {
      const { id } = req.params;
      const { userId } = req.user;

      await ExpenseService.getById(req.prisma, id, req.user.tenantId, userId);

      // Buscar despesa com centro de custo
      const expense = await req.prisma.expense.findUnique({
        where: { id },
        include: {
          costCenter: {
            include: { manager: true }
          }
        }
      });

      if (!expense) {
        return res.status(404).json({ error: 'Despesa não encontrada.' });
      }

      // Validar que está em status que pode ser submetido
      if (expense.status !== 'PREVISTO' && expense.status !== 'RETURNED') {
        return res.status(400).json({
          error: 'Apenas despesas com status Previsto ou Devolvida para ajuste podem ser submetidas para aprovação.'
        });
      }

      // Atualizar status
      const updated = await req.prisma.expense.update({
        where: { id },
        data: {
          status: 'AGUARDANDO_APROVACAO',
          rejectionReason: null,
          requiresAdjustment: false,
        },
        include: {
          costCenter: true,
          supplier: true
        }
      });

      const NotificationService = require('../services/notification.service');
      const { notifyExpenseTierApprovers } = require('../services/approval-tier.service');

      // Notificar gestor do centro de custo
      if (expense.costCenter?.managerId) {
        await NotificationService.createNotification(req.prisma, expense.costCenter.managerId,
          'Despesa Pendente de Aprovação',
          `Uma despesa de R$ ${expense.amount} aguarda sua aprovação.`,
          'INFO',
          '/approvals'
        );
      }

      await notifyExpenseTierApprovers(req.prisma, expense, {
        alreadyNotifiedManagerId: expense.costCenter?.managerId || undefined,
      });

      return res.status(200).json(updated);

    } catch (error) {
      logger.error('Erro ao submeter despesa para aprovação:', error);
      return res.status(500).json({ error: 'Erro ao submeter despesa para aprovação.' });
    }
  }
}

module.exports = ExpenseController;

