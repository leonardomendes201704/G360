class IntegrationRepository {
    static async findAll(prisma) {
        return prisma.integration.findMany();
    }

    static async findByType(prisma, type) {
        return prisma.integration.findUnique({
            where: { type }
        });
    }

    static async update(prisma, type, data) {
        // Definir nome padrão caso não venha no data (necessário para o create do upsert)
        const defaultName = type === 'AZURE' ? 'Azure Active Directory' :
            type === 'LDAP' ? 'LDAP / Active Directory' : type;

        return prisma.integration.upsert({
            where: { type },
            update: data,
            create: {
                type,
                name: data.name || defaultName,
                ...data
            }
        });
    }
}

module.exports = IntegrationRepository;
