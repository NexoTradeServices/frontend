// Feature 6003 -- the contractor's Settlements, frontend e2e (ADR 0001).
//
// AC11  the menu shows Settlements; the page shows the Next payout ("You'll be paid $X plus GST for
//       N jobs on [pay day]") for finished work not yet invoiced; once the Monday run has made a
//       draft it is a Record card tagged "Awaiting your approval", opening to the invoice with each
//       job's working and the caption pointing at the email; approved and paid change the tag; another
//       contractor's invoice is not found
// 6007 AC7/AC8  a correction on a paid week waits for the next run and reads "JOB-xxxx Correction"
//       (no reason) on the next draft; what the run cannot take stays on Bob's next payout as
//       "Still to deduct: $X (JOB-xxxx)"
//
// The sums, the lists and the refusals are proven in the backend (tests/contractor-settlements.test.ts,
// settlements-sweep.test.ts). Bob's jobs here are throwaways labelled `e2e`; the page holds whatever
// else is waiting for him, so this file checks its own invoice among the rest.
import { test, expect } from "@playwright/test";
import { MOBILE_VIEWPORT } from "../playwright.config";
import { login } from "./helpers/login";
import { BASE_URL, testRunStorageState } from "./helpers/test-run";
import { withSettlementsLock } from "./helpers/singleton-lock";
import { expectNoSidewaysScroll, finishedJob, mondayRun, runSettlementSweep } from "./helpers/settlements";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

test.describe(() => {
  test.use(MOBILE_VIEWPORT);

  test("6003 AC11: Settlements is in the menu; Next payout, then a draft, an approved and a paid invoice as Record cards that open to the invoice; another contractor's is not found", async ({
    page,
    browser,
    request,
  }) => {
    test.setTimeout(360_000);
    await withSettlementsLock(async () => {
      const { job } = await finishedJob(browser, request, "cst-flow");

      await page.goto("/contractor");
      await login(page, "bob@idelta.com.au");
      await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("navigation", { name: "Menu" }).getByRole("link", { name: "Payouts" }).click();
      await expect(page).toHaveURL(/\/contractor\/payouts$/, { timeout: 30_000 });
      await expect(page.getByRole("heading", { name: "Payouts", level: 1 })).toBeVisible();

      // Next payout: a card like the invoices, tagged Next payout, that opens the invoice it will become.
      await expect(page.getByTestId("next-payout-tag")).toHaveText("Next payout");
      await expect(page.getByTestId("next-payout-line")).toHaveText(/^To be paid on [A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}$/);
      await expect(page.getByTestId("next-payout-amount")).toHaveText(/^\$[\d,]+(\.\d{2})?$/);
      await page.getByTestId("next-payout").click();
      await expect(page.getByTestId("preview-caption")).toContainText("You can approve this on");
      await expect(page.getByTestId("invoice-date")).toContainText("Not yet invoiced");
      await expect(page.getByTestId("approve-later")).toBeDisabled();
      await page.goBack();

      // The Monday run makes the draft; it is a Record card tagged Awaiting your approval.
      const [draft] = await runSettlementSweep(request, mondayRun(9));
      if (draft === undefined) throw new Error("the run made no draft");
      await page.reload();
      const card = page.locator(`[data-testid="settlement-card"][data-ref="${draft.reference}"]`);
      await expect(card).toBeVisible();
      await expect(card.getByTestId("settlement-tag")).toHaveText("Awaiting your approval");
      await expect(card.getByTestId("settlement-tag")).toHaveCSS("text-transform", "uppercase");
      await expect(card).toContainText(/\d{1,2} [A-Z][a-z]{2}( \d{4})? - \d{1,2} [A-Z][a-z]{2} \d{4}/);
      await expect(card).toContainText(/To be paid on [A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}/);
      await expectNoSidewaysScroll(page);

      // It opens to the invoice, each job with its working; the draft points at the email.
      await card.click();
      await expect(page).toHaveURL(new RegExp(`/contractor/payouts/${draft.reference}$`));
      await expect(page.getByRole("heading", { name: `Draft invoice ${draft.reference}`, level: 1 })).toBeVisible();
      await expect(page.getByTestId("settlement-tag")).toHaveText("Awaiting your approval");
      const line = page.locator(`[data-testid="pay-line"][data-job="${job.reference}"]`);
      await expect(line).toContainText("Wed 7 Oct");
      await expect(page.getByTestId("draft-caption")).toHaveText("This is a draft until you approve it. Check it, then approve.");
      await expect(page.getByRole("link", { name: "Payouts" }).first()).toBeVisible();

      // Approved: he taps Approve here, logged in; the draft becomes his Tax Invoice and the button goes.
      await page.getByRole("button", { name: "Approve" }).click();
      await expect(page.getByRole("heading", { name: `Tax Invoice ${draft.reference}`, level: 1 })).toBeVisible();
      await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
      await page.reload();
      await expect(page.getByTestId("settlement-tag")).toHaveText("Approved");
      await expect(page.getByTestId("draft-caption")).toHaveCount(0);
      await expect(page.getByTestId("invoice-date")).not.toContainText("Draft");

      // Paid: Mike marks it, in a context of his own.
      const mikes = await browser.newContext({ baseURL: BASE_URL, storageState: testRunStorageState() });
      try {
        const mikesPage = await mikes.newPage();
        await mikesPage.goto("/ops/payouts");
        await login(mikesPage, "mike@idelta.com.au");
        await expect(mikesPage.getByRole("heading", { name: "Payouts", level: 1 })).toBeVisible();
        const paid = await mikesPage.request.post(`${apiUrl}/api/settlements/${draft.reference}/mark-paid`);
        expect(paid.status()).toBe(200);
      } finally {
        await mikes.close();
      }
      await page.goto("/contractor/payouts");
      const paidCard = page.locator(`[data-testid="settlement-card"][data-ref="${draft.reference}"]`);
      await expect(paidCard.getByTestId("settlement-tag")).toHaveText("Paid");
      await expect(paidCard).toContainText(/Paid on \d{1,2} [A-Z][a-z]{2} \d{4}/);

      // Dave cannot open Bob's invoice.
      const daves = await browser.newContext({ baseURL: BASE_URL, storageState: testRunStorageState() });
      try {
        const davesPage = await daves.newPage();
        await davesPage.goto(`/contractor/payouts/${draft.reference}`);
        await login(davesPage, "dave@idelta.com.au");
        await expect(davesPage.getByText("We couldn't find that invoice.")).toBeVisible();
        await expect(davesPage.getByTestId("invoice-card")).toHaveCount(0);
      } finally {
        await daves.close();
      }
    });
  });
});

test("6007 AC7/AC8: a correction on a paid week reads 'JOB-xxxx Correction' on the next draft, and what the run cannot take is 'Still to deduct' on the next payout", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(360_000);
  await withSettlementsLock(async () => {
    const { job } = await finishedJob(browser, request, "cst-correction");
    const [week] = await runSettlementSweep(request, mondayRun(11));
    if (week === undefined) throw new Error("the run made no draft");
    // Bob's week is approved and paid: it is never reopened.
    for (const status of ["approved", "paid"]) {
      const res = await request.post(`${apiUrl}/api/test-data/settlements/${week.reference}/status`, { data: { status } });
      expect(res.status()).toBe(200);
    }

    // Mike corrects the job: 3.0h was logged, 2.0h were worked. Bob's pay for it falls by $150.
    const mikes = await browser.newContext({ baseURL: BASE_URL, storageState: testRunStorageState() });
    try {
      const mikesPage = await mikes.newPage();
      await mikesPage.goto("/ops/payouts");
      await login(mikesPage, "mike@idelta.com.au");
      await expect(mikesPage.getByRole("heading", { name: "Payouts", level: 1 })).toBeVisible();
      const corrected = await mikesPage.request.post(`${apiUrl}/api/jobs/${job.reference}/correct`, {
        data: { timeEntries: [{ date: "2026-10-07", start: "08:07", end: "10:07", note: "" }], reason: "Logged 3h, worked 2h." },
      });
      expect(corrected.status()).toBe(200);
    } finally {
      await mikes.close();
    }
    // ... and a much bigger deduction than any week of work can take.
    const big = await request.post(`${apiUrl}/api/test-data/jobs/${job.reference}/correction`, { data: { amount: -1_000_000, reason: "A big deduction." } });
    expect(big.status()).toBe(200);

    // The paid week did not move.
    await page.goto("/contractor/payouts");
    await login(page, "bob@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Payouts", level: 1 })).toBeVisible();
    await expect(page.locator(`[data-testid="settlement-card"][data-ref="${week.reference}"]`).getByTestId("settlement-tag")).toHaveText("Paid");

    // The next run takes the correction onto his next draft, as its own signed line.
    await finishedJob(browser, request, "cst-correction-work");
    const [draft] = await runSettlementSweep(request, mondayRun(12));
    if (draft === undefined) throw new Error("the second run made no draft");
    await page.goto(`/contractor/payouts/${draft.reference}`);
    // Two corrections of this job read alike (the reason never prints), so the line is found by its amount.
    const line = page.getByTestId("adjustment-line").filter({ hasText: `${job.reference} Correction` }).filter({ hasText: "-$150" });
    await expect(line).toBeVisible();

    // What the run could not take waits on his next payout, with the job it came from.
    await page.goto("/contractor/payouts/next");
    await expect(page.getByTestId("still-to-deduct")).toContainText(new RegExp(`^Note\\s*\\$[\\d,]+(\\.\\d{2})? from ${job.reference} is still to be taken off\\. It will come off your next payout\\.$`));
  });
});
