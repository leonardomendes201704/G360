const SoftwareLicenseRepository = require('../repositories/software-license.repository');
const AuditLogRepository = require('../repositories/audit-log.repository');
const { getUserAccessScope } = require('../utils/access-scope');
const logger = require('../config/logger');

class SoftwareLicenseService {
  static async create(prisma, tenantId, data, userId) {
    // await this.assertAdminAccess(userId); // REMOVED: Permissions handled by middleware
    // Conversao de datas
    const purchase = data.purchaseDate ? new Date(data.purchaseDate) : null;
    const expiration = data.expirationDate ? new Date(data.expirationDate) : null;

    if (purchase && expiration && expiration <= purchase) {
      const error = new Error('Data de expiracao deve ser posterior a data de compra.');
      error.statusCode = 400;
      throw error;
    }

    const license = await SoftwareLicenseRepository.create(prisma, {
      ...data,
      purchaseDate: purchase,
      expirationDate: expiration,
      tenantId
    });

    try {
      await AuditLogRepository.create(prisma, {
        userId: data.createdBy || 'system',
        action: 'registrou licenca',
        module: 'ASSETS',
        entityId: license.id,
        entityType: 'LICENSE',
        newData: license
      });
    } catch (e) { }

    // Email Notification (Asset Manager)
    try {
      // Assuming there is an Asset Manager role or specific user?
      // Or notify the creator? 
      // User request: "notificação de licenças novas e expiração"
      // Let's notify the creator for confirmation, or find an admin.
      // For now, let's notify the CREATOR as confirmation.
      const user = await prisma.user.findUnique({ where: { id: (data.createdBy || userId) } });
      if (user && user.email) {
        const EmailTemplateService = require('./email-template.service');
        const MailService = require('./mail.service');

        // Reuse Generic or Create valid template?
        // Using generic wrapper for now or simpler.
        // We don't have getLicenseCreatedTemplate.
        // I will use a simple wrapper call.
        const title = `Nova Licença: ${license.name}`;
        const content = `
                <h2>Licença Registrada 💿</h2>
                <p>Licença <strong>${license.name}</strong> registrada com sucesso.</p>
                <p>Chave: ${license.key}</p>
                <p>Vencimento: ${license.expirationDate ? new Date(license.expirationDate).toLocaleDateString() : 'N/A'}</p>
             `;

        await MailService.sendMail(prisma, {
          to: user.email,
          subject: `[ASSETS] Nova Licença: ${license.name}`,
          html: EmailTemplateService.getWrapper(title, content, `Nova licença registrada`),
          type: 'LICENSE_CREATED',
          module: 'ASSETS'
        });
      }
    } catch (e) { logger.error('Error sending license email', e); }

    return license;
  }

  static async getAll(prisma, tenantId, userId) {
    // await this.assertAdminAccess(userId); // REMOVED: Allow read access to all authenticated users with ASSET permissions
    return SoftwareLicenseRepository.findAll(prisma, tenantId);
  }

  static async getById(prisma, id, tenantId, userId) {
    // await this.assertAdminAccess(userId); // REMOVED: Allow read access to all authenticated users with ASSET permissions
    const license = await SoftwareLicenseRepository.findById(prisma, id, tenantId);
    if (!license) {
      const error = new Error('Licenca de software nao encontrada.');
      error.statusCode = 404;
      throw error;
    }
    return license;
  }

  static async update(prisma, id, tenantId, data, userId) {
    await this.getById(prisma, id, tenantId, userId); // Garante existencia

    // Tratamento de datas no update
    if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate);
    if (data.expirationDate) data.expirationDate = new Date(data.expirationDate);

    if (data.purchaseDate && data.expirationDate) {
      if (data.expirationDate <= data.purchaseDate) {
        throw { statusCode: 400, message: 'Data de expiracao invalida.' };
      }
    }

    const oldData = await this.getById(prisma, id, tenantId, userId);
    const updated = await SoftwareLicenseRepository.update(prisma, id, data);

    try {
      await AuditLogRepository.create(prisma, {
        userId: data.userId || 'system',
        action: 'atualizou licenca',
        module: 'ASSETS',
        entityId: id,
        entityType: 'LICENSE',
        oldData,
        newData: updated
      });
    } catch (e) { }

    return updated;
  }

  static async delete(prisma, id, tenantId, userId) {
    await this.getById(prisma, id, tenantId, userId);
    const oldData = await this.getById(prisma, id, tenantId, userId);
    await SoftwareLicenseRepository.delete(prisma, id);

    try {
      await AuditLogRepository.create(prisma, {
        userId: 'system',
        action: 'excluiu licenca',
        module: 'ASSETS',
        entityId: id,
        entityType: 'LICENSE',
        oldData
      });
    } catch (e) { }

    return true;
  }

  static async assertAdminAccess(prisma, userId) {
    if (!userId) throw { statusCode: 403, message: 'Acesso negado.' };
    const scope = await getUserAccessScope(prisma, userId);
    if (!scope.isAdmin) throw { statusCode: 403, message: 'Acesso negado.' };
  }
}

module.exports = SoftwareLicenseService;
