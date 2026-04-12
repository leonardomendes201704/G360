/**
 * Seed: Popular tabela global_settings com valores padrão.
 *
 * Uso:
 *   node src/scripts/seed_global_settings.js
 *
 * Requer DATABASE_URL apontando para o banco catálogo (public schema).
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

const DEFAULT_SETTINGS = [
    // ══════════════ GENERAL ══════════════
    { category: 'GENERAL', key: 'app_name', value: 'G360', value_type: 'STRING', label: 'Nome da Plataforma', description: 'Nome exibido no cabeçalho e notificações.' },
    { category: 'GENERAL', key: 'default_language', value: 'pt-BR', value_type: 'STRING', label: 'Idioma Padrão', description: 'Idioma padrão da plataforma.' },
    { category: 'GENERAL', key: 'timezone', value: 'America/Sao_Paulo', value_type: 'STRING', label: 'Fuso Horário', description: 'Fuso horário para exibição de datas.' },
    { category: 'GENERAL', key: 'date_format', value: 'DD/MM/YYYY', value_type: 'STRING', label: 'Formato de Data', description: 'Formato de exibição de datas.' },
    { category: 'GENERAL', key: 'enable_notifications', value: 'true', value_type: 'BOOLEAN', label: 'Habilitar Notificações', description: 'Ativar sistema de notificações por email e in-app.' },
    { category: 'GENERAL', key: 'session_timeout', value: '480', value_type: 'NUMBER', label: 'Timeout de Sessão (min)', description: 'Tempo de inatividade até expirar a sessão (em minutos).' },

    // ══════════════ SMTP ══════════════
    { category: 'SMTP', key: 'smtp_host', value: '', value_type: 'STRING', label: 'Servidor SMTP', description: 'Endereço do servidor de email (ex: smtp.gmail.com).' },
    { category: 'SMTP', key: 'smtp_port', value: '587', value_type: 'NUMBER', label: 'Porta', description: 'Porta do servidor SMTP (587 para TLS, 465 para SSL).' },
    { category: 'SMTP', key: 'smtp_secure', value: 'false', value_type: 'BOOLEAN', label: 'Usar SSL/TLS', description: 'Ativar conexão segura SSL.' },
    { category: 'SMTP', key: 'smtp_user', value: '', value_type: 'STRING', label: 'Usuário', description: 'Email ou usuário para autenticação SMTP.' },
    { category: 'SMTP', key: 'smtp_password', value: '', value_type: 'STRING', label: 'Senha', description: 'Senha do email para autenticação.' },
    { category: 'SMTP', key: 'smtp_from_email', value: '', value_type: 'STRING', label: 'Email Remetente', description: 'Endereço de email exibido como remetente.' },
    { category: 'SMTP', key: 'smtp_from_name', value: 'G360', value_type: 'STRING', label: 'Nome do Remetente', description: 'Nome exibido como remetente nos emails.' },

    // ══════════════ AUTH ══════════════
    { category: 'AUTH', key: 'allow_registration', value: 'false', value_type: 'BOOLEAN', label: 'Permitir Registro Público', description: 'Permite que novos usuários se cadastrem sem convite.' },
    { category: 'AUTH', key: 'password_min_length', value: '8', value_type: 'NUMBER', label: 'Tamanho Mínimo da Senha', description: 'Número mínimo de caracteres para senhas.' },
    { category: 'AUTH', key: 'require_2fa', value: 'false', value_type: 'BOOLEAN', label: 'Exigir 2FA', description: 'Exigir autenticação de dois fatores para todos os usuários.' },
    { category: 'AUTH', key: 'max_login_attempts', value: '5', value_type: 'NUMBER', label: 'Tentativas Máximas de Login', description: 'Número de tentativas antes de bloquear a conta.' },
    { category: 'AUTH', key: 'lockout_duration', value: '15', value_type: 'NUMBER', label: 'Duração do Bloqueio (min)', description: 'Tempo de bloqueio após exceder tentativas (em minutos).' },

    // ══════════════ MODULES ══════════════
    { category: 'MODULES', key: 'enable_risks', value: 'true', value_type: 'BOOLEAN', label: 'Módulo de Riscos', description: 'Habilitar gestão de riscos corporativos.' },
    { category: 'MODULES', key: 'enable_compliance', value: 'true', value_type: 'BOOLEAN', label: 'Módulo de Compliance', description: 'Habilitar gestão de compliance e conformidade.' },
    { category: 'MODULES', key: 'enable_incidents', value: 'true', value_type: 'BOOLEAN', label: 'Módulo de Incidentes', description: 'Habilitar registro e gestão de incidentes.' },
    { category: 'MODULES', key: 'enable_audits', value: 'true', value_type: 'BOOLEAN', label: 'Módulo de Auditorias', description: 'Habilitar planejamento e execução de auditorias.' },
    { category: 'MODULES', key: 'enable_action_plans', value: 'true', value_type: 'BOOLEAN', label: 'Módulo de Planos de Ação', description: 'Habilitar gestão de planos de ação e tarefas.' },
    { category: 'MODULES', key: 'enable_documents', value: 'true', value_type: 'BOOLEAN', label: 'Módulo de Documentos', description: 'Habilitar gestão documental.' },
    { category: 'MODULES', key: 'enable_training', value: 'false', value_type: 'BOOLEAN', label: 'Módulo de Treinamentos', description: 'Habilitar gestão de treinamentos e capacitações.' },
    { category: 'MODULES', key: 'enable_obz', value: 'true', value_type: 'BOOLEAN', label: 'Módulo OBZ', description: 'Habilitar Orçamento Base Zero.' },

    // ══════════════ MAINTENANCE ══════════════
    { category: 'MAINTENANCE', key: 'maintenance_mode', value: 'false', value_type: 'BOOLEAN', label: 'Modo Manutenção', description: 'Ativar tela de manutenção para todos os usuários (exceto admins).' },
    { category: 'MAINTENANCE', key: 'maintenance_message', value: 'O sistema está em manutenção. Voltaremos em breve.', value_type: 'STRING', label: 'Mensagem de Manutenção', description: 'Mensagem exibida quando o modo manutenção está ativo.' },
    { category: 'MAINTENANCE', key: 'log_retention_days', value: '90', value_type: 'NUMBER', label: 'Retenção de Logs (dias)', description: 'Número de dias para manter logs de atividade.' },
];

async function seed() {
    console.log('🔧 Populando global_settings com valores padrão...\n');

    const result = await prisma.globalSetting.createMany({
        data: DEFAULT_SETTINGS.map(s => ({
            category: s.category,
            key: s.key,
            value: s.value,
            valueType: s.value_type,
            label: s.label,
            description: s.description,
        })),
        skipDuplicates: true,
    });

    console.log(`\n✅ Seed concluído: ${result.count} registros inseridos (duplicados ignorados).`);
}

seed()
    .catch((err) => {
        console.error('❌ Erro no seed:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
