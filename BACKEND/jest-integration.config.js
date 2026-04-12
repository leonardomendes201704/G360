module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.integration.test.js'],
  verbose: true,
  clearMocks: true,
  setupFilesAfterEnv: ['./tests/integration/setup.js'],
  moduleNameMapper: {
    '^isomorphic-dompurify$': '<rootDir>/tests/integration/mocks/dompurify.js'
  },
  testTimeout: 30000
};
