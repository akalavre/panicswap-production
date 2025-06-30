module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/assets/js/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/test-setup.js'],
  verbose: true,
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js'],
  collectCoverageFrom: [
    'assets/js/**/*.js',
    '!assets/js/tests/**',
  ],
};
