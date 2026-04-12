const UserRepository = require('../repositories/user.repository');
const bcrypt = require('bcryptjs');
const AuditLogRepository = require('../repositories/audit-log.repository');
const { validatePassword } = require('../utils/password-policy');
const logger = require('../config/logger');

class UserService {
  static async createUser(prisma, { name, email, password, roleId, roleIds, departmentId, costCenterId }) {
    // 1. Verificar se usuário já existe
    const userExists = await UserRepository.findByEmail(prisma, email);

    if (userExists) {
      const error = new Error('Usuário já cadastrado.');
      error.statusCode = 409; // Conflict
      throw error;
    }

    // 2. Validar política de senhas
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      const error = new Error(passwordValidation.errors.join('. '));
      error.statusCode = 400;
      throw error;
    }

    // 3. Criptografar senha (Hash)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Resolve Department from CostCenter if provided
    let finalDepartmentId = departmentId;
    if (costCenterId) {
      const cc = await prisma.costCenter.findUnique({ where: { id: costCenterId } });
      if (cc && cc.departmentId) {
        finalDepartmentId = cc.departmentId;
      }
    }

    // 4. Criar usuário
    const user = await UserRepository.create(prisma, {
      name,
      email,
      password: hashedPassword,
      roleIds: roleIds || (roleId ? [roleId] : undefined),
      departmentId: finalDepartmentId,
      costCenterId,
      isActive: true
    });

    // 5. Remover senha do objeto de retorno (segurança)
    const { password: _, ...userWithoutPassword } = user;

    try {
      await AuditLogRepository.create(prisma, {
        userId: 'system', // or initiator if passed
        action: 'criou usuário',
        module: 'CONFIG',
        entityId: user.id,
        entityType: 'USER',
        newData: userWithoutPassword
      });
    } catch (e) { logger.error('Audit Log Error', e); }

    return userWithoutPassword;
  }
  static async findAll(prisma) {
    return UserRepository.findAll(prisma);
  }

  static async update(prisma, id, data) {
    // Remover campos que não existem no schema Prisma
    delete data.currentPassword;
    delete data.confirmPassword;

    // Validar e criptografar senha se fornecida
    if (data.password) {
      const passwordValidation = validatePassword(data.password);
      if (!passwordValidation.valid) {
        const error = new Error(passwordValidation.errors.join('. '));
        error.statusCode = 400;
        throw error;
      }
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password, salt);
    }

    // Resolve Department if CostCenter changed
    if (data.costCenterId) {
      const cc = await prisma.costCenter.findUnique({ where: { id: data.costCenterId } });
      if (cc && cc.departmentId) {
        data.departmentId = cc.departmentId;
      }
    }

    const updated = await UserRepository.update(prisma, id, data);

    try {
      await AuditLogRepository.create(prisma, {
        userId: 'system',
        action: 'atualizou usuário',
        module: 'CONFIG',
        entityId: id,
        entityType: 'USER',
        newData: updated
      });
    } catch (e) { logger.error('Audit Log Error', e); }

    return updated;
  }

  static async delete(prisma, id) {
    const result = await UserRepository.delete(prisma, id);
    try {
      await AuditLogRepository.create(prisma, {
        userId: 'system',
        action: 'desativou usuário', // or deleted
        module: 'CONFIG',
        entityId: id,
        entityType: 'USER'
      });
    } catch (e) { logger.error('Audit Log Error', e); }
    return result;
  }

  static async toggleStatus(prisma, id) {
    const user = await UserRepository.findById(prisma, id);
    if (!user) throw { statusCode: 404, message: 'Usuário não encontrado' };

    return UserRepository.update(prisma, id, { isActive: !user.isActive });
  }

  static async importUsers(prisma, usersData) {
    const results = {
      total: usersData.length,
      created: 0,
      updated: 0,
      errors: 0
    };

    for (const userData of usersData) {
      try {
        const { name, email, azureId, roleId } = userData;

        // Verifica se usuário já existe por email
        const existingUser = await UserRepository.findByEmail(prisma, email);

        if (existingUser) {
          // Atualiza dados (vincula Azure ID e atualiza Role se fornecido)
          await UserRepository.update(prisma, existingUser.id, {
            azureId,
            azureId,
            roleIds: roleId ? [roleId] : undefined,
            name: name || existingUser.name // Atualiza nome se vier do Azure? Opcional
          });
          results.updated++;
        } else {
          // Cria novo usuário
          await UserRepository.create(prisma, {
            name,
            email,
            azureId,
            azureId,
            roleIds: roleId ? [roleId] : undefined,
            password: null, // Sem senha
            isActive: true
          });
          results.created++;
        }
      } catch (error) {
        logger.error(`Erro ao importar usuário ${userData.email}:`, error);
        results.errors++;
      }
    }

    return results;
  }
}

module.exports = UserService;