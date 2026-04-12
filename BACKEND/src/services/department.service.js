const DepartmentRepository = require('../repositories/department.repository');

class DepartmentService {
  static async create(prisma, data) {
    const existing = await DepartmentRepository.findByCode(prisma, data.code);
    if (existing) {
      const error = new Error('Já existe um departamento com este código.');
      error.statusCode = 409;
      throw error;
    }

    return DepartmentRepository.create(prisma, {
      ...data
      // tenantId removed
    });
  }

  static async getAll(prisma) {
    return DepartmentRepository.findAll(prisma);
  }

  static async update(prisma, id, data) {
    const department = await DepartmentRepository.findById(prisma, id);
    if (!department) {
      const error = new Error('Departamento não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    return DepartmentRepository.update(prisma, id, data);
  }

  static async delete(prisma, id) {
    const department = await DepartmentRepository.findById(prisma, id);
    if (!department) {
      const error = new Error('Departamento não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    return DepartmentRepository.delete(prisma, id);
  }
}

module.exports = DepartmentService;