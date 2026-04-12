const FreezeWindowRepository = require('../repositories/freeze-window.repository');

class FreezeWindowService {
    static async create(prisma, data) {
        if (new Date(data.startDate) > new Date(data.endDate)) {
            throw { statusCode: 400, message: 'Data de início deve ser anterior a data de fim.' };
        }
        return FreezeWindowRepository.create(prisma, data);
    }

    static async getAll(prisma, activeOnly = false) {
        return FreezeWindowRepository.findAll(prisma, activeOnly);
    }

    static async update(prisma, id, data) {
        if (data.startDate && data.endDate) {
            if (new Date(data.startDate) > new Date(data.endDate)) {
                throw { statusCode: 400, message: 'Data de início deve ser anterior a data de fim.' };
            }
        }
        return FreezeWindowRepository.update(prisma, id, data);
    }

    static async delete(prisma, id) {
        return FreezeWindowRepository.delete(prisma, id);
    }

    // Helper for ChangeRequestService
    static async checkFreeze(prisma, startDate, endDate) {
        return FreezeWindowRepository.findOverlapping(prisma, startDate, endDate);
    }
}

module.exports = FreezeWindowService;
