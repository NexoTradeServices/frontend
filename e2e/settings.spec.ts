// Feature 1006, admin settings screen -- frontend e2e (ADR 0001, Playwright).
//
// AC1  the owner opens /ops/settings: the OWNER nav group shows, the
//      seeded values render
// AC2  Mike (ops) and Bob (contractor) get the wrong-door card at
//      /ops/settings; Mike's ops-portal nav shows no OWNER group
// AC3  the owner edits a plain field and saves; a reload shows the change
// AC4  the ABN gate, mirrored client-side: no ABN, no network call, just
//      the field error
// AC5  with an ABN, the flip passes the confirm dialog and the audit
//      caption appears
// AC6  the Business inbox field edits operatorEmail
// AC7  the 390px responsive floor: the app-bar menu opens with the full
//      nav, every field and Save reachable, no horizontal scrolling
//
// Also carries one test with no AC number, added by
// project/setup/frontend-test-harness.md Part 2: the app-bar menu's own
// nav content and order, for Mike, at 390px -- not a feature AC, but the
// one thing Part 1's cut to desktop-only would otherwise have dropped.
//
// Runs against the seeded dev database, not a throwaway one (same
// constraint as auth.spec.ts). PlatformSettings is a SINGLETON row -- the
// one test below that saves restores the row to what it found, the same
// "leave it as we found it" discipline auth.spec.ts uses for sessions, and
// runs inside withPlatformSettingsLock (helpers/singleton-lock.ts) because
// brand-identity.spec.ts's AC6 writes the very same row.
import { test, expect } from "@playwright/test";
import { login } from "./helpers/login";
import { MOBILE_VIEWPORT } from "../playwright.config";
import { withPlatformSettingsLock } from "./helpers/singleton-lock";

async function logout(page: import("@playwright/test").Page) {
  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole("button", { name: "Log out" }).click();
}

test("AC2: Mike (ops) gets the wrong-door card at /ops/settings", async ({ page }) => {
  await page.goto("/ops/settings");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Wrong portal" })).toBeVisible();
});

test("AC2: Bob (contractor) gets the wrong-door card at /ops/settings too", async ({ page }) => {
  await page.goto("/ops/settings");
  await login(page, "bob@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Wrong portal" })).toBeVisible();
});

test("AC2: Mike's ops-portal nav shows no OWNER group -- Settings is owner-only", async ({ page }) => {
  await page.goto("/ops");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByText(/Logged in as Mike/)).toBeVisible();

  await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await expect(page.getByText("Owner", { exact: true })).toHaveCount(0);

  await logout(page);
});

test("AC12 (BKLG-012, feature 2002): required fields carry the star, no field says \"(optional)\"", async ({
  page,
}) => {
  await page.goto("/ops/settings");
  await login(page, "owner@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 });

  await expect(page.getByText("(optional)")).toHaveCount(0);
  await expect(page.getByLabel("Business name")).toHaveAttribute("aria-required", "true");
  await expect(page.getByLabel("Operator phone")).toHaveAttribute("aria-required", "true");
  await expect(page.getByLabel("Business inbox")).toHaveAttribute("aria-required", "true");
  await expect(page.getByLabel("Timezone")).toHaveAttribute("aria-required", "true");
  // ABN is conditionally required (only once GST is switched on) -- never starred.
  await expect(page.getByLabel("ABN")).not.toHaveAttribute("aria-required", "true");

  await logout(page);
});

test.describe(() => {
  test.use(MOBILE_VIEWPORT);

  test("AC7: at 390px the settings screen holds the responsive floor", async ({ page }) => {
    await page.goto("/ops/settings");
    await login(page, "owner@idelta.com.au");
    // /ops/settings renders from two sequential server-side fetches (session,
    // then settings) -- a longer, honest wait for genuinely slower real work,
    // not a weaker assertion.
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // The app-bar menu opens with the full nav.
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("navigation", { name: "Menu" });
    await expect(menu.getByRole("link", { name: "Settings" })).toBeVisible();
    await expect(menu.getByText("Owner", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close menu" }).click();

    // Every field and Save stay reachable.
    await expect(page.getByLabel("ABN")).toBeVisible();
    await expect(page.getByLabel("SMS provider")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save settings" })).toBeVisible();

    await logout(page);
  });

  // project/setup/frontend-test-harness.md Part 2: cutting every other test
  // to desktop-only drops the one thing only the phone layout can prove --
  // that the app-bar menu carries the sidebar's exact content and order
  // (project/design/frontend-conventions.md, the mobile nav promise). Mike's
  // sidebar is proven above (AC2, desktop) to show Contractors only, no
  // Owner group; this is that same claim through the app-bar menu instead.
  test("the app-bar menu carries the sidebar's exact nav, in the same order, for the same role", async ({
    page,
  }) => {
    await page.goto("/ops");
    await login(page, "mike@idelta.com.au");
    await expect(page.getByText(/Logged in as Mike/)).toBeVisible();

    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("navigation", { name: "Menu" });
    await expect(menu.getByText("Owner", { exact: true })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Settings" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Pricing" })).toHaveCount(0);
    // Same order as the sidebar's own list (frontend/src/lib/ops-nav.ts) --
    // Contractors is Mike's only built, non-owner entry, so it is the only
    // link the menu carries.
    await expect(menu.getByRole("link")).toHaveText(["Contractors"]);

    await page.getByRole("button", { name: "Close menu" }).click();
  });
});

test(
  "AC1 + AC3 + AC5 + AC6: seeded values render; the owner edits, saves, flips GST through the confirm dialog and sees the audit caption -- then everything reverts",
  async ({ page }) => {
    await withPlatformSettingsLock(async () => {
      await page.goto("/ops/settings");
      await login(page, "owner@idelta.com.au");

      // AC1 -- the OWNER nav group shows, and the seeded values render, one field per card.
      // (/ops/settings renders from two sequential server-side fetches -- session,
      // then settings -- a longer, honest wait for genuinely slower real work.)
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
      await expect(page.getByText("Owner", { exact: true })).toBeVisible();
      await expect(page.getByLabel("ABN")).toHaveValue("");
      await expect(page.getByLabel("Operator phone")).toHaveValue("08 0000 0000");
      await expect(page.getByLabel("Business inbox")).toHaveValue("ops@idelta.com.au");
      await expect(page.getByLabel("Timezone")).toHaveValue("Australia/Perth");
      await expect(page.getByLabel("GST rate")).toHaveValue("10");
      await expect(page.getByLabel("Payment terms")).toHaveValue("7");
      await expect(page.getByLabel("No-show call-out fee")).toHaveValue("150.00");
      await expect(page.getByLabel("Return visit minimum")).toHaveValue("30");
      await expect(page.getByLabel("Contractor part cap")).toHaveValue("150.00");
      await expect(page.getByLabel("Service reach")).toHaveValue("25");
      await expect(page.getByLabel("Payout cycle")).toHaveValue("weekly");
      await expect(page.getByLabel("Payout day")).toHaveValue("fri");
      await expect(page.getByLabel("Email provider")).toHaveValue("mailjet");
      await expect(page.getByLabel("SMS provider")).toHaveValue("clicksend");

      // AC3 -- edit a plain field and save; a reload shows the change.
      await page.getByLabel("Payment terms").fill("14");
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByText("Saved.")).toBeVisible();
      await page.reload();
      await expect(page.getByLabel("Payment terms")).toHaveValue("14");

      // AC4 -- flipping GST on with no ABN is blocked client-side, no network round trip.
      await page.getByRole("switch", { name: "GST registered" }).click();
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByText(/Enter the ABN first/)).toBeVisible();

      // AC5 -- with an ABN, the flip passes the confirm dialog and stamps the audit pair.
      await page.getByLabel("ABN").fill("51 824 753 556");
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByRole("heading", { name: "Switch GST on?" })).toBeVisible();
      await page.getByRole("button", { name: "Switch on" }).click();
      await expect(page.getByText(/Changed \d{2}\/\d{2}\/\d{2} by The owner/)).toBeVisible();

      // AC6 -- the Business inbox field edits operatorEmail.
      await page.getByLabel("Business inbox").fill("admin@idelta.com.au");
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByText("Saved.")).toBeVisible();
      await page.reload();
      await expect(page.getByLabel("Business inbox")).toHaveValue("admin@idelta.com.au");

      // Leave the row exactly as found.
      await page.getByLabel("Business inbox").fill("ops@idelta.com.au");
      await page.getByLabel("Payment terms").fill("7");
      await page.getByLabel("ABN").fill("");
      await page.getByRole("switch", { name: "GST registered" }).click();
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByRole("heading", { name: "Switch GST off?" })).toBeVisible();
      await page.getByRole("button", { name: "Switch off" }).click();
      await expect(page.getByText("Saved.")).toBeVisible();

      await logout(page);
    });
  },
);
