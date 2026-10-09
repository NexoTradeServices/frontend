// Feature 2001, contractor onboarding (Mike's path) -- frontend e2e (ADR
// 0001, Playwright).
//
// Browser tests only for what needs a browser (project/design/trades-platform-design.md,
// Ground rules, "Tests leave nothing behind, and prove each thing once"). Feature 9002
// moved every server rule this file used to re-prove to tests/contractors.test.ts in the
// backend: the list with Bob and Dave Ready and Priya Not ready (AC1), the owner's view
// and Bob's refusal (AC1), a contractor saved with just the three fields (AC2), Bob's
// Plumbing row round-trip in whole cents (AC5), the blank and past licence expiry (AC6),
// and the deactivated login with its operator-phone message and the reactivated login
// (AC8, AC9). The agreement card on the record is covered by the frontend unit test
// tests/agreement-views.test.ts and the backend's AC14.
//
// What stays here:
// AC6  a blank licence expiry stops the form with "Required."; the expired warning on the record
// AC8/9 the status switch, its confirm dialog and toasts, on a throwaway contractor
// AC11 the Google Places pick, and the field degrading when the script is blocked
// AC14 the 390px responsive floor on the list, the form and the deactivate dialog
// 6003 AC1 GST registered is Not asked yet / Yes / No: not asked is a missing item on the list and the
//      record, and once answered the option is gone
//
// Every contractor a test adds carries the `e2e` test-data label (the test-run
// cookie, playwright.config.ts) and is swept by the run's global setup and
// teardown (e2e/helpers/test-run.ts) -- nothing here cleans up after itself, and
// nothing writes to the seeded cast.
import { test, expect } from "@playwright/test";
import { login } from "./helpers/login";
import { MOBILE_VIEWPORT } from "../playwright.config";
import { MOCKS_GOOGLE_PLACES, installMockGooglePlaces } from "./helpers/mock-google-places";

// A unique suffix per test, on BOTH the name and the email, so a row lookup
// by text resolves to exactly one element.
function uniqueTag(tag: string): string {
  return `${tag}-${Date.now().toString()}`;
}
function uniqueEmail(tag: string): string {
  return `e2e-${uniqueTag(tag)}@idelta.com.au`;
}

test("AC11: a real Google pick stores the structured address and round-trips", async ({ page }) => {
  if (MOCKS_GOOGLE_PLACES) await installMockGooglePlaces(page);
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
});

test("AC11: with the Places script blocked, the address field is disabled with the warning line and the form still saves", async ({
  page,
}) => {
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

  // AC8/AC9: the status switch, its confirm dialog and toasts -- on this
  // throwaway contractor, never on a seeded one.
  await page.getByRole("switch", { name: "Contractor status" }).click();
  await page.getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByText(/Their session is gone/)).toBeVisible();
  await expect(page.getByText("Deactivated -- no dispatch, no login")).toBeVisible();
  await page.getByRole("switch", { name: "Contractor status" }).click();
  await expect(page.getByText(`${name} reactivated.`)).toBeVisible();
  await expect(page.getByText("Active -- dispatched when ready")).toBeVisible();
});

test("AC6: a blank licence expiry stops the form with Required.; a past expiry saves and shows the warning on his record", async ({
  page,
}) => {
  await page.goto("/ops/contractors/new");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });

  const name = `E2E Expiry Case ${uniqueTag("ac6")}`;
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Phone", { exact: true }).fill("0412 000 222");
  await page.getByLabel("Email", { exact: true }).fill(uniqueEmail("ac6"));
  await page.getByLabel("Trade", { exact: true }).selectOption("Plumbing");
  await page.getByLabel("Call-out rate").fill("200.00");
  await page.getByLabel("Standard rate").fill("150.00");
  await page.getByLabel("Licence number").fill("PL-0001");
  // Licence expiry left blank on purpose.
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Required.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  await expect(page).toHaveURL(/\/ops\/contractors\/new$/);

  // What the server stores and what it says is missing: tests/contractors.test.ts AC6.
  await page.getByLabel("Licence expiry").fill("2020-01-01");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/ops\/contractors$/, { timeout: 10_000 });
  await page.getByRole("link").filter({ hasText: name }).click();
  await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Already expired -- this trade cannot be dispatched until renewed.")).toBeVisible();
});

test("6003 AC1: GST registered offers Not asked yet, Yes and No; not asked is a missing item on the list and the record; once answered it is gone for good", async ({
  page,
}) => {
  await page.goto("/ops/contractors/new");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });

  // The blank add form starts on Not asked yet, with all three answers on offer.
  const gst = page.getByLabel("GST registered");
  await expect(gst).toHaveValue("");
  await expect(gst.locator("option")).toHaveText(["Not asked yet", "Yes", "No"]);

  const name = `E2E Gst Case ${uniqueTag("gst")}`;
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Phone", { exact: true }).fill("0412 000 555");
  await page.getByLabel("Email", { exact: true }).fill(uniqueEmail("gst"));
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/ops\/contractors$/, { timeout: 10_000 });

  // Not asked counts as missing: on the list row ...
  const row = page.getByRole("link").filter({ hasText: name });
  await expect(row).toContainText("GST registration (not asked)");
  await row.click();
  await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });
  // ... and in the record's Not ready banner.
  await expect(page.getByRole("listitem").filter({ hasText: "GST registration (not asked)" })).toBeVisible();
  await expect(page.getByLabel("GST registered")).toHaveValue("");

  // Mike records a Yes. The banner no longer names GST, and Not asked yet is no longer on offer.
  await page.getByLabel("GST registered").selectOption("yes");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/ops\/contractors$/, { timeout: 10_000 });
  await expect(page.getByRole("link").filter({ hasText: name })).not.toContainText("GST registration (not asked)");
  await page.getByRole("link").filter({ hasText: name }).click();
  await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel("GST registered")).toHaveValue("yes");
  await expect(page.getByLabel("GST registered").locator("option")).toHaveText(["Yes", "No"]);
  await expect(page.getByRole("listitem").filter({ hasText: "GST registration (not asked)" })).toHaveCount(0);
});

test.describe(() => {
  test.use(MOBILE_VIEWPORT);

  test("AC14: at 390px the list, the form and the deactivate confirm dialog hold the responsive floor", async ({
    page,
  }) => {
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
});
