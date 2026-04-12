const UserService = require('../services/user.service');
const TenantManager = require('../config/tenant-manager');
const TenantRepository = require('../repositories/tenant.repository');
const yup = require('yup');

class UserController {
  static async create(req, res) {
    try {
      // 1. Validação com Yup
      const schema = yup.object().shape({
        name: yup.string().required('Nome é obrigatório'),
        email: yup.string().email('Email inválido').required('Email é obrigatório'),
        password: yup.string().min(6, 'Senha deve ter no mínimo 6 caracteres').required('Senha é obrigatória'),
        departmentId: yup.string().nullable().transform((v) => (v === '' ? null : v)).uuid('ID do departamento inválido'),
        costCenterId: yup.string().nullable().transform((v) => (v === '' ? null : v)).uuid('ID do centro de custo inválido'),
        roleIds: yup.array().of(yup.string().uuid('ID de perfil inválido')).optional()
      });

      await schema.validate(req.body, { abortEarly: false });

      // 2. Enforcement de Limite de Usuários (Multi-Tenant)
      if (req.tenantInfo && req.tenantInfo.slug !== 'default') {
        const catalog = TenantManager.getCatalogClient();
        const tenant = await TenantRepository.findBySlug(catalog, req.tenantInfo.slug);

        if (tenant) {
          const currentUsers = await req.prisma.user.count({ where: { isActive: true } });
          if (currentUsers >= tenant.maxUsers) {
            return res.status(403).json({
              error: 'Limite de usuários atingido.',
              message: `Seu plano (${tenant.plan}) permite no máximo ${tenant.maxUsers} usuários ativos. Atualize seu plano para adicionar mais.`
            });
          }
        }
      }

      const user = await UserService.createUser(req.prisma, req.body);

      // 2. Retorno
      return res.status(201).json(user);

    } catch (error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Erro de Validação',
          messages: error.errors
        });
      }
      throw error;
    }
  }

  // --- NOVO MÉTODO ---
  static async index(req, res) {
    try {
      const users = await UserService.findAll(req.prisma);
      return res.status(200).json(users);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const user = await UserService.update(req.prisma, id, req.body);
      return res.status(200).json(user);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      await UserService.delete(req.prisma, id);
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async toggleStatus(req, res) {
    try {
      const { id } = req.params;
      const user = await UserService.toggleStatus(req.prisma, id);
      return res.status(200).json(user);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async importAzureUsers(req, res) {
    try {
      const { users } = req.body; // Array de { name, email, azureId, roleId }

      if (!users || !Array.isArray(users)) {
        return res.status(400).json({ error: 'Lista de usuários inválida.' });
      }

      const result = await UserService.importUsers(req.prisma, users);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}


module.exports = UserController;