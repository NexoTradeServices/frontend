// Feature 6006 -- Refunds, frontend e2e (ADR 0001).
//
// AC1  Refund on a paid job's Invoice card: the dialog, the Toast, the refund line, Refund still shown
// AC2  each field error (amount 0, more than is left, blank reason); no button once nothing is left
// AC3  refunding what is left removes Refund; the invoice stays Paid
// AC4  Stripe's refusal shown above the buttons, nothing changed
// AC10 the Refunds list: menu entry, columns, Refunded tag, a row opens its job, Record cards at
//      390px, the Empty-state wording is the backend's; the Page numbers rules are in tests/page-numbers.test.ts
// AC11 the credit note link opens a PDF; Bob gets nothing from the refund endpoints
//
// The refund provider is a pretend one behind the backend's seam outside production (a payment made by
// the test-only paid hook has the intent `pi_test_<invoice>`); each job is a throwaway, labelled `e2e`
// and swept by the suite, so nothing here reaches Stripe or a real mailbox.
import { test, expect, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { acceptedJobForBob, completeJobAsBob, giveInvoiceItsPayLink } from "./helpers/accepted-job";
import { login } from "./helpers/login";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

/** A completed, paid throwaway job ($610 invoice); `refuse` makes the pretend Stripe say no to a refund. */
async function paidJob(browser: Browser, request: APIRequestContext, tag: string, refuse = false): Promise<string> {
  const job = await acceptedJobForBob(browser, request, tag);
  await completeJobAsBob(browser, job);
  await giveInvoiceItsPayLink(request, job);
  const paid = await request.post(`${apiUrl}/api/test-data/jobs/${job.reference}/paid`, { data: { refuseRefund: refuse } });
  expect(paid.status()).toBe(200);
  return job.reference;
}

async function openJobAsMike(page: Page, reference: string): Promise<void> {
  await page.goto(`/ops/jobs/${reference}`);
  await login(page, "mike@idelta.com.au");
  await expect(page.getByTestId("invoice-status")).toHaveText("Paid");
}

test("6006 AC1-3, AC11: Mike refunds part, sees the line and the credit note, then refunds the rest and Refund goes", async ({ page, browser, request }) => {
  test.setTimeout(240_000);
  const reference = await paidJob(browser, request, "ref-part");
  await openJobAsMike(page, reference);

  const refund = page.getByTestId("refund-button");
  await expect(refund).toBeVisible();
  await refund.click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("heading", { name: /^Refund INV-\d+\?$/ })).toBeVisible();
  await expect(dialog.getByText("The money goes back to how they paid. This cannot be undone.")).toBeVisible();
  await expect(dialog.getByLabel("Amount")).toHaveValue("610.00");
  await expect(dialog.getByText("Up to $610.")).toBeVisible();
  await expect(dialog.getByText("Sent to the customer as written.")).toBeVisible();

  // AC2: each field error, and nothing is sent.
  await dialog.getByLabel("Amount").fill("0");
  await dialog.getByRole("button", { name: "Refund", exact: true }).click();
  await expect(dialog.getByText("Enter an amount more than $0.")).toBeVisible();
  await expect(dialog.getByText("Give a reason for the refund.")).toBeVisible();
  await dialog.getByLabel("Amount").fill("700");
  await dialog.getByLabel("Reason").fill("Part of the job was not done");
  await dialog.getByRole("button", { name: "Refund", exact: true }).click();
  await expect(dialog.getByText("That is more than is left to refund ($610).")).toBeVisible();
  await expect(page.locator('[data-testid="invoice-refunds"]')).toHaveCount(0);

  // AC1: $200 of $610.
  await dialog.getByLabel("Amount").fill("200");
  await dialog.getByRole("button", { name: "Refund", exact: true }).click();
  await expect(page.getByText(/^Refund made - CN-\d+\.$/)).toBeVisible();
  await expect(dialog).toBeHidden();
  const lines = page.getByTestId("invoice-refunds").locator("li");
  await expect(lines).toHaveCount(1);
  await expect(lines.first()).toContainText("$200");
  await expect(lines.first().locator("[data-refund-status]")).toHaveText("Refunded");
  await expect(page.getByTestId("invoice-status")).toHaveText("Paid");
  await expect(refund).toBeVisible();

  // AC11: the credit note opens as a PDF in a new tab.
  // (Headless Chromium has no PDF viewer and downloads the file instead, so the proof is the new tab
  // and the PDF answer the page fetched, not the tab's address.)
  const popup = page.waitForEvent("popup");
  const pdf = page.waitForResponse((res) => res.url().includes("/credit-note"));
  await lines.first().getByRole("button", { name: "Refund receipt (PDF)" }).click();
  const tab = await popup;
  const answer = await pdf;
  expect(answer.status()).toBe(200);
  expect(answer.headers()["content-type"]).toContain("application/pdf");
  await tab.close();

  // AC10: the Refunds list shows it, the menu entry works, a row opens its job, Record cards at 390px.
  const cn = (await lines.first().getAttribute("data-refund")) ?? "";
  await page.getByRole("link", { name: "Refunds" }).first().click();
  await expect(page).toHaveURL(/\/ops\/refunds$/);
  await expect(page.getByRole("heading", { name: "Refunds", level: 1 })).toBeVisible();
  await expect(page.getByText("Every refund, newest first.")).toBeVisible();
  const row = page.locator(`table tr[data-ref="${cn}"]`);
  await expect(row).toBeVisible();
  await expect(row).toContainText("$200");
  await expect(row).toContainText("Mike");
  await expect(row.locator("[data-refund-status]")).toHaveText("Refunded");
  await expect(page.getByTestId("page-numbers-caption")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("table")).toBeHidden();
  await expect(page.locator(`a[data-ref="${cn}"]`)).toBeVisible();
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await page.setViewportSize({ width: 1440, height: 900 });
  await row.getByText(cn).click();
  await expect(page).toHaveURL(new RegExp(`/ops/jobs/${reference}$`));

  // AC3: the rest ($410) -- Refund is gone, the invoice stays Paid.
  await page.getByTestId("refund-button").click();
  await expect(dialog.getByLabel("Amount")).toHaveValue("410.00");
  await dialog.getByLabel("Reason").fill("The rest");
  await dialog.getByRole("button", { name: "Refund", exact: true }).click();
  await expect(page.getByTestId("invoice-refunds").locator("li")).toHaveCount(2);
  await expect(page.getByTestId("refund-button")).toHaveCount(0);
  await expect(page.getByTestId("invoice-status")).toHaveText("Paid");
});

test("6006 AC4: Stripe says no -- its reason above the buttons, no refund line, nothing changed", async ({ page, browser, request }) => {
  test.setTimeout(240_000);
  const reference = await paidJob(browser, request, "ref-refuse", true);
  await openJobAsMike(page, reference);
  await page.getByTestId("refund-button").click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByLabel("Reason").fill("Goodwill");
  await dialog.getByRole("button", { name: "Refund", exact: true }).click();
  await expect(dialog.getByTestId("refund-refused")).toContainText("Stripe did not make the refund:");
  await expect(dialog.getByTestId("refund-refused")).toContainText("Nothing was changed.");
  await expect(page.locator('[data-testid="invoice-refunds"]')).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("refund-button")).toBeVisible();
});

test("6006 AC11: Bob gets nothing from the refund endpoints", async ({ page }) => {
  await page.goto("/contractor");
  await login(page, "bob@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  expect((await page.request.get(`${apiUrl}/api/refunds`)).status()).toBe(403);
  expect((await page.request.get(`${apiUrl}/api/refunds/CN-1001/credit-note`)).status()).toBe(403);
});
