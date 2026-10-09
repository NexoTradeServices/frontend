// A throwaway job Bob has already accepted -- Feature 5001, contractor job screen.
//
// Mike dispatches it (helpers/dispatched-job.ts, in a context of his own so
// the page under test stays free for Bob), then Bob's respond link accepts
// it through the API: what is under test here is the job screen, not
// accepting. Every call writes a REAL Customer + Job + Assignment + block
// for Bob, labelled `e2e` and removed by the suite's sweep (feature 9002).
import { expect, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { dispatchThrowawayJob, type DispatchedJob } from "./dispatched-job";
import { login } from "./login";
import { BASE_URL, testRunStorageState } from "./test-run";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

export async function acceptedJobForBob(
  browser: Browser,
  request: APIRequestContext,
  tag: string,
  options: { siteContact?: { name: string; phone: string } } = {},
): Promise<DispatchedJob> {
  const context = await browser.newContext({ baseURL: BASE_URL, storageState: testRunStorageState() });
  try {
    const mikesPage = await context.newPage();
    const job = await dispatchThrowawayJob(mikesPage, request, tag, options);
    const accepted = await request.post(`${apiUrl}/api/respond/${job.token}/accept`);
    expect(accepted.status()).toBe(200);
    return job;
  } finally {
    await context.close();
  }
}

/** Bob logs in, and opens the job from its dashboard card -- the way he gets there. */
export async function openJobScreen(page: Page, job: DispatchedJob): Promise<void> {
  await page.goto("/contractor");
  await login(page, "bob@idelta.com.au");
  await page.getByRole("link", { name: new RegExp(job.reference) }).click();
  await expect(page).toHaveURL(new RegExp(`/contractor/jobs/${job.reference}$`));
  await expect(page.getByRole("heading", { name: job.reference, exact: true })).toBeVisible();
}

/**
 * Feature 6001: Bob completes the job through the API, in a context of his own, so the page
 * under test stays free. 3.0h on the books (8:07 - 11:05 bills 3.0h), work notes, no parts:
 * the invoice is $250 + 2.0h @ $180/h = $610, and the pay link is asked for straight after.
 */
export async function completeJobAsBob(
  browser: Browser,
  job: DispatchedJob,
  /** Feature 6003: the day Bob worked, and when he started and finished it (default: Wed 7 Oct, 3.0h). */
  visit: { date: string; start: string; end: string } = { date: "2026-10-07", start: "08:07", end: "11:05" },
): Promise<void> {
  const context = await browser.newContext({ baseURL: BASE_URL, storageState: testRunStorageState() });
  try {
    const page = await context.newPage();
    await page.goto("/contractor");
    await login(page, "bob@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    const completed = await page.request.post(`${apiUrl}/api/contractor/jobs/${job.reference}/complete`, {
      data: {
        timeEntries: [{ date: visit.date, start: visit.start, end: visit.end, note: "" }],
        completionNotes: "Replaced the cartridge.",
        parts: [],
      },
    });
    expect(completed.status()).toBe(200);
  } finally {
    await context.close();
  }
}

/**
 * Feature 6001: give the job's invoice, if it is still waiting, a fake pay link and send its
 * messages -- so a browser test reaches "an invoice with a link" with no Stripe key (CI) and
 * never depends on Stripe being reachable. A link Stripe already made is left alone; while
 * Complete's own try is still talking to Stripe the hook says "not yet" and is asked again.
 */
export async function giveInvoiceItsPayLink(request: APIRequestContext, job: DispatchedJob): Promise<void> {
  await expect
    .poll(
      async () => {
        const res = await request.post(`${apiUrl}/api/test-data/jobs/${job.reference}/pay-link`);
        expect(res.status()).toBe(200);
        return ((await res.json()) as { linked: boolean }).linked;
      },
      { timeout: 30_000 },
    )
    .toBe(true);
}
