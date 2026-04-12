const DepartmentService = require('../services/department.service');
const yup = require('yup');

class DepartmentController {
  static async create(req, res) {
    try {
      const schema = yup.object().shape({
        name: yup.string().required('Nome é obrigatório'),
        code: yup.string().required('Código é obrigatório'),
        parentId: yup.string().uuid().nullable().transform((v) => v === '' ? null : v),
        directorId: yup.string().uuid().nullable().transform((v) => v === '' ? null : v),
        budget: yup.number().nullable().transform((v) => isNaN(v) ? null : v)
      });

      const validated = await schema.validate(req.body, { stripUnknown: true });

      const department = await DepartmentService.create(req.prisma, validated);
      return res.status(201).json(department);
    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      throw error;
    }
  }

  static async index(req, res) {
    const departments = await DepartmentService.getAll(req.prisma);
    return res.status(200).json(departments);
  }

  static async update(req, res) {
    try {
      const schema = yup.object().shape({
        name: yup.string(),
        code: yup.string(),
        parentId: yup.string().uuid().nullable().transform((v) => v === '' ? null : v),
        directorId: yup.string().uuid().nullable().transform((v) => v === '' ? null : v),
        budget: yup.number().nullable().transform((v) => isNaN(v) ? null : v)
      });

      const validated = await schema.validate(req.body, { stripUnknown: true });

      const { id } = req.params;

      const department = await DepartmentService.update(req.prisma, id, validated);
      return res.status(200).json(department);
    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      throw error;
    }
  }

  static async delete(req, res) {
    const { id } = req.params;
    await DepartmentService.delete(req.prisma, id);
    return res.status(204).send();
  }
}

module.exports = DepartmentController;