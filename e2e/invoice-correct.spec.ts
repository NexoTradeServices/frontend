// Feature 6007 -- Correct & reissue, frontend e2e (ADR 0001).
//
// AC1   Mike opens Correct & reissue from the Invoice card; the page is framed (Breadcrumb, title, subtitle,
//       Time on site / Reduce customer price / Why? / What happens); changing the time updates the What happens card live,
//       and Correct & reissue goes back to the job with the Toast "Corrected - INV-xxxx sent."
// AC3   a price above the invoice's is refused where Mike types it ("Can only go down - the most is $250.00."),
//       the reason is required, Cancel goes back to the job and changes nothing
// AC5   on a paid job the card says the overcharge goes back as a refund, and the Toast names the CN
// AC6   hours up leaves the invoice as it is ("... stays as it is."), Toast "Corrected."
// AC15  the job header shows Paid beside the status once the invoice is paid
//
// The sums, the void and reissue, the refund, Bob's pay and the messages are proven in the backend
// (tests/invoice-correct*.test.ts). Each job is a throwaway of Bob's (3.0h, call-out $250 + 2.0h at $180 = $610),
// labelled `e2e` and swept by the suite; the refund provider is the pretend one behind the backend's seam,
// so nothing here reaches Stripe or a real mailbox.
import { test, expect, type Page } from "@playwright/test";
import { acceptedJobForBob, completeJobAsBob, giveInvoiceItsPayLink } from "./helpers/accepted-job";
import { login } from "./helpers/login";
import { pickTime } from "./helpers/time-box";
import type { DispatchedJob } from "./helpers/dispatched-job";
import type { Browser, APIRequestContext } from "@playwright/test";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

async function completedJob(browser: Browser, request: APIRequestContext, tag: string): Promise<DispatchedJob> {
  const job = await acceptedJobForBob(browser, request, tag);
  await completeJobAsBob(browser, job);
  await giveInvoiceItsPayLink(request, job);
  return job;
}

/** The job page's Invoice card: the section that holds the invoice's lines. */
function invoiceCard(page: Page) {
  return page.locator("section", { has: page.getByTestId("invoice-lines") });
}

async function openCorrectAsMike(page: Page, job: DispatchedJob): Promise<void> {
  await page.goto(`/ops/jobs/${job.reference}`);
  await login(page, "mike@idelta.com.au");
  await expect(page.getByTestId("invoice-status")).toBeVisible();
  await page.getByTestId("correct-button").click();
  // The first visit to the page makes the dev server build it.
  await expect(page).toHaveURL(new RegExp(`/ops/jobs/${job.reference}/correct$`), { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Correct & reissue", level: 1 })).toBeVisible({ timeout: 30_000 });
}

test("6007 AC1/AC3: the page, its live What happens card, the price and reason refusals, Cancel, and the Toast after Correct & reissue", async ({ page, browser, request }) => {
  test.setTimeout(300_000);
  const job = await completedJob(browser, request, "corr-unpaid");
  await openCorrectAsMike(page, job);

  // The frame: Breadcrumb back to the job, the title, the subtitle naming the invoice and its state.
  await expect(page.getByRole("link", { name: `< ${job.reference}` })).toBeVisible();
  await expect(page.getByText(/ - Plumbing - INV-\d+ \(unpaid\)$/)).toBeVisible();
  for (const heading of ["Time on site", "Reduce customer price", "Why?", "What happens"]) {
    await expect(page.getByRole("heading", { name: heading, level: 2 })).toBeVisible();
  }
  // After the fact: no "Now" button on Finish.
  await expect(page.getByRole("button", { name: "Now" })).toHaveCount(0);

  // The prices, each with what it was.
  const callout = page.getByLabel("Call-out + first hour");
  const hourly = page.getByLabel("Hourly rate after");
  await expect(callout).toHaveValue("250.00");
  await expect(hourly).toHaveValue("180.00");
  await expect(page.getByText("was $250.00")).toBeVisible();
  await expect(page.getByText("was $180.00")).toBeVisible();
  await expect(page.getByText("Bob sees this on their pay. Say what was wrong, plainly.")).toBeVisible();
  await expect(page.getByTestId("what-happens")).toContainText("Nothing changes yet");

  // AC1: the card follows the time as Mike types it - 3.0h becomes 2.0h.
  await pickTime(page, "#correct-entry-0-end", "10:07am");
  await expect(page.getByTestId("what-customer-money")).toContainText("$610.00");
  await expect(page.getByTestId("what-customer-money")).toContainText("$430.00");
  await expect(page.getByTestId("what-customer-money").getByTestId("value-change")).toBeVisible();
  await expect(page.getByTestId("what-customer")).toHaveText(/^INV-\d+ is voided and a new invoice is emailed to \w+\.$/);
  await expect(page.getByTestId("what-contractor-money")).toContainText("Bob's pay");
  await expect(page.getByTestId("what-contractor-money")).toContainText("$500.00");
  await expect(page.getByTestId("what-contractor-money")).toContainText("$350.00");
  await expect(page.getByTestId("what-contractor")).toHaveText("It goes on their next payout.");

  // AC3: a price above the invoice's is refused where it is typed, with the most it can be.
  await callout.fill("300");
  await expect(page.getByText("Can only go down - the most is $250.00.")).toBeVisible();
  await expect(callout).toHaveAttribute("aria-invalid", "true");
  await callout.fill("250");
  await expect(page.getByText("Can only go down - the most is $250.00.")).toHaveCount(0);

  // AC3: the reason is required.
  await page.getByRole("button", { name: "Correct & reissue" }).click();
  await expect(page.getByText("Required.")).toBeVisible();
  await expect(page).toHaveURL(/\/correct$/);

  // AC3: Cancel goes back to the job and changes nothing.
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL(new RegExp(`/ops/jobs/${job.reference}$`));
  const before = await invoiceCard(page).textContent();
  await page.getByTestId("correct-button").click();
  await expect(page.getByTestId("what-happens")).toContainText("Nothing changes yet");

  // AC1: do it - the job page with the Toast, and the new invoice on the card.
  await pickTime(page, "#correct-entry-0-end", "10:07am");
  await page.getByLabel("Reason").fill("Bob logged 3h, he worked 2h.");
  await page.getByRole("button", { name: "Correct & reissue" }).click();
  await expect(page).toHaveURL(new RegExp(`/ops/jobs/${job.reference}$`));
  await expect(page.getByText(/^Corrected - INV-\d+ sent\.$/)).toBeVisible();
  const after = await invoiceCard(page).textContent();
  expect(after).not.toBe(before);
  await expect(invoiceCard(page)).toContainText("$430");
  await expect(invoiceCard(page)).toContainText("Additional 1.0h @ $180/h");
  // The correction landed as an operator note.
  await expect(page.getByText("Bob logged 3h, he worked 2h.")).toBeVisible();
});

test("6007 AC6: hours up leaves Sarah's invoice as it is; the Toast says only Corrected.", async ({ page, browser, request }) => {
  test.setTimeout(300_000);
  const job = await completedJob(browser, request, "corr-hours-up");
  await openCorrectAsMike(page, job);
  await pickTime(page, "#correct-entry-0-end", "12:07pm");
  await expect(page.getByTestId("what-customer")).toHaveText(/^\w+'s invoice stays as it is\.$/);
  await expect(page.getByTestId("what-customer-money")).toHaveCount(0);
  await expect(page.getByTestId("what-contractor-money")).toContainText("$500.00");
  await expect(page.getByTestId("what-contractor-money")).toContainText("$650.00");
  const invoiceBefore = await page.request.get(`${apiUrl}/api/jobs/${job.reference}`);
  const reference = ((await invoiceBefore.json()) as { invoice: { reference: string } }).invoice.reference;

  await page.getByLabel("Reason").fill("Worked 4h, logged 3h.");
  await page.getByRole("button", { name: "Correct & reissue" }).click();
  await expect(page).toHaveURL(new RegExp(`/ops/jobs/${job.reference}$`));
  await expect(page.getByText("Corrected.", { exact: true })).toBeVisible();
  // The same invoice, still $610.
  await expect(invoiceCard(page)).toContainText(reference);
  await expect(invoiceCard(page)).toContainText("$610");
});

test("6007 AC5/AC15: on a paid job the card says the overcharge goes back as a refund, the Toast names the CN, and the job stays Paid", async ({ page, browser, request }) => {
  test.setTimeout(300_000);
  const job = await completedJob(browser, request, "corr-paid");
  const paid = await request.post(`${apiUrl}/api/test-data/jobs/${job.reference}/paid`, { data: {} });
  expect(paid.status()).toBe(200);

  await page.goto(`/ops/jobs/${job.reference}`);
  await login(page, "mike@idelta.com.au");
  // AC15: Paid beside the status once its invoice is paid.
  await expect(page.getByTestId("job-paid-tag")).toHaveText("Paid");
  await expect(page.getByTestId("job-paid-tag")).toHaveCSS("text-transform", "uppercase");
  await page.getByTestId("correct-button").click();
  await expect(page.getByText(/ - Plumbing - INV-\d+ \(paid\)$/)).toBeVisible();

  await page.getByLabel("Call-out + first hour").fill("200");
  await expect(page.getByTestId("what-customer")).toHaveText(/^\$50\.00 goes back to \w+ as a refund\.$/);
  await expect(page.getByTestId("what-customer-money")).toContainText("$610.00");
  await expect(page.getByTestId("what-customer-money")).toContainText("$560.00");
  await page.getByLabel("Reason").fill("Goodwill on the call-out.");
  await page.getByRole("button", { name: "Correct & reissue" }).click();
  await expect(page).toHaveURL(new RegExp(`/ops/jobs/${job.reference}$`));
  await expect(page.getByText(/^Corrected - refund CN-\d+ made\.$/)).toBeVisible();
  await expect(page.getByTestId("invoice-status")).toHaveText("Paid");
  await expect(page.getByTestId("invoice-refunds").locator("li")).toHaveCount(1);
  await expect(page.getByTestId("job-paid-tag")).toBeVisible();
});

test("6007 AC15: an unpaid job carries no Paid tag", async ({ page, browser, request }) => {
  test.setTimeout(300_000);
  const job = await completedJob(browser, request, "corr-notpaid");
  await page.goto(`/ops/jobs/${job.reference}`);
  await login(page, "mike@idelta.com.au");
  await expect(page.getByTestId("invoice-status")).toBeVisible();
  await expect(page.getByTestId("job-paid-tag")).toHaveCount(0);
  await expect(page.getByTestId("correct-button")).toBeVisible();
});
