import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4177",
    browserName: "chromium",
    headless: true,
    locale: "he-IL",
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx vite --config e2e/vite.config.ts --host 127.0.0.1 --port 4177 --strictPort",
    cwd: "..",
    url: "http://127.0.0.1:4177",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
