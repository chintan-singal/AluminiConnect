const config = (displayName, dir) => ({
  displayName,
  testMatch: ['<rootDir>/tests/' + dir + '/**/*.test.js'],
  testEnvironment: 'node',
})
module.exports = {
  projects: [
    config('unit', 'unit'),
    config('api', 'api'),
    config('integration', 'integration'),
    {
      ...config('web', 'web'),
      testEnvironment: 'jsdom',
      transform: { '^.+\\.tsx?$': '<rootDir>/tests/transform.cjs' },
    },
  ],
  testTimeout: 30000,
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {lines:95, functions:90, branches:85, statements:95},
    './server/booking.js': {lines:100, functions:100, branches:100, statements:100}
  },
  collectCoverageFrom: [
    'server/*.js',
    '!server/start.js',
    'web/src/*.{ts,tsx}',
    '!web/src/main.tsx',
  ],
  coverageReporters: ['text', 'html', 'lcov'],
  coverageDirectory: 'coverage',
}
