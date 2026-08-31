// Playwright config -- ADR 0001 (Playwright + Vitest).
//
// The three viewports every UI feature is checked at, always the same three
// (implementor skill): desktop 1440x900, tablet 768x1024 (iPad preset),
// mobile 390x844 (iPhone preset).
//
// baseURL is the real dev domain, not localhost: the session cookie is
// scoped to COOKIE_DOMAIN (Authentication & Security -- first-party across
// api.idelta.com.au and idelta.com.au), so a login flow only works end to
// end through the real domain, same as a browser would reach it.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "https://idelta.com.au",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "tablet",
      use: { ...devices["iPad (gen 7)"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } },
    },
  ],
});
