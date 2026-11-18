import { existsSync } from 'node:fs';
import { defineConfig, type ReporterDescription } from '@playwright/test';
import { resolveEnvironment } from './config/environments';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const environment = resolveEnvironment();
const isCI = Boolean(process.env.CI);

const reporters: ReporterDescription[] = [
  ['list'],
  ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ['junit', { outputFile: 'test-results/junit.xml' }],
];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : 4,
  timeout: 60_000,
  reporter: isCI ? [...reporters, ['github']] : reporters,
  metadata: {
    environment: environment.name,
    baseURL: environment.baseURL,
  },
  use: {
    baseURL: environment.baseURL,
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },
  projects: [{ name: 'api' }],
});
