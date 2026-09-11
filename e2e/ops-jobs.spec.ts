// Feature 4001 -- ops job queue and job detail, frontend e2e (ADR 0001).
//
// AC1  Mike logs in at /ops and lands on /ops/jobs; Jobs is shown and current
// AC7  a web enquiry submitted while the queue is open appears within 30
//      seconds with no reload, and the Updated line moves forward
// AC13 Karl's first enquiry: Mike picks a billing address (Places stood in
//      on CI, the real lookup locally), leaves the tick, saves -- the job
//      site equals the billing address
// AC24 the email's job link opened logged out: the ops login, then that job
//      (the link itself is proven at the backend, ops-jobs.test.ts AC24)
// AC25 (BKLG-022) Assigned renders #6b4fa3 on #efeafa through the one
//      shared tag -- on the queue and on Bob's dashboard card for JOB-1042
// AC29 at 390px: every action reachable, no sideways scroll, every tap
//      target at least 44px -- on the queue and on the job page
// AC30 at 390px the status chips stay one row that scrolls sideways
//
// Runs against the seeded dev database. The seeded jobs are only read.
// Every enquiry this file posts is a genuine, permanent Customer + Job row
// (nothing is ever deleted, only deactivated) -- each carries its own
// throwaway e2e-4001-... email so it never touches the cast. No test here
// saves an address on, or adds a note to, a job it did not create.
import { test, expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { login } from "./helpers/login";
import { MOCKS_GOOGLE_PLACES, installMockGooglePlaces } from "./helpers/mock-google-places";
import { MOBILE_VIEWPORT } from "../playwright.config";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

/** A fresh web enquiry, posted the way the public form posts it (no reCAPTCHA token reads as unreachable, never a block). */
async function postEnquiry(request: APIRequestContext, tag: string, name: string): Promise<string> {
  const res = await request.post(`${apiUrl}/api/enquiries`, {
    data: {
      name,
      email: `e2e-4001-${tag}-${String(Date.now())}@idelta.com.au`,
      phone: "0400 000 401",
      location: {
        suburb: "Fremantle",
        state: "WA",
        country: "AU",
        postcode: "6160",
        lat: -32.0569,
        lng: 115.7439,
        placeId: "e2e-place-fremantle",
      },
      trade: "Plumbing",
      selectedOptions: [],
      preferredDate: "2026-12-01",
      preferredWindow: "morning",
      description: "Kitchen mixer tap is leaking from the base.",
      marketingEmail: false,
      marketingSms: false,
    },
  });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { reference: string }).reference;
}

async function expectPair(tag: Locator) {
  await expect(tag).toHaveCSS("color", "rgb(107, 79, 163)");
  await expect(tag).toHaveCSS("background-color", "rgb(239, 234, 250)");
}

test("AC1: Mike logs in at /ops and lands on /ops/jobs, the menu's Jobs entry shown and marked current", async ({ page }) => {
  await page.goto("/ops");
  await login(page, "mike@idelta.com.au");
  await expect(page).toHaveURL(/\/ops\/jobs$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();
  const jobs = page.getByRole("navigation", { name: "Sidebar" }).getByRole("link", { name: "Jobs", exact: true });
  await expect(jobs).toBeVisible();
  await expect(jobs).toHaveAttribute("aria-current", "page");
});

test("AC7: a web enquiry submitted while the queue is open appears within 30 seconds with no reload, and the Updated line moves forward", async ({
  page,
  request,
}) => {
  // The Updated line reads to the minute, so seeing it move can take up to
  // a minute and a poll.
  test.setTimeout(180_000);
  const name = `E2E Poll ${String(Date.now())}`;

  await page.goto("/ops/jobs");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();

  // Narrow the list to a name nobody has yet, so the proof holds however many
  // open jobs the dev database carries (50 a batch). The poll re-reads this
  // same search.
  await page.getByLabel("Search jobs").fill(name);
  await expect(page.getByText(`No job matches "${name}".`)).toBeVisible();
  const updated = page.getByText(/^Updated \d{1,2}:\d{2}(am|pm) AWST/);
  const before = (await updated.textContent()) ?? "";
  await page.evaluate(() => {
    (window as unknown as { __sameDocument?: boolean }).__sameDocument = true;
  });

  const reference = await postEnquiry(request, "ac7", name);
  await expect(page.getByRole("link", { name: reference, exact: true })).toBeVisible({ timeout: 35_000 });
  await expect(updated).not.toHaveText(before, { timeout: 95_000 });

  // No reload happened: a marker set on this document is still there.
  expect(await page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument)).toBe(true);
});

test("AC13: Karl's first enquiry -- Mike picks a billing address, leaves the job at the billing address, saves: the site equals it", async ({
  page,
  request,
}) => {
  if (MOCKS_GOOGLE_PLACES) await installMockGooglePlaces(page);
  const reference = await postEnquiry(request, "ac13", "Karl");

  await page.goto(`/ops/jobs/${reference}`);
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible();

  const billing = page.getByLabel("Billing address", { exact: true });
  await expect(billing).toBeEnabled({ timeout: 10_000 });
  await expect(billing).toHaveValue("");
  await expect(page.getByLabel("Job site address same as billing address")).toBeChecked();
  // change.md V6: nothing to save yet (no billing on file, no site stored),
  // so Save addresses is quiet.
  await expect(page.getByRole("button", { name: "Save addresses" })).toBeDisabled();
  await expect(page.getByText("Not saved yet", { exact: true })).toHaveCount(0);

  await billing.fill("14 Marine Terrace, Fremantle WA 6160");
  await expect(page.getByText("Google suggestions")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Marine Terrace.*Fremantle.*WA/ }).first().click();
  // While the pick's own round trip runs the button reads "Picking address..."
  // -- this waits for the pick to land, never saving with it unset.
  const save = page.getByRole("button", { name: "Save addresses" });
  await expect(save).toBeEnabled({ timeout: 20_000 });
  await expect(page.getByText("Not saved yet", { exact: true })).toBeVisible();
  await save.click();
  await expect(page.getByText(`Addresses saved for ${reference}.`)).toBeVisible();
  // Saved: quiet again until the next change (V6).
  await expect(save).toBeDisabled();
  await expect(page.getByText("Not saved yet", { exact: true })).toHaveCount(0);

  // What was stored, read back through the API on Mike's own session.
  const res = await page.request.get(`${apiUrl}/api/jobs/${reference}`);
  expect(res.status()).toBe(200);
  const job = (await res.json()) as {
    customer: { billingAddress: { street: string; placeId: string } | null };
    siteAddress: { street: string; placeId: string } | null;
    siteSameAsBilling: boolean;
  };
  expect(job.customer.billingAddress?.street).toMatch(/Marine Terrace/);
  expect(job.siteAddress).toEqual(job.customer.billingAddress);
  expect(job.siteSameAsBilling).toBe(true);

  await page.reload();
  await expect(page.getByLabel("Billing address", { exact: true })).toHaveValue(/Marine Terrace.*Fremantle/);
  await expect(page.getByLabel("Job site address same as billing address")).toBeChecked();
});

test("AC24: the email's job link, opened logged out, shows the ops login and then that job", async ({ page, request }) => {
  const reference = await postEnquiry(request, "ac24", "Karl");
  await page.goto(`/ops/jobs/${reference}`);
  await expect(page.getByRole("heading", { name: "Operations portal" })).toBeVisible();

  await login(page, "mike@idelta.com.au");
  await expect(page).toHaveURL(new RegExp(`/ops/jobs/${reference}$`));
  await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible();
});

test("AC25 (BKLG-022): the Assigned tag on the queue reads #6b4fa3 on #efeafa, through the shared tag", async ({ page }) => {
  await page.goto("/ops/jobs");
  await login(page, "mike@idelta.com.au");
  // The Assigned chip, not All open: new jobs sort first and the dev
  // database's could push JOB-1042 past the first 50.
  await page.getByRole("button", { name: /^Assigned/ }).click();
  const tag = page.locator('tr[data-ref="JOB-1042"] [data-status="assigned"]');
  await expect(tag).toHaveText("Assigned");
  await expectPair(tag);
});

test("AC25 (BKLG-022): Bob's dashboard card for JOB-1042 wears the same pair, through the same tag", async ({ page }) => {
  await page.goto("/contractor");
  await login(page, "bob@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  const card = page.locator("div").filter({ hasText: "JOB-1042" }).filter({ has: page.locator('[data-status="assigned"]') }).last();
  const tag = card.locator('[data-status="assigned"]');
  await expect(tag).toHaveText("Awaiting your answer");
  await expectPair(tag);
});

// ---------------------------------------------------------------------------
// The phone floor -- these tests' subject IS the small screen.
// ---------------------------------------------------------------------------

async function expectNoSidewaysScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

/** Every visible tappable thing, measured; a tick box is measured by its label, which is what the finger hits. */
async function expectTapTargets(page: Page) {
  const tooSmall = await page.evaluate(() => {
    const found: string[] = [];
    const nodes = document.querySelectorAll<HTMLElement>(
      "a[href], button, input:not([type=hidden]), select, textarea, [tabindex='0']",
    );
    for (const node of nodes) {
      const target = node instanceof HTMLInputElement && node.type === "checkbox" ? (node.closest("label") ?? node) : node;
      const rect = target.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || getComputedStyle(target).visibility === "hidden") continue;
      if (rect.width < 44 || rect.height < 44) {
        const name = (node.getAttribute("aria-label") ?? node.textContent ?? "").trim().slice(0, 40);
        found.push(`${node.tagName.toLowerCase()} "${name}" ${String(Math.round(rect.width))}x${String(Math.round(rect.height))}`);
      }
    }
    return found;
  });
  expect(tooSmall).toEqual([]);
}

async function expectReachable(page: Page, locator: Locator, mustBeEnabled = true) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  if (mustBeEnabled) await expect(locator).toBeEnabled();
  const box = await locator.boundingBox();
  const width = page.viewportSize()?.width ?? 0;
  expect(box).not.toBeNull();
  expect((box?.x ?? -1) >= 0 && (box?.x ?? 0) + (box?.width ?? 0) <= width).toBe(true);
}

test.describe(() => {
  test.use(MOBILE_VIEWPORT);

  test("AC29: at 390px the queue and the job page keep every action reachable, never scroll sideways, and hold 44px tap targets", async ({
    page,
  }) => {
    await page.goto("/ops/jobs");
    await login(page, "mike@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();

    // The queue: filter, search, open a job.
    await expectNoSidewaysScroll(page);
    await expectTapTargets(page);
    const newChip = page.getByRole("button", { name: /^New/ });
    await expectReachable(page, newChip);
    await newChip.click();
    await expect(newChip).toHaveAttribute("aria-pressed", "true");
    await expectReachable(page, page.getByLabel("Search jobs"));
    const firstJob = page.locator("a[data-ref]").first();
    await expectReachable(page, firstJob);
    const reference = (await firstJob.getAttribute("data-ref")) ?? "";
    await firstJob.click();
    await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible({ timeout: 15_000 });

    // The job page: save the addresses, add a note -- reached, not pressed
    // (this is a seeded or shared job; nothing is written to it).
    await expectNoSidewaysScroll(page);
    await expectTapTargets(page);
    // Reached, whichever job opened: it is quiet (disabled) when that job has
    // nothing to save -- change.md V6; AC13 proves it goes live and back.
    await expectReachable(page, page.getByRole("button", { name: "Save addresses" }), false);
    await expectReachable(page, page.getByLabel("Note", { exact: true }));
    await expectReachable(page, page.getByRole("button", { name: "Add note" }));
    await expectNoSidewaysScroll(page);
  });

  test("AC30: at 390px the status chips stay one row that scrolls sideways", async ({ page }) => {
    await page.goto("/ops/jobs");
    await login(page, "mike@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();

    const chips = page.getByRole("group", { name: "Filter by status" });
    const tops = await chips.getByRole("button").evaluateAll((buttons) =>
      buttons.map((button) => Math.round(button.getBoundingClientRect().top)),
    );
    expect(tops).toHaveLength(7);
    expect(new Set(tops).size).toBe(1);

    const overflow = await chips.evaluate((row) => ({ scrollWidth: row.scrollWidth, clientWidth: row.clientWidth }));
    expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);
    await chips.evaluate((row) => {
      row.scrollLeft = 200;
    });
    expect(await chips.evaluate((row) => row.scrollLeft)).toBeGreaterThan(0);
    // The row scrolls; the page never does.
    await expectNoSidewaysScroll(page);
  });
});
