// Shared e2e login helper -- Feature 2001, plan decision 13 (BKLG-013).
//
// Fill + click was duplicated across five spec files, each racing the same
// gap: after the click, the gate calls router.refresh() (no URL change) to
// swap in the real portal content, and a caller's next assertion could run
// before that swap lands -- worse under parallel viewport-project load
// (backlog BKLG-013). Waiting HERE, once, for the post-login landmark (the Log
// in button gone) closes that gap for every caller.
//
// A seeded-contractor login is wrapped in withContractorStatusLock
// (helpers/singleton-lock.ts, project/setup/frontend-test-harness.md): it
// can land exactly while contractors.spec.ts's AC8+AC9 has Bob switched
// off, and the app correctly refuses it -- a caller then fails for a
// reason unrelated to what it is testing. Mike and the owner never get
// deactivated in this suite, so their logins skip the lock entirely --
// wrapping every login regardless of who it's for serialises the whole
// suite's sign-ins through one lock (measured: turns a ~1.1min run into a
// ~1.9min one with cascading test timeouts) for a wait that is supposed to
// cost about a second on the rare occasion it is actually contended.
import { expect, type Page } from "@playwright/test";
import { withContractorStatusLock } from "./singleton-lock";

export const DEV_PASSWORD = "dev-password-123";

// The dev-seeded cast's contractor logins (src/db/seed/fixtures.ts) -- the
// only accounts whose Contractor.status this suite ever flips. Mike and the
// owner are ops/owner accounts, never contractors, and never deactivated.
const SEEDED_CONTRACTOR_EMAILS = new Set(["bob@idelta.com.au", "dave@idelta.com.au", "priya@idelta.com.au"]);

export async function login(page: Page, email: string, password: string = DEV_PASSWORD): Promise<void> {
  async function fillAndSubmit() {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    // BKLG-013's own root-cause note: the flake "correlates with heavy PARALLEL
    // login load (all three viewport projects at once)" -- server slowness
    // under concurrent sign-ins, not a wrong wait condition. The default 5s
    // expect timeout was still too tight under that load; 15s gives the
    // landmark room to land without masking a genuinely broken login.
    await expect(page.getByRole("button", { name: "Log in" })).toBeHidden({ timeout: 15_000 });
  }

  if (SEEDED_CONTRACTOR_EMAILS.has(email)) {
    await withContractorStatusLock(fillAndSubmit);
  } else {
    await fillAndSubmit();
  }
}
