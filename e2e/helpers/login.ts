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

/** Gets to `url` logged in as `email`, whatever session (if any) is
 * already active on `page` -- for cleanup code (an afterEach restoring a
 * shared fixture) that runs after a test which could have failed at ANY
 * point, including before it ever logged out. Calling login() straight
 * after a bare goto() assumes the gate is what's actually showing there;
 * a still-authenticated page (the ordinary case right after a test fails
 * mid-body) never has one, so that assumption hangs forever waiting for
 * a field that will never appear, instead of failing -- found chasing
 * project/setup/frontend-test-harness.md's CI cascade. Logs out first
 * whenever something else is already signed in, rather than trying to
 * tell "already the right session" apart from "the wrong one" -- both
 * are safe to just re-authenticate from.
 *
 * Checks for the "Log in" BUTTON specifically, not a bare Email field --
 * an authenticated record page can carry its own "Email" label (a
 * contact-details field, e.g. the contractor record's own email input at
 * /ops/contractors/[code]), which the first version of this check
 * mistook for the gate and filled with a login email, then hung waiting
 * for a Password field that page has no reason to have. */
export async function ensureLoggedInAs(
  page: Page,
  url: string,
  email: string,
  password: string = DEV_PASSWORD,
): Promise<void> {
  await page.goto(url);
  // .count() reads the DOM the instant this line runs; goto() resolving
  // does not guarantee this route's own content (gate or authenticated)
  // has actually settled by then. waitFor() gives the gate a real window
  // to appear before concluding it never will.
  const loginButton = page.getByRole("button", { name: "Log in", exact: true });
  const atGate = await loginButton
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!atGate) {
    const menuButton = page.getByRole("button", { name: "Open menu" });
    if (await menuButton.isVisible().catch(() => false)) await menuButton.click();
    await page.getByRole("button", { name: "Log out" }).click();
    // The SAME unambiguous locator as the gate check above -- not
    // getByLabel("Email"), which a still-mounted authenticated page (mid
    // client-side swap, or logout silently doing nothing) can satisfy via
    // its own unrelated "Email provider" field, falsely confirming the
    // gate before it has actually arrived.
    await expect(loginButton).toBeVisible({ timeout: 10_000 });
  }
  await login(page, email, password);
}
