// Shared e2e login helper -- Feature 2001, plan decision 13 (BKLG-013).
//
// Fill + click was duplicated across five spec files, each racing the same
// gap: after the click, the gate calls router.refresh() (no URL change) to
// swap in the real portal content, and a caller's next assertion could run
// before that swap lands -- worse under parallel viewport-project load
// (backlog BKLG-013). Waiting HERE, once, for the post-login landmark (the Log
// in button gone) closes that gap for every caller.
//
import { expect, type Page } from "@playwright/test";

export const DEV_PASSWORD = "dev-password-123";

/**
 * Waits until React has hydrated the gate's form. The gate is server-rendered:
 * a field filled before hydration is wiped when React takes the form over, and
 * a click before it is a native form submit, a plain page reload -- so the login
 * silently does nothing and the gate is still there. Under parallel load
 * hydration lags far enough behind the first paint for a test to get in first
 * (feature 9002: this was the "Mike login test fails under parallel runs" flake;
 * reproduced by delaying the page's script chunks). React stamps a
 * `__reactProps$...` key on every element it has hydrated.
 */
export async function waitForHydration(page: Page, elementId: string): Promise<void> {
  await page.waitForFunction(
    (id) => {
      const el = document.getElementById(id);
      return el !== null && Object.keys(el).some((key) => key.startsWith("__reactProps$"));
    },
    elementId,
    { timeout: 30_000 },
  );
}

export async function login(page: Page, email: string, password: string = DEV_PASSWORD): Promise<void> {
  await waitForHydration(page, "email");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  // BKLG-013 saw the flake "correlate with heavy PARALLEL login load". The
  // cause was the hydration race above, not server slowness; the 15s here is
  // only the room the post-login swap needs.
  await expect(page.getByRole("button", { name: "Log in" })).toBeHidden({ timeout: 15_000 });
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
