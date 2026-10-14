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
// 8002 AC4 / AC5 / AC6  the Google-visibility fail-safe: a robots meta tag
//      saying noindex unless the host is exactly the approved public domain.
//      (8002 AC7 -- identity read fails -- is in tests/identity.test.ts: the
//      fetch is server-side, so a browser test cannot fail it; same reason
//      as 1014 AC7 above.)
//
// AC6 writes the shared PlatformSettings row -- same "leave it as we found
// it" discipline as settings.spec.ts, and the same withPlatformSettingsLock
// exclusion (see that helper) as settings.spec.ts's own writer test, since
// both PUT the whole row.
//
// The restore used to be the test's own last step -- if an earlier
// assertion threw, it never ran, and the row stayed on "Stand-In Trades" for
// every run after (a real incident: one flaky assertion here turned into
// twenty minutes of chasing an apparently-broken baseline elsewhere). It now
// lives in afterEach, which Playwright runs whether the test passed or
// failed.
import { test, expect, type Page } from "@playwright/test";
import { login, ensureLoggedInAs } from "./helpers/login";
import { withPlatformSettingsLock } from "./helpers/singleton-lock";

const INTERIM_WORDING = "Perth Trades & Services";

async function logout(page: Page) {
  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole("button", { name: "Log out" }).click();
  // Log out's own client-side refresh swaps the portal for the login gate
  // in place (no URL change) -- wait for that landmark before navigating
  // again, or the next goto races it (contractors.spec.ts's own precedent;
  // this file's logout() was missing it -- found when it raced under load,
  // project/setup/frontend-test-harness.md).
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 10_000 });
}

async function setBusinessName(page: Page, name: string): Promise<void> {
  await ensureLoggedInAs(page, "/ops/settings", "owner@idelta.com.au");
  await expect(page.getByLabel("Business name")).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Business name").fill(name);
  // 8002: every restore also puts the public web address back to blank.
  await page.getByLabel("Public web address").fill("");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
}

/** 8002: types the approved public domain on Settings, as the owner would. */
async function setPublicDomain(page: Page, domain: string): Promise<void> {
  await ensureLoggedInAs(page, "/ops/settings", "owner@idelta.com.au");
  await expect(page.getByLabel("Public web address")).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Public web address").fill(domain);
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await logout(page);
}

/** The robots meta content of the page now open, or null when it has none. */
async function robotsMeta(page: Page): Promise<string | null> {
  const tag = page.locator('meta[name="robots"]');
  if ((await tag.count()) === 0) return null;
  return tag.first().getAttribute("content");
}

const CAPABILITY_PAGES = ["/a/uat-no-such-link", "/approve/uat-no-such-link"];

test.afterEach(async ({ page }) => {
  // Idempotent by design -- runs after a clean pass too (the test leaves
  // the row on "Stand-In Trades" and relies entirely on this to restore
  // it), and a no-op PUT of the same value it already holds after an
  // early failure costs nothing.
  await withPlatformSettingsLock(async () => {
    await setBusinessName(page, INTERIM_WORDING);
    await logout(page);
  });
});

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

      // Logged out, the gate shows the same rename. Scoped to the gate's
      // OWN banner landmark (gate-shell.tsx), not any `.bg-ink` -- the
      // portal shell's top app bar carries the same wordmark in the same
      // class, and both can exist in the DOM for a moment right after
      // logout (found by the first CI run: an intermittent strict-mode
      // "resolved to 2 elements" on the plain class selector).
      await logout(page);
      await page.goto("/ops");
      await expect(page.getByRole("heading", { name: "Operations portal" })).toBeVisible();
      await expect(page.getByRole("banner").getByText("Stand-In Trades", { exact: true })).toBeVisible();
    });
  },
);

test.describe("8002 -- the Google-visibility fail-safe", () => {
  test("AC4: with the domain blank, the home page, a portal gate and capability pages all say noindex, nofollow", async ({
    page,
  }) => {
    await withPlatformSettingsLock(async () => {
      for (const path of ["/", "/ops", ...CAPABILITY_PAGES]) {
        await page.goto(path);
        expect(await robotsMeta(page), path).toBe("noindex, nofollow");
      }
    });
  });

  test("AC5: with the domain set to some other host, every page says noindex, nofollow", async ({ page }) => {
    await withPlatformSettingsLock(async () => {
      await setPublicDomain(page, "somewhere-else.example.com.au");
      for (const path of ["/", "/ops", ...CAPABILITY_PAGES]) {
        await page.goto(path);
        expect(await robotsMeta(page), path).toBe("noindex, nofollow");
      }
    });
  });

  test("AC6: with the domain set to this very host, the home page opens to search and capability pages stay hidden", async ({
    page,
  }) => {
    await page.goto("/");
    const host = new URL(page.url()).hostname;
    // The settings rule wants a dot, so a bare "localhost" (CI's own server)
    // cannot be typed in; isIndexableHost's host match is unit-tested in
    // tests/identity.test.ts for that case.
    test.skip(!host.includes("."), "this server's host has no dot, so it cannot be typed on Settings");

    await withPlatformSettingsLock(async () => {
      await setPublicDomain(page, host);
      await page.goto("/");
      expect(await robotsMeta(page)).toBeNull();
      for (const path of CAPABILITY_PAGES) {
        await page.goto(path);
        expect(await robotsMeta(page), path).toBe("noindex, nofollow");
      }
    });
  });
});
