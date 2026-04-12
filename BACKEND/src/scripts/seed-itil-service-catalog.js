/**
 * Catálogo ITIL — SLAs de referência de mercado, categorias e serviços com formulários de abertura.
 * Idempotente: pode rodar várias vezes (upsert por nome; serviços por nome + categoria).
 *
 * SLAs (minutos) — referência comum em ITSM corporativo:
 * - P1: 1ª resposta 15 min, solução alvo 4 h
 * - P2: 1 h / 8 h
 * - P3: 4 h / 24 h
 * - P4: 8 h / 72 h
 * - Requisição: 2 h / 48 h (pedidos padronizados)
 * - Mudança: 8 h / 7 dias (análise / CAB / planejamento)
 */

/** @param {import('@prisma/client').PrismaClient} prisma */
async function upsertSlaPolicies(prisma) {
  const slas = [
    {
      name: 'SLA P1 — Crítico',
      description: 'Incidente crítico: 1ª resposta 15 min, solução alvo 4 h (referência mercado).',
      responseMinutes: 15,
      resolveMinutes: 240
    },
    {
      name: 'SLA P2 — Alto',
      description: 'Alto impacto: 1ª resposta 1 h, solução alvo 8 h.',
      responseMinutes: 60,
      resolveMinutes: 480
    },
    {
      name: 'SLA P3 — Médio',
      description: 'Médio impacto: 1ª resposta 4 h, solução alvo 24 h.',
      responseMinutes: 240,
      resolveMinutes: 1440
    },
    {
      name: 'SLA P4 — Baixo',
      description: 'Baixo impacto: 1ª resposta 8 h, solução alvo 72 h.',
      responseMinutes: 480,
      resolveMinutes: 4320
    },
    {
      name: 'SLA Requisição padrão',
      description: 'Requisição de serviço: 1ª resposta 2 h, cumprimento 48 h (pedidos padronizados).',
      responseMinutes: 120,
      resolveMinutes: 2880
    },
    {
      name: 'SLA Mudança',
      description: 'Mudança / release: 1ª resposta 8 h, conclusão alvo 7 dias (análise de impacto e CAB).',
      responseMinutes: 480,
      resolveMinutes: 10080
    }
  ];

  const map = {};
  for (const s of slas) {
    const row = await prisma.slaPolicy.upsert({
      where: { name: s.name },
      update: {
        description: s.description,
        responseMinutes: s.responseMinutes,
        resolveMinutes: s.resolveMinutes,
        isActive: true
      },
      create: {
        name: s.name,
        description: s.description,
        responseMinutes: s.responseMinutes,
        resolveMinutes: s.resolveMinutes,
        isActive: true
      }
    });
    map[s.name] = row.id;
  }
  return map;
}

async function upsertCategories(prisma) {
  const categories = [
    {
      name: 'Incidente',
      description: 'Interrupção ou degradação não planejada de serviço de TI (gestão de incidentes).'
    },
    {
      name: 'Requisição de serviço',
      description: 'Pedidos padronizados: informação, acesso, equipamento, material (service request).'
    },
    {
      name: 'Gestão de identidade e acessos',
      description: 'Contas, perfis, grupos, MFA e permissões em sistemas corporativos.'
    },
    {
      name: 'Estações de trabalho e periféricos',
      description: 'Desktop, notebook, monitores, impressoras e periféricos.'
    },
    {
      name: 'Rede, voz e colaboração',
      description: 'LAN/WAN, VPN, Wi‑Fi, voz e ferramentas de colaboração.'
    },
    {
      name: 'Aplicações e dados',
      description: 'ERP, CRM, BI, integrações e dados / relatórios.'
    },
    {
      name: 'Segurança da informação',
      description: 'Ameaças, phishing, malware, exceções e controles de segurança.'
    },
    {
      name: 'Mudança e release',
      description: 'Mudanças em infraestrutura ou aplicação; janelas e deploy (change management).'
    },
    {
      name: 'Fornecedores e terceiros',
      description: 'Garantia, RMA e coordenação com fabricantes ou prestadores.'
    }
  ];

  const map = {};
  for (const c of categories) {
    const row = await prisma.ticketCategory.upsert({
      where: { name: c.name },
      update: { description: c.description, isActive: true },
      create: { name: c.name, description: c.description }
    });
    map[c.name] = row.id;
  }
  return map;
}

const opt = (s) => s;

/** Formulários reutilizáveis (campos compatíveis com PortalPage / CatalogAdmin) */
const Forms = {
  incidentBase: [
    {
      id: 'impacto',
      type: 'select',
      label: 'Impacto no negócio',
      required: true,
      options: opt('Alto — vários usuários ou processo crítico,Médio — um time ou área,Baixo — um usuário ou rotina secundária')
    },
    {
      id: 'urgencia',
      type: 'select',
      label: 'Urgência',
      required: true,
      options: opt('Crítica — paralisado agora,Alta — prazo hoje,Média — até o próximo dia útil,Baixa — quando possível')
    },
    {
      id: 'sintomas',
      type: 'textarea',
      label: 'Sintomas e mensagens de erro (se houver)',
      required: true
    },
    {
      id: 'patrimonio',
      type: 'text',
      label: 'Patrimônio ou hostname (se souber)',
      required: false
    },
    {
      id: 'contato',
      type: 'text',
      label: 'Telefone ou ramal para retorno',
      required: true
    }
  ],
  requestBase: [
    {
      id: 'justificativa',
      type: 'textarea',
      label: 'Justificativa / necessidade de negócio',
      required: true
    },
    {
      id: 'data_desejada',
      type: 'date',
      label: 'Data desejada para conclusão',
      required: false
    },
    {
      id: 'gestor_email',
      type: 'text',
      label: 'E-mail do gestor para aprovação (se aplicável)',
      required: false
    }
  ],
  accessRequest: [
    {
      id: 'sistema',
      type: 'text',
      label: 'Sistema ou aplicação',
      required: true
    },
    {
      id: 'perfil',
      type: 'select',
      label: 'Tipo de acesso',
      required: true,
      options: opt('Leitura,Inclusão/edição,Administrador,Conforme usuário espelho')
    },
    {
      id: 'espelho',
      type: 'text',
      label: 'Usuário espelho (copiar permissões de)',
      required: false
    },
    {
      id: 'gestor_aprovador',
      type: 'text',
      label: 'E-mail do gestor que aprova o acesso',
      required: true
    }
  ],
  changeBase: [
    {
      id: 'titulo_mudanca',
      type: 'text',
      label: 'Resumo da mudança',
      required: true
    },
    {
      id: 'risco',
      type: 'select',
      label: 'Risco estimado',
      required: true,
      options: opt('Baixo,Médio,Alto')
    },
    {
      id: 'janela',
      type: 'textarea',
      label: 'Janela desejada e impacto esperado',
      required: true
    },
    {
      id: 'rollback',
      type: 'textarea',
      label: 'Plano de rollback (se aplicável)',
      required: false
    }
  ]
};

function servicesDefinitions() {
  return [
    {
      categoryName: 'Incidente',
      slaName: 'SLA P1 — Crítico',
      name: 'Indisponibilidade de serviço crítico',
      description: 'Sistema essencial fora do ar ou inutilizável para o negócio.',
      icon: 'error_outline',
      formSchema: Forms.incidentBase
    },
    {
      categoryName: 'Incidente',
      slaName: 'SLA P2 — Alto',
      name: 'Lentidão ou falha em aplicação',
      description: 'Erros intermitentes, travamentos ou performance inaceitável em sistema corporativo.',
      icon: 'bug_report',
      formSchema: Forms.incidentBase
    },
    {
      categoryName: 'Incidente',
      slaName: 'SLA P2 — Alto',
      name: 'Falha de rede, VPN ou Wi‑Fi',
      description: 'Sem conectividade, VPN não autentica ou Wi‑Fi institucional indisponível.',
      icon: 'wifi_off',
      formSchema: Forms.incidentBase
    },
    {
      categoryName: 'Incidente',
      slaName: 'SLA P3 — Médio',
      name: 'Estação não liga ou hardware com defeito',
      description: 'Notebook/desktop, tela, energia ou componente com falha física.',
      icon: 'devices',
      formSchema: Forms.incidentBase
    },
    {
      categoryName: 'Incidente',
      slaName: 'SLA P3 — Médio',
      name: 'E-mail ou colaboração indisponível',
      description: 'Correio, calendário, Teams/Slack ou equivalente com falha.',
      icon: 'mail_outline',
      formSchema: Forms.incidentBase
    },
    {
      categoryName: 'Incidente',
      slaName: 'SLA P2 — Alto',
      name: 'Restauração de arquivo ou backup',
      description: 'Recuperação pontual de arquivo ou pasta a partir de backup.',
      icon: 'restore',
      formSchema: [
        ...Forms.incidentBase.slice(0, 3),
        {
          id: 'caminho',
          type: 'textarea',
          label: 'Caminho da pasta/arquivo e data aproximada da versão desejada',
          required: true
        },
        { id: 'contato', type: 'text', label: 'Telefone ou ramal para retorno', required: true }
      ]
    },

    {
      categoryName: 'Requisição de serviço',
      slaName: 'SLA P4 — Baixo',
      name: 'Orientação geral de TI',
      description: 'Dúvidas sobre processos, ferramentas ou encaminhamento ao canal certo.',
      icon: 'help_outline',
      formSchema: [
        {
          id: 'duvida',
          type: 'textarea',
          label: 'Descreva sua dúvida',
          required: true
        },
        { id: 'contato', type: 'text', label: 'Telefone ou ramal', required: false }
      ]
    },
    {
      categoryName: 'Requisição de serviço',
      slaName: 'SLA Requisição padrão',
      name: 'Solicitação de equipamento',
      description: 'Notebook, monitor, dock, headset ou demais ativos padronizados.',
      icon: 'laptop_mac',
      formSchema: [
        ...Forms.requestBase,
        {
          id: 'tipo_equip',
          type: 'select',
          label: 'Tipo de equipamento',
          required: true,
          options: opt('Notebook,Monitor,Headset,Mouse/Teclado,Dock/Adaptador,Outro')
        }
      ]
    },
    {
      categoryName: 'Requisição de serviço',
      slaName: 'SLA Requisição padrão',
      name: 'Instalação ou licença de software',
      description: 'Solicitação de instalação ou atribuição de licença de software corporativo.',
      icon: 'extension',
      formSchema: [
        ...Forms.requestBase,
        {
          id: 'software_nome',
          type: 'text',
          label: 'Nome do software e versão (se souber)',
          required: true
        }
      ]
    },
    {
      categoryName: 'Requisição de serviço',
      slaName: 'SLA Requisição padrão',
      name: 'Preparação de estação (onboarding)',
      description: 'Configuração de estação para novo colaborador ou mudança de função.',
      icon: 'work',
      formSchema: [
        ...Forms.requestBase,
        {
          id: 'novo_colaborador',
          type: 'text',
          label: 'Nome completo do colaborador e data de início',
          required: true
        }
      ]
    },

    {
      categoryName: 'Gestão de identidade e acessos',
      slaName: 'SLA Requisição padrão',
      name: 'Solicitação de acesso a sistema',
      description: 'Inclusão ou alteração de permissões em aplicações corporativas.',
      icon: 'vpn_key',
      formSchema: Forms.accessRequest
    },
    {
      categoryName: 'Gestão de identidade e acessos',
      slaName: 'SLA P3 — Médio',
      name: 'Reset de senha ou desbloqueio de conta',
      description: 'Conta bloqueada, senha expirada ou MFA com problema.',
      icon: 'lock_open',
      formSchema: [
        {
          id: 'conta',
          type: 'text',
          label: 'Usuário / e-mail corporativo afetado',
          required: true
        },
        {
          id: 'local',
          type: 'text',
          label: 'Onde ocorre o bloqueio (Windows, VPN, e-mail, outro)',
          required: true
        },
        { id: 'contato', type: 'text', label: 'Telefone para validação', required: true }
      ]
    },
    {
      categoryName: 'Gestão de identidade e acessos',
      slaName: 'SLA Requisição padrão',
      name: 'Alteração de perfil ou grupo de segurança',
      description: 'Mudança de cargo, transferência ou revisão de grupos do AD/LDAP.',
      icon: 'group',
      formSchema: Forms.accessRequest
    },

    {
      categoryName: 'Estações de trabalho e periféricos',
      slaName: 'SLA P4 — Baixo',
      name: 'Impressora ou digitalização',
      description: 'Fila parada, toner, driver ou equipamento compartilhado.',
      icon: 'print',
      formSchema: [
        {
          id: 'local_fisico',
          type: 'text',
          label: 'Local ou nome da impressora (etiqueta)',
          required: true
        },
        { id: 'sintomas', type: 'textarea', label: 'O que está acontecendo', required: true }
      ]
    },
    {
      categoryName: 'Estações de trabalho e periféricos',
      slaName: 'SLA Requisição padrão',
      name: 'Troca de periférico simples',
      description: 'Mouse, teclado, cabos ou acessórios padronizados.',
      icon: 'mouse',
      formSchema: Forms.requestBase
    },

    {
      categoryName: 'Rede, voz e colaboração',
      slaName: 'SLA Requisição padrão',
      name: 'Novo ponto de rede ou alteração de IP',
      description: 'Mesa nova, mudança de layout ou ajuste de VLAN/DHCP.',
      icon: 'settings_ethernet',
      formSchema: [
        ...Forms.requestBase,
        {
          id: 'local',
          type: 'text',
          label: 'Andar / sala / patrimônio',
          required: true
        }
      ]
    },
    {
      categoryName: 'Rede, voz e colaboração',
      slaName: 'SLA P4 — Baixo',
      name: 'Telefonia ou videoconferência',
      description: 'Ramais, discagem, áudio/ vídeo em salas ou equipamento de VC.',
      icon: 'videocam',
      formSchema: [
        { id: 'sala_ou_ramal', type: 'text', label: 'Sala ou ramal', required: true },
        { id: 'sintomas', type: 'textarea', label: 'Descrição do problema', required: true }
      ]
    },

    {
      categoryName: 'Aplicações e dados',
      slaName: 'SLA P4 — Baixo',
      name: 'Dúvida ou orientação em aplicação',
      description: 'Como usar funcionalidade, fluxo ou erro de validação não crítico.',
      icon: 'quiz',
      formSchema: [
        {
          id: 'sistema',
          type: 'text',
          label: 'Sistema / módulo',
          required: true
        },
        { id: 'duvida', type: 'textarea', label: 'O que precisa realizar', required: true }
      ]
    },
    {
      categoryName: 'Aplicações e dados',
      slaName: 'SLA Requisição padrão',
      name: 'Relatório, exportação ou dados',
      description: 'Extração sob demanda, ajuste de visão ou suporte a BI.',
      icon: 'table_chart',
      formSchema: [
        ...Forms.requestBase,
        {
          id: 'relatorio',
          type: 'text',
          label: 'Nome do relatório ou painel',
          required: true
        }
      ]
    },

    {
      categoryName: 'Segurança da informação',
      slaName: 'SLA P2 — Alto',
      name: 'Suspeita de phishing, malware ou conta comprometida',
      description: 'Clique suspeito, anexo, ou sinais de conta invadida — prioridade alta.',
      icon: 'security',
      formSchema: [
        {
          id: 'o_que_ocorreu',
          type: 'textarea',
          label: 'O que aconteceu (sem abrir links suspeitos novamente)',
          required: true
        },
        {
          id: 'encaminhou',
          type: 'select',
          label: 'Encaminhou e-mail ou arquivo a outras pessoas?',
          required: true,
          options: opt('Não,Sim — informar quem no campo abaixo')
        },
        { id: 'contato', type: 'text', label: 'Ramal ou telefone para contato imediato', required: true }
      ]
    },
    {
      categoryName: 'Segurança da informação',
      slaName: 'SLA Requisição padrão',
      name: 'Exceção de segurança (URL, firewall, DLP)',
      description: 'Liberação pontual com análise de risco.',
      icon: 'shield',
      formSchema: [
        ...Forms.requestBase,
        {
          id: 'recurso',
          type: 'textarea',
          label: 'URL, IP, sistema ou regra desejada',
          required: true
        }
      ]
    },

    {
      categoryName: 'Mudança e release',
      slaName: 'SLA Mudança',
      name: 'Solicitação de mudança (Change)',
      description: 'Alteração planejada em ambiente de TI; pode exigir CAB.',
      icon: 'published_with_changes',
      formSchema: Forms.changeBase
    },
    {
      categoryName: 'Mudança e release',
      slaName: 'SLA Mudança',
      name: 'Deploy ou liberação em janela',
      description: 'Publicação de versão em homologação/produção em horário acordado.',
      icon: 'rocket_launch',
      formSchema: [
        ...Forms.changeBase,
        {
          id: 'ambiente',
          type: 'select',
          label: 'Ambiente',
          required: true,
          options: opt('Desenvolvimento,Homologação,Produção')
        }
      ]
    },

    {
      categoryName: 'Fornecedores e terceiros',
      slaName: 'SLA P3 — Médio',
      name: 'Garantia, RMA ou acionamento de fabricante',
      description: 'Abertura de chamado junto ao fornecedor com suporte da TI.',
      icon: 'support_agent',
      formSchema: [
        {
          id: 'fabricante',
          type: 'text',
          label: 'Fabricante e modelo',
          required: true
        },
        {
          id: 'patrimonio',
          type: 'text',
          label: 'Patrimônio / número de série',
          required: true
        },
        { id: 'defeito', type: 'textarea', label: 'Defeito relatado', required: true }
      ]
    }
  ];
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ verbose?: boolean }} [options]
 */
async function seedItilServiceCatalog(prisma, options = {}) {
  const verbose = options.verbose !== false;

  const slaByName = await upsertSlaPolicies(prisma);
  const catByName = await upsertCategories(prisma);

  const defs = servicesDefinitions();
  let created = 0;
  let updated = 0;

  for (const def of defs) {
    const categoryId = catByName[def.categoryName];
    const slaPolicyId = slaByName[def.slaName];
    if (!categoryId) throw new Error(`Categoria não encontrada: ${def.categoryName}`);
    if (!slaPolicyId) throw new Error(`SLA não encontrado: ${def.slaName}`);

    const existing = await prisma.serviceCatalog.findFirst({
      where: { name: def.name, categoryId }
    });

    const payload = {
      description: def.description,
      icon: def.icon || 'build',
      categoryId,
      slaPolicyId,
      formSchema: def.formSchema || [],
      isActive: true
    };

    if (existing) {
      await prisma.serviceCatalog.update({ where: { id: existing.id }, data: payload });
      updated += 1;
    } else {
      await prisma.serviceCatalog.create({
        data: {
          name: def.name,
          ...payload
        }
      });
      created += 1;
    }
  }

  if (verbose) {
    console.log(`   📚 Catálogo ITIL: +${created} serviço(s) novo(s), ${updated} atualizado(s).`);
  }

  return { created, updated, categories: Object.keys(catByName).length, slas: Object.keys(slaByName).length };
}

module.exports = {
  seedItilServiceCatalog,
  upsertSlaPolicies,
  upsertCategories,
  servicesDefinitions
};
