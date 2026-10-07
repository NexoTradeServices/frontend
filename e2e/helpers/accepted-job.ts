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
