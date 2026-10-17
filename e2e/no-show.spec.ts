// Feature 6004 -- Mark no-show, frontend e2e (ADR 0001).
//
// AC9  Mark no-show shows only on scheduled and in-progress jobs; the dialog's line follows the tick
// AC10 charged: the job reads Cancelled, reason Customer no-show, with a call-out invoice
// AC11 waived: the same close, no invoice
//
// Everything else (the money, the messages) is proven in the backend (tests/no-show.test.ts). Every
// test makes a throwaway accepted job of its own, labelled `e2e`.
import { test, expect, type Page } from "@playwright/test";
import { acceptedJobForBob } from "./helpers/accepted-job";
import { dispatchThrowawayJob, freeBobsHold } from "./helpers/dispatched-job";
import { login } from "./helpers/login";

async function mikeOpens(page: Page, reference: string): Promise<void> {
  await page.goto(`/ops/jobs/${reference}`);
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible();
}

test("AC9: a job still waiting for Bob's answer has no Mark no-show, and no placeholder is left", async ({ page, request }) => {
  const waiting = await dispatchThrowawayJob(page, request, "ns0");
  await page.goto(`/ops/jobs/${waiting.reference}`);
  await expect(page.getByRole("heading", { name: waiting.reference, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark no-show" })).toHaveCount(0);
  await expect(page.getByText(/Mark no-show - coming in/)).toHaveCount(0);
  await freeBobsHold(request, [waiting]);
});

test("AC9, AC10: the dialog's line follows the tick; charged closes the job as a customer no-show with a call-out invoice", async ({
  page,
  browser,
  request,
}) => {
  const job = await acceptedJobForBob(browser, request, "ns1");
  await mikeOpens(page, job.reference);

  await page.getByRole("button", { name: "Mark no-show" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("heading", { name: `Mark ${job.reference} as a no-show?` })).toBeVisible();
  const tick = dialog.getByLabel("Charge the customer the call-out");
  await expect(tick).toBeChecked();
  await expect(dialog.getByTestId("no-show-line")).toHaveText(/^Bob is paid the call-out\. .+ is invoiced\.$/);
  await tick.uncheck();
  await expect(dialog.getByTestId("no-show-line")).toHaveText(/^Bob is paid the call-out\. There is no charge to .+\.$/);
  await tick.check();

  // Keep the job: nothing changes.
  await dialog.getByRole("button", { name: "Keep the job" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mark no-show" })).toBeVisible();

  await page.getByRole("button", { name: "Mark no-show" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Mark no-show" }).click();
  await expect(page.getByText(`Marked ${job.reference} as a no-show.`)).toBeVisible();
  await expect(page.getByText("Customer no-show")).toBeVisible();
  await expect(page.getByText("Call-out fee - no access / customer unavailable")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark no-show" })).toHaveCount(0);
});

test("AC9, AC11: unticked, the job closes the same way with no invoice", async ({ page, browser, request }) => {
  const job = await acceptedJobForBob(browser, request, "ns2");
  await mikeOpens(page, job.reference);

  await page.getByRole("button", { name: "Mark no-show" }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByLabel("Charge the customer the call-out").uncheck();
  await dialog.getByRole("button", { name: "Mark no-show" }).click();

  await expect(page.getByText(`Marked ${job.reference} as a no-show.`)).toBeVisible();
  await expect(page.getByText("Customer no-show")).toBeVisible();
  await expect(page.getByText("Call-out fee - no access / customer unavailable")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mark no-show" })).toHaveCount(0);
});
