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
// Both tests below never click Save, so they touch no server state and are
// safe to run on every project in parallel.
import { test, expect } from "@playwright/test";

const DEV_PASSWORD = "dev-password-123";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
}

async function openPlumbingEdit(page: import("@playwright/test").Page) {
  await page.goto("/ops/pricing");
  await login(page, "owner@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("link", { name: "Edit Plumbing" }).click();
  await expect(page.getByRole("heading", { name: "Plumbing" })).toBeVisible({ timeout: 10_000 });
}

test("AC1: prefilled-option rows show up/down buttons, disabled at the ends", async ({ page }) => {
  await openPlumbingEdit(page);

  // Plumbing seeds with zero options (base.ts); add three locally -- never
  // saved, so this never touches the shared row other tests write to.
  await page.getByRole("button", { name: "+ Add another" }).click();
  await page.getByRole("button", { name: "+ Add another" }).click();
  await page.getByRole("button", { name: "+ Add another" }).click();

  // First row: up disabled, down enabled.
  await expect(page.getByRole("button", { name: "Move option 1 up" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Move option 1 down" })).toBeEnabled();

  // Middle row: both enabled.
  await expect(page.getByRole("button", { name: "Move option 2 up" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Move option 2 down" })).toBeEnabled();

  // Last row: up enabled, down disabled.
  await expect(page.getByRole("button", { name: "Move option 3 up" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Move option 3 down" })).toBeDisabled();
});

test("AC3: at 390px the up/down buttons are 44px tap targets and the screen holds the floor", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "this AC is specifically about the phone viewport");

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
