// Feature 1006, admin settings screen -- frontend e2e (ADR 0001, Playwright).
//
// Feature 9002 moved every server rule this file used to re-prove to
// tests/settings.test.ts in the backend: the owner-only doors for Mike and Bob
// (AC2, 403), the seeded values (AC2), a saved plain field (AC3), the ABN gate
// (AC4), the GST audit pair (AC5) and the Business inbox (AC6). The one
// wrong-door test left here is Mike's; Bob's wrong-door card is auth.spec.ts.
//
// What stays here:
// AC1/AC2 the OWNER nav group shows for the owner and not for Mike
// AC4  the ABN gate, mirrored client-side: no ABN, no network call, just the field error
// AC5  with an ABN, the flip passes the confirm dialog and the audit caption appears
// AC7  the 390px responsive floor: the app-bar menu opens with the full nav,
//      every field and Save reachable, no horizontal scrolling
// AC12 the required-field stars
//
// Feature 2006 (contractor agreement) adds, below:
// AC2  the Legal identity card saves the legal entity name and a picked
//      business address, and both come back on reload (the real backend)
// AC3  pick a PDF, a label, Publish: the version lists as Current, with an
//      Open PDF that opens the file in a new tab (the backend's answers
//      faked -- helpers/mock-agreement.ts)
// AC4  a refusal shows as the file's or the label's own error; the
//      legal-identity one as an error Banner at the top of the card
// AC5  the dialog states how many active contractors it will stop
//
// Also carries one test with no AC number, added by
// project/setup/frontend-test-harness.md Part 2: the app-bar menu's own
// nav content and order, for Mike, at 390px -- not a feature AC, but the
// one thing Part 1's cut to desktop-only would otherwise have dropped.
//
// Runs against the seeded dev database, not a throwaway one (same
// constraint as auth.spec.ts). PlatformSettings is a SINGLETON row -- the
// writer test below restores it via its own afterEach (not its own last
// step -- project/setup/frontend-test-harness.md: a test that dies partway
// through a multi-field edit otherwise leaves the row corrupted for every
// later test, in this file and in brand-identity.spec.ts, which is exactly
// the bug that shape caused there), inside withPlatformSettingsLock
// (helpers/singleton-lock.ts) because brand-identity.spec.ts's AC6 writes
// the very same row.
import { test, expect, type Page } from "@playwright/test";
import { login, ensureLoggedInAs } from "./helpers/login";
import { MOBILE_VIEWPORT } from "../playwright.config";
import { withPlatformSettingsLock } from "./helpers/singleton-lock";
import { installMockGooglePlaces } from "./helpers/mock-google-places";
import { installMockFileHost, installMockOwnerAgreements } from "./helpers/mock-agreement";

async function logout(page: Page) {
  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole("button", { name: "Log out" }).click();
  // Log out's own client-side refresh swaps the portal for the login gate
  // in place (no URL change) -- wait for that landmark before navigating
  // again, or the next goto races it (contractors.spec.ts's own precedent).
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 10_000 });
}

test("AC2: Mike (ops) gets the wrong-door card at /ops/settings", async ({ page }) => {
  await page.goto("/ops/settings");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Wrong portal" })).toBeVisible();
});

test("AC2: Mike's ops-portal nav shows no OWNER group -- Settings is owner-only", async ({ page }) => {
  await page.goto("/ops");
  await login(page, "mike@idelta.com.au");
  // Since feature 4001 the ops root lands on the job queue.
  await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible({ timeout: 15_000 });

  await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Pricing" })).toHaveCount(0);
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
    // Since feature 4001 the ops root lands on the job queue.
    await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("navigation", { name: "Menu" });
    await expect(menu.getByText("Owner", { exact: true })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Settings" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Pricing" })).toHaveCount(0);
    // Same order as the sidebar's own list (frontend/src/lib/ops-nav.ts) --
    // Jobs (feature 4001), Contractors and Receivables (feature 6002) are
    // Mike's built, non-owner entries, so they are the only links the menu carries.
    await expect(menu.getByRole("link")).toHaveText(["Jobs", "Contractors", "Receivables"]);

    await page.getByRole("button", { name: "Close menu" }).click();
  });
});

/** Idempotent: reads the current row before touching anything, and only
 * fixes what actually differs from the seed. GST goes off first, on its
 * own, since flipping it needs its own confirm dialog and going off
 * doesn't depend on the other fields. */
async function restoreSeededSettings(page: Page): Promise<void> {
  await ensureLoggedInAs(page, "/ops/settings", "owner@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 });

  if ((await page.getByRole("switch", { name: "GST registered" }).getAttribute("aria-checked")) === "true") {
    await page.getByRole("switch", { name: "GST registered" }).click();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByRole("heading", { name: "Switch GST off?" })).toBeVisible();
    await page.getByRole("button", { name: "Switch off" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
  }

  const abn = await page.getByLabel("ABN").inputValue();
  const paymentTerms = await page.getByLabel("Payment terms").inputValue();
  const businessInbox = await page.getByLabel("Business inbox").inputValue();
  if (abn !== "" || paymentTerms !== "7" || businessInbox !== "ops@idelta.com.au") {
    await page.getByLabel("ABN").fill("");
    await page.getByLabel("Payment terms").fill("7");
    await page.getByLabel("Business inbox").fill("ops@idelta.com.au");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
  }

  // Feature 2006: the Legal identity card's test writes both fields.
  if ((await page.getByLabel("Legal entity name").inputValue()) !== "Trade Services") {
    await page.getByLabel("Legal entity name").fill("Trade Services");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
  }

  await logout(page);
}

test.describe(() => {
  // Runs whether the test below passes or fails -- see the file header.
  test.afterEach(async ({ page }) => {
    await withPlatformSettingsLock(() => restoreSeededSettings(page));
  });

  test(
    "AC1 + AC4 + AC5: the owner's nav group shows; flipping GST on with no ABN is stopped in the form; with one it goes through the confirm dialog and shows the audit caption",
    async ({ page }) => {
      await withPlatformSettingsLock(async () => {
        await page.goto("/ops/settings");
        await login(page, "owner@idelta.com.au");

        // AC1 -- the OWNER nav group shows. (The values on the screen, the saved
        // payment terms and the saved Business inbox are proven at the backend,
        // tests/settings.test.ts AC2, AC3 and AC6.)
        await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
        await expect(page.getByText("Owner", { exact: true })).toBeVisible();
        await expect(page.getByLabel("Legal entity name")).toBeVisible();

        // AC4 -- flipping GST on with no ABN is blocked client-side, no network round trip.
        await page.getByLabel("ABN").fill("");
        await page.getByRole("switch", { name: "GST registered" }).click();
        await page.getByRole("button", { name: "Save settings" }).click();
        await expect(page.getByText(/Enter the ABN first/)).toBeVisible();

        // AC5 -- with an ABN, the flip passes the confirm dialog and shows the audit caption.
        await page.getByLabel("ABN").fill("51 824 753 556");
        await page.getByRole("button", { name: "Save settings" }).click();
        await expect(page.getByRole("heading", { name: "Switch GST on?" })).toBeVisible();
        await page.getByRole("button", { name: "Switch on" }).click();
        await expect(page.getByText(/Changed \d{2}\/\d{2}\/\d{2} by The owner/)).toBeVisible();
      });
    },
  );
  test("2006 AC2: the Legal identity card saves the legal name and a picked address; both come back on reload", async ({
    page,
  }) => {
    // Always the stand-in, not only in CI: this test is about the settings card, and a settings save must not depend on Google being up.
    await installMockGooglePlaces(page);
    await withPlatformSettingsLock(async () => {
      await page.goto("/ops/settings");
      await login(page, "owner@idelta.com.au");
      await expect(page.getByRole("heading", { name: "Legal identity" })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("Printed on contracts and invoices")).toBeVisible();

      await page.getByLabel("Legal entity name").fill("Trade Services Pty Ltd");
      const address = page.getByLabel("Business address");
      await expect(address).toBeEnabled({ timeout: 10_000 });
      // The page is server-rendered: type again until hydration has caught up and the list answers.
      await expect(async () => {
        await address.fill("");
        await address.fill("14 Marine Terrace, Fremantle WA 6160");
        await expect(page.getByText("Google suggestions")).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 20_000 });
      await page.getByRole("button", { name: /Marine Terrace.*Fremantle.*WA/ }).click();
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByText("Saved.")).toBeVisible({ timeout: 10_000 });

      await page.reload();
      await expect(page.getByLabel("Legal entity name")).toHaveValue("Trade Services Pty Ltd");
      await expect(page.getByLabel("Business address")).toHaveValue(/Marine Terrace.*Fremantle/);
    });
  });
});

// ---------------------------------------------------------------------------
// Feature 2006 -- publishing the contractor agreement (the backend's answers faked)
// ---------------------------------------------------------------------------

const PDF_BYTES = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");

test("2006 AC3 + AC4 + AC5: pick a PDF and a label, see the count, meet each refusal at its own field, publish, list it Current, open it", async ({
  page,
}) => {
  await installMockFileHost(page.context());
  const mock = await installMockOwnerAgreements(page, { activeContractors: 3 });
  await page.goto("/ops/settings");
  await login(page, "owner@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Contractor agreement" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("No agreement published yet.")).toBeVisible();
  await expect(page.getByText("No file chosen")).toBeVisible();

  // Nothing chosen: each field's own "Required.", no dialog.
  await page.getByRole("button", { name: "Publish version" }).click();
  await expect(page.getByText("Required.")).toHaveCount(2);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await page.getByLabel("Agreement file").setInputFiles({ name: "contractor-agreement.pdf", mimeType: "application/pdf", buffer: PDF_BYTES });
  await expect(page.getByText("contractor-agreement.pdf")).toBeVisible();
  await page.getByLabel("Version label").fill("1");

  // AC5: the dialog says how many active contractors it will stop.
  await page.getByRole("button", { name: "Publish version" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("heading", { name: "Publish version 1?" })).toBeVisible();
  await expect(dialog).toContainText("Every active contractor (3) must accept it before new jobs can be sent to them.");
  await expect(dialog).toContainText("Jobs already booked go ahead.");

  // AC4: the legal-identity refusal is an error Banner on the card.
  mock.nextRefusal = { status: 409, error: "Fill in the legal name, ABN and address in Settings first", field: "legalIdentity" };
  await dialog.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Fill in the legal name, ABN and address in Settings first")).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  // AC4: a refusal about the file is the File field's error.
  await page.getByRole("button", { name: "Publish version" }).click();
  mock.nextRefusal = { status: 400, error: "That isn't a PDF - choose a PDF file.", field: "file" };
  await page.getByRole("alertdialog").getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("That isn't a PDF - choose a PDF file.")).toBeVisible();

  // AC4: a refusal about the label is the label's error.
  await page.getByRole("button", { name: "Publish version" }).click();
  mock.nextRefusal = { status: 409, error: "That version label is already used.", field: "version" };
  await page.getByRole("alertdialog").getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("That version label is already used.")).toBeVisible();

  // AC3: published; listed as Current with an Open PDF.
  await page.getByRole("button", { name: "Publish version" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Version 1 published.")).toBeVisible();
  expect(mock.publishes.at(-1)).toMatchObject({ label: "1", contentType: "application/pdf" });
  expect(mock.publishes.at(-1)?.bytes).toBe(PDF_BYTES.length);
  const row = page.getByRole("row").filter({ hasText: "The owner" });
  await expect(row).toContainText("Current");
  await expect(page.getByText("No agreement published yet.")).toHaveCount(0);

  const [popup] = await Promise.all([page.waitForEvent("popup"), row.getByRole("button", { name: "Open PDF" }).click()]);
  await popup.waitForURL(/files\.test\/agreements\/mock-1\.pdf/);
  expect(mock.opened).toContain("mock-1");
  await popup.close();

  await logout(page);
});

test.describe(() => {
  test.use(MOBILE_VIEWPORT);

  test("2006 AC3: at phone width the versions are Record cards and nothing scrolls sideways", async ({ page }) => {
    await installMockOwnerAgreements(page, {
      versions: [
        { id: "mock-2", version: "2", issuedAt: "2026-09-09T04:00:00.000Z", issuedBy: "The owner", current: true },
        { id: "mock-1", version: "1", issuedAt: "2026-09-01T04:00:00.000Z", issuedBy: "The owner", current: false },
      ],
    });
    await page.goto("/ops/settings");
    await login(page, "owner@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Contractor agreement" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Version 2", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Current").filter({ visible: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Open PDF" })).toHaveCount(2);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    await logout(page);
  });
});
