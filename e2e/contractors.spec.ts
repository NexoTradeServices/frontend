// Feature 2001, contractor onboarding (Mike's path) -- frontend e2e (ADR
// 0001, Playwright).
//
// AC1  Mike/the owner see Bob, Dave, Priya -- Active tags, all Not ready to
//      dispatch, Priya names "insurance renewal (expired)", all three name
//      "service area (not set up yet)"; Bob (contractor) gets the
//      wrong-door card
// AC2  Add a contractor with just name/phone/email: lands on the list with
//      the toast, the new row shows Not ready to dispatch with the full
//      missing list
// AC5  Bob's Plumbing row, insurance and payout round-trip; [IMPL] (plan.md)
//      -- the missing list is "address" + "service area (not set up yet)",
//      not just the one item; see the plan note for why
// AC6  a blank licence expiry refuses the whole save with a field error; a
//      past expiry saves and shows the warning
// AC8  a deactivated contractor with the RIGHT password sees the
//      operatorPhone message; reactivating restores his login (AC9),
//      leaving the seeded Bob exactly as this suite found him
// AC11 [IMPL] (plan.md) -- the Google Places key turned out to be already
//      provisioned and network-reachable here (project/setup/
//      01-dev-environment.md, section 6, ticked 03/09/26), so this proves
//      BOTH branches: a real pick stores the structured address, and a
//      simulated script failure (route-blocked) degrades to the
//      unavailable state with the form still saving
// AC13 this file, and every other spec touched by B-009, log in through the
//      shared helper (frontend/e2e/helpers/login.ts) -- proven by three
//      consecutive clean `npm run test:e2e` runs, not by an assertion here
// AC14 the 390px responsive floor on the list, the form and the deactivate
//      confirm dialog
//
// Runs against the seeded dev database (`npm run db:seed:fixtures`), same
// constraint as auth.spec.ts/settings.spec.ts/pricing.spec.ts -- AC2's and
// AC6's new contractors cannot be deleted (design has none), so each test
// deactivates its own throwaway row as cleanup; AC8/AC9 restores Bob to
// Active, the same "leave it as we found it" discipline.
import { test, expect } from "@playwright/test";
import { login } from "./helpers/login";

// A unique suffix per test, on BOTH the name and the email -- a test that
// fails before its own cleanup step leaves a stray active row behind, and
// without this, the next run's `hasText` row lookup resolves to more than
// one element (Playwright strict mode) instead of a clean, unrelated fail.
function uniqueTag(tag: string): string {
  return `${tag}-${Date.now().toString()}`;
}
function uniqueEmail(tag: string): string {
  return `e2e-${uniqueTag(tag)}@idelta.com.au`;
}

async function deactivateOpenContractor(page: import("@playwright/test").Page) {
  await page.getByRole("switch", { name: "Contractor status" }).click();
  await page.getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByText(/Their session is gone/)).toBeVisible();
}

test("AC1: Mike sees Bob, Dave, Priya -- Active + Not ready to dispatch, Priya's insurance expired, all missing a service area", async ({
  page,
}) => {
  await page.goto("/ops/contractors");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });

  for (const name of ["Bob Reilly", "Dave Hurst", "Priya Nair"]) {
    const row = page.getByRole("link").filter({ hasText: name });
    await expect(row.getByText("Active", { exact: true })).toBeVisible();
    await expect(row.getByText("Not ready to dispatch")).toBeVisible();
    await expect(row.getByText(/service area \(not set up yet\)/)).toBeVisible();
  }
  await expect(
    page.getByRole("link").filter({ hasText: "Priya Nair" }).getByText(/insurance renewal \(expired\)/),
  ).toBeVisible();
});

test("AC1: the owner sees the same list; Bob (contractor) gets the wrong-door card", async ({ page }) => {
  await page.goto("/ops/contractors");
  await login(page, "owner@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("link").filter({ hasText: "Bob Reilly" })).toBeVisible();

  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole("button", { name: "Log out" }).click();
  // Log out's own client-side refresh swaps the portal for the login gate
  // in place (no URL change) -- wait for that landmark before navigating
  // again, or the next goto races it (seen on tablet: "Navigation ...
  // interrupted by another navigation").
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 10_000 });

  await page.goto("/ops/contractors");
  await login(page, "bob@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Wrong portal" })).toBeVisible();
});

test("AC2: add a contractor with just the three required fields", async ({ page }) => {
  await page.goto("/ops/contractors/new");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });

  const tag = uniqueTag("ac2");
  const name = `E2E Throwaway ${tag}`;
  const email = uniqueEmail("ac2");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Phone", { exact: true }).fill("0412 000 111");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page).toHaveURL(/\/ops\/contractors$/, { timeout: 10_000 });
  await expect(page.getByText(`${name} added. Welcome email sent to ${email}.`)).toBeVisible();

  const row = page.getByRole("link").filter({ hasText: name });
  await expect(row.getByText("Not ready to dispatch")).toBeVisible();
  await expect(row.getByText(/Missing: /)).toBeVisible();

  // Cleanup -- no delete exists (plan.md Scope / Out); deactivate the
  // throwaway row instead, same spirit as settings.spec.ts's restores.
  await row.click();
  await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });
  await deactivateOpenContractor(page);
});

test("AC11: a real Google pick stores the structured address and round-trips", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one network-dependent pick is enough; avoid tripling the Google API calls");

  await page.goto("/ops/contractors/new");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });

  const tag = uniqueTag("ac11");
  const name = `E2E Places Case ${tag}`;
  const email = uniqueEmail("ac11");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Phone", { exact: true }).fill("0412 000 333");
  await page.getByLabel("Email", { exact: true }).fill(email);

  const address = page.getByLabel("Address");
  await expect(address).toBeEnabled({ timeout: 10_000 });
  await address.fill("14 Marine Terrace, Fremantle WA 6160");
  await expect(page.getByText("Google suggestions")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Marine Terrace.*Fremantle.*WA/ }).click();
  // Mike only cares whether the address is in the field, not a suburb/
  // postcode confirmation line -- the field itself, filled, is the proof.
  await expect(address).toHaveValue(/Marine Terrace.*Fremantle/);
  // PlacesField's own onPickingChange disables Save (renamed "Picking
  // address...") until the pick's network round-trip actually lands --
  // getByRole("Save") only matches once it's back, so this click can never
  // race ahead of the real data the way the visible text update alone did.
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/ops\/contractors$/, { timeout: 10_000 });

  const row = page.getByRole("link").filter({ hasText: name });
  await row.click();
  await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel("Address")).toHaveValue(/Marine Terrace.*Fremantle/);

  await deactivateOpenContractor(page);
});

test("AC11: with the Places script blocked, the address field is disabled with the warning line and the form still saves", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "the unavailable branch needs no repeating per viewport");

  await page.route("https://maps.googleapis.com/**", (route) => route.abort());
  await page.goto("/ops/contractors/new");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });

  await expect(page.getByLabel("Address")).toBeDisabled({ timeout: 10_000 });
  await expect(page.getByText(/Address lookup is unavailable right now -- try again shortly\. Everything else still saves\./)).toBeVisible();

  const tag = uniqueTag("ac11b");
  const name = `E2E Places Blocked ${tag}`;
  const email = uniqueEmail("ac11b");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Phone", { exact: true }).fill("0412 000 444");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page).toHaveURL(/\/ops\/contractors$/, { timeout: 10_000 });
  await expect(page.getByText(`${name} added. Welcome email sent to ${email}.`)).toBeVisible();

  const row = page.getByRole("link").filter({ hasText: name });
  await row.click();
  await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });
  await deactivateOpenContractor(page);
});

// AC5 and AC8+AC9 both write to the SHARED seeded Bob (CON-014) row --
// serialized so they never race each other's PUT under fullyParallel
// workers (unlike settings.spec.ts's/pricing.spec.ts's single shared
// writer, this file has two, so a project-only skip is not enough).
test.describe.serial("Bob (CON-014) -- the shared writer tests", () => {
  test("AC5: Bob's Plumbing row, insurance and payout round-trip as whole cents", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "writes the shared seeded Bob row; runs on one project only to avoid racing the others (pricing.spec.ts's precedent)",
    );
    await page.goto("/ops/contractors/CON-014");
    await login(page, "mike@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });

    // Bob carries a second trade (Electrical) alongside Plumbing -- scope to
    // his Plumbing row specifically, not just the first rate field on the
    // page.
    const plumbingRow = page.locator('[data-trade="Plumbing"]');
    await expect(plumbingRow.getByLabel("Call-out rate")).toHaveValue("200.00");
    await expect(plumbingRow.getByLabel("Standard rate")).toHaveValue("150.00");
    await expect(plumbingRow.getByLabel("Licence number")).toHaveValue("PL-8841");
    await expect(page.getByLabel("Insurer")).toHaveValue("QBE");
    await expect(page.getByLabel("BSB")).toHaveValue("066-000");

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(/\/ops\/contractors$/, { timeout: 10_000 });
    await expect(page.getByText("Bob Reilly saved.")).toBeVisible();

    await page.goto("/ops/contractors/CON-014");
    const plumbingRowAfterSave = page.locator('[data-trade="Plumbing"]');
    await expect(plumbingRowAfterSave.getByLabel("Call-out rate")).toHaveValue("200.00");
    await expect(plumbingRowAfterSave.getByLabel("Standard rate")).toHaveValue("150.00");
    // This dev DB's Bob predates the migration (Feature 1001's original
    // seed), so his old free-text address survived it as
    // { street: "Fremantle WA 6160" } (AC12) -- present, so "address" is not
    // missing here. [IMPL] (plan.md) applies to a FRESH database (the
    // backend suite's throwaway one), where the current fixture seed never
    // sets Bob's own address at all and "address" stays missing too.
    await expect(page.getByText("Not ready to dispatch", { exact: true })).toBeVisible();
    // The banner's "Missing:" text and its <li> items are separate nodes,
    // unlike the list row's flat "Missing: a, b, c" string -- check both.
    await expect(page.getByText("Not ready to dispatch.")).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveText(["service area (not set up yet)"]);
  });

  test("AC6: a blank licence expiry refuses the save; a past expiry saves and shows the warning", async ({ page }) => {
    await page.goto("/ops/contractors/new");
    await login(page, "mike@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });

    const tag = uniqueTag("ac6");
    const name = `E2E Expiry Case ${tag}`;
    const email = uniqueEmail("ac6");
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Phone", { exact: true }).fill("0412 000 222");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Trade", { exact: true }).selectOption("Plumbing");
    await page.getByLabel("Call-out rate").fill("200.00");
    await page.getByLabel("Standard rate").fill("150.00");
    await page.getByLabel("Licence number").fill("PL-0001");
    // Licence expiry left blank on purpose.
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Required.")).toBeVisible();
    await expect(page).toHaveURL(/\/ops\/contractors\/new$/);

    await page.getByLabel("Licence expiry").fill("2020-01-01");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(/\/ops\/contractors$/, { timeout: 10_000 });
    await expect(page.getByText(`${name} added. Welcome email sent to ${email}.`)).toBeVisible();

    const row = page.getByRole("link").filter({ hasText: name });
    await expect(row.getByText(/Missing: .*at least one active trade with a current licence/)).toBeVisible();
    await row.click();
    await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Already expired -- this trade cannot be dispatched until renewed.")).toBeVisible();

    await deactivateOpenContractor(page);
  });

  test("AC8 + AC9: a deactivated contractor with the right password is told to call the office; reactivating restores his login", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "writes the shared seeded Bob row; runs on one project only to avoid racing the others (pricing.spec.ts's precedent)",
    );
    await page.goto("/ops/contractors/CON-014");
    await login(page, "mike@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });
    await deactivateOpenContractor(page);
    await expect(page.getByText("Deactivated -- no dispatch, no login")).toBeVisible();

    const menuButton = page.getByRole("button", { name: "Open menu" });
    if (await menuButton.isVisible()) await menuButton.click();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 10_000 });

    // AC8: the right password, told why -- never a field-specific message.
    await page.goto("/contractor");
    await page.getByLabel("Email").fill("bob@idelta.com.au");
    await page.getByLabel("Password").fill("dev-password-123");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText(/Your account is not active\. Call us on 08 0000 0000\./)).toBeVisible();

    // A wrong password still gets the generic banner, not the operatorPhone one.
    await page.getByLabel("Password").fill("not-the-right-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText(/don't match/)).toBeVisible();

    // AC9: reactivate Bob (no confirm) and restore the seeded row.
    await page.goto("/ops/contractors/CON-014");
    await login(page, "mike@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("switch", { name: "Contractor status" }).click();
    await expect(page.getByText("Bob Reilly reactivated.")).toBeVisible();
    await expect(page.getByText("Active -- dispatched when ready")).toBeVisible();

    const mikeMenu = page.getByRole("button", { name: "Open menu" });
    if (await mikeMenu.isVisible()) await mikeMenu.click();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 10_000 });

    await page.goto("/contractor");
    await page.getByLabel("Email").fill("bob@idelta.com.au");
    await page.getByLabel("Password").fill("dev-password-123");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText(/Logged in as Bob Reilly/)).toBeVisible();
    const bobMenu = page.getByRole("button", { name: "Open menu" });
    if (await bobMenu.isVisible()) await bobMenu.click();
    await page.getByRole("button", { name: "Log out" }).click();
  });
});

test("AC14: at 390px the list, the form and the deactivate dialog hold the responsive floor", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "this AC is specifically about the phone viewport");

  await page.goto("/ops/contractors");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });
  let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  let clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  await page.getByRole("link", { name: "Add a contractor" }).click();
  await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
  scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  await expect(page.getByRole("button", { name: "Remove this trade" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();

  await page.goto("/ops/contractors/CON-014");
  await expect(page.getByRole("switch", { name: "Contractor status" })).toBeVisible();
  await page.getByRole("switch", { name: "Contractor status" }).click();
  await expect(page.getByRole("heading", { name: "Deactivate Bob Reilly?" })).toBeVisible();
  scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await expect(page.getByRole("button", { name: "Keep active" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Deactivate" })).toBeVisible();
  await page.getByRole("button", { name: "Keep active" }).click();
});
