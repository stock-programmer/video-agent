export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {},
  testMatch: [
    '**/__tests__/**/*.test.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/__tests__/create-test-image.js',
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/__tests__/**',
    '!src/server.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000,
};
