// Feature 1014, brand strings go to config -- frontend e2e (ADR 0001, Playwright).
//
// AC6  after a rename, the login gate (logged out), the ops shell (logged
//      in) and the browser-tab title all show the stand-in; the ampersand
//      in the seeded name renders in the accent colour before the change
//
// AC7 and AC8 used to live here as Playwright tests that opened no page at
// all (AC7 calls getDisplayName()/Wordmark() directly in Node; AC8 greps
// frontend/src). project/setup/frontend-test-harness.md Part 1 moved both
// to frontend/tests/identity.test.ts and
// frontend/tests/no-interim-wording.test.ts (plain Vitest) -- they never
// needed a browser, so running them under three Playwright viewport
// projects each time only tripled a source-file scan and two function
// calls for nothing.
//
// AC6 writes the shared PlatformSettings row -- same "leave it as we found
// it" discipline as settings.spec.ts, and the same withPlatformSettingsLock
// exclusion (see that helper) as settings.spec.ts's own writer test, since
// both PUT the whole row.
import { test, expect } from "@playwright/test";
import { login } from "./helpers/login";
import { withPlatformSettingsLock } from "./helpers/singleton-lock";

const INTERIM_WORDING = "Perth Trades & Services";

async function logout(page: import("@playwright/test").Page) {
  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole("button", { name: "Log out" }).click();
}

test(
  "AC6: a rename on the settings screen follows through to the ops shell, the login gate and the tab title",
  async ({ page }) => {
    await withPlatformSettingsLock(async () => {
      // Before the change -- the seeded name, ampersand in the accent colour,
      // on both the ops shell (logged in) and the login gate (logged out).
      await page.goto("/ops/settings");
      await login(page, "owner@idelta.com.au");
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByLabel("Business name")).toHaveValue(INTERIM_WORDING);
      const sidebarWordmarkBefore = page.locator("nav[aria-label='Sidebar']").getByText("Perth Trades");
      await expect(sidebarWordmarkBefore).toBeVisible();
      await expect(page.locator("nav[aria-label='Sidebar'] span.text-brand-accent")).toHaveText("&");
      await expect(page).toHaveTitle(INTERIM_WORDING);

      // The rename.
      await page.getByLabel("Business name").fill("Stand-In Trades");
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByText("Saved.")).toBeVisible();

      // A reload re-fetches the identity endpoint server-side -- the sidebar
      // wordmark and the tab title both follow, with no ampersand this time.
      await page.reload();
      await expect(page.locator("nav[aria-label='Sidebar']")).toContainText("Stand-In Trades");
      await expect(page).toHaveTitle("Stand-In Trades");

      // Logged out, the gate shows the same rename.
      await logout(page);
      await page.goto("/ops");
      await expect(page.getByRole("heading", { name: "Operations portal" })).toBeVisible();
      await expect(page.locator(".bg-ink").getByText("Stand-In Trades")).toBeVisible();

      // Leave the row exactly as found.
      await page.goto("/ops/settings");
      await login(page, "owner@idelta.com.au");
      await expect(page.getByLabel("Business name")).toHaveValue("Stand-In Trades");
      await page.getByLabel("Business name").fill(INTERIM_WORDING);
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByText("Saved.")).toBeVisible();
      await logout(page);
    });
  },
);
