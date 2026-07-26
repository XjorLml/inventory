module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testPathIgnorePatterns: ['\\\\node_modules\\\\'],
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    }],
  },
  transformIgnorePatterns: [],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
  // ─── QA Agent Reporter (GitHub Issues) ──────────────────────────
  // Captures test failures for automatic bug filing.
  // Remove 'default' to silence Jest's normal output.
  reporters: [
    "default",
    ["./src/qa-agent/jest-reporter.mjs", {
      outputFile: "test-failures.json",
      environment: process.env.NODE_ENV || "development",
      commitSha: process.env.COMMIT_SHA || "unknown",
      autoFile: false,  // set true to auto-file tickets via the QA agent
    }]
  ],
};
