/**
 * Seed idempotente de fornecedores de demonstração (10 registros).
 * Uso programático: `await seedSuppliers(prisma, { verbose: true })`
 */

/** Monta CNPJ de 14 dígitos a partir de 12 dígitos base (únicos por índice). */
function buildCnpj12To14(base12) {
  if (base12.length !== 12 || !/^\d{12}$/.test(base12)) {
    throw new Error(`base12 inválido: ${base12}`);
  }
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let s = 0;
  for (let i = 0; i < 12; i += 1) s += parseInt(base12[i], 10) * w1[i];
  const d1 = s % 11 < 2 ? 0 : 11 - (s % 11);
  const b13 = base12 + String(d1);
  s = 0;
  for (let i = 0; i < 13; i += 1) s += parseInt(b13[i], 10) * w2[i];
  const d2 = s % 11 < 2 ? 0 : 11 - (s % 11);
  return b13 + String(d2);
}

const CLASSIFICATIONS = ['CRITICO', 'ESTRATEGICO', 'OPERACIONAL', 'OUTROS'];

function supplierRows() {
  const definitions = [
    {
      name: 'CloudTech Soluções em Nuvem Ltda',
      tradeName: 'CloudTech',
      base12: '112223330001',
      email: 'contato@cloudtechseed.g360.local',
      phone: '(11) 3000-1001',
      city: 'São Paulo',
      state: 'SP',
      category: 'TECNOLOGIA',
      contactName: 'Ana Souza',
    },
    {
      name: 'InfraLink Telecomunicações S.A.',
      tradeName: 'InfraLink',
      base12: '223334440002',
      email: 'comercial@infralinkseed.g360.local',
      phone: '(21) 3000-1002',
      city: 'Rio de Janeiro',
      state: 'RJ',
      category: 'TELECOM',
      contactName: 'Bruno Lima',
    },
    {
      name: 'SecureData Segurança da Informação Ltda',
      tradeName: 'SecureData',
      base12: '334445550003',
      email: 'vendas@secureseed.g360.local',
      phone: '(31) 3000-1003',
      city: 'Belo Horizonte',
      state: 'MG',
      category: 'SEGURANCA',
      contactName: 'Carla Mendes',
    },
    {
      name: 'OfficePrime Suprimentos Corporativos ME',
      tradeName: 'OfficePrime',
      base12: '445556660004',
      email: 'pedidos@officeprime.g360.local',
      phone: '(41) 3000-1004',
      city: 'Curitiba',
      state: 'PR',
      category: 'SUPRIMENTOS',
      contactName: 'Daniel Rocha',
    },
    {
      name: 'LogiExpress Transportes Integrados Ltda',
      tradeName: 'LogiExpress',
      base12: '556667770005',
      email: 'operacoes@logiexpress.g360.local',
      phone: '(51) 3000-1005',
      city: 'Porto Alegre',
      state: 'RS',
      category: 'LOGISTICA',
      contactName: 'Elena Costa',
    },
    {
      name: 'SoftHouse Desenvolvimento de Software Ltda',
      tradeName: 'SoftHouse',
      base12: '667778880006',
      email: 'projetos@softhouse.g360.local',
      phone: '(61) 3000-1006',
      city: 'Brasília',
      state: 'DF',
      category: 'SOFTWARE',
      contactName: 'Felipe Nunes',
    },
    {
      name: 'GreenEnergy Energia Renovável S.A.',
      tradeName: 'GreenEnergy',
      base12: '778889990007',
      email: 'contratos@greenenergy.g360.local',
      phone: '(71) 3000-1007',
      city: 'Salvador',
      state: 'BA',
      category: 'ENERGIA',
      contactName: 'Gabriela Alves',
    },
    {
      name: 'MedEquip Hospitalar Importação Ltda',
      tradeName: 'MedEquip',
      base12: '889990000008',
      email: 'importacao@medequip.g360.local',
      phone: '(81) 3000-1008',
      city: 'Recife',
      state: 'PE',
      category: 'SAUDE',
      contactName: 'Henrique Dias',
    },
    {
      name: 'AgroBem Insumos Agrícolas Ltda',
      tradeName: 'AgroBem',
      base12: '990001110009',
      email: 'vendas@agrobem.g360.local',
      phone: '(62) 3000-1009',
      city: 'Goiânia',
      state: 'GO',
      category: 'AGRO',
      contactName: 'Isabela Freitas',
    },
    {
      name: 'FinConsult Assessoria Financeira ME',
      tradeName: 'FinConsult',
      base12: '001112220010',
      email: 'contato@finconsult.g360.local',
      phone: '(48) 3000-1010',
      city: 'Florianópolis',
      state: 'SC',
      category: 'SERVICOS',
      contactName: 'João Pedro Silva',
    },
  ];

  return definitions.map((def, i) => {
    const document = buildCnpj12To14(def.base12);
    const classification = CLASSIFICATIONS[i % CLASSIFICATIONS.length];
    const { base12, ...rest } = def;
    return {
      ...rest,
      document,
      documentType: 'CNPJ',
      classification,
      country: 'Brasil',
      status: 'ATIVO',
      rating: Math.min(5, 3 + (i % 3)),
      isActive: true,
    };
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ verbose?: boolean }} [options]
 */
async function seedSuppliers(prisma, options = {}) {
  const { verbose = false } = options;
  const rows = supplierRows();
  let upserted = 0;

  for (const row of rows) {
    const { document, ...updateData } = row;
    await prisma.supplier.upsert({
      where: { document },
      create: row,
      update: {
        name: updateData.name,
        tradeName: updateData.tradeName,
        documentType: updateData.documentType,
        email: updateData.email,
        phone: updateData.phone,
        address: updateData.address,
        city: updateData.city,
        state: updateData.state,
        country: updateData.country,
        zipCode: updateData.zipCode,
        classification: updateData.classification,
        category: updateData.category,
        contactName: updateData.contactName,
        status: updateData.status,
        rating: updateData.rating,
        isActive: updateData.isActive,
      },
    });
    upserted += 1;
    if (verbose) {
      console.log(`   ✓ ${row.tradeName || row.name} (${document})`);
    }
  }

  return { count: upserted };
}

module.exports = {
  seedSuppliers,
  supplierRows,
  buildCnpj12To14,
};
