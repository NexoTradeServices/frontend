// Feature 4001 -- ops job queue and job detail, frontend e2e (ADR 0001).
//
// (AC1, Mike lands on /ops/jobs with Jobs shown and current, is in auth.spec.ts AC1.)
// AC7  a web enquiry submitted while the queue is open appears within 30
//      seconds with no reload, and the Updated line moves forward
// AC13 Karl's first enquiry: Mike picks a billing address (Places stood in
//      on CI, the real lookup locally), leaves the tick, saves -- the job
//      site equals the billing address
// 1017 AC3 the Business name Field sits in the Addresses card; Mike adds
//      "Rossi's Cafe" to a customer with none, Save keeps it, then he clears it
//      (the dispatched-job and other-jobs cases are proven at the backend,
//      tests/ops-jobs.test.ts 1017 AC3)
// AC24 the email's job link opened logged out: the ops login, then that job
//      (the link itself is proven at the backend, ops-jobs.test.ts AC24)
// AC25 (BKLG-022) Assigned renders #6b4fa3 on #efeafa through the one
//      shared tag -- on the queue and on Bob's dashboard card for JOB-1042
// 3003 AC11 Sarah's enquiry photos in "The request" card with their file names;
//      tapping one opens the full photo in a new tab; "No photos" without
// 6001 AC13-AC15 Mike's Invoice card on a completed job: facts, lines, status tag (or the
//      waiting state); Resend invoice shows its Toast and two new rows in Messages; Copy pay
//      link puts the link on the clipboard, and says so when the browser refuses
// AC29 at 390px: every action reachable, no sideways scroll, every tap
//      target at least 44px -- on the queue and on the job page
// AC30 at 390px the status chips stay one row that scrolls sideways
// 6002 AC6  Check payment with Stripe answers inside the Invoice card, never as a Toast: "Checked
//      with Stripe at ... - no payment yet." while nobody has paid; the card's error Banner when
//      Stripe cannot be reached
// 6002 AC9  once paid, the Invoice card shows Paid with its Fact, and Resend, Copy and Check payment are gone
//
// Runs against the seeded dev database. The seeded jobs are only read.
// Every enquiry this file posts is a genuine, permanent Customer + Job row
// (nothing is ever deleted, only deactivated) -- each carries its own
// throwaway e2e-4001-... email so it never touches the cast. No test here
// saves an address on, or adds a note to, a job it did not create.
import { test, expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { acceptedJobForBob, completeJobAsBob, giveInvoiceItsPayLink } from "./helpers/accepted-job";
import { login } from "./helpers/login";
import { MOCKS_GOOGLE_PLACES, installMockGooglePlaces } from "./helpers/mock-google-places";
import { installMockPhotoImages } from "./helpers/mock-cloudinary";
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
  // so Save is quiet.
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await expect(page.getByText("Not saved yet", { exact: true })).toHaveCount(0);

  await billing.fill("14 Marine Terrace, Fremantle WA 6160");
  await expect(page.getByText("Google suggestions")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Marine Terrace.*Fremantle.*WA/ }).first().click();
  // While the pick's own round trip runs the button reads "Picking address..."
  // -- this waits for the pick to land, never saving with it unset.
  const save = page.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeEnabled({ timeout: 20_000 });
  await expect(page.getByText("Not saved yet", { exact: true })).toBeVisible();
  await save.click();
  await expect(page.getByText(`Saved ${reference}.`)).toBeVisible();
  // Saved: quiet again until the next change (V6).
  await expect(save).toBeDisabled();
  await expect(page.getByText("Not saved yet", { exact: true })).toHaveCount(0);

  // What was stored -- the customer's billing address and the job site equal to it --
  // is proven at the backend, tests/ops-jobs.test.ts AC13.

  await page.reload();
  await expect(page.getByLabel("Billing address", { exact: true })).toHaveValue(/Marine Terrace.*Fremantle/);
  await expect(page.getByLabel("Job site address same as billing address")).toBeChecked();
});

test("1017 AC3: Mike adds Rossi's Cafe as the business name beside the billing address, saves, then clears it", async ({
  page,
  request,
}) => {
  if (MOCKS_GOOGLE_PLACES) await installMockGooglePlaces(page);
  const reference = await postEnquiry(request, "1017", "Nina Rossi");

  await page.goto(`/ops/jobs/${reference}`);
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible();

  const businessName = page.getByLabel("Business name");
  const save = page.getByRole("button", { name: "Save", exact: true });
  await expect(businessName).toBeVisible();
  await expect(businessName).toHaveValue("");
  await expect(save).toBeDisabled();

  await businessName.fill("Rossi's Cafe");
  await expect(page.getByText("Not saved yet", { exact: true })).toBeVisible();
  await save.click();
  await expect(page.getByText(`Saved ${reference}.`)).toBeVisible();
  await expect(save).toBeDisabled();

  await page.reload();
  await expect(page.getByLabel("Business name")).toHaveValue("Rossi's Cafe");

  await page.getByLabel("Business name").fill("");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(`Saved ${reference}.`)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Business name")).toHaveValue("");
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
    await expectReachable(page, page.getByRole("button", { name: "Save", exact: true }), false);
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

test("3003 AC11: Mike sees the customer's photos in The request card; tapping one opens the full photo in a new tab; a job without says No photos", async ({
  page,
  request,
}) => {
  await installMockPhotoImages(page);
  const stamp = String(Date.now());
  const withPhotos = await request.post(`${apiUrl}/api/enquiries`, {
    data: {
      name: "E2E 3003 Photos",
      email: `e2e-3003-ops-${stamp}@idelta.com.au`,
      phone: "0400 000 303",
      location: {
        suburb: "Fremantle",
        state: "WA",
        country: "AU",
        postcode: "6160",
        lat: -32.0569,
        lng: 115.7439,
        placeId: `e2e-3003-place-${stamp}`,
      },
      trade: "Plumbing",
      selectedOptions: [],
      preferredDate: "2026-12-01",
      preferredWindow: "morning",
      description: "Mixer tap leaking from the base.",
      marketingEmail: false,
      marketingSms: false,
      photos: [
        { storageKey: `tradeservice/enquiry-photos/e2e-ops-a-${stamp}`, fileName: "leaking mixer tap.jpg" },
        { storageKey: `tradeservice/enquiry-photos/e2e-ops-b-${stamp}`, fileName: "under the sink.heic" },
      ],
    },
  });
  expect(withPhotos.status()).toBe(201);
  const { reference } = (await withPhotos.json()) as { reference: string };
  const bare = await postEnquiry(request, "3003-bare", "E2E 3003 Bare");

  await page.goto(`/ops/jobs/${reference}`);
  await login(page, "mike@idelta.com.au");
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "The request" }) });
  await expect(card.getByText("Photos", { exact: true })).toBeVisible();
  const first = card.getByRole("link", { name: "Open leaking mixer tap.jpg" });
  await expect(first).toBeVisible();
  // The caption cuts a long name short with "..."; the link keeps the whole name.
  await expect(card.getByRole("link", { name: "Open under the sink.heic" })).toBeVisible();
  await expect(card.getByText("under the s...")).toBeVisible();
  // Read-only: no x, no Add tile, no count.
  await expect(card.getByRole("button", { name: /Remove/ })).toHaveCount(0);
  await expect(card.getByText("Add photo")).toHaveCount(0);
  await expect(card.getByText(/of 5 photos/)).toHaveCount(0);
  await expect(card.getByText("No photos")).toHaveCount(0);

  // The thumbnail is square and automatic; the link goes to the full photo.
  await expect(first.getByRole("img")).toHaveAttribute("src", /\/c_fill,g_auto,w_240,h_240,f_auto,q_auto\/tradeservice\/enquiry-photos\/e2e-ops-a-/);
  await expect(first).toHaveAttribute("target", "_blank");
  await expect(first).toHaveAttribute("href", /\/image\/upload\/f_auto,q_auto\/tradeservice\/enquiry-photos\/e2e-ops-a-/);
  const popup = page.waitForEvent("popup");
  await first.click();
  const opened = await popup;
  expect(opened.url()).toMatch(/\/f_auto,q_auto\/tradeservice\/enquiry-photos\/e2e-ops-a-/);
  await opened.close();

  await page.goto(`/ops/jobs/${bare}`);
  const bareCard = page.locator("section").filter({ has: page.getByRole("heading", { name: "The request" }) });
  await expect(bareCard.getByText("No photos")).toBeVisible();
});

test("6001 AC13-AC15: the Invoice card shows the invoice; Resend sends it again; Copy puts the pay link on the clipboard", async ({
  page,
  browser,
  request,
}) => {
  const job = await acceptedJobForBob(browser, request, "inv");
  await completeJobAsBob(browser, job);

  await page.goto(`/ops/jobs/${job.reference}`);
  await login(page, "mike@idelta.com.au");
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: /^InvoiceINV-\d+$/ }) });

  // AC13: the facts, the lines and the total, read from the invoice's own rows.
  await expect(card).toBeVisible();
  await expect(card.getByText("E2E 4003 inv")).toBeVisible();
  await expect(card.getByText("Billed to")).toBeVisible();
  await expect(card.getByText("Issued")).toBeVisible();
  await expect(card.getByText("Due", { exact: true })).toBeVisible();
  const lines = card.getByTestId("invoice-lines");
  // The Line items table: one header row, Item / Qty / Price / Amount side by side, over their columns.
  const headers = lines.locator("thead th");
  await expect(headers).toHaveText([/^item$/i, /^qty$/i, /^price$/i, /^amount$/i]);
  const tops = await headers.evaluateAll((cells) => cells.map((cell) => Math.round(cell.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  await expect(lines.getByRole("row", { name: /Call-out \+ first hour - Plumbing, normal.*\$250.*\$250/ })).toBeVisible();
  await expect(lines.getByRole("row", { name: /Additional 2\.0h @ \$180\/h.*\$360/ })).toBeVisible();
  await expect(lines.getByRole("row", { name: /^Total.*\$610$/ })).toBeVisible();
  // GST is not registered on the dev settings: a plain Total, no GST line.
  await expect(card.getByText("Includes GST")).toHaveCount(0);

  // Waiting for the pay link (Stripe has not answered) or already sent (it has): either way the
  // card is honest about it, and the backups are offered only once there is a link.
  const tag = card.getByTestId("invoice-status");
  await expect(tag).toHaveText(/^(Sent|Waiting for pay link)$/i);
  if (((await tag.textContent()) ?? "").toLowerCase().startsWith("waiting")) {
    await expect(card.getByText("Stripe has not answered yet. The invoice goes out by email and text as soon as it does.")).toBeVisible();
    await expect(card.getByRole("button", { name: "Resend invoice" })).toHaveCount(0);
    await expect(card.getByRole("button", { name: "Copy pay link" })).toHaveCount(0);
  }

  // Once the link exists the tag reads Sent and both backups appear.
  await giveInvoiceItsPayLink(request, job);
  await page.reload();
  await expect(card.getByTestId("invoice-status")).toHaveText(/^sent$/i);
  await expect(card.getByText("Stripe has not answered yet.")).toHaveCount(0);

  // AC14: Resend shows its Toast, and its email and text join the Messages card.
  const invoiceRows = page.getByTestId("message-row").filter({ hasText: "Invoice" });
  await expect(invoiceRows).toHaveCount(2);
  await card.getByRole("button", { name: "Resend invoice" }).click();
  await expect(page.getByText("Invoice sent again.")).toBeVisible();
  await expect(invoiceRows).toHaveCount(4);

  // AC15: Copy pay link puts the invoice's link on the clipboard.
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const read = await page.request.get(`${apiUrl}/api/jobs/${job.reference}`);
  const { invoice } = (await read.json()) as { invoice: { payLinkUrl: string } };
  await card.getByRole("button", { name: "Copy pay link" }).click();
  await expect(page.getByText("Pay link copied.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(invoice.payLinkUrl);

  // ... and when the browser refuses, the Toast says where the link is instead.
  await page.evaluate(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error("denied"));
  });
  await card.getByRole("button", { name: "Copy pay link" }).click();
  await expect(page.getByText("Couldn't copy - the link is in the invoice email.")).toBeVisible();
});

test("6002 AC6 / AC9: Check payment with Stripe answers in the Invoice card; once paid the card shows Paid with when and how, and its actions are gone", async ({
  page,
  browser,
  request,
}) => {
  const job = await acceptedJobForBob(browser, request, "chk");
  await completeJobAsBob(browser, job);
  await giveInvoiceItsPayLink(request, job);

  await page.goto(`/ops/jobs/${job.reference}`);
  await login(page, "mike@idelta.com.au");
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: /^InvoiceINV-\d+$/ }) });
  await expect(card.getByTestId("invoice-status")).toHaveText(/^sent$/i);

  // AC6: nobody has paid at Stripe (dev's sandbox, or the test hook's pretend link) -- the card says so, with when.
  const check = card.getByRole("button", { name: "Check payment with Stripe" });
  await check.click();
  await expect(card.getByTestId("payment-check")).toHaveText(/^Checked with Stripe at \d{1,2}:\d{2}(am|pm) AWST - no payment yet\.$/);
  // Right above the row of buttons, by the one pressed.
  const banner = await card.getByTestId("payment-check").boundingBox();
  const button = await check.boundingBox();
  const lastLine = await card.getByTestId("invoice-lines").boundingBox();
  expect(banner!.y).toBeGreaterThan(lastLine!.y + lastLine!.height);
  expect(banner!.y + banner!.height).toBeLessThanOrEqual(button!.y);
  // A warning Banner: the warning pair, so it stands out.
  await expect(card.getByTestId("payment-check")).toHaveCSS("color", await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--brand-warning").trim()).then(hexToRgb));
  await expect(card.getByTestId("invoice-status")).toHaveText(/^sent$/i);
  await expect(page.getByText("No payment yet.", { exact: true })).toHaveCount(0);
  // The line is true only when it was checked: a reload drops it.
  await page.reload();
  await expect(card.getByTestId("payment-check")).toHaveCount(0);

  // AC6: Stripe out of reach -- the card's error Banner, and the check line is not left behind.
  await page.route("**/invoice/check-payment", (route) =>
    route.fulfill({ status: 502, json: { error: "Couldn't reach Stripe - try again in a minute." } }),
  );
  await check.click();
  await expect(card.getByTestId("payment-check-error")).toHaveText("Couldn't reach Stripe - try again in a minute.");
  await expect(card.getByTestId("payment-check")).toHaveCount(0);
  await page.unroute("**/invoice/check-payment");

  // AC9: paid (the test hook runs the one paid step with a card payment).
  const paid = await request.post(`${apiUrl}/api/test-data/jobs/${job.reference}/paid`);
  expect(paid.status()).toBe(200);
  await page.reload();
  await expect(card.getByTestId("invoice-status")).toHaveText(/^paid$/i);
  await expect(card.getByText("Paid", { exact: true }).last()).toBeVisible();
  await expect(card.getByText(/^\d{1,2} \w{3} \d{4}, card$/)).toBeVisible();
  for (const name of ["Resend invoice", "Copy pay link", "Check payment with Stripe"]) {
    await expect(card.getByRole("button", { name })).toHaveCount(0);
  }
  // The receipt and the office's notice are listed with the job's messages.
  await expect(page.getByTestId("message-row").filter({ hasText: "Payment receipt" })).toHaveCount(1);
  await expect(page.getByTestId("message-row").filter({ hasText: "Payment received" })).toHaveCount(1);
});

/** "#b4531a" -> "rgb(180, 83, 26)", as getComputedStyle reports a color. */
function hexToRgb(hex: string): string {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((at) => Number.parseInt(value.slice(at, at + 2), 16));
  return `rgb(${String(r)}, ${String(g)}, ${String(b)})`;
}
