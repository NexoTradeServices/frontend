// The test-run signal and the sweep -- Feature 9002, test data hygiene.
//
// Every browser context and every API request a test makes carries the cookie
// `ts-test-run=e2e` (design: Data Model, Test data). The backend labels every
// record it creates while answering such a request `e2e`, and skips the live
// reCAPTCHA check for it (never in production, where the cookie is ignored).
// The sweep removes everything labelled `e2e` and whatever hangs off it; the
// global setup runs it before the first test and the global teardown after the
// last, so a run that crashed is cleaned up by the next one.
//
// The cookie rides the same domain the session cookie does (COOKIE_DOMAIN on
// the backend): shared across idelta.com.au and api.idelta.com.au in dev, plain
// `localhost` in CI.
import { request } from "@playwright/test";

export const TEST_RUN_LABEL = "e2e";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://idelta.com.au";

function cookieDomain(baseUrl: string): string {
  const { hostname } = new URL(baseUrl);
  const isIp = /^[\d.]+$/.test(hostname) || hostname.includes(":");
  return hostname === "localhost" || isIp ? hostname : `.${hostname}`;
}

/** Playwright's shared `use.storageState`: the one cookie, set once for the whole suite. */
export function testRunStorageState() {
  return {
    cookies: [
      {
        name: "ts-test-run",
        value: TEST_RUN_LABEL,
        domain: cookieDomain(BASE_URL),
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
}

/** Clears every `e2e` row and what hangs off it. Throws when the backend refuses -- a run never goes on dirty. */
export async function sweepE2eData(): Promise<void> {
  const context = await request.newContext();
  try {
    const res = await context.post(`${API_URL}/api/test-data/sweep`, { data: { label: TEST_RUN_LABEL } });
    if (!res.ok()) {
      throw new Error(`the e2e sweep failed: ${String(res.status())} ${await res.text()}`);
    }
    const { total } = (await res.json()) as { total: number };
    console.log(`e2e sweep: ${String(total)} leftover row(s) removed`);
  } finally {
    await context.dispose();
  }
}

/**
 * Visits each page the suite opens, once, before the first test. The dev site
 * is `next dev`, which compiles a route on its first visit -- tens of seconds
 * for a big one, right after the container starts or the app was rebuilt. Two
 * workers meeting cold routes at once stretched hydration past the tests'
 * waits (feature 9002). Errors are ignored: this only warms, it never judges.
 */
export async function warmRoutes(): Promise<void> {
  const context = await request.newContext({ baseURL: BASE_URL });
  try {
    for (const path of [
      "/",
      "/ops",
      "/ops/jobs",
      "/ops/contractors",
      "/ops/contractors/new",
      "/ops/settings",
      "/ops/pricing",
      "/ops/pricing/new",
      "/contractor",
      "/contractor/rates",
      "/contractor/service-area",
      "/contractor/agreement",
      "/ops/settlements",
      "/contractor/settlements",
      "/contractor/settlements/CINV-0",
      "/approve/warm-up",
      "/request-a-job",
      "/forgot-password",
      "/reset-password",
    ]) {
      await context.get(path, { timeout: 120_000 }).catch(() => undefined);
    }
  } finally {
    await context.dispose();
  }
}
