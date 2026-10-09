// Feature 4006 -- reschedule, frontend e2e (ADR 0001).
//
// AC1  Reschedule from the job page opens the dispatch page fixed on Bob: no candidate list, the
//      real status tag, "Send new time"; sending returns to the job page with the Toast
// AC8  Bob's old link reads "This booking was changed"
// AC9  Earlier bookings lists the old booking as moved
// (phone) at 390px the reschedule page has no sideways scroll and Send new time is reachable
//
// Runs against the seeded dev database. Every test makes a throwaway accepted job of its own
// (helpers/dispatched-job.ts) -- never JOB-1042 -- and cancels it at the end so Bob's calendar is
// left free (his calendar is shared state).
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { dispatchThrowawayJob, pickFreeWeekday } from "./helpers/dispatched-job";
import { MOBILE_VIEWPORT } from "../playwright.config";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

/** Mike's page is signed in by dispatchThrowawayJob; Bob accepts through his link. */
async function acceptedJob(page: Page, request: APIRequestContext, tag: string) {
  const job = await dispatchThrowawayJob(page, request, tag);
  const accepted = await request.post(`${apiUrl}/api/respond/${job.token}/accept`);
  expect(accepted.status()).toBe(200);
  return job;
}

/** Leave Bob's calendar free: a duplicate cancel tells the customer side nothing. */
async function wrapUp(page: Page, reference: string) {
  await page.request.post(`${apiUrl}/api/jobs/${reference}/cancel`, { data: { reason: "duplicate" } });
}

async function expectNoSidewaysScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test("AC1, AC8, AC9: Reschedule opens the page fixed on Bob; Send new time moves the booking, and his old link says so", async ({
  page,
  request,
}) => {
  const job = await acceptedJob(page, request, "resched");
  try {
    await page.goto(`/ops/jobs/${job.reference}`);
    await expect(page.getByRole("link", { name: "Reschedule" })).toBeVisible();
    await page.getByRole("link", { name: "Reschedule" }).click();

    await expect(page).toHaveURL(new RegExp(`/ops/jobs/${job.reference}/dispatch\\?mode=reschedule`));
    await expect(page.getByRole("heading", { name: `Reschedule ${job.reference}` })).toBeVisible();
    await expect(page.getByText("Pick Bob's new time. Bob is asked to accept it again.")).toBeVisible();
    // The tag shows the job's real status, and there is no candidate list.
    await expect(page.locator('[data-status="scheduled"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Contractors" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Bob's day" })).toBeVisible();

    const newDay = await pickFreeWeekday(page);
    await page.getByLabel("Day", { exact: true }).fill(newDay);
    await page.getByLabel("Start (AWST)").selectOption("420");
    const send = page.getByRole("button", { name: "Send new time" });
    await expect(send).toBeEnabled({ timeout: 15_000 });
    await send.click();

    await expect(page).toHaveURL(new RegExp(`/ops/jobs/${job.reference}$`));
    await expect(page.getByText(`${job.reference} moved. Waiting for Bob's answer.`)).toBeVisible();
    await expect(page.getByText(/Waiting for Bob's answer - proposed/)).toBeVisible();

    // AC9: the old booking is in Earlier bookings under its new word.
    const earlier = page.getByTestId("earlier-bookings");
    await expect(earlier.getByText("Bob Reilly")).toBeVisible();
    await expect(earlier.getByText(/moved/)).toBeVisible();

    // AC8: the link he had already answered says why it no longer works.
    await page.goto(job.respondPath);
    await expect(page.getByRole("heading", { name: "This booking was changed" })).toBeVisible();
    await expect(page.getByText("Use the link in your latest message.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to your jobs" })).toHaveAttribute("href", "/contractor");
  } finally {
    await wrapUp(page, job.reference);
  }
});

test.describe("phone", () => {
  test.use(MOBILE_VIEWPORT);

  test("at 390px the reschedule page has no sideways scroll and Send new time is reachable", async ({ page, request }) => {
    const job = await acceptedJob(page, request, "resched-phone");
    try {
      await page.goto(`/ops/jobs/${job.reference}/dispatch?mode=reschedule`);
      await expect(page.getByRole("heading", { name: `Reschedule ${job.reference}` })).toBeVisible();
      await expectNoSidewaysScroll(page);
      const send = page.getByRole("button", { name: "Send new time" });
      // The disabled stand-in is swapped for the real button once Bob's slot is known to be free.
      await expect(send).toBeEnabled({ timeout: 15_000 });
      await send.scrollIntoViewIfNeeded();
      await expect(send).toBeVisible();
      const box = await send.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    } finally {
      await wrapUp(page, job.reference);
    }
  });
});
