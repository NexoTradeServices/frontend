// Feature 6010 -- the customer portal, frontend e2e (ADR 0001).
//
// One customer's whole visit, from a login made the 3004 way on a throwaway customer who has a completed job
// of Bob's, its invoice (a fake pay link), and then its payment:
//   AC1  she lands on Jobs and the menu has Jobs, Invoices, Profile (refunds sit under Invoices)
//   AC2  the job is listed with her wording of status (Done)
//   AC3  the job's detail: what she asked for, Bob, the invoice as a link, "No review yet."
//   AC4  Invoices: the open invoice, its lines and total, Pay now to the pay link, Download PDF gives a PDF;
//        once paid there is no Pay now and Invoices shows it Paid; /account/payments leads to Invoices
//   AC7  Profile: her details, the call-us line and the change-password link
//   AC8  another customer's job (JOB-1042, Sarah's) reads "We can't find that"
//   and at 390px the lists are Record cards
// The refund, the replaced invoice, the 60-job paging and every other customer's record are proven at the
// backend (tests/account.test.ts).
import { test, expect } from "@playwright/test";
import { MOBILE_VIEWPORT } from "../playwright.config";
import { acceptedJobForBob, completeJobAsBob, giveInvoiceItsPayLink } from "./helpers/accepted-job";
import { askForSetPasswordLink } from "./helpers/set-password";
import { waitForHydration } from "./helpers/login";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

test("6010: a customer's portal -- Jobs, a job, Invoices and the PDF, Payments, Profile, and nobody else's records", async ({ page, browser, request }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  const job = await acceptedJobForBob(browser, request, "portal");
  await completeJobAsBob(browser, job);
  await giveInvoiceItsPayLink(request, job);

  // She sets a password (3004) and is logged in.
  await page.goto(await askForSetPasswordLink(request, job.customerEmail ?? ""));
  await waitForHydration(page, "new-password");
  await page.getByLabel("New password", { exact: true }).fill("a-portal-customer-password-1");
  await page.getByRole("button", { name: "Set password", exact: true }).click();

  // AC1: she lands on Jobs; the four menu entries.
  await expect(page).toHaveURL(/\/account\/jobs$/, { timeout: 20_000 });
  const bar = page.getByRole("navigation", { name: "Sidebar" });
  await expect(bar.getByRole("link")).toHaveText(["Jobs", "Invoices", "Profile"]);

  // AC2: the job is listed, Done.
  const row = page.getByRole("row").filter({ hasText: job.reference });
  await expect(row).toBeVisible();
  await expect(row.getByText("Done", { exact: true })).toBeVisible();

  // AC3: the job's detail.
  await row.getByRole("link", { name: job.reference }).click();
  await expect(page.getByRole("heading", { name: job.reference, exact: true })).toBeVisible();
  await expect(page.getByText("An e2e throwaway job for feature 4003.")).toBeVisible();
  await expect(page.getByText("Bob", { exact: true })).toBeVisible();
  await expect(page.getByText("No review yet.")).toBeVisible();
  const invoiceLink = page.getByRole("link", { name: /^INV-\d+$/ });
  await expect(invoiceLink).toBeVisible();
  const invoiceRef = (await invoiceLink.textContent()) ?? "";

  // AC4: the invoice, Pay now, the PDF.
  await invoiceLink.click();
  await expect(page.getByRole("heading", { name: invoiceRef, exact: true })).toBeVisible();
  await expect(page.getByTestId("invoice-lines")).toBeVisible();
  await expect(page.getByTestId("invoice-total")).toHaveText(/^\$\d/);
  await expect(page.getByRole("link", { name: "Pay now" })).toHaveAttribute("href", /^https:\/\/(pay\.test\/|buy\.stripe\.com\/)/);
  const pdf = await page.request.get(`${apiUrl}/api/account/invoices/${invoiceRef}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  await expect(page.getByRole("link", { name: "Download PDF" })).toHaveAttribute("href", new RegExp(`/api/account/invoices/${invoiceRef}/pdf$`));

  await page.goto("/account/invoices");
  await expect(page.getByRole("row").filter({ hasText: invoiceRef }).getByText("Open", { exact: true })).toBeVisible();

  // She pays; the invoice is Paid, Pay now goes, and Payments lists it.
  const paid = await request.post(`${apiUrl}/api/test-data/jobs/${job.reference}/paid`, { data: {} });
  expect(paid.status()).toBe(200);
  await page.goto(`/account/invoices/${invoiceRef}`);
  await expect(page.getByRole("link", { name: "Pay now" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Download PDF" })).toBeVisible();
  await page.goto("/account/invoices");
  await expect(page.getByRole("row").filter({ hasText: invoiceRef }).getByText("Paid", { exact: true })).toBeVisible();
  // The old Payments address leads to Invoices (there is no Payments menu entry).
  await page.goto("/account/payments");
  await expect(page).toHaveURL(/\/account\/invoices$/);

  // AC7: the profile.
  await page.goto("/account/profile");
  await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
  await expect(page.getByText(job.customerEmail ?? "")).toBeVisible();
  await expect(page.getByText(/To change your details, call us on/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Change your password" })).toBeVisible();
  // Page map: Profile is the Medium container; the lists and records are Wide.
  await expect(page.locator('[data-container="medium"]')).toBeVisible();

  // AC8: Sarah's seeded job is not hers.
  await page.goto("/account/jobs/JOB-1042");
  await expect(page.getByRole("heading", { name: "We can't find that" })).toBeVisible();
  await page.goto("/account/invoices/INV-1");
  await expect(page.getByRole("heading", { name: "We can't find that" })).toBeVisible();

  // On a phone the lists are Record cards.
  await page.setViewportSize(MOBILE_VIEWPORT.viewport);
  await page.goto("/account/jobs");
  await expect(page.locator(`a[href="/account/jobs/${job.reference}"]`).filter({ hasText: "Done" })).toBeVisible();
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
