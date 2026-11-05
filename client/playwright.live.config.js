import { defineConfig, devices } from '@playwright/test';

if (!/^jdbc:postgresql:\/\/[^/]+\/publication_system_test$/.test(process.env.TEST_DB_URL || '')) {
  throw new Error('Set TEST_DB_URL to the disposable publication_system_test database.');
}

export default defineConfig({
  testDir: './e2e-live',
  outputDir: 'test-results/live',
  workers: 1,
  forbidOnly: true,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-live-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/live-junit.xml' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [{
    command: 'mvn -B -f ../server/pom.xml spring-boot:run',
    url: 'http://127.0.0.1:18080/api/auth/me',
    timeout: 120000,
    reuseExistingServer: false,
    env: {
      SERVER_PORT: '18080',
      DB_URL: process.env.TEST_DB_URL,
      DB_USERNAME: process.env.TEST_DB_USERNAME || 'postgres',
      DB_PASSWORD: process.env.TEST_DB_PASSWORD || 'postgres',
      SPRING_JPA_HIBERNATE_DDL_AUTO: 'create-drop',
      ADMIN_USERNAME: '',
      ADMIN_PASSWORD: '',
    },
  }, {
    command: 'npm run dev -- --host 127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    env: { VITE_API_URL: 'http://127.0.0.1:18080/api' },
  }],
});
