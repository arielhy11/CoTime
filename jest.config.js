/** @type {import('jest').Config} */
module.exports = {
  // Pure logic tests (game engine + utils). No React Native runtime needed.
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
      ],
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testEnvironment: 'node',
};
