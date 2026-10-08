// Feature 6002 -- the Receivables page, frontend e2e (ADR 0001).
//
// AC8 every invoice still owed, most overdue first: the rows in order with their tags,
//     the count and the total, a row opening its job, a paid invoice leaving the list by
//     itself, the empty state; at 390px the Record cards
//
// The order, the due states on the business clock, billed to, paid / void / zero-dollar
// left out and paging are proven in the backend (tests/stripe-payment.test.ts); the browser
// proves what needs one. Runs against the dev database, which may hold other owed
// invoices: this file checks its own three rows and their order among the rest. Each is a
// throwaway job of its own (helpers/accepted-job.ts), labelled `e2e` and swept by the suite.
import { test, expect, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { acceptedJobForBob, completeJobAsBob } from "./helpers/accepted-job";
import { login } from "./helpers/login";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

/** A completed throwaway job whose invoice is due `days` from now (negative: overdue). */
async function owedJob(browser: Browser, request: APIRequestContext, tag: string, days: number): Promise<string> {
  const job = await acceptedJobForBob(browser, request, tag);
  await completeJobAsBob(browser, job);
  const moved = await request.post(`${apiUrl}/api/test-data/jobs/${job.reference}/due`, { data: { days } });
  expect(moved.status()).toBe(200);
  return job.reference;
}

async function invoiceReferenceOf(page: Page, jobReference: string): Promise<string> {
  const res = await page.request.get(`${apiUrl}/api/jobs/${jobReference}`);
  expect(res.status()).toBe(200);
  return ((await res.json()) as { invoice: { reference: string } }).invoice.reference;
}

async function summary(page: Page): Promise<{ count: number; total: number }> {
  const res = await page.request.get(`${apiUrl}/api/receivables`);
  expect(res.status()).toBe(200);
  return (await res.json()) as { count: number; total: number };
}

function dollars(cents: number): string {
  const value = cents / 100;
  return `$${Number.isInteger(value) ? String(value) : value.toFixed(2)}`;
}

/** The page refreshes when the tab comes back into view; the test makes that happen now. */
async function nudgeRefresh(page: Page): Promise<void> {
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
}

test("6002 AC8: Receivables lists what is owed, most overdue first, with the count and the total; a row opens its job; paid leaves by itself; the Record cards at 390px; the empty state", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(240_000);
  const late = await owedJob(browser, request, "rcv-late", -12);
  const today = await owedJob(browser, request, "rcv-today", 0);
  const soon = await owedJob(browser, request, "rcv-soon", 4);

  await page.goto("/ops/receivables");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Receivables", level: 1 })).toBeVisible();
  // The menu entry is there, and current.
  await expect(page.getByRole("link", { name: "Receivables" }).first()).toBeVisible();

  const refs = {
    late: await invoiceReferenceOf(page, late),
    today: await invoiceReferenceOf(page, today),
    soon: await invoiceReferenceOf(page, soon),
  };

  // The facts: the count and the total of everything owed.
  const before = await summary(page);
  await expect(page.getByTestId("unpaid-count")).toHaveText(String(before.count));
  await expect(page.getByTestId("owed-total")).toHaveText(dollars(before.total));

  // The order: 12 days overdue, then due today, then due in 4 days.
  const table = page.locator("table");
  const order = await table.locator("tbody tr").evaluateAll((rows) => rows.map((row) => row.getAttribute("data-ref")));
  const at = (ref: string) => order.indexOf(ref);
  expect(at(refs.late)).toBeGreaterThanOrEqual(0);
  expect(at(refs.late)).toBeLessThan(at(refs.today));
  expect(at(refs.today)).toBeLessThan(at(refs.soon));

  // Where each stands: warning Tags for overdue and due today, muted text for later.
  const rowOf = (ref: string) => table.locator(`tr[data-ref="${ref}"]`);
  await expect(rowOf(refs.late).getByTestId("due-state")).toHaveText("12 days overdue");
  await expect(rowOf(refs.today).getByTestId("due-state")).toHaveText("Due today");
  await expect(rowOf(refs.soon).getByTestId("due-state")).toHaveText("Due in 4 days");
  await expect(rowOf(refs.late).getByText("12 days overdue")).toHaveCSS("text-transform", "uppercase");
  await expect(rowOf(refs.soon).getByText("Due in 4 days")).not.toHaveCSS("text-transform", "uppercase");
  await expect(rowOf(refs.late)).toContainText("E2E 4003 rcv-late");
  await expect(rowOf(refs.late)).toContainText(late);
  await expect(rowOf(refs.late)).toContainText("$610");

  // Paid leaves the list by itself: no reload, the count drops by one.
  const paid = await request.post(`${apiUrl}/api/test-data/jobs/${soon}/paid`);
  expect(paid.status()).toBe(200);
  await nudgeRefresh(page);
  await expect(rowOf(refs.soon)).toHaveCount(0);
  await expect(page.getByTestId("unpaid-count")).toHaveText(String(before.count - 1));

  // At 390px the table becomes Record cards, each opening the same job; the page never scrolls sideways.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(table).toBeHidden();
  const card = page.locator(`a[data-ref="${refs.today}"]`);
  await expect(card).toBeVisible();
  await expect(card).toContainText("E2E 4003 rcv-today");
  await expect(card.getByTestId("due-state")).toHaveText("Due today");
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/ops/jobs/${today}$`));

  // Back at desktop width, tapping a row opens its job page.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ops/receivables");
  await rowOf(refs.late).getByText("E2E 4003 rcv-late").click();
  await expect(page).toHaveURL(new RegExp(`/ops/jobs/${late}$`));

  // Nothing owed: the Empty state (the list's own refresh answered with nothing).
  await page.goto("/ops/receivables");
  await expect(rowOf(refs.late)).toBeVisible();
  await page.route("**/api/receivables*", (route) => route.fulfill({ json: { count: 0, total: 0, rows: [], nextCursor: null } }));
  await nudgeRefresh(page);
  await expect(page.getByText("Nobody owes anything right now.")).toBeVisible();
  await expect(page.getByTestId("unpaid-count")).toHaveText("0");
  await expect(page.getByTestId("owed-total")).toHaveText("$0");
});
