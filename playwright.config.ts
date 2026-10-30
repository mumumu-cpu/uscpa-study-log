import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "mobile-chromium", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npm run db:migrate:local && npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/api/dashboard?weekStart=2026-01-05`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Signs every request in as a fixed local user; ignored in production builds.
    env: { AUTH_BYPASS: "1", AUTH_SECRET: "e2e-only-secret" },
  },
});
