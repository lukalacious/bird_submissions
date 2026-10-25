import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a production build and the v2-staging database,
 * signed in as a throwaway @example.test player (see e2e/global-setup.ts).
 *   npm run build && npm run test:e2e
 */
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false, // one test player, shared state
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  // Mobile first: most players are on phones in the field
  projects: [{ name: "phone", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/signin`,
    reuseExistingServer: !process.env.CI,
  },
});
