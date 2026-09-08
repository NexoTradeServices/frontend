// Playwright config -- ADR 0001 (Playwright + Vitest).
//
// One project, one viewport by default: desktop 1440x900 (Desktop Chrome),
// the primary breakpoint project/design/frontend-conventions.md mocks are
// drawn at. A behaviour test's assertions do not change with viewport width
// (same strings, same code, at every size), so running the whole suite
// three times over under three Playwright *projects* (desktop, tablet,
// mobile -- project/setup/frontend-test-harness.md Part 1) tripled it for
// no extra coverage and made concurrent logins (BKLG-013) the dominant
// source of flake. The handful of tests that ARE specifically about the
// phone layout opt into MOBILE_VIEWPORT below, on their own describe block
// (`test.use(MOBILE_VIEWPORT)`) -- nothing opts into a tablet viewport
// because no test ever needed one; it only existed to be a third multiplier.
//
// MOBILE_VIEWPORT deliberately does not spread devices["iPhone 13"] whole:
// that preset also carries `defaultBrowserType: "webkit"`, and Playwright
// only lets a describe block override test-scoped options (viewport,
// userAgent, hasTouch...) -- which browser ENGINE runs is worker-scoped and
// can only be set per PROJECT. Nothing here (ADR 0001, or this file's old
// three-project shape) ever asked for WebKit-vs-Chromium coverage on
// purpose; it was a side effect of the iPhone/iPad presets defaulting to
// WebKit. The phone-layout tests keep every other device trait -- narrow
// viewport, touch, mobile UA -- and run it on the same Chromium as the rest
// of the suite.
//
// baseURL is the real dev domain by default, not localhost: the session
// cookie is scoped to COOKIE_DOMAIN (Authentication & Security -- first-party
// across api.idelta.com.au and idelta.com.au), so a login flow only works
// end to end through the real domain, same as a browser would reach it.
// CI (project/setup/frontend-test-harness.md Part 3) overrides this to its
// own hermetic http://localhost:3000, where COOKIE_DOMAIN=localhost instead.
import { defineConfig, devices } from "@playwright/test";

const IPHONE_13 = devices["iPhone 13"];

/** The one phone preset a handful of describe blocks opt into with `test.use(MOBILE_VIEWPORT)`. */
export const MOBILE_VIEWPORT = {
  userAgent: IPHONE_13.userAgent,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: IPHONE_13.deviceScaleFactor,
  isMobile: IPHONE_13.isMobile,
  hasTouch: IPHONE_13.hasTouch,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // BKLG-013 (feature 2002): the flake "correlates with heavy PARALLEL login
  // load" -- server-side slowness under concurrent sign-ins, not a wrong
  // wait condition (frontend/e2e/helpers/login.ts already gives the
  // post-login landmark more room). This caps how many logins ever run at
  // once, independent of the CPU count Playwright would otherwise default to.
  workers: 2,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "https://idelta.com.au",
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
});
