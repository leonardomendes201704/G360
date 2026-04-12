/**
 * GlobalSettingService — Lógica de negócio para configurações globais.
 */

const GlobalSettingRepository = require('../repositories/global-setting.repository');
const TenantManager = require('../config/tenant-manager');
const logger = require('../config/logger');

class GlobalSettingService {

    /**
     * Lista todas as configurações, agrupadas por categoria.
     */
    static async getAll() {
        const settings = await GlobalSettingRepository.findAll();
        return this.groupByCategory(settings);
    }

    /**
     * Lista configurações de uma categoria específica.
     */
    static async getByCategory(category) {
        const validCategories = ['GENERAL', 'SMTP', 'AUTH', 'MODULES', 'MAINTENANCE'];
        if (!validCategories.includes(category.toUpperCase())) {
            throw { statusCode: 400, message: `Categoria inválida. Use: ${validCategories.join(', ')}` };
        }
        return GlobalSettingRepository.findByCategory(category.toUpperCase());
    }

    /**
     * Retorna o valor tipado de uma configuração.
     */
    static async getValue(category, key) {
        const setting = await GlobalSettingRepository.findByKey(category, key);
        if (!setting) return null;
        return this.castValue(setting.value, setting.valueType);
    }

    /**
     * Atualiza múltiplas configurações.
     * @param {Array<{category, key, value}>} settings
     */
    static async updateSettings(settings) {
        if (!Array.isArray(settings) || settings.length === 0) {
            throw { statusCode: 400, message: 'Informe um array de configurações para atualizar.' };
        }

        // Validar que todas as chaves existem
        for (const s of settings) {
            if (!s.category || !s.key) {
                throw { statusCode: 400, message: `Cada configuração deve ter category e key.` };
            }
            // Converter value para string
            if (s.value === undefined || s.value === null) {
                s.value = '';
            } else if (typeof s.value === 'object') {
                s.value = JSON.stringify(s.value);
            } else {
                s.value = String(s.value);
            }
        }

        const result = await GlobalSettingRepository.bulkUpsert(settings);
        logger.info(`[GlobalSettings] ${settings.length} configurações atualizadas`);
        return this.groupByCategory(result);
    }

    /**
     * Testa a configuração SMTP enviando um email de teste.
     */
    static async testSmtp(recipientEmail) {
        const smtpSettings = await GlobalSettingRepository.findByCategory('SMTP');
        const smtp = {};
        for (const s of smtpSettings) {
            smtp[s.key] = s.value;
        }

        if (!smtp.smtp_host || !smtp.smtp_port) {
            throw { statusCode: 400, message: 'Configuração SMTP incompleta. Defina ao menos servidor e porta.' };
        }

        try {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                host: smtp.smtp_host,
                port: parseInt(smtp.smtp_port, 10),
                secure: smtp.smtp_secure === 'true',
                auth: smtp.smtp_user ? {
                    user: smtp.smtp_user,
                    pass: smtp.smtp_password,
                } : undefined,
                tls: { rejectUnauthorized: false },
            });

            const to = recipientEmail || smtp.smtp_from_email || 'test@example.com';

            await transporter.sendMail({
                from: `"${smtp.smtp_from_name || 'G360'}" <${smtp.smtp_from_email || smtp.smtp_user}>`,
                to,
                subject: '[G360] Teste de Email - Configuração SMTP',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #6366f1;">✅ Teste SMTP Bem-Sucedido</h2>
                        <p>Este é um email de teste enviado pela plataforma G360.</p>
                        <p>Se você recebeu este email, a configuração SMTP está funcionando corretamente.</p>
                        <hr style="border: 1px solid #e2e8f0;" />
                        <p style="color: #64748b; font-size: 12px;">
                            Servidor: ${smtp.smtp_host}:${smtp.smtp_port}<br/>
                            Data: ${new Date().toLocaleString('pt-BR')}
                        </p>
                    </div>
                `,
            });

            logger.info('[GlobalSettings] Teste SMTP enviado com sucesso');
            return { success: true, message: `Email de teste enviado para ${to}` };
        } catch (error) {
            logger.error('[GlobalSettings] Erro no teste SMTP:', error.message);
            throw { statusCode: 500, message: `Falha no teste SMTP: ${error.message}` };
        }
    }

    /**
     * Retorna informações de saúde do sistema.
     */
    static async getSystemHealth() {
        const startTime = Date.now();
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: `${Math.floor(process.uptime())}s`,
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development',
        };

        // Memory
        const mem = process.memoryUsage();
        health.memory = {
            rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
            heapPercent: `${Math.round((mem.heapUsed / mem.heapTotal) * 100)}%`,
        };

        // Database
        try {
            const catalog = TenantManager.getCatalogClient();
            const dbStart = Date.now();
            await catalog.$queryRaw`SELECT 1`;
            health.database = {
                status: 'up',
                latency: `${Date.now() - dbStart}ms`,
            };
        } catch (err) {
            health.status = 'degraded';
            health.database = { status: 'down', error: err.message };
        }

        // Tenant Pool
        health.tenantPool = TenantManager.getPoolStats();

        // Active Tenants
        try {
            const tenants = await TenantManager.getAllActiveTenants();
            health.activeTenants = tenants.length;
        } catch (err) {
            health.activeTenants = 'unknown';
        }

        health.responseTime = `${Date.now() - startTime}ms`;
        return health;
    }

    /**
     * Inicializa as configurações padrões de fábrica caso a tabela esteja vazia.
     */
    static async initializeDefaults() {
        const defaultSettings = [
            // GENERAL
            { category: 'GENERAL', key: 'company_name', label: 'Nome da Empresa', value: 'G360 Enterprise', valueType: 'STRING', description: 'Nome exibido nos relatórios e emails.' },
            { category: 'GENERAL', key: 'system_language', label: 'Idioma Padrão', value: 'pt-BR', valueType: 'STRING', description: 'Idioma oficial da interface.' },
            { category: 'GENERAL', key: 'timezone', label: 'Fuso Horário', value: 'America/Sao_Paulo', valueType: 'STRING', description: 'Fuso horário para logs e SLAs.' },
            { category: 'GENERAL', key: 'allow_user_registration', label: 'Permitir Auto-Cadastro', value: 'false', valueType: 'BOOLEAN', description: 'Permite que novos usuários criem contas na tela de login.' },

            // SMTP
            { category: 'SMTP', key: 'smtp_host', label: 'Servidor SMTP', value: '', valueType: 'STRING', description: 'Endereço do servidor de email (ex: smtp.gmail.com)' },
            { category: 'SMTP', key: 'smtp_port', label: 'Porta SMTP', value: '587', valueType: 'NUMBER', description: 'Ex: 587 (TLS) ou 465 (SSL)' },
            { category: 'SMTP', key: 'smtp_secure', label: 'Usar Conexão Segura', value: 'true', valueType: 'BOOLEAN', description: 'Ativa SSL/TLS.' },
            { category: 'SMTP', key: 'smtp_user', label: 'Usuário SMTP', value: '', valueType: 'STRING', description: 'Email de autenticação.' },
            { category: 'SMTP', key: 'smtp_password', label: 'Senha SMTP', value: '', valueType: 'STRING', description: 'Senha ou App Password do email.' },
            { category: 'SMTP', key: 'smtp_from_email', label: 'Email Remetente (From)', value: 'no-reply@g360.com.br', valueType: 'STRING', description: 'Email que aparecerá como remetente.' },
            { category: 'SMTP', key: 'smtp_from_name', label: 'Nome Remetente', value: 'G360 ITBM', valueType: 'STRING', description: 'Nome de exibição nos emails enviados.' },

            // AUTH
            { category: 'AUTH', key: 'password_min_length', label: 'Tamanho Mínimo da Senha', value: '8', valueType: 'NUMBER', description: 'Quantidade mínima de caracteres exigida para novas senhas.' },
            { category: 'AUTH', key: 'require_special_chars', label: 'Exigir Caracteres Especiais', value: 'true', valueType: 'BOOLEAN', description: 'Obriga o uso de @, #, $, etc.' },
            { category: 'AUTH', key: 'max_login_attempts', label: 'Tentativas Máximas de Login', value: '5', valueType: 'NUMBER', description: 'Bloqueia a conta após X tentativas falhas consecutivas.' },
            { category: 'AUTH', key: 'session_timeout_minutes', label: 'Tempo de Sessão', value: '120', valueType: 'NUMBER', description: 'Desloga o usuário após este período de ociosidade.' },

            // MAINTENANCE
            { category: 'MAINTENANCE', key: 'maintenance_mode', label: 'Modo Manutenção', value: 'false', valueType: 'BOOLEAN', description: 'Ativa o aviso de paralisação global.' },
            { category: 'MAINTENANCE', key: 'maintenance_message', label: 'Mensagem de Manutenção', value: 'O sistema está em manutenção. Voltaremos em breve.', valueType: 'STRING', description: 'Texto visível para os usuários.' },
            { category: 'MAINTENANCE', key: 'maintenance_end_time', label: 'Fim Previsto', value: '', valueType: 'STRING', description: 'Data/Hora de término.' }
        ];

        let injected = 0;
        for (const preset of defaultSettings) {
            const existing = await GlobalSettingRepository.findByKey(preset.category, preset.key);
            if (!existing) {
                await GlobalSettingRepository.bulkUpsert([preset]);
                injected++;
            }
        }
        
        logger.info(`[GlobalSettings] Inicialização padrão injetada. Novas chaves: ${injected}`);
        return { injected, total: defaultSettings.length };
    }

    // ===== HELPERS =====

    /**
     * Agrupa configurações por categoria.
     */
    static groupByCategory(settings) {
        const grouped = {};
        for (const s of settings) {
            if (!grouped[s.category]) {
                grouped[s.category] = [];
            }
            grouped[s.category].push({
                ...s,
                typedValue: this.castValue(s.value, s.valueType),
            });
        }
        return grouped;
    }

    /**
     * Converte valor string para o tipo correto.
     */
    static castValue(value, valueType) {
        if (value === null || value === undefined || value === '') return value;
        switch (valueType) {
            case 'NUMBER':
                return Number(value);
            case 'BOOLEAN':
                return value === 'true';
            case 'JSON':
                try { return JSON.parse(value); }
                catch { return value; }
            default:
                return value;
        }
    }
}

module.exports = GlobalSettingService;
