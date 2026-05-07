import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      diagnostics: { ignoreCodes: [151002] },
    }],
    '^.+\\.js$': '<rootDir>/tests/jest-js-transformer.cjs',
  },
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

export default config;
