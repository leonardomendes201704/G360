module.exports = {
    testEnvironment: 'node',
    coveragePathIgnorePatterns: ['/node_modules/'],
    testMatch: ['**/*.test.js'],
    testPathIgnorePatterns: ['/node_modules/', '/tests/integration/'],
    verbose: true,
    clearMocks: true,
    collectCoverage: true,
    collectCoverageFrom: [
        'src/services/**/*.js',
        'src/controllers/**/*.js',
        'src/middlewares/**/*.js',
        'src/validators/**/*.js',
        'src/utils/**/*.js',
        'src/helpers/**/*.js',
        '!src/services/mail.service.js'
    ],
    moduleNameMapper: {
        '^isomorphic-dompurify$': '<rootDir>/tests/integration/mocks/dompurify.js'
    },
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    coverageReporters: ['text', 'html', 'lcov']
};
