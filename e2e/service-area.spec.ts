// Feature 2002, service area builder -- frontend e2e (ADR 0001, Playwright).
//
// AC1  the tab strip (Details, Service area) on an existing contractor;
//      /new shows Details only; an empty area shows the empty pin, 30km
//      slider default and pick-first banner, no chips
// AC3  Mike picks a suburb, crosses one postcode off, saves: the toast, the
//      redirect to the list, the row's new postcode count
// AC4  reopening shows the crossed-off postcode still crossed and the rest
//      kept; widening the radius brings a new postcode in kept
// AC5  (V4, feel-pass 07/09/26 -- decision 7's carryover group removed at
//      the owner's word) moving the pin resets the radius to 30km and
//      starts the postcode list over; nothing from the old pin survives
// AC6  refused, nothing written: no pin; nothing kept
// AC7  Bob's own door (/contractor/service-area): sees and saves his own
//      area; Priya sees her own (empty) area, never Bob's; Bob at the ops
//      URL gets the wrong-door card
// AC8  with Places unavailable: a saved pin (Bob) still works and Save
//      succeeds; an empty area (Priya) shows the pick-first banner and Save
//      is refused
// AC10 the 390px responsive floor
//
// Runs against the seeded dev database (real Suburb reference data, ADR
// 0003) -- same constraint as contractors.spec.ts. AC3-AC6 use a FRESH
// throwaway contractor (deactivated at the end, same litter convention as
// contractors.spec.ts's AC2/AC6/AC11) rather than Dave, so Priya alone
// stays the permanent "never saved a service area" fixture AC1/AC7/AC8 read.
import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/login";

function uniqueTag(tag: string): string {
  return `${tag}-${Date.now().toString()}`;
}
function uniqueEmail(tag: string): string {
  return `e2e-${uniqueTag(tag)}@idelta.com.au`;
}

async function addThrowawayContractor(page: Page, tag: string): Promise<{ name: string }> {
  await page.goto("/ops/contractors/new");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible({ timeout: 10_000 });
  const name = `E2E Service Area ${uniqueTag(tag)}`;
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Phone", { exact: true }).fill("0412 000 555");
  await page.getByLabel("Email", { exact: true }).fill(uniqueEmail(tag));
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/ops\/contractors$/, { timeout: 10_000 });
  return { name };
}

/** Waits for the in-range fetch to land -- every step that changes pin or
 * radius races this same request, and the chip list is only trustworthy
 * once it has resolved. */
function waitForInRange(page: Page) {
  return page.waitForResponse((res) => res.url().includes("/api/suburbs/in-range"));
}

async function openServiceAreaTab(page: Page, name: string, opts: { hasPin?: boolean } = {}) {
  await page.getByRole("link").filter({ hasText: name }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 10_000 });
  const wait = opts.hasPin === false ? Promise.resolve() : waitForInRange(page);
  await page.getByRole("tab", { name: "Service area" }).click();
  await expect(page.getByRole("heading", { name: "Core location" })).toBeVisible({ timeout: 10_000 });
  await wait;
}

async function pickSuburb(page: Page, typed: string, matchName: RegExp) {
  const field = page.getByLabel("Suburb");
  await expect(field).toBeEnabled({ timeout: 10_000 });
  await field.fill(typed);
  await expect(page.getByText("Google suggestions")).toBeVisible({ timeout: 20_000 });
  const wait = waitForInRange(page);
  await page.getByRole("button", { name: matchName }).first().click();
  await expect(field).toHaveValue(matchName);
  await wait;
}

async function deactivateOpenContractor(page: Page) {
  await page.getByRole("tab", { name: "Details" }).click();
  await page.getByRole("switch", { name: "Contractor status" }).click();
  await page.getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByText(/Their session is gone/)).toBeVisible();
}

test("AC1: the tab strip on an existing contractor; /new carries Details only", async ({ page }) => {
  await page.goto("/ops/contractors/CON-014");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: /CON-014/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("tab", { name: "Details" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Service area" })).toBeVisible();

  await page.goto("/ops/contractors/new");
  await expect(page.getByRole("heading", { name: "New contractor" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("tab")).toHaveCount(0);
});

test("AC1: an empty area shows the empty pin, 30km default and pick-first banner, no chips", async ({ page }) => {
  await page.goto("/ops/contractors/CON-030"); // Priya -- never saved a service area
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: /CON-030/ })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("tab", { name: "Service area" }).click();
  await expect(page.getByRole("heading", { name: "Core location" })).toBeVisible({ timeout: 10_000 });

  await expect(page.getByLabel("Suburb")).toHaveValue("");
  await expect(page.getByRole("slider", { name: "Radius in kilometres" })).toHaveValue("30");
  await expect(page.getByText("Pick the suburb first.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^\d{4} -/ })).toHaveCount(0);
});

test.describe.serial("AC3-AC6 (desktop only, real Places): the pin/radius/postcode lifecycle on a throwaway contractor", () => {
  test("AC3 + AC4 + AC5 + AC6: pick, cross off, save, reopen, widen, move the pin resets, refuse", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one real-network suite is enough; avoid tripling Google API calls");

    const { name } = await addThrowawayContractor(page, "ac3");
    await openServiceAreaTab(page, name, { hasPin: false });

    // AC6: no pin, refused.
    await page.getByRole("button", { name: "Save service area" }).click();
    await expect(page.getByText("Pick the suburb the area is built around.")).toBeVisible();
    await expect(page.getByText(/service area needs a core location/)).toBeVisible();

    // AC3: pick Fremantle, keep 30km, cross off one real postcode, save.
    await pickSuburb(page, "Fremantle WA", /Fremantle WA/);
    const fremantleChip = page.getByRole("button", { name: /^6162 -/ });
    await expect(fremantleChip).toBeVisible({ timeout: 10_000 });
    await fremantleChip.click(); // cross 6162 off
    await expect(fremantleChip).toHaveAttribute("aria-pressed", "false");

    await page.getByRole("button", { name: "Save service area" }).click();
    await expect(page).toHaveURL(/\/ops\/contractors$/, { timeout: 10_000 });
    await expect(page.getByText(`${name}'s service area saved`)).toBeVisible();
    await expect(page.getByRole("link").filter({ hasText: name }).getByText(/postcodes from Fremantle/)).toBeVisible();

    // AC4: reopening derives 6162 as crossed off (no chip is ever stored
    // crossed) -- it must not appear among the kept (success-styled) chips.
    await openServiceAreaTab(page, name);
    const reopenedChip = page.getByRole("button", { name: /^6162 -/ });
    await expect(reopenedChip).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: /^6160 -/ })).toHaveAttribute("aria-pressed", "true");

    // Widen to 40km -- real Suburb data, so the exact postcodes that newly
    // qualify are not pinned by name; only that MORE arrive, all kept by
    // default (nothing was crossed off there before they even existed).
    const chipCount = page.getByRole("button", { name: /^\d{4} -/ });
    const countAt30 = await chipCount.count();
    const slider = page.getByRole("slider", { name: "Radius in kilometres" });
    await slider.focus();
    const widenWait = waitForInRange(page);
    await slider.press("ArrowRight"); // 30 -> 35
    await slider.press("ArrowRight"); // 35 -> 40 -- the release-equivalent commit fires here
    await expect(slider).toHaveValue("40");
    await widenWait;
    await expect(async () => {
      expect(await chipCount.count()).toBeGreaterThan(countAt30);
    }).toPass({ timeout: 10_000 });
    const newlyArrived = chipCount.last();
    await expect(newlyArrived).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Save service area" }).click();
    await expect(page).toHaveURL(/\/ops\/contractors$/, { timeout: 10_000 });

    // AC5 (V4): moving the pin resets the radius to 30km and starts the
    // postcode list over -- nothing from the Fremantle-area 40km set
    // survives, whatever Joondalup's own 30km reach turns up arrives kept.
    await openServiceAreaTab(page, name);
    await pickSuburb(page, "Joondalup WA", /Joondalup WA/);
    await expect(slider).toHaveValue("30");
    await expect(page.getByText("Kept last time, now outside the radius")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^6160 -/ })).toHaveCount(0); // Fremantle itself is long gone
    const joondalupChips = page.getByRole("button", { name: /^\d{4} -/, pressed: true });
    await expect(joondalupChips.first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Save service area" }).click();
    await expect(page).toHaveURL(/\/ops\/contractors$/, { timeout: 10_000 });

    // AC6: every chip crossed off ("Untick all") is refused, nothing written.
    await openServiceAreaTab(page, name);
    await expect(page.getByRole("button", { name: /^\d{4} -/, pressed: true }).first()).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "Untick all" }).click();
    await expect(page.getByRole("button", { name: /^\d{4} -/, pressed: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Save service area" }).click();
    await expect(page.getByText(/Keep at least one postcode/)).toBeVisible();

    await deactivateOpenContractor(page);
  });
});

test("AC7: Bob sees and saves his own area; Priya sees her own (empty) area, never Bob's; Bob gets the wrong door at the ops URL", async ({
  page,
}) => {
  await page.goto("/contractor/service-area");
  await login(page, "bob@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Your service area" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel("Suburb")).toHaveValue(/Fremantle/);
  const keptChip = page.getByRole("button", { name: /^6163 -/ });
  await expect(keptChip).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });
  await keptChip.click();
  await page.getByRole("button", { name: "Save service area" }).click();
  await expect(page.getByText(/Service area saved -- \d+ postcodes from Fremantle/)).toBeVisible({ timeout: 10_000 });
  // Leave as found: put 6163 back and save again.
  await keptChip.click();
  await page.getByRole("button", { name: "Save service area" }).click();
  await expect(page.getByText(/Service area saved/)).toBeVisible({ timeout: 10_000 });

  await page.goto("/ops/contractors/CON-014/service-area");
  await expect(page.getByRole("heading", { name: "Wrong portal" })).toBeVisible({ timeout: 10_000 });

  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 10_000 });

  await page.goto("/contractor/service-area");
  await login(page, "priya@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Your service area" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel("Suburb")).toHaveValue("");
  await expect(page.getByText("Pick the suburb first.")).toBeVisible();
});

test("AC8: Places unavailable -- Bob's saved pin still works and Save succeeds; Priya's empty area refuses Save", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "the unavailable branch needs no repeating per viewport");

  await page.route("https://maps.googleapis.com/**", (route) => route.abort());

  await page.goto("/contractor/service-area");
  await login(page, "bob@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Your service area" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel("Suburb")).toBeDisabled({ timeout: 10_000 });
  await expect(page.getByText("Suburb lookup is unavailable right now -- try again shortly.")).toBeVisible();
  await expect(page.getByLabel("Suburb")).toHaveValue(/Fremantle/);
  await expect(page.getByRole("button", { name: /^6163 -/ })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Save service area" }).click();
  await expect(page.getByText(/Service area saved/)).toBeVisible({ timeout: 10_000 });

  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 10_000 });

  await page.goto("/contractor/service-area");
  await login(page, "priya@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Your service area" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Pick the suburb first.")).toBeVisible();
  await page.getByRole("button", { name: "Save service area" }).click();
  await expect(page.getByText(/service area needs a core location/)).toBeVisible();
});

test("AC10: at 390px Bob's page holds the floor -- pin, slider, chips, both text actions, Save and Cancel reachable, no horizontal scroll", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "this AC is specifically about the phone viewport");

  await page.goto("/contractor/service-area");
  await login(page, "bob@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Your service area" })).toBeVisible({ timeout: 10_000 });

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  await expect(page.getByLabel("Suburb")).toBeVisible();
  await expect(page.getByRole("slider", { name: "Radius in kilometres" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^6163 -/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Tick all", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Untick all" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo changes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save service area" })).toBeVisible();
});
