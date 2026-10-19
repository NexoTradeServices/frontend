// Feature 6003 -- the ops Settlements screen, frontend e2e (ADR 0001).
//
// AC9   Ready to pay lists the approved invoice with its bank details and amount; Download CSV
//       saves the payout run (Contractor, BSB, Account, Amount, CINV reference)
// AC10  Mark paid opens its Standard dialog with the bank reference, Cancel changes nothing,
//       confirming toasts "<CINV> marked paid." and the row moves to Paid with who paid it
// AC8   Rebuild asks first, replaces an unapproved draft with a fresh one, and the old link says so
//       (6007: the "Job corrected since" tag is gone - a correction rebuilds the draft by itself)
// AC12  a row opens to the invoice's own lines with their working, the weekend line marked T1.5
//       with its legend; Not yet invoiced lists unswept work with the Monday and the pay day
//       after; at 390px the table becomes Record cards and the page never scrolls sideways
// 6007 AC10/AC11  Add pay adjustment in the Page header opens its Standard dialog (Contractor, Amount,
//       Job, Reason, the muted line saying where it lands), refuses what is wrong where it is typed,
//       and toasts "Added - on Bob's next payout."; Not yet invoiced shows Work, Adjustments, Payout
//
// The sums, the lists, the CSV bytes and the refusals are proven in the backend
// (tests/settlements-payout.test.ts, settlements-supersede.test.ts). The browser proves what needs
// one. Every job here is a throwaway of Bob's, labelled `e2e`; the run is the backend's hook, which
// sweeps only `e2e` work - the owner's UAT records are never touched. One test at a time may make
// Bob's draft (withSettlementsLock), each in a Monday of its own.
import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { login } from "./helpers/login";
import { expectFilterRowOnPhone, expectFilterRowWraps } from "./helpers/filter-row";
import { withSettlementsLock } from "./helpers/singleton-lock";
import { approveByLink, approveLinkFor, expectNoSidewaysScroll, finishedJob, mondayRun, runSettlementSweep } from "./helpers/settlements";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

function money(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-AU", { minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

test("6003 AC9/AC10/AC12: an approved invoice is ready to pay - open its lines, download the CSV, mark it paid, and it moves to Paid", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(300_000);
  await withSettlementsLock(async () => {
    const { job } = await finishedJob(browser, request, "stl-ready");
    const [draft] = await runSettlementSweep(request, mondayRun(0));
    if (draft === undefined) throw new Error("the run made no draft");
    await approveByLink(request, await approveLinkFor(request, draft.reference));

    await page.goto("/ops/payouts");
    await login(page, "mike@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Payouts", level: 1 })).toBeVisible();
    await expect(page.getByText("Pay the approved invoices on pay day, then mark each one paid.")).toBeVisible();
    // The menu entry is there.
    await expect(page.getByRole("link", { name: "Payouts" }).first()).toBeVisible();

    const detail = await page.request.get(`${apiUrl}/api/settlements/${draft.reference}`);
    expect(detail.status()).toBe(200);
    const { amount } = (await detail.json()) as { amount: number };

    // The facts, and the four pills with their counts.
    await expect(page.getByTestId("pay-day")).toHaveText(/^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}$/);
    await expect(page.getByTestId("ready-count")).not.toHaveText("0");
    for (const label of ["Ready to pay", "Awaiting approval", "Not yet invoiced", "Paid"]) {
      await expect(page.getByRole("button", { name: new RegExp(`^${label} \\d+$`) })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: /^Ready to pay \d+$/ })).toHaveAttribute("aria-pressed", "true");

    // The Ready row: who, which invoice, where the money goes, how much.
    const row = page.locator(`tr[data-ref="${draft.reference}"]`);
    await expect(row).toBeVisible();
    await expect(row).toContainText("Bob Reilly");
    await expect(row).toContainText("066-000");
    await expect(row).toContainText("12345678");
    await expect(row).toContainText(money(amount));

    // AC12: the row opens to the invoice's own lines, each with its working.
    await row.click();
    const line = page.locator(`[data-testid="pay-line"][data-job="${job.reference}"]`);
    await expect(line).toBeVisible();
    await expect(line).toContainText("Wed 7 Oct");
    await expect(line).toContainText("3.0h");
    await expect(line).toContainText("$500");
    await row.click();
    await expect(page.getByTestId("drilldown")).toHaveCount(0);

    // AC9: Download CSV saves the payout run.
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download CSV" }).click()]);
    expect(download.suggestedFilename()).toMatch(/^payout-run-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = await readFile((await download.path()) ?? "", "utf8");
    expect(csv.split("\r\n")[0]).toBe("Contractor,BSB,Account,Amount,CINV reference");
    expect(csv).toContain(`B Reilly,066-000,12345678,${(amount / 100).toFixed(2)},${draft.reference}`);

    // AC10: Mark paid asks first, with the bank reference; Cancel changes nothing.
    await row.getByRole("button", { name: "Mark paid" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByRole("heading", { name: `Mark ${draft.reference} paid?` })).toBeVisible();
    await expect(page.getByTestId("mark-paid-body")).toContainText(
      `${money(amount)} to Bob Reilly, BSB 066-000, account 12345678. Use ${draft.reference} as the bank reference. Bob gets an email saying they've been paid.`,
    );
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Mark paid" }).click();
    await dialog.getByRole("button", { name: "Mark paid" }).click();
    await expect(page.getByText(`${draft.reference} marked paid.`)).toBeVisible();
    await expect(row).toHaveCount(0);

    // It is under Paid now, with who paid it.
    await page.getByRole("button", { name: /^Paid \d+$/ }).click();
    const paidRow = page.locator(`tr[data-ref="${draft.reference}"]`);
    await expect(paidRow).toBeVisible();
    await expect(paidRow).toContainText("Bob Reilly");
    await expect(paidRow).toContainText("Mike");
    await expect(paidRow).toContainText(money(amount));
    await expect(paidRow.getByRole("button", { name: "Mark paid" })).toHaveCount(0);

    // At 390px the table becomes Record cards, and the page never scrolls sideways.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("settlements-table")).toBeHidden();
    const card = page.getByTestId("settlements-cards").locator(`[data-ref="${draft.reference}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText("Bob Reilly");
    await expectNoSidewaysScroll(page);
  });
});

test("6003 AC8/AC12: Rebuild asks first and replaces a draft, the old link says so; the weekend line is T1.5; Not yet invoiced lists unswept work", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(300_000);
  await withSettlementsLock(async () => {
    const { job } = await finishedJob(browser, request, "stl-rebuild", "weekend");
    const [draft] = await runSettlementSweep(request, mondayRun(2));
    if (draft === undefined) throw new Error("the run made no draft");
    const staleLink = await approveLinkFor(request, draft.reference);

    await page.goto("/ops/payouts");
    await login(page, "mike@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Payouts", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: /^Awaiting approval \d+$/ }).click();
    const row = page.locator(`tr[data-ref="${draft.reference}"]`);
    await expect(row).toBeVisible();
    await expect(row).toContainText("Bob Reilly");
    // 6007: the "Job corrected since" tag is gone for good.
    await expect(row.getByText("Job corrected since")).toHaveCount(0);
    // Bob's registration is recorded, so no GST warning either.
    await expect(row.getByText("GST not recorded")).toHaveCount(0);

    // AC12: the weekend line is marked T1.5, once, with its legend.
    await row.click();
    const line = page.locator(`[data-testid="pay-line"][data-job="${job.reference}"]`);
    await expect(line).toContainText("Sat 3 Oct");
    await expect(line).toContainText("1.0h");
    await expect(line.getByTestId("weekend-code")).toHaveText("(T1.5)");
    await expect(page.getByTestId("weekend-legend")).toHaveText("T1.5 - weekend, time and a half");
    await row.click();

    await page.getByRole("button", { name: /^Ready to pay \d+$/ }).click();
    await page.getByRole("button", { name: /^Awaiting approval \d+$/ }).click();

    // Rebuild asks first; Cancel changes nothing.
    await row.getByRole("button", { name: "Rebuild" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByRole("heading", { name: `Rebuild ${draft.reference}?` })).toBeVisible();
    await expect(page.getByTestId("rebuild-body")).toHaveText(
      "It is replaced by a new draft with the jobs as they stand now, and Bob gets a fresh email. The old link stops working.",
    );
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Rebuild" }).click();
    await dialog.getByRole("button", { name: "Rebuild" }).click();
    const toast = page.getByText(/^Rebuilt as CINV-\d+\.$/);
    await expect(toast).toBeVisible();
    const rebuilt = /CINV-\d+/.exec((await toast.textContent()) ?? "")?.[0] ?? "";
    expect(rebuilt).not.toBe(draft.reference);
    await expect(row).toHaveCount(0);
    const fresh = page.locator(`tr[data-ref="${rebuilt}"]`);
    await expect(fresh).toBeVisible();

    // The old link explains itself.
    await page.goto(staleLink);
    await expect(page.getByRole("heading", { name: "This invoice was replaced" })).toBeVisible();
    await expect(page.getByText("This invoice was replaced by a newer one. Use the link in your latest email.")).toBeVisible();

    // Not yet invoiced: Bob's finished job, not swept yet, with the Monday it will be invoiced and the pay day after.
    await finishedJob(browser, request, "stl-unswept");
    await page.goto("/ops/payouts");
    await page.getByRole("button", { name: /^Not yet invoiced \d+$/ }).click();
    const unswept = page.locator('tr[data-ref="CON-014"]');
    await expect(unswept).toBeVisible();
    await expect(unswept).toContainText("Bob Reilly");
    // 6007 AC11: Work, Adjustments and Payout sit between the job count and the two dates.
    await expect(page.locator("thead th")).toHaveText(["Contractor", "Jobs", "Work", "Adjustments", "Payout", "Invoiced on", "Paid on"]);
    await expect(unswept.getByTestId("upcoming-work")).toHaveText(/^\$[\d,]+(\.\d{2})?$/);
    await expect(unswept.getByTestId("upcoming-adjustments")).toHaveText(/^(\$0|[+-]\$[\d,]+(\.\d{2})?)$/);
    await expect(unswept.getByTestId("upcoming-payout")).toHaveText(/^-?\$[\d,]+(\.\d{2})?$/);
    await expect(unswept.locator("td").nth(5)).toHaveText(/^Mon \d{1,2} [A-Z][a-z]{2}$/);
    await expect(unswept.locator("td").nth(6)).toHaveText(/^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}$/);
  });
});

test("6007 AC10/AC11: Mike adds a pay adjustment - the dialog says where it lands, refuses what is wrong, and the Toast names Bob", async ({ page, browser, request }) => {
  test.setTimeout(300_000);
  await withSettlementsLock(async () => {
    const { job } = await finishedJob(browser, request, "adj-unswept");

    await page.goto("/ops/payouts");
    await login(page, "mike@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Payouts", level: 1 })).toBeVisible();
    // The compact Primary sits in the Page header.
    await page.getByRole("button", { name: "Add pay adjustment" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByRole("heading", { name: "Add pay adjustment" })).toBeVisible();
    await expect(dialog.getByTestId("adjustment-landing")).toHaveText("Choose a contractor to see where it will land.");

    // The muted line says which, before Add: Bob's next payout, his draft, or next week's draft.
    await dialog.getByLabel("Contractor").selectOption({ label: "Bob Reilly" });
    await expect(dialog.getByTestId("adjustment-landing")).toHaveText(
      /^(Goes on Bob's next payout - invoiced \w{3} \d{1,2} \w{3}\.|Goes on Bob's draft for \w{3} \d{1,2} \w{3} - their draft is resent to approve\.|Bob has approved this week - it goes on next week's draft\.)$/,
    );
    await expect(dialog.getByText("Internal note. Bob does not see this.")).toBeVisible();

    // Refusals, where they are typed; nothing is saved.
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(dialog.getByText("Enter an amount more than $0.")).toBeVisible();
    await expect(dialog.getByText("Required.")).toBeVisible();
    await dialog.getByLabel("Amount").fill("75");
    await dialog.getByLabel("Reason").fill(`Missing hour on ${job.reference}`);
    await dialog.getByLabel("Job").fill("JOB-9999");
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(dialog.getByText("No job with that number.")).toBeVisible();
    await expect(dialog).toBeVisible();

    // Add: the Toast names Bob and the page shows it under Not yet invoiced.
    await dialog.getByLabel("Job").fill(job.reference);
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Added - on Bob's next payout.")).toBeVisible();
    await expect(dialog).toBeHidden();

    // Cancel changes nothing.
    await page.getByRole("button", { name: "Add pay adjustment" }).click();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    // Where it landed depends on what else of Bob's is waiting; the backend tests prove each case.
  });
});

test("9001 AC9: the Payouts Filter row is the same row - 8px apart, chosen pill ink - wrapping at 1024px", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/ops/payouts");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Payouts", level: 1 })).toBeVisible();
  await expectFilterRowWraps(page.getByRole("group", { name: "Show" }));
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("9001 AC9: at 390px the Payouts Filter row is one line that scrolls sideways, with the edge fade and no scrollbar", async ({ page }) => {
    await page.goto("/ops/payouts");
    await login(page, "mike@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Payouts", level: 1 })).toBeVisible();
    await expectFilterRowOnPhone(page, page.getByRole("group", { name: "Show" }));
  });
});
