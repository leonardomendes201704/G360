/**
 * Script para criar a tabela global_settings no schema public.
 * 
 * Uso: node src/scripts/create-global-settings-table.js
 * 
 * Esta tabela armazena configurações globais da plataforma (key-value).
 * Pertence ao schema public (catálogo), não aos schemas de tenant.
 */

require('dotenv').config();
const TenantManager = require('../config/tenant-manager');

const DEFAULT_SETTINGS = [
    // ── GENERAL ──
    { category: 'GENERAL', key: 'platform_name', value: 'G360 Enterprise', value_type: 'STRING', label: 'Nome da Plataforma', description: 'Nome exibido na interface e emails' },
    { category: 'GENERAL', key: 'platform_logo_url', value: '/assets/g360_logo_dark.png', value_type: 'STRING', label: 'URL do Logo', description: 'URL do logo da plataforma' },
    { category: 'GENERAL', key: 'default_timezone', value: 'America/Sao_Paulo', value_type: 'STRING', label: 'Timezone Padrão', description: 'Fuso horário padrão para novos tenants' },
    { category: 'GENERAL', key: 'default_language', value: 'pt-BR', value_type: 'STRING', label: 'Idioma Padrão', description: 'Idioma padrão da plataforma' },
    { category: 'GENERAL', key: 'session_timeout_minutes', value: '480', value_type: 'NUMBER', label: 'Timeout de Sessão (min)', description: 'Tempo em minutos antes da sessão expirar' },

    // ── SMTP ──
    { category: 'SMTP', key: 'smtp_host', value: '', value_type: 'STRING', label: 'Servidor SMTP', description: 'Endereço do servidor SMTP' },
    { category: 'SMTP', key: 'smtp_port', value: '587', value_type: 'NUMBER', label: 'Porta SMTP', description: 'Porta do servidor SMTP' },
    { category: 'SMTP', key: 'smtp_user', value: '', value_type: 'STRING', label: 'Usuário SMTP', description: 'Usuário para autenticação SMTP' },
    { category: 'SMTP', key: 'smtp_password', value: '', value_type: 'STRING', label: 'Senha SMTP', description: 'Senha para autenticação SMTP (armazenada de forma segura)' },
    { category: 'SMTP', key: 'smtp_from_name', value: 'G360 Enterprise', value_type: 'STRING', label: 'Nome do Remetente', description: 'Nome exibido como remetente dos emails' },
    { category: 'SMTP', key: 'smtp_from_email', value: '', value_type: 'STRING', label: 'Email do Remetente', description: 'Endereço de email do remetente' },
    { category: 'SMTP', key: 'smtp_secure', value: 'true', value_type: 'BOOLEAN', label: 'Usar TLS/SSL', description: 'Usar conexão segura TLS/SSL' },

    // ── AUTH ──
    { category: 'AUTH', key: 'password_min_length', value: '8', value_type: 'NUMBER', label: 'Comprimento Mínimo da Senha', description: 'Número mínimo de caracteres na senha' },
    { category: 'AUTH', key: 'password_require_uppercase', value: 'true', value_type: 'BOOLEAN', label: 'Exigir Letra Maiúscula', description: 'Exigir pelo menos uma letra maiúscula na senha' },
    { category: 'AUTH', key: 'password_require_number', value: 'true', value_type: 'BOOLEAN', label: 'Exigir Número', description: 'Exigir pelo menos um número na senha' },
    { category: 'AUTH', key: 'password_require_special', value: 'false', value_type: 'BOOLEAN', label: 'Exigir Caractere Especial', description: 'Exigir pelo menos um caractere especial na senha' },
    { category: 'AUTH', key: 'max_login_attempts', value: '5', value_type: 'NUMBER', label: 'Tentativas Máx. de Login', description: 'Número máximo de tentativas de login antes do bloqueio' },
    { category: 'AUTH', key: 'lockout_duration_minutes', value: '15', value_type: 'NUMBER', label: 'Duração do Bloqueio (min)', description: 'Tempo em minutos que a conta fica bloqueada' },
    { category: 'AUTH', key: 'allow_sso_only', value: 'false', value_type: 'BOOLEAN', label: 'Forçar SSO', description: 'Permitir apenas login via SSO (Azure AD)' },

    // ── MODULES ──
    {
        category: 'MODULES', key: 'modules_available', value: JSON.stringify([
            { id: 'PROJECTS', name: 'Projetos', enabled: true },
            { id: 'FINANCE', name: 'Financeiro', enabled: true },
            { id: 'TASKS', name: 'Tarefas', enabled: true },
            { id: 'GMUD', name: 'Gestão de Mudança', enabled: true },
            { id: 'INCIDENT', name: 'Incidentes', enabled: true },
            { id: 'CONTRACTS', name: 'Contratos', enabled: true },
            { id: 'SUPPLIERS', name: 'Fornecedores', enabled: true },
            { id: 'ASSETS', name: 'Ativos', enabled: true },
            { id: 'RISKS', name: 'Riscos & Compliance', enabled: true },
            { id: 'KNOWLEDGE_BASE', name: 'Base de Conhecimento', enabled: true },
        ]), value_type: 'JSON', label: 'Módulos Disponíveis', description: 'Lista de módulos disponíveis para ativação por tenant'
    },

    // ── MAINTENANCE ──
    { category: 'MAINTENANCE', key: 'maintenance_mode', value: 'false', value_type: 'BOOLEAN', label: 'Modo Manutenção', description: 'Quando ativado, exibe mensagem de manutenção para todos os usuários' },
    { category: 'MAINTENANCE', key: 'maintenance_message', value: 'O sistema está em manutenção programada. Voltaremos em breve.', value_type: 'STRING', label: 'Mensagem de Manutenção', description: 'Mensagem exibida durante o modo manutenção' },
    { category: 'MAINTENANCE', key: 'maintenance_end_time', value: '', value_type: 'STRING', label: 'Previsão de Término', description: 'Data/hora prevista para o fim da manutenção (ISO 8601)' },
];

async function main() {
    const catalog = TenantManager.getCatalogClient();

    console.log('🔧 Criando tabela global_settings no schema public...');

    // 1. Criar tabela
    await catalog.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public.global_settings (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            category    VARCHAR(50) NOT NULL,
            key         VARCHAR(100) NOT NULL,
            value       TEXT,
            value_type  VARCHAR(20) DEFAULT 'STRING',
            label       VARCHAR(200),
            description TEXT,
            created_at  TIMESTAMPTZ DEFAULT NOW(),
            updated_at  TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(category, key)
        );
    `);

    console.log('✅ Tabela global_settings criada.');

    // 2. Inserir defaults (apenas se não existirem)
    let inserted = 0;
    for (const setting of DEFAULT_SETTINGS) {
        try {
            await catalog.$executeRawUnsafe(`
                INSERT INTO public.global_settings (category, key, value, value_type, label, description)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (category, key) DO NOTHING
            `, setting.category, setting.key, setting.value, setting.value_type, setting.label, setting.description);
            inserted++;
        } catch (err) {
            console.warn(`⚠️ Erro ao inserir ${setting.category}.${setting.key}:`, err.message);
        }
    }

    console.log(`✅ ${inserted} configurações padrão inseridas.`);
    console.log('🎉 Setup concluído!');

    await TenantManager.disconnectAll();
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
