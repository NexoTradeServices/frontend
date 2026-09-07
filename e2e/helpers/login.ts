// Shared e2e login helper -- Feature 2001, plan decision 13 (BKLG-013).
//
// Fill + click was duplicated across five spec files, each racing the same
// gap: after the click, the gate calls router.refresh() (no URL change) to
// swap in the real portal content, and a caller's next assertion could run
// before that swap lands -- worse under parallel viewport-project load
// (backlog BKLG-013). Waiting HERE, once, for the post-login landmark (the Log
// in button gone) closes that gap for every caller.
import { expect, type Page } from "@playwright/test";

export const DEV_PASSWORD = "dev-password-123";

export async function login(page: Page, email: string, password: string = DEV_PASSWORD): Promise<void> {
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
