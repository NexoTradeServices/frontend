// Feature 1007, ServiceType catalog screen -- frontend e2e (ADR 0001, Playwright).
//
// Browser tests only for what needs a browser (project/design/trades-platform-design.md,
// Ground rules, "Tests leave nothing behind, and prove each thing once"). Feature 9002
// moved every server rule this file used to re-prove to tests/service-types.test.ts in
// the backend: the owner-only doors (AC1: Mike and Bob get 403), the seeded catalog
// (AC1), the saved rate (AC2), only the multiplier written (AC3), the locked normal
// multiplier (AC4), the saved option order (AC5) and the duplicate-name refusal (AC6).
//
// What stays here:
// AC3/AC4 the live multiplier preview and the locked normal row -- form state, never
//         sent to the server
// 1012    add, remove and move the prefilled option rows -- form state again
// 1007 AC7 the 390px responsive floor on the list and the edit screen
// BKLG-011/012 the compact "Add a trade" button and the required-field stars
//
// Nothing in this file saves: Plumbing is never written, so nothing needs restoring.
import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/login";
import { MOBILE_VIEWPORT } from "../playwright.config";

async function logout(page: Page) {
  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole("button", { name: "Log out" }).click();
  // Log out's own client-side refresh swaps the portal for the login gate
  // in place (no URL change) -- wait for that landmark before navigating
  // again, or the next goto races it (contractors.spec.ts's own precedent).
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 10_000 });
}

/** The catalog lists every trade alphabetically -- each row's Edit link is named for its own trade. */
async function editTrade(page: import("@playwright/test").Page, trade: string) {
  await page.getByRole("link", { name: `Edit ${trade}` }).click();
}

test("AC11 (BKLG-011, feature 2002): 'Add a trade' is the shared primary's compact size, not full-width", async ({
  page,
}) => {
  await page.goto("/ops/pricing");
  await login(page, "owner@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible({ timeout: 10_000 });

  const addButton = page.getByRole("link", { name: "Add a trade" });
  await expect(addButton).toHaveClass(/inline-block/);
  await expect(addButton).not.toHaveClass(/w-full/);

  await logout(page);
});

test("AC12 (BKLG-012, feature 2002): required fields carry the star, no field says \"(optional)\"", async ({
  page,
}) => {
  await page.goto("/ops/pricing/new");
  await login(page, "owner@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Add a trade" })).toBeVisible({ timeout: 10_000 });

  await expect(page.getByText("(optional)")).toHaveCount(0);
  await expect(page.getByLabel("Trade name")).toHaveAttribute("aria-required", "true");
  await expect(page.getByLabel("Call-out (first hour)")).toHaveAttribute("aria-required", "true");
  await expect(page.getByLabel("Standard rate")).toHaveAttribute("aria-required", "true");

  await logout(page);
});

test.describe(() => {
  test.use(MOBILE_VIEWPORT);

  test("AC7: at 390px the pricing list and edit screens hold the responsive floor", async ({ page }) => {
    await page.goto("/ops/pricing");
    await login(page, "owner@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible({ timeout: 10_000 });

    let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    let clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("navigation", { name: "Menu" });
    await expect(menu.getByRole("link", { name: "Pricing" })).toBeVisible();
    await page.getByRole("button", { name: "Close menu" }).click();

    await expect(page.getByRole("link", { name: "Add a trade" })).toBeVisible();
    await editTrade(page, "Plumbing");

    await expect(page.getByRole("heading", { name: "Plumbing" })).toBeVisible({ timeout: 10_000 });
    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await expect(page.getByLabel("Call-out (first hour)")).toBeVisible();
    await expect(page.getByLabel("Weekend")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();

    await logout(page);
  });
});

test("AC3 + AC4 + feature 1012 AC2/AC4: the locked normal row, the live multiplier preview, and the option rows' add, remove and move -- all form state, nothing saved", async ({
  page,
}) => {
  await page.goto("/ops/pricing");
  await login(page, "owner@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible({ timeout: 10_000 });
  await editTrade(page, "Plumbing");
  await expect(page.getByRole("heading", { name: "Plumbing" })).toBeVisible({ timeout: 10_000 });

  // AC4 -- the normal row is locked/frozen: shown, but no input to edit it.
  await expect(page.getByText("1.0x")).toBeVisible();
  await expect(page.getByLabel("Normal")).toHaveCount(0);

  // AC3 -- the weekend multiplier's live preview, computed in the form from
  // the rate typed beside it: nothing is sent to the server.
  await page.getByLabel("Standard rate").fill("190.00");
  await page.getByLabel("Weekend").fill("1.25");
  await expect(page.getByText("Preview: call-out $312.50 / hourly $237.50")).toBeVisible();

  // Feature 1012 -- add, remove and move the prefilled option rows. The saved
  // order is proven at the backend (tests/service-types.test.ts, AC5); here
  // only the form's own state, so Plumbing is never written.
  // Start from an empty list whatever the database seeded (a fresh CI database
  // carries option rows, the dev one does not): taking rows off is form state too.
  const removeButtons = page.getByRole("button", { name: /^Remove option \d+$/ });
  while ((await removeButtons.count()) > 0) {
    await removeButtons.first().click();
  }
  await page.getByRole("button", { name: "+ Add another" }).click();
  await page.getByLabel("Option 1", { exact: true }).fill("Where in the property is it?");
  await page.getByRole("button", { name: "+ Add another" }).click();
  await page.getByLabel("Option 2", { exact: true }).fill("What brand is it?");
  await page.getByRole("button", { name: "+ Add another" }).click();
  await page.getByLabel("Option 3", { exact: true }).fill("to be removed");
  await page.getByRole("button", { name: "Remove option 3" }).click();
  await expect(page.getByLabel("Option 3", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Move option 2 up" }).click();
  await expect(page.getByLabel("Option 1", { exact: true })).toHaveValue("What brand is it?");
  await expect(page.getByLabel("Option 2", { exact: true })).toHaveValue("Where in the property is it?");

  await logout(page);
});
