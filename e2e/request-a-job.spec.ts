// Feature 3001, enquiry form to job created -- frontend e2e (ADR 0001).
//
// AC1  Karl (never contacted before) picks Joondalup, a trade, a weekday
//      morning and a note, and submits -- lands on /request-a-job/confirmed
//      with a JOB- reference
// AC2  a weekend date shows the weekend rate; a weekday shows normal --
//      the two never disagree with each other on the page
// (AC3, a repeat enquiry from a known email, is proven at the backend --
//      tests/enquiries.test.ts AC3 -- and no longer here, where it wrote a job
//      onto the cast's Sarah.)
// AC4  the confirmation page reads "we'll call you shortly" and carries no
//      "Set a password" offer
// AC8  every required field carries a star (change.md V3 -- this form
//      moved off the "every field required, no stars" case once real
//      optional fields existed); the word "(optional)" is never used
// AC10 no picker, no "emergency" option, anywhere on the form
// 3003 (enquiry photos) lives in its own describe at the foot of this file:
//      AC5 AC5b AC6 AC7 AC8 AC9 AC10, at phone width, Cloudinary faked
// 1017 AC1  the details step shows Business name under Phone, no star, the hint
//      "Only if this job is for a business"; the enquiry goes through empty
// 1017 AC5  the evening window's note reads 17:00 - 19:00
//      (the business name reaching the customer record is proven at the
//      backend, tests/enquiries.test.ts 1017 AC2)
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
import { installMockCloudinary } from "./helpers/mock-cloudinary";
import { MOBILE_VIEWPORT } from "../playwright.config";

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
    // 1017 AC5: the evening window ends at 19:00.
    await expect(page.getByText("17:00 - 19:00", { exact: true })).toBeVisible();
    await expect(page.getByText("17:00 - 20:00")).toHaveCount(0);
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
    // 1017 AC1: Business name sits under Phone, unstarred, with its hint, and is left empty here.
    const businessName = page.getByLabel("Business name");
    await expect(businessName).toBeVisible();
    await expect(businessName).toHaveValue("");
    expect(await hasRequiredStar(page, "Business name")).toBe(false);
    await expect(page.getByText("Only if this job is for a business", { exact: true })).toBeVisible();
    const phoneBox = await page.getByLabel("Phone").boundingBox();
    const businessBox = await businessName.boundingBox();
    expect(businessBox?.y ?? 0).toBeGreaterThan(phoneBox?.y ?? Number.MAX_SAFE_INTEGER);
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

// ---------------------------------------------------------------------------
// Feature 3003 -- enquiry photos
//
// Phone width: the form is designed Mobile first. Cloudinary is faked
// (helpers/mock-cloudinary.ts); the enquiry itself goes to the real dev
// backend, so each test that sends one leaves a genuine, permanent Job row
// behind, under its own throwaway e2e-3003-... email.
// ---------------------------------------------------------------------------
const JPEG = (name: string) => ({ name, mimeType: "image/jpeg", buffer: Buffer.from("not-really-a-jpeg") });
const LONG_NAME = "IMG_2041 leaking mixer tap under the sink.jpg";

test.describe("Feature 3003 -- enquiry photos", () => {
  test.use(MOBILE_VIEWPORT);

  let formData: FormDataDto;

  test.beforeAll(async ({ request }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";
    formData = (await (await request.get(`${apiUrl}/api/enquiries/form-data`)).json()) as FormDataDto;
  });

  test.beforeEach(async ({ page }) => {
    if (MOCKS_GOOGLE_PLACES) await installMockGooglePlaces(page);
  });

  /** Suburb, trade and schedule done; the page is on "Tell us what's wrong". */
  async function reachNotesStep(page: Page) {
    await page.goto("/request-a-job");
    await pickJoondalup(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await pickTrade(page, nonPlumbing(formData.serviceTypes).trade);
    await page.getByLabel("Date").fill("2026-09-09");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByLabel("What's happening")).toBeVisible();
  }

  /** From the notes step to the pricing step, ready to press "Request a job". */
  async function reachPricingStep(page: Page, tag: string) {
    await page.getByLabel("What's happening").fill("Mixer tap leaking from the base.");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Your name").fill("Sarah Chen");
    await page.getByLabel("Email", { exact: true }).fill(uniqueEmail(`3003-${tag}`));
    await page.getByLabel("Phone").fill("0400 001 050");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();
  }

  const cells = (page: Page) => page.getByTestId("photo-cell");

  /**
   * Records each enquiry the form posts. The reCAPTCHA token is dropped on the
   * way: a headless browser is scored as a bot by the live check, and "no
   * token" is the backend's own unreachable-check path -- it lets the request
   * through exactly as a human's, so the enquiry itself stays the real thing.
   */
  async function captureEnquiries(page: Page): Promise<Record<string, unknown>[]> {
    const posted: Record<string, unknown>[] = [];
    await page.route(/\/api\/enquiries$/, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      delete body.recaptchaToken;
      posted.push(body);
      return route.continue({ postData: JSON.stringify(body) });
    });
    return posted;
  }

  test("AC5, AC5b: a picked photo shows uploading, then its thumbnail with its name cut short; the x takes it off and deletes it from Cloudinary", async ({
    page,
  }) => {
    const cloudinary = await installMockCloudinary(page, { uploadDelayMs: 1500 });
    await reachNotesStep(page);
    await expect(page.getByRole("heading", { name: "Photos" })).toBeVisible();

    await page.getByLabel("Add photo").setInputFiles(JPEG(LONG_NAME));
    await expect(cells(page)).toHaveCount(1);
    await expect(cells(page).first()).toHaveAttribute("data-status", "uploading");
    await expect(page.getByRole("status", { name: "Uploading" })).toBeVisible();

    await expect(cells(page).first()).toHaveAttribute("data-status", "done", { timeout: 10_000 });
    await expect(page.getByRole("status", { name: "Uploading" })).toHaveCount(0);
    await expect(cells(page).first().getByRole("img")).toBeVisible();
    // One line, cut short with "..." -- the whole name stays on the title for the curious.
    const caption = cells(page).first().locator("[title]");
    await expect(caption).toHaveText(/^IMG_2041 le\.\.\.$/);
    await expect(caption).toHaveAttribute("title", LONG_NAME);
    await expect(page.getByText("1 of 5 photos")).toBeVisible();

    await page.getByRole("button", { name: `Remove ${LONG_NAME}` }).click();
    await expect(cells(page)).toHaveCount(0);
    await expect(page.getByText("0 of 5 photos")).toBeVisible();
    // The delete went to Cloudinary with the photo's own token.
    await expect.poll(() => cloudinary.deletes.length).toBe(1);
    expect(cloudinary.deletes[0]).toBe(`token-${cloudinary.publicIds[0]}`);
  });

  test("AC5b: a delete Cloudinary refuses still takes the photo off the form, with no message", async ({ page }) => {
    const cloudinary = await installMockCloudinary(page, { failDelete: true });
    await reachNotesStep(page);

    await page.getByLabel("Add photo").setInputFiles(JPEG("tap.jpg"));
    await expect(cells(page).first()).toHaveAttribute("data-status", "done", { timeout: 10_000 });
    await page.getByRole("button", { name: "Remove tap.jpg" }).click();

    await expect(cells(page)).toHaveCount(0);
    await expect.poll(() => cloudinary.deletes.length).toBe(1);
    await expect(page.getByText(/delete|couldn't|failed/i)).toHaveCount(0);
  });

  test("AC6: five photos take the Add tile away and the Caption reads 5 of 5 photos", async ({ page }) => {
    await installMockCloudinary(page);
    await reachNotesStep(page);

    await page
      .getByLabel("Add photo")
      .setInputFiles(["one.jpg", "two.jpg", "three.jpg", "four.jpg", "five.jpg"].map(JPEG));
    await expect(cells(page)).toHaveCount(5);
    await expect(page.getByText("5 of 5 photos")).toBeVisible();
    await expect(page.getByLabel("Add photo")).toHaveCount(0);

    // Taking one off brings the Add tile back.
    await page.getByRole("button", { name: "Remove three.jpg" }).click();
    await expect(page.getByLabel("Add photo")).toHaveCount(1);
    await expect(page.getByText("4 of 5 photos")).toBeVisible();
  });

  test("AC7: a file over 10MB, or one that is not a photo, is refused at the pick and never uploaded", async ({ page }) => {
    const cloudinary = await installMockCloudinary(page);
    await reachNotesStep(page);

    await page.getByLabel("Add photo").setInputFiles({
      name: "huge.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
    });
    await expect(page.getByText("Photos must be under 10MB")).toBeVisible();
    await expect(cells(page)).toHaveCount(0);

    await page.getByLabel("Add photo").setInputFiles({
      name: "invoice.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4"),
    });
    await expect(page.getByText("Only photos can be added")).toBeVisible();
    await expect(page.getByText("Photos must be under 10MB")).toHaveCount(0);
    await expect(cells(page)).toHaveCount(0);

    await page.getByLabel("Add photo").setInputFiles({
      name: "animated.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("GIF89a"),
    });
    await expect(page.getByText("Only photos can be added")).toBeVisible();

    expect(cloudinary.uploads).toEqual([]);
  });

  test("AC8: a photo that fails to upload shows Didn't upload; the enquiry still sends, without it", async ({ page }) => {
    const cloudinary = await installMockCloudinary(page, { failUpload: true });
    await reachNotesStep(page);

    await page.getByLabel("Add photo").setInputFiles(JPEG("tap.jpg"));
    await expect(cells(page).first()).toHaveAttribute("data-status", "failed", { timeout: 10_000 });
    await expect(page.getByText("Didn't upload")).toBeVisible();
    // It keeps its x.
    await expect(page.getByRole("button", { name: "Remove tap.jpg" })).toBeVisible();
    expect(cloudinary.uploads).toEqual(["tap.jpg"]);

    const posted = await captureEnquiries(page);
    await reachPricingStep(page, "ac8");
    await page.getByRole("button", { name: "Request a job" }).click();
    await expect(page).toHaveURL(/\/request-a-job\/confirmed\?ref=JOB-/, { timeout: 20_000 });
    expect(posted).toHaveLength(1);
    expect(posted[0]).not.toHaveProperty("photos");
  });

  test("AC9: Request a job stays busy while a photo is still uploading, then sends the enquiry with it", async ({ page }) => {
    const cloudinary = await installMockCloudinary(page, { uploadDelayMs: 4000 });
    await reachNotesStep(page);

    await page.getByLabel("Add photo").setInputFiles(JPEG("slow-tap.jpg"));
    await expect(cells(page).first()).toHaveAttribute("data-status", "uploading");
    await reachPricingStep(page, "ac9");

    const posted = await captureEnquiries(page);
    await page.getByRole("button", { name: "Request a job" }).click();
    const busy = page.getByRole("button", { name: "Sending..." });
    await expect(busy).toBeDisabled();
    // Nothing has gone to the backend while the photo is still going up.
    expect(cloudinary.publicIds).toHaveLength(0);
    await expect(page).toHaveURL(/\/request-a-job\/confirmed\?ref=JOB-/, { timeout: 30_000 });

    expect(posted).toHaveLength(1);
    expect(posted[0]?.photos).toEqual([{ storageKey: cloudinary.publicIds[0], fileName: "slow-tap.jpg" }]);
  });

  test("AC10: with the signature unavailable the Add tile is disabled with the warning, and the enquiry still sends", async ({
    page,
  }) => {
    const cloudinary = await installMockCloudinary(page, { signatureStatus: 503 });
    await reachNotesStep(page);

    await expect(
      page.getByText("Photo upload isn't working right now - you can still send your request"),
    ).toBeVisible();
    await expect(page.getByLabel("Add photo")).toBeDisabled();
    // The rest of the form is untouched.
    await expect(page.getByLabel("What's happening")).toBeEnabled();

    await captureEnquiries(page);
    await reachPricingStep(page, "ac10");
    await page.getByRole("button", { name: "Request a job" }).click();
    await expect(page).toHaveURL(/\/request-a-job\/confirmed\?ref=JOB-/, { timeout: 20_000 });
    expect(cloudinary.uploads).toEqual([]);
  });
});
