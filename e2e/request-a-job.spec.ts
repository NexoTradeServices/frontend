// Feature 3001, enquiry form to job created -- frontend e2e (ADR 0001).
//
// AC1  Karl (never contacted before) picks Joondalup, a trade, a weekday
//      morning and a note, and submits -- lands on /request-a-job/confirmed
//      with a JOB- reference
// AC2  a weekend date shows the weekend rate; a weekday shows normal --
//      the two never disagree with each other on the page
// AC3  a repeat enquiry (a known email) completes the same flow
// AC4  the confirmation page reads "we'll call you shortly" and carries no
//      "Set a password" offer
// AC8  every required field carries a star (change.md V3 -- this form
//      moved off the "every field required, no stars" case once real
//      optional fields existed); the word "(optional)" is never used
// AC10 no picker, no "emergency" option, anywhere on the form
// AC11 a trade's own questions render as labelled text answers under
//      "Additional questions" on the Notes step ("Tell us what's wrong"),
//      optional, never their own step; a trade with none shows that same
//      step with no "Additional questions" section at all
//
// This suite runs against the seeded DEV database (not throwaway, same
// constraint as pricing.spec.ts) -- it reads the live ServiceType catalog
// rather than hardcoding rates, so it stays true whatever the owner has
// since typed on /ops/pricing. Every enquiry it submits is a genuine,
// permanent Customer + Job row (nothing here is ever deleted, only
// deactivated) -- each test uses its own throwaway email so it never
// collides with the cast.
//
// Plumbing is deliberately avoided as this suite's own trade: pricing.spec.ts
// and reorderable-rows.spec.ts use it as their shared writer row (edited and
// restored by their own afterEach), so reading it here while the full suite
// runs in parallel can observe a transient prefilledFields state that never
// matches the `formData` snapshot this file read moments earlier.
import { test, expect, type Page } from "@playwright/test";
import { MOCKS_GOOGLE_PLACES, installMockGooglePlaces } from "./helpers/mock-google-places";

interface ServiceTypeDto {
  trade: string;
  customerCalloutRate: number;
  customerStandardRate: number;
  serviceLevelMultipliers: { normal: number; weekend: number };
  prefilledFields: string[];
}
interface FormDataDto {
  operatorPhone: string;
  serviceTypes: ServiceTypeDto[];
}

function formatDollars(cents: number): string {
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2)}`;
}

function uniqueEmail(tag: string): string {
  return `e2e-3001-${tag}-${Date.now()}@idelta.com.au`;
}

/** Any trade but Plumbing -- see the file header on why. */
function nonPlumbing(serviceTypes: ServiceTypeDto[]): ServiceTypeDto {
  const found = serviceTypes.find((t) => t.trade !== "Plumbing");
  if (!found) throw new Error("the live catalog has no non-Plumbing trade to test with");
  return found;
}

/** True if the label/span whose own text exactly matches `text` carries the star (::after content), AC8. */
async function hasRequiredStar(page: Page, text: string): Promise<boolean> {
  return page.evaluate((needle: string) => {
    const candidates = Array.from(document.querySelectorAll("label, span"));
    const el = candidates.find((node) => node.textContent?.trim() === needle);
    if (!el) return false;
    return window.getComputedStyle(el, "::after").content.includes("*");
  }, text);
}

async function pickJoondalup(page: Page) {
  const field = page.getByLabel("Suburb");
  await expect(field).toBeEnabled({ timeout: 10_000 });
  await field.fill("Joondalup");
  await expect(page.getByText("Google suggestions")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Joondalup/ }).first().click();
  // The plain typed text "Joondalup" also matches a loose /Joondalup/
  // check, so a real pick (the suggestion's own async fetchFields()
  // round-trip) can still be in flight when that passes -- wait for the
  // POST-PICK shape specifically ("Joondalup WA ...", never just the
  // typed text) so Continue is never clicked while `location` is still
  // null underneath.
  await expect(field).toHaveValue(/Joondalup WA/, { timeout: 20_000 });
}

/** Suburb step already done. Picks `trade` and lands on the schedule step. */
async function pickTrade(page: Page, trade: string) {
  await page.getByRole("button", { name: trade, exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
}

test.describe("Feature 3001 -- enquiry form to job created", () => {
  let formData: FormDataDto;

  test.beforeAll(async ({ request }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";
    const res = await request.get(`${apiUrl}/api/enquiries/form-data`);
    formData = (await res.json()) as FormDataDto;
  });

  test.beforeEach(async ({ page }) => {
    if (MOCKS_GOOGLE_PLACES) await installMockGooglePlaces(page);
  });

  test("AC1/AC8/AC10: the golden path -- Joondalup, a weekday note, submits to a JOB- confirmation", async ({ page }) => {
    const trade = nonPlumbing(formData.serviceTypes);

    await page.goto("/request-a-job");
    // AC8: required fields carry a star; the word "(optional)" is never used.
    expect(await hasRequiredStar(page, "Suburb")).toBe(true);
    await expect(page.getByText("(optional)")).toHaveCount(0);
    await expect(page.getByText("All fields are required.")).toHaveCount(0);

    await pickJoondalup(page);
    await page.getByRole("button", { name: "Continue" }).click();

    expect(await hasRequiredStar(page, "Trade")).toBe(true);
    await pickTrade(page, trade.trade);

    // A fixed weekday, well clear of any weekend.
    await page.getByLabel("Date").fill("2026-09-09");
    await expect(page.getByText("Morning", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // AC10: emergency is never offered anywhere on this form.
    await expect(page.getByText("Emergency", { exact: true })).toHaveCount(0);

    // AC11: the trade's own questions (if any) are optional -- the golden
    // path leaves them blank and still submits on the general description.
    expect(await hasRequiredStar(page, "What's happening")).toBe(true);
    await page.getByLabel("What's happening").fill("Kitchen tap won't stop dripping, started yesterday.");
    await page.getByRole("button", { name: "Continue" }).click();

    expect(await hasRequiredStar(page, "Your name")).toBe(true);
    await page.getByLabel("Your name").fill("Karl");
    await page.getByLabel("Email", { exact: true }).fill(uniqueEmail("ac1"));
    await page.getByLabel("Phone").fill("0400 000 111");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();
    await expect(page.getByText("Standard Rate")).toBeVisible();
    await expect(page.getByText(formatDollars(trade.customerCalloutRate), { exact: true })).toBeVisible();
    await expect(page.getByText(`then ${formatDollars(trade.customerStandardRate)} per additional hour`)).toBeVisible();

    await page.getByRole("button", { name: "Request a job" }).click();
    await expect(page).toHaveURL(/\/request-a-job\/confirmed\?ref=JOB-/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "We've got it." })).toBeVisible();
    await expect(page.getByText("We'll call you shortly to confirm a time.")).toBeVisible();
    await expect(page.getByText(/^JOB-\d+$/)).toBeVisible();
    // AC4: no "Set a password" offer -- that ships with 3004.
    await expect(page.getByText(/password/i)).toHaveCount(0);
  });

  test("AC2: a Saturday date shows the weekend rate, a weekday shows normal", async ({ page }) => {
    const trade = nonPlumbing(formData.serviceTypes);

    await page.goto("/request-a-job");
    await pickJoondalup(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await pickTrade(page, trade.trade);

    // 2026-09-12 is a Saturday. The estimate only ever renders on the
    // later Price step (AC10), not here on Schedule.
    await page.getByLabel("Date").fill("2026-09-12");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("What's happening").fill("Weekend leak.");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Your name").fill("Karl");
    await page.getByLabel("Email", { exact: true }).fill(uniqueEmail("ac2"));
    await page.getByLabel("Phone").fill("0400 000 112");
    await page.getByRole("button", { name: "Continue" }).click();

    const weekendCallout = Math.round(trade.customerCalloutRate * trade.serviceLevelMultipliers.weekend);
    const weekendStandard = Math.round(trade.customerStandardRate * trade.serviceLevelMultipliers.weekend);
    await expect(page.getByText("Weekend rate")).toBeVisible();
    await expect(page.getByText(formatDollars(weekendCallout), { exact: true })).toBeVisible();
    await expect(page.getByText(`then ${formatDollars(weekendStandard)} per additional hour`)).toBeVisible();
  });

  test("AC3: a repeat enquiry from a known email completes the same flow", async ({ page }) => {
    const trade = nonPlumbing(formData.serviceTypes);

    await page.goto("/request-a-job");
    await pickJoondalup(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await pickTrade(page, trade.trade);
    await page.getByRole("button", { name: "Continue" }).click(); // schedule (defaults are fine)
    await page.getByLabel("What's happening").fill("Sarah again.");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Your name").fill("Sarah Chen");
    await page.getByLabel("Email", { exact: true }).fill("sarah@idelta.com.au"); // the cast's own known email
    await page.getByLabel("Phone").fill("0400 001 050");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Request a job" }).click();
    await expect(page).toHaveURL(/\/request-a-job\/confirmed\?ref=JOB-/, { timeout: 20_000 });
  });

  test("AC11: a trade's own questions render as labelled text answers under Additional questions; a trade with none shows no such section", async ({ page }) => {
    const withOptions = formData.serviceTypes.find((t) => t.trade !== "Plumbing" && t.prefilledFields.length > 0);
    const withoutOptions = formData.serviceTypes.find((t) => t.trade !== "Plumbing" && t.prefilledFields.length === 0);
    test.skip(!withOptions || !withoutOptions, "the live catalog needs one non-Plumbing trade with options and one without");
    if (!withOptions || !withoutOptions) return;

    await page.goto("/request-a-job");
    await pickJoondalup(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await pickTrade(page, withOptions.trade);
    await page.getByRole("button", { name: "Continue" }).click(); // schedule
    await expect(page.getByRole("heading", { name: "Tell us what's wrong" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Additional questions" })).toBeVisible();
    const firstQuestion = withOptions.prefilledFields[0]!;
    await expect(page.getByLabel(firstQuestion)).toBeVisible();
    // AC8: these are optional -- no star, unlike the required fields above.
    expect(await hasRequiredStar(page, firstQuestion)).toBe(false);

    await page.goto("/request-a-job");
    await pickJoondalup(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await pickTrade(page, withoutOptions.trade);
    await page.getByRole("button", { name: "Continue" }).click(); // schedule
    await expect(page.getByRole("heading", { name: "Tell us what's wrong" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Additional questions" })).toHaveCount(0);
  });
});
