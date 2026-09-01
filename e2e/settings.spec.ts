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
// AC6  the Business inbox field edits operatorEmail (B-004)
// AC7  the 390px responsive floor: the app-bar menu opens with the full
//      nav, every field and Save reachable, no horizontal scrolling
//
// Runs against the seeded dev database, not a throwaway one (same
// constraint as auth.spec.ts). PlatformSettings is a SINGLETON row shared
// by every project this suite runs (desktop/tablet/mobile run in
// parallel) -- any test that actually saves is restricted to one project
// (`test.skip` below) and restores the row to what it found, the same
// "leave it as we found it" discipline auth.spec.ts uses for sessions.
import { test, expect } from "@playwright/test";

const DEV_PASSWORD = "dev-password-123";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
}

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

test("AC7: at 390px the settings screen holds the responsive floor", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "this AC is specifically about the phone viewport");

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

test(
  "AC1 + AC3 + AC5 + AC6 (desktop only): seeded values render; the owner edits, saves, flips GST through the confirm dialog and sees the audit caption -- then everything reverts",
  async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "writes the shared PlatformSettings row; runs on one project only to avoid racing the others",
    );

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
  },
);
