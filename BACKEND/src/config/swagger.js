const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'G360 Enterprise API',
            version: '1.0.0',
            description: 'API de gerenciamento empresarial para projetos, orçamentos, incidentes, mudanças e ativos de TI.',
            contact: {
                name: 'G360 Team'
            }
        },
        servers: [
            {
                url: '/api/v1',
                description: 'API v1'
            },
            {
                url: '/api',
                description: 'Legacy (backward compatibility)'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Token JWT obtido via POST /api/v1/auth/login'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Recurso não encontrado' },
                        errorCode: { type: 'string', example: 'NOT_FOUND' }
                    }
                },
                ValidationError: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Dados inválidos' },
                        errorCode: { type: 'string', example: 'VALIDATION_ERROR' },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    field: { type: 'string' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                PaginatedResponse: {
                    type: 'object',
                    properties: {
                        data: { type: 'array', items: {} },
                        meta: {
                            type: 'object',
                            properties: {
                                total: { type: 'integer', example: 100 },
                                page: { type: 'integer', example: 1 },
                                limit: { type: 'integer', example: 20 },
                                totalPages: { type: 'integer', example: 5 },
                                hasNext: { type: 'boolean' },
                                hasPrev: { type: 'boolean' }
                            }
                        }
                    }
                },
                HealthCheck: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', enum: ['healthy', 'degraded'] },
                        version: { type: 'string' },
                        environment: { type: 'string' },
                        uptime: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        dependencies: {
                            type: 'object',
                            properties: {
                                database: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string' },
                                        latency: { type: 'string' }
                                    }
                                }
                            }
                        },
                        memory: {
                            type: 'object',
                            properties: {
                                rss: { type: 'string' },
                                heap: { type: 'string' }
                            }
                        }
                    }
                }
            },
            responses: {
                Unauthorized: {
                    description: 'Token JWT ausente ou inválido',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                Forbidden: {
                    description: 'Sem permissão para este recurso',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                NotFound: {
                    description: 'Recurso não encontrado',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                }
            }
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Auth', description: 'Autenticação e tokens' },
            { name: 'Users', description: 'Gerenciamento de usuários' },
            { name: 'Projects', description: 'Gestão de projetos' },
            { name: 'Budgets', description: 'Orçamentos e cenários financeiros' },
            { name: 'Changes', description: 'Gestão de Mudanças (GMUD)' },
            { name: 'Incidents', description: 'Gestão de Incidentes de TI' },
            { name: 'Assets', description: 'Ativos e licenças de software' },
            { name: 'Suppliers', description: 'Fornecedores e contratos' },
            { name: 'Dashboard', description: 'Dashboards e KPIs' },
            { name: 'Knowledge Base', description: 'Base de conhecimento' },
            { name: 'Corporate Risks', description: 'Riscos corporativos' },
            { name: 'Admin', description: 'Configurações administrativas' },
            { name: 'Health', description: 'Status e health check' }
        ]
    },
    apis: [
        './src/routes/*.js',
        './src/controllers/*.js'
    ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
