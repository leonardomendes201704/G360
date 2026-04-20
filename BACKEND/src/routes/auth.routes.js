const express = require('express');
const AuthController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { loginLimiter, strictLimiter } = require('../middlewares/rate-limit.middleware');
const { tenantResolverPublic } = require('../middlewares/tenant-resolver.middleware');

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Autenticação local (email + senha)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@g360.com.br
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login bem-sucedido, retorna tokens JWT
 *       401:
 *         description: Credenciais inválidas
 *       429:
 *         description: Muitas tentativas — conta temporariamente bloqueada
 */
router.post('/login', tenantResolverPublic(), loginLimiter, AuthController.login);

/**
 * @swagger
 * /auth/azure:
 *   post:
 *     summary: Login via Azure AD (SSO)
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Login SSO bem-sucedido
 */
router.post('/azure', tenantResolverPublic(), loginLimiter, AuthController.loginAzure);
router.post('/google', tenantResolverPublic(), loginLimiter, AuthController.loginGoogle);
router.post('/ldap', tenantResolverPublic(), loginLimiter, AuthController.loginLdap);
router.get('/azure-config/:tenantSlug', tenantResolverPublic(), AuthController.getAzureConfig);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renovar token JWT usando refresh token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Novo access token gerado
 *       401:
 *         description: Refresh token inválido ou expirado
 */
router.post('/refresh', strictLimiter, AuthController.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout — revoga refresh token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 */
router.post('/logout', AuthController.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Dados do usuário autenticado
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Perfil do usuário logado
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/stream-token', authMiddleware, AuthController.issueStreamToken);
router.get('/me', authMiddleware, AuthController.getMe);
router.patch('/me/notification-preferences', authMiddleware, AuthController.patchNotificationPreferences);

module.exports = router;
