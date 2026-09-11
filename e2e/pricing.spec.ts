// Feature 1007, ServiceType catalog screen -- frontend e2e (ADR 0001, Playwright).
//
// AC1  the owner sees the seeded catalog at /ops/pricing (Plumbing $250 /
//      $180 among them); Mike and Bob get the wrong-door card and no
//      Pricing nav entry
// AC2  the owner edits Plumbing's standard rate 180 -> 190 and saves;
//      reload shows it
// AC3  setting the weekend multiplier to 1.25 shows the live computed
//      preview call-out $312.50 / hourly $237.50 (with AC2's rate) --
//      nothing but the multiplier round-trips
// AC4  the normal row renders as the locked/frozen field state and carries
//      no input to edit
// AC5  the owner reorders Plumbing's prefilled options; the saved order is
//      what reloading shows
// AC6  the duplicate-name refusal (creating "Plumbing" again) end to end
//      through the UI. The create-succeeds half of this AC is proven by
//      the backend suite's throwaway database (tests/service-types.test.ts)
//      instead of here: this suite runs against the seeded DEV database
//      (not throwaway, same constraint as auth.spec.ts/settings.spec.ts),
//      and the design has no delete/deactivate for a trade (plan.md Scope
//      / Out) -- an e2e run that actually created a trade would litter the
//      dev catalog forever with no way to remove it.
// AC7  the 390px responsive floor on both the list and the edit screen
//
// Plumbing's rate/multiplier/option edits are restored to the seeded
// values via the writing test's own afterEach, not its own last step --
// project/setup/frontend-test-harness.md: a test that dies partway through
// a multi-field edit otherwise leaves Plumbing corrupted for every later
// test (this file's own AC1, and reorderable-rows.spec.ts) for the rest of
// the run, the same bug shape that hit brand-identity.spec.ts and
// settings.spec.ts.
//
// Feature 1012 (reorderable rows) proves its own AC2 (reorder + save +
// reload) and AC4 (add/remove regression on the shared component) inside
// this same desktop-only test, right after this file's AC5 section -- this
// test already owns the one exclusive-write slot on the shared Plumbing
// row; a second writer in reorderable-rows.spec.ts would race it. 1012's
// AC1 and AC3 (button presence, tap targets) touch no server state and
// live in reorderable-rows.spec.ts instead.
import { test, expect, type Page } from "@playwright/test";
import { login, ensureLoggedInAs } from "./helpers/login";
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

test("AC1: Mike (ops) gets the wrong-door card at /ops/pricing", async ({ page }) => {
  await page.goto("/ops/pricing");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Wrong portal" })).toBeVisible();
});

test("AC1: Bob (contractor) gets the wrong-door card at /ops/pricing too", async ({ page }) => {
  await page.goto("/ops/pricing");
  await login(page, "bob@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Wrong portal" })).toBeVisible();
});

test("AC1: Mike's ops-portal nav shows no Pricing entry -- owner-only", async ({ page }) => {
  await page.goto("/ops");
  await login(page, "mike@idelta.com.au");
  // Since feature 4001 the ops root lands on the job queue.
  await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible({ timeout: 15_000 });

  await expect(page.getByRole("link", { name: "Pricing" })).toHaveCount(0);

  await logout(page);
});

test("AC1: the owner sees the seeded catalog, Plumbing $250 / $180 among it", async ({ page }) => {
  await page.goto("/ops/pricing");
  await login(page, "owner@idelta.com.au");

  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible({ timeout: 10_000 });
  const plumbingRow = page.getByText("Plumbing", { exact: true }).locator("..");
  await expect(plumbingRow.getByText(/Call-out \$250\.00 \/ standard \$180\.00 per hour/)).toBeVisible();

  await logout(page);
});

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

test("AC6: creating 'Plumbing' again is refused with the field error on the name", async ({ page }) => {
  await page.goto("/ops/pricing/new");
  await login(page, "owner@idelta.com.au");

  await expect(page.getByRole("heading", { name: "Add a trade" })).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Trade name").fill("Plumbing");
  await page.getByLabel("Call-out (first hour)").fill("100.00");
  await page.getByLabel("Standard rate").fill("80.00");
  await page.getByLabel("Emergency").fill("1.5");
  await page.getByLabel("Weekend").fill("1.5");
  await page.getByRole("button", { name: "Add trade" }).click();

  await expect(page.getByText(/a trade with this name already exists/)).toBeVisible();
  // Refused, not created -- still on the create form, never redirected to the list.
  await expect(page).toHaveURL(/\/ops\/pricing\/new$/);

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

/** Idempotent: reads the current row before touching anything, and only
 * saves if something actually differs from the seed. Options are removed
 * highest-index-first -- removing shifts nothing below it, so the loop
 * never has to recompute names mid-flight. */
async function restoreSeededPlumbing(page: Page): Promise<void> {
  await ensureLoggedInAs(page, "/ops/pricing", "owner@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible({ timeout: 10_000 });
  await editTrade(page, "Plumbing");
  await expect(page.getByRole("heading", { name: "Plumbing" })).toBeVisible({ timeout: 10_000 });

  const standardRate = await page.getByLabel("Standard rate").inputValue();
  const weekend = await page.getByLabel("Weekend").inputValue();
  const optionCount = await page.getByRole("button", { name: /^Remove option \d+$/ }).count();

  if (standardRate === "180.00" && weekend === "1.5" && optionCount === 0) {
    await logout(page);
    return;
  }

  if (standardRate !== "180.00") await page.getByLabel("Standard rate").fill("180.00");
  if (weekend !== "1.5") await page.getByLabel("Weekend").fill("1.5");
  for (let i = optionCount; i >= 1; i--) {
    await page.getByRole("button", { name: `Remove option ${String(i)}` }).click();
  }
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await logout(page);
}

test.describe(() => {
  // Runs whether the test below passes or fails -- see the file header.
  test.afterEach(async ({ page }) => {
    await restoreSeededPlumbing(page);
  });

  test(
    "AC2 + AC3 + AC4 + AC5: edit Plumbing's rate, see the live multiplier preview, the locked normal row, reorder its options",
    async ({ page }) => {
      await page.goto("/ops/pricing");
      await login(page, "owner@idelta.com.au");
      await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible({ timeout: 10_000 });
      await editTrade(page, "Plumbing");
      await expect(page.getByRole("heading", { name: "Plumbing" })).toBeVisible({ timeout: 10_000 });

      // AC1/seeded values render on the edit screen too.
      await expect(page.getByLabel("Call-out (first hour)")).toHaveValue("250.00");
      await expect(page.getByLabel("Standard rate")).toHaveValue("180.00");
      await expect(page.getByLabel("Emergency")).toHaveValue("1.5");
      await expect(page.getByLabel("Weekend")).toHaveValue("1.5");

      // AC4 -- the normal row is locked/frozen: shown, but no input to edit it.
      await expect(page.getByText("1.0x")).toBeVisible();
      await expect(page.getByLabel("Normal")).toHaveCount(0);

      // AC2 -- standard rate 180 -> 190, saved.
      await page.getByLabel("Standard rate").fill("190.00");
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Saved.")).toBeVisible();
      await page.reload();
      await expect(page.getByLabel("Standard rate")).toHaveValue("190.00");

      // AC3 -- the weekend multiplier's live preview, computed off the just-saved rate.
      await page.getByLabel("Weekend").fill("1.25");
      await expect(page.getByText("Preview: call-out $312.50 / hourly $237.50")).toBeVisible();

      // AC5 -- add, remove and reorder the prefilled options; save; reload shows the saved order.
      await page.getByRole("button", { name: "+ Add another" }).click();
      await page.getByLabel("Option 1", { exact: true }).fill("Where in the property is it?");
      await page.getByRole("button", { name: "+ Add another" }).click();
      await page.getByLabel("Option 2", { exact: true }).fill("What brand is it?");
      await page.getByRole("button", { name: "+ Add another" }).click();
      await page.getByLabel("Option 3", { exact: true }).fill("to be removed");
      await page.getByRole("button", { name: "Remove option 3" }).click();
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Saved.")).toBeVisible();
      await page.reload();
      await expect(page.getByLabel("Option 1", { exact: true })).toHaveValue("Where in the property is it?");
      await expect(page.getByLabel("Option 2", { exact: true })).toHaveValue("What brand is it?");
      await expect(page.getByLabel("Option 3", { exact: true })).toHaveCount(0);

      // Feature 1012, AC2 -- move option 2 up one place and save; the API
      // returns the new order and a reload shows it.
      await page.getByRole("button", { name: "Move option 2 up" }).click();
      await expect(page.getByLabel("Option 1", { exact: true })).toHaveValue("What brand is it?");
      await expect(page.getByLabel("Option 2", { exact: true })).toHaveValue("Where in the property is it?");
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Saved.")).toBeVisible();
      await page.reload();
      await expect(page.getByLabel("Option 1", { exact: true })).toHaveValue("What brand is it?");
      await expect(page.getByLabel("Option 2", { exact: true })).toHaveValue("Where in the property is it?");

      // Feature 1012, AC4 -- add and remove still behave exactly as before
      // now that the ordered variant is in play (regression guard).
      await page.getByRole("button", { name: "+ Add another" }).click();
      await page.getByLabel("Option 3", { exact: true }).fill("to be removed");
      await expect(page.getByLabel("Option 3", { exact: true })).toHaveValue("to be removed");
      await page.getByRole("button", { name: "Remove option 3" }).click();
      await expect(page.getByLabel("Option 3", { exact: true })).toHaveCount(0);
    },
  );
});
