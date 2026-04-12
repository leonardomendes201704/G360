require('express-async-errors');
const express = require('express');
const cors = require('cors');

// Mocks define handlers
const mockTenantResolverMiddleware = (req, res, next) => {
    req.tenantId = 'test-tenant-id';
    req.prisma = require('./prisma-mock'); // Mock prisma shared instance
    req.tenantInfo = { slug: 'test-tenant', id: 'test-id' };
    next();
};

const mockAuthMiddleware = (req, res, next) => {
    req.user = req.body.mockUser || {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN',
        permissions: ['ALL']
    };
    next();
};

const createApp = () => {
    // Require routes inside function to allow mocks to engage
    // This is crucial because routes import middlewares directly
    const routes = require('../../src/routes');
    const errorHandler = require('../../src/middlewares/error-handler.middleware');

    const app = express();
    app.use(cors());
    app.use(express.json());

    // Apply generic mocks globally for tests
    app.use(mockTenantResolverMiddleware);
    app.use(mockAuthMiddleware);

    app.use('/api', routes);

    app.use(errorHandler);

    return app;
};

module.exports = createApp;
