import { defineConfig } from "@playwright/test";

// A dedicated port, and never reuse a running server, so the tests can't
// quietly run against some other app that happens to be on port 3000.
const port = 3100;

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `http://localhost:${port}/sign-in`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
