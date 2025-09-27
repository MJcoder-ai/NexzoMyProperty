import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import tsconfig from '../../tsconfig.base.json';

const config: Config = {
  roots: ['<rootDir>/src'],
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths ?? {}, {
    prefix: '<rootDir>/../../',
  }),
};

export default config;
