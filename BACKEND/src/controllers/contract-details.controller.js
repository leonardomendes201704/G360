const NotificationService = require('../services/notification.service');
const ContractService = require('../services/contract.service');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

class ContractDetailsController {

  // --- MÉTODO PRIVADO: Recalcula o contrato baseando-se no Original + Histórico ---
  static async _recalculateContract(prisma, contractId) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { addendums: { orderBy: { signatureDate: 'asc' } } }
    });

    if (!contract) return;

    let currentValue = Number(contract.originalValue ?? contract.value);
    let currentEndDate = contract.originalEndDate ? new Date(contract.originalEndDate) : new Date(contract.endDate);

    for (const add of contract.addendums) {
      if (add.valueChange) {
        currentValue += Number(add.valueChange);
      }
      if (add.newEndDate) {
        currentEndDate = new Date(add.newEndDate);
      }
    }

    await prisma.contract.update({
      where: { id: contractId },
      data: {
        value: currentValue,
        endDate: currentEndDate
      }
    });
  }

  static async getAddendums(req, res) {
    const { id } = req.params;
    await ContractService.getById(req.prisma, id, req.user.userId);
    const addendums = await req.prisma.contractAddendum.findMany({
      where: { contractId: id },
      orderBy: { signatureDate: 'desc' }
    });
    return res.json(addendums);
  }

  static async createAddendum(req, res) {
    const { id } = req.params;
    const file = req.file;
    await ContractService.getById(req.prisma, id, req.user.userId);

    let fileUrl = null;
    let fileName = null;
    if (file) {
      const uploadsRoot = path.resolve(__dirname, '..', '..');
      const relativePath = path.relative(uploadsRoot, file.path);
      fileUrl = `/${relativePath.split(path.sep).join('/')}`;
      fileName = file.originalname;
    }

    // 1. Snapshot: Salva o estado original ANTES do primeiro aditivo
    const contract = await req.prisma.contract.findUnique({ where: { id } });
    if (contract) {
      if (new Date(req.body.signatureDate) < contract.startDate) {
        return res.status(400).json({ error: 'Data do aditivo não pode ser anterior ao início do contrato.' });
      }

      const updates = {};
      if (contract.originalValue === null) updates.originalValue = contract.value;
      if (contract.originalEndDate === null) updates.originalEndDate = contract.endDate;

      if (Object.keys(updates).length > 0) {
        await req.prisma.contract.update({ where: { id }, data: updates });
      }
    }

    // 2. Auto-generate addendum number linked to contract
    let addendumNumber = req.body.number;
    if (!addendumNumber && contract) {
      const addendumCount = await req.prisma.contractAddendum.count({ where: { contractId: id } });
      addendumNumber = `${contract.number}-ADT-${String(addendumCount + 1).padStart(2, '0')}`;
    }

    // 3. Cria o Aditivo
    const addendum = await req.prisma.contractAddendum.create({
      data: {
        contractId: id,
        number: addendumNumber || req.body.number,
        description: req.body.description,
        signatureDate: new Date(req.body.signatureDate),
        valueChange: req.body.valueChange ? Number(req.body.valueChange) : 0,
        newEndDate: req.body.newEndDate ? new Date(req.body.newEndDate) : null,
        fileUrl,
        fileName
      }
    });

    // 3. Recalcula e atualiza o contrato pai
    await ContractDetailsController._recalculateContract(req.prisma, id);

    try {
      const contractDetails = await req.prisma.contract.findUnique({
        where: { id },
        include: { costCenter: { include: { department: true } } }
      });

      const recipientId = contractDetails?.costCenter?.department?.managerId;
      if (recipientId) {
        await NotificationService.createNotification(req.prisma, recipientId,
          'Aditivo de Contrato',
          `Um novo aditivo foi registrado para o contrato.`,
          'INFO',
          `/contracts/${id}`
        );
      }
    } catch (e) {
      logger.error('Falha ao notificar aditivo', e);
    }

    return res.status(201).json(addendum);
  }

  static async updateAddendum(req, res) {
    const { addendumId } = req.params;
    const file = req.file;

    const existingAddendum = await req.prisma.contractAddendum.findUnique({ where: { id: addendumId } });
    if (!existingAddendum) return res.status(404).send();
    await ContractService.getById(req.prisma, existingAddendum.contractId, req.user.userId);

    const updateData = {
      number: req.body.number,
      description: req.body.description,
      signatureDate: new Date(req.body.signatureDate),
      valueChange: req.body.valueChange ? Number(req.body.valueChange) : 0,
      newEndDate: req.body.newEndDate ? new Date(req.body.newEndDate) : null,
    };

    if (file) {
      const uploadsRoot = path.resolve(__dirname, '..', '..');
      const relativePath = path.relative(uploadsRoot, file.path);
      updateData.fileUrl = `/${relativePath.split(path.sep).join('/')}`;
      updateData.fileName = file.originalname;
    }

    const updated = await req.prisma.contractAddendum.update({
      where: { id: addendumId },
      data: updateData
    });

    await ContractDetailsController._recalculateContract(req.prisma, updated.contractId);

    return res.json(updated);
  }

  static async deleteAddendum(req, res) {
    const { addendumId } = req.params;
    const addendum = await req.prisma.contractAddendum.findUnique({ where: { id: addendumId } });
    if (!addendum) return res.status(404).send();
    await ContractService.getById(req.prisma, addendum.contractId, req.user.userId);

    if (addendum.fileUrl) {
      const filePath = path.join(__dirname, '..', '..', addendum.fileUrl);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
    }

    await req.prisma.contractAddendum.delete({ where: { id: addendumId } });

    // Recalcula para reverter valores/datas
    await ContractDetailsController._recalculateContract(req.prisma, addendum.contractId);

    return res.status(204).send();
  }

  // ... (Métodos de Anexos permanecem iguais)
  static async getAttachments(req, res) {
    const { id } = req.params;
    await ContractService.getById(req.prisma, id, req.user.userId);
    const attachments = await req.prisma.contractAttachment.findMany({ where: { contractId: id }, orderBy: { createdAt: 'desc' } });
    return res.json(attachments);
  }

  static async uploadAttachment(req, res) {
    const { id } = req.params;
    const { userId } = req.user;
    const { type } = req.query;
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'Arquivo obrigatório' });
    await ContractService.getById(req.prisma, id, userId);

    if (['CONTRATO', 'CNPJ', 'PROPOSTA'].includes(type)) {
      const oldAttachment = await req.prisma.contractAttachment.findFirst({ where: { contractId: id, type } });
      if (oldAttachment) {
        const oldPath = path.join(__dirname, '..', '..', oldAttachment.fileUrl);
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (e) { }
        await req.prisma.contractAttachment.delete({ where: { id: oldAttachment.id } });
      }
    }
    const uploadsRoot = path.resolve(__dirname, '..', '..');
    const relativePath = path.relative(uploadsRoot, file.path);
    const fileUrl = `/${relativePath.split(path.sep).join('/')}`;
    const attachment = await req.prisma.contractAttachment.create({
      data: { contractId: id, fileName: file.originalname, fileUrl, fileSize: file.size, mimeType: file.mimetype, type: type || 'OUTROS', uploadedBy: userId }
    });
    return res.status(201).json(attachment);
  }

  static async deleteAttachment(req, res) {
    const { attachmentId } = req.params;
    const attachment = await req.prisma.contractAttachment.findUnique({ where: { id: attachmentId } });
    if (attachment) {
      await ContractService.getById(req.prisma, attachment.contractId, req.user.userId);
      const filePath = path.join(__dirname, '..', '..', attachment.fileUrl);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
      await req.prisma.contractAttachment.delete({ where: { id: attachmentId } });
    }
    return res.status(204).send();
  }
}

module.exports = ContractDetailsController;
