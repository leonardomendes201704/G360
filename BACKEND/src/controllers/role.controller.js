const RoleService = require('../services/role.service');
const yup = require('yup');

class RoleController {
    static async index(req, res) {
        try {
            const roles = await RoleService.getAll(req.prisma);
            return res.status(200).json(roles);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const schema = yup.object().shape({
                name: yup.string().required('Nome é obrigatório'),
                permissions: yup.array().of(
                    yup.object().shape({
                        module: yup.string().required(),
                        action: yup.string().required()
                    })
                )
            });

            await schema.validate(req.body);
            const role = await RoleService.create(req.prisma, req.body);
            return res.status(201).json(role);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const role = await RoleService.update(req.prisma, id, req.body);
            return res.status(200).json(role);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            await RoleService.delete(req.prisma, id);
            return res.status(204).send();
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
}

module.exports = RoleController;
