// Feature 1012, Reorderable rows -- frontend e2e (ADR 0001, Playwright).
//
// AC1  every prefilled-option row on a trade's edit screen shows up and down
//      buttons; the first row's up and the last row's down are disabled
// AC3  on the phone layout the buttons are full 44px tap targets and the
//      screen holds the 390px floor -- no horizontal scrolling
//
// AC2 (reorder + save + reload) and AC4 (add/remove regression) are proven
// in pricing.spec.ts instead of here: they write to the shared seeded
// Plumbing row, and that file already owns the one desktop-only test with
// exclusive write access to it (see its header) -- a second writer here
// would race it.
//
// Both tests below never click Save, so they touch no server state -- they
// can still catch pricing.spec.ts's shared writer mid-edit on the same
// live Plumbing row for a moment, which AC1's own assertions now tolerate
// (see its comment) rather than assuming a specific pre-existing row count.
import { test, expect } from "@playwright/test";
import { login } from "./helpers/login";
import { MOBILE_VIEWPORT } from "../playwright.config";

async function openPlumbingEdit(page: import("@playwright/test").Page) {
  await page.goto("/ops/pricing");
  await login(page, "owner@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("link", { name: "Edit Plumbing" }).click();
  await expect(page.getByRole("heading", { name: "Plumbing" })).toBeVisible({ timeout: 10_000 });
}

test("AC1: prefilled-option rows show up/down buttons, disabled at the ends", async ({ page }) => {
  await openPlumbingEdit(page);

  // Plumbing seeds with zero options (base.ts) and this test never saves,
  // so it never touches the shared row other tests write to -- but it can
  // still catch pricing.spec.ts's shared writer mid-edit for a moment
  // (both read the same live Plumbing row; discovered as a one-off flake
  // measuring project/setup/frontend-test-harness.md Part 1). Reading the
  // row count AFTER adding three, rather than assuming it lands on exactly
  // 3, keeps this test proving what AC1 actually claims -- the first row's
  // up and the LAST row's down are disabled, whatever the last index is --
  // instead of a specific row count that was never the point.
  await page.getByRole("button", { name: "+ Add another" }).click();
  await page.getByRole("button", { name: "+ Add another" }).click();
  await page.getByRole("button", { name: "+ Add another" }).click();
  const lastRow = await page.getByRole("button", { name: /^Move option \d+ up$/ }).count();

  // First row: up disabled, down enabled.
  await expect(page.getByRole("button", { name: "Move option 1 up" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Move option 1 down" })).toBeEnabled();

  // A middle row (one of the three just added, since there are at least
  // three of them): both enabled.
  await expect(page.getByRole("button", { name: `Move option ${String(lastRow - 1)} up` })).toBeEnabled();
  await expect(page.getByRole("button", { name: `Move option ${String(lastRow - 1)} down` })).toBeEnabled();

  // Last row: up enabled, down disabled.
  await expect(page.getByRole("button", { name: `Move option ${String(lastRow)} up` })).toBeEnabled();
  await expect(page.getByRole("button", { name: `Move option ${String(lastRow)} down` })).toBeDisabled();
});

test.describe(() => {
  test.use(MOBILE_VIEWPORT);

  test("AC3: at 390px the up/down buttons are 44px tap targets and the screen holds the floor", async ({
    page,
  }) => {
    await openPlumbingEdit(page);

    await page.getByRole("button", { name: "+ Add another" }).click();
    await page.getByRole("button", { name: "+ Add another" }).click();

    const upButton = page.getByRole("button", { name: "Move option 2 up" });
    await expect(upButton).toBeVisible();
    const box = await upButton.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);

    const downButton = page.getByRole("button", { name: "Move option 1 down" });
    const downBox = await downButton.boundingBox();
    expect(downBox?.width).toBeGreaterThanOrEqual(44);
    expect(downBox?.height).toBeGreaterThanOrEqual(44);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
