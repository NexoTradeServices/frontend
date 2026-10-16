// A throwaway callback Bob has accepted -- Feature 6004, callbacks and no-shows.
//
// An original job Bob finished (helpers/accepted-job.ts), then Mike raises a callback from it
// through the API, dispatches that to Bob, and Bob accepts. Every call writes real rows labelled
// `e2e`, removed by the suite's sweep (feature 9002).
import { expect, type APIRequestContext, type Browser } from "@playwright/test";
import { acceptedJobForBob, completeJobAsBob } from "./accepted-job";
import { dispatchExistingJob, type DispatchedJob } from "./dispatched-job";
import { login } from "./login";
import { BASE_URL, testRunStorageState } from "./test-run";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

export interface CallbackJob extends DispatchedJob {
  /** The original Bob finished, whose page the callback links to. */
  originalReference: string;
}

/** A completed original, and a callback on it that Bob has accepted. */
export async function acceptedCallbackForBob(
  browser: Browser,
  request: APIRequestContext,
  tag: string,
  words = "The tap is dripping again.",
): Promise<CallbackJob> {
  const original = await acceptedJobForBob(browser, request, `${tag}o`);
  await completeJobAsBob(browser, original);
  const context = await browser.newContext({ baseURL: BASE_URL, storageState: testRunStorageState() });
  try {
    const page = await context.newPage();
    await page.goto("/ops/jobs");
    await login(page, "mike@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();
    const raised = await page.request.post(`${apiUrl}/api/jobs/${original.reference}/callback`, { data: { description: words } });
    expect(raised.status(), await raised.text()).toBe(201);
    const { jobReference } = (await raised.json()) as { jobReference: string };
    const dispatched = await dispatchExistingJob(page, request, jobReference);
    const accepted = await request.post(`${apiUrl}/api/respond/${dispatched.token}/accept`);
    expect(accepted.status()).toBe(200);
    return { ...dispatched, originalReference: original.reference };
  } finally {
    await context.close();
  }
}
