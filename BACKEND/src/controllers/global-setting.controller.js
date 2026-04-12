/**
 * GlobalSettingController — Endpoints para configurações globais da plataforma.
 * Todas as rotas requerem Super Admin.
 */

const GlobalSettingService = require('../services/global-setting.service');
const logger = require('../config/logger');

class GlobalSettingController {

    /**
     * GET /api/global-settings — Listar todas as configurações agrupadas por categoria.
     */
    static async findAll(req, res) {
        try {
            const settings = await GlobalSettingService.getAll();
            return res.json({ status: 'success', data: settings });
        } catch (error) {
            logger.error('[GlobalSettingController] FindAll error:', error);
            return res.status(500).json({ status: 'error', message: 'Erro ao listar configurações.' });
        }
    }

    /**
     * GET /api/global-settings/:category — Listar por categoria.
     */
    static async findByCategory(req, res) {
        try {
            const settings = await GlobalSettingService.getByCategory(req.params.category);
            return res.json({ status: 'success', data: settings });
        } catch (error) {
            logger.error('[GlobalSettingController] FindByCategory error:', error);
            const statusCode = error.statusCode || 500;
            return res.status(statusCode).json({
                status: 'error',
                message: error.message || 'Erro ao buscar configurações.',
            });
        }
    }

    /**
     * PUT /api/global-settings — Atualizar múltiplas configurações.
     * Body: { settings: [{ category, key, value }] }
     */
    static async update(req, res) {
        try {
            const { settings } = req.body;
            if (!settings) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Informe o campo "settings" com um array de configurações.',
                });
            }

            const result = await GlobalSettingService.updateSettings(settings);
            return res.json({
                status: 'success',
                message: 'Configurações atualizadas com sucesso.',
                data: result,
            });
        } catch (error) {
            logger.error('[GlobalSettingController] Update error:', error);
            const statusCode = error.statusCode || 500;
            return res.status(statusCode).json({
                status: 'error',
                message: error.message || 'Erro ao atualizar configurações.',
            });
        }
    }

    /**
     * POST /api/global-settings/test-smtp — Testar configuração SMTP.
     * Body (opcional): { email: "recipient@example.com" }
     */
    static async testSmtp(req, res) {
        try {
            const result = await GlobalSettingService.testSmtp(req.body?.email);
            return res.json({ status: 'success', data: result });
        } catch (error) {
            logger.error('[GlobalSettingController] TestSMTP error:', error);
            const statusCode = error.statusCode || 500;
            return res.status(statusCode).json({
                status: 'error',
                message: error.message || 'Erro ao testar SMTP.',
            });
        }
    }

    /**
     * GET /api/global-settings/system-health — Health check detalhado.
     */
    static async systemHealth(req, res) {
        try {
            const health = await GlobalSettingService.getSystemHealth();
            const statusCode = health.status === 'healthy' ? 200 : 503;
            return res.status(statusCode).json({ status: 'success', data: health });
        } catch (error) {
            logger.error('[GlobalSettingController] SystemHealth error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Erro ao obter status do sistema.',
            });
        }
    }

    /**
     * POST /api/global-settings/initialize — Gera as configurações primárias via botão.
     */
    static async initialize(req, res) {
        try {
            const result = await GlobalSettingService.initializeDefaults();
            return res.json({ status: 'success', data: result, message: 'Parâmetros gerados com sucesso.' });
        } catch (error) {
            logger.error('[GlobalSettingController] Initialize error:', error);
            return res.status(500).json({ status: 'error', message: 'Erro ao inicializar configurações.' });
        }
    }
}

module.exports = GlobalSettingController;
