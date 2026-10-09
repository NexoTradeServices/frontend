// Feature 6003 -- the contractor's Settlements, frontend e2e (ADR 0001).
//
// AC11  the menu shows Settlements; the page shows the Next payout ("You'll be paid $X plus GST for
//       N jobs on [pay day]") for finished work not yet invoiced; once the Monday run has made a
//       draft it is a Record card tagged "Awaiting your approval", opening to the invoice with each
//       job's working and the caption pointing at the email; approved and paid change the tag; another
//       contractor's invoice is not found
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
      await expect(card).toContainText(/\d{1,2} [A-Z][a-z]{2} - \d{1,2} [A-Z][a-z]{2} \d{4}/);
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
      await expect(paidCard).toContainText(/Paid on \d{2}\/\d{2}\/\d{2}/);

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
