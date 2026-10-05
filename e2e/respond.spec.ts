// Feature 4003 -- accept / decline, frontend e2e (ADR 0001).
//
// AC2  the respond page shows when, where and who to ask for, then the job
// AC7  Accept -> "You're booked"; the other states follow from the answer
// AC9  (BKLG-027) an answered link opens as "Already answered"
// AC18 Decline with a note -> "Declined"
// AC21 Mike's queue badges the declined job with who declined and the note
// AC23 the job page keeps the declined booking under Earlier bookings
// AC25 a link that does not exist reads "This link doesn't work" with the office number
// AC26 tapping Decline shows the note box; Back returns with nothing sent
// AC27 the Texts sent page shows the site contact's slot-confirmed text
// 3003 AC12 the customer's photos sit under her answers on the respond page; no photo block when the job has none
// AC-phone (the small screen IS the subject) Accept and Decline stay fixed at
//      the bottom of a phone, reachable, no sideways scroll, 44px targets
//
// Runs against the seeded dev database. Every test dispatches a throwaway job
// of its own (helpers/dispatched-job.ts) - never JOB-1042, so the cast's own
// respond link is never burned by a run of this file.
import { test, expect, type Page } from "@playwright/test";
import { dispatchThrowawayJob, freeBobsHold, type DispatchedJob } from "./helpers/dispatched-job";
import { installMockPhotoImages } from "./helpers/mock-cloudinary";
import { MOBILE_VIEWPORT } from "../playwright.config";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

// Every throwaway job a test dispatches goes here, so afterEach can free Bob's
// calendar whatever way the test ended (his calendar is shared state).
const dispatched: DispatchedJob[] = [];

async function newJob(...args: Parameters<typeof dispatchThrowawayJob>): Promise<DispatchedJob> {
  const job = await dispatchThrowawayJob(...args);
  dispatched.push(job);
  return job;
}

test.afterEach(async ({ request }) => {
  await freeBobsHold(request, dispatched.splice(0));
});

async function expectNoSidewaysScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test("AC2, AC26: the page leads with when, where and who to ask for; Decline shows the note box and Back sends nothing", async ({
  page,
  request,
}) => {
  const job = await newJob(page, request, "ac2");
  await page.goto(job.respondPath);

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("heading", { name: `Plumbing - ${job.reference}` })).toBeVisible();
  await expect(page.getByText("New job for you, Bob")).toBeVisible();
  await expect(page.getByText("When", { exact: true })).toBeVisible();
  await expect(page.getByText(/\d\d\/\d\d, \d{1,2}:\d\dam AWST|\d\d\/\d\d, \d{1,2}:\d\dpm AWST/).first()).toBeVisible();
  await expect(page.getByText("14 Marine Terrace, Fremantle")).toBeVisible();
  // No site contact on this job: the customer's name is who to ask for.
  await expect(page.getByText("Site contact", { exact: true })).toBeVisible();
  await expect(page.getByText("E2E 4003 ac2").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "The job" })).toBeVisible();
  // The page carries no money.
  await expect(page.getByText("$")).toHaveCount(0);

  // AC26: Decline opens the note step; Back returns to the job.
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Decline this job?" })).toBeVisible();
  await expect(page.getByLabel("Anything Mike should know?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Decline the job" })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("button", { name: "Accept", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: `Plumbing - ${job.reference}` })).toBeVisible();

  // Nothing was sent: the link still opens the job.
  const read = await request.get(`${apiUrl}/api/respond/${job.token}`);
  expect(read.status()).toBe(200);
  expect(((await read.json()) as { state: string }).state).toBe("open");
});

test("AC7, AC9, AC27: Accept shows You're booked, the link then reads Already answered, and the site contact's text is on the Texts sent page", async ({
  page,
  request,
}) => {
  const job = await newJob(page, request, "ac7", { siteContact: { name: "Lena Park", phone: "0400 002 050" } });
  await page.goto(job.respondPath);
  // V3: Bob sees her name, never her number; no call link either.
  await expect(page.getByText("Lena Park", { exact: true })).toBeVisible();
  await expect(page.getByText("0400 002 050")).toHaveCount(0);
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You're booked" })).toBeVisible();
  await expect(page.getByText(`${job.reference},`)).toContainText("E2E has been told.");
  await expect(page.getByRole("link", { name: "Go to your jobs" })).toHaveAttribute("href", "/contractor");

  // BKLG-027: the link now says it was answered, naming the accept.
  await page.goto(job.respondPath);
  await expect(page.getByRole("heading", { name: "Already answered" })).toBeVisible();
  await expect(page.getByText(new RegExp(`You accepted ${job.reference} on`))).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to your jobs" })).toBeVisible();

  // AC27: Lena's text, under the job, on the interim page.
  await expect
    .poll(
      async () => {
        await page.goto("/dev/texts");
        return page.locator("section", { hasText: `${job.reference} - slot confirmed` }).count();
      },
      { timeout: 45_000, intervals: [2_000] },
    )
    .toBeGreaterThan(0);
  const block = page.locator("section", { hasText: `${job.reference} - slot confirmed` });
  await expect(block.getByText("SITE CONTACT SMS")).toBeVisible();
  await expect(block.getByText("Lena Park, 0400 002 050")).toBeVisible();
  await expect(block.getByText("CUSTOMER SMS")).toBeVisible();
});

test("AC18, AC21, AC23: Decline with a note -> Declined; Mike's queue badges the job and the job page keeps the booking", async ({
  page,
  request,
}) => {
  const job = await newJob(page, request, "ac18");
  const note = "Still on another job in Kalamunda that morning";
  await page.goto(job.respondPath);
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  await page.getByLabel("Anything Mike should know?").fill(note);
  await page.getByRole("button", { name: "Decline the job" }).click();
  await expect(page.getByRole("heading", { name: "Declined", exact: true })).toBeVisible();
  await expect(page.getByText(`${job.reference} is back with the office.`)).toBeVisible();

  // AC21: the queue, badged. Mike is still signed in on this page's context.
  await page.goto("/ops/jobs");
  await page.getByLabel("Search jobs").fill(job.reference);
  const row = page.getByRole("row", { name: new RegExp(job.reference) });
  await expect(row.getByText("Declined by Bob Reilly")).toBeVisible();
  await expect(row.getByText(note)).toBeVisible();

  // AC23: the job page, Earlier bookings.
  await page.goto(`/ops/jobs/${job.reference}`);
  const earlier = page.getByTestId("earlier-bookings");
  await expect(earlier.getByText("Earlier bookings")).toBeVisible();
  await expect(earlier.getByText("Bob Reilly")).toBeVisible();
  await expect(earlier.getByText("CON-014")).toBeVisible();
  await expect(earlier.getByText(note)).toBeVisible();
});

test("AC25: a link that does not exist reads \"This link doesn't work\" and offers the office number", async ({ page }) => {
  await page.goto("/a/this-is-not-a-real-link");
  await expect(page.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();
  const ring = page.getByRole("link", { name: /^Ring the office - / });
  await expect(ring).toBeVisible();
  await expect(ring).toHaveAttribute("href", /^tel:\d+$/);
});

test.describe("on a phone", () => {
  test.use(MOBILE_VIEWPORT);

  test("Accept and Decline are fixed at the bottom, reachable, no sideways scroll, 44px targets", async ({ page, request }) => {
    const job = await newJob(page, request, "phone");
    await page.goto(job.respondPath);
    await expect(page.getByRole("heading", { name: `Plumbing - ${job.reference}` })).toBeVisible();

    const accept = page.getByRole("button", { name: "Accept", exact: true });
    const decline = page.getByRole("button", { name: "Decline", exact: true });
    await expect(accept).toBeVisible();
    await expect(decline).toBeVisible();

    // Fixed: the bar sits on the bottom edge of the viewport before and after scrolling.
    const viewportHeight = page.viewportSize()?.height ?? 844;
    for (const scroll of [0, 400]) {
      await page.evaluate((y) => window.scrollTo(0, y), scroll);
      for (const button of [accept, decline]) {
        const box = await button.boundingBox();
        expect(box).not.toBeNull();
        expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(viewportHeight);
        expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThan(viewportHeight - 80);
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      }
    }
    await expectNoSidewaysScroll(page);

    // The note step is just as reachable.
    await decline.click();
    await expect(page.getByLabel("Anything Mike should know?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Decline the job" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();
    await expectNoSidewaysScroll(page);
  });
});

test("3003 AC12: Bob sees the customer's photos under her answers", async ({
  page,
  request,
}) => {
  await installMockPhotoImages(page);
  const stamp = String(Date.now());
  const withPhotos = await newJob(page, request, "ac12a", {
    photos: [
      { storageKey: `tradeservice/enquiry-photos/e2e-respond-a-${stamp}`, fileName: "leaking mixer tap.jpg" },
      { storageKey: `tradeservice/enquiry-photos/e2e-respond-b-${stamp}`, fileName: "under the sink.jpg" },
    ],
  });
  await page.goto(withPhotos.respondPath);

  await expect(page.getByText("Customer's photos", { exact: true })).toBeVisible();
  const first = page.getByRole("link", { name: "Open leaking mixer tap.jpg" });
  await expect(first).toBeVisible();
  // The caption cuts a long name short with "..."; the link keeps the whole name.
  await expect(page.getByRole("link", { name: "Open under the sink.jpg" })).toBeVisible();
  await expect(page.getByText("under the s...")).toBeVisible();
  await expect(first).toHaveAttribute("target", "_blank");
  await expect(first).toHaveAttribute("href", /\/f_auto,q_auto\/tradeservice\/enquiry-photos\/e2e-respond-a-/);
  // Read-only: no x, no Add tile, no count.
  await expect(page.getByRole("button", { name: /Remove/ })).toHaveCount(0);
  await expect(page.getByText("Add photo")).toHaveCount(0);
  await expect(page.getByText(/of 5 photos/)).toHaveCount(0);
});

test("3003 AC12: a job with no photos shows no photo block", async ({ page, request }) => {
  await installMockPhotoImages(page);
  const without = await newJob(page, request, "ac12b");
  await page.goto(without.respondPath);
  await expect(page.getByRole("heading", { name: "The job" })).toBeVisible();
  await expect(page.getByText("Customer's photos")).toHaveCount(0);
});
