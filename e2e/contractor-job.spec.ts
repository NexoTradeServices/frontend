// Feature 5001 -- the contractor's job screen and Complete, frontend e2e (ADR 0001).
//
// AC4  Bob adds a visit with the date and time boxes, writes his notes, Saves, reloads --
//      everything is back; finish before start is refused on that row
// AC6  a receipt picked through the mocked Cloudinary lands on the part; a part with no
//      receipt is refused on its Receipt photo
// AC7  Complete with nothing entered is refused on those fields; otherwise the dialog asks
//      once, then the screen is locked and the job has left his dashboard
// AC1  (UI) the dashboard card opens the job screen -- every test here gets in that way
// 6001 AC12 the Payment card after Complete: a QR code that decodes to the pay link and no
//      price; "on its way" while the invoice waits for its link
//
// AC1-AC3, AC5, AC8 and AC9 are proven in the backend (tests/contractor-job.test.ts,
// tests/billed-hours.test.ts, tests/ops-jobs.test.ts); the browser proves what needs one.
//
// Phone width: Bob's screen is designed Mobile first. Every test dispatches a throwaway job
// of its own (helpers/accepted-job.ts), labelled `e2e` and swept by the suite.
import { test, expect, type Page } from "@playwright/test";
import { acceptedJobForBob, giveInvoiceItsPayLink, openJobScreen } from "./helpers/accepted-job";
import { decodeQr } from "./helpers/qr";
import { installMockCloudinary } from "./helpers/mock-cloudinary";
import { expectTime, pickTime } from "./helpers/time-box";
import { MOBILE_VIEWPORT } from "../playwright.config";

/** A 1x1 PNG, the receipt photo. */
const RECEIPT = {
  name: "bunnings-receipt.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
};

async function expectNoSidewaysScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test.describe("Bob's job screen, on a phone", () => {
  test.use(MOBILE_VIEWPORT);

  test("AC4, AC6: a visit with date and time boxes, notes and a part with its receipt -- Save, reload, all back; finish before start is refused on that row", async ({
    page,
    browser,
    request,
  }) => {
    await installMockCloudinary(page);
    const job = await acceptedJobForBob(browser, request, "ac4", { siteContact: { name: "Lena Park", phone: "0400 002 050" } });
    await openJobScreen(page, job);

    // The job's facts: the ask-for NAME, never her number.
    await expect(page.getByText("Lena Park")).toBeVisible();
    await expect(page.getByText("0400 002 050")).toHaveCount(0);
    await expect(page.getByText("14 Marine Terrace, Fremantle")).toBeVisible();
    await expectNoSidewaysScroll(page);

    // One row ready to fill. Finish before start is refused on that row.
    await page.locator("#entry-0-date").fill("2026-10-07");
    await pickTime(page, "#entry-0-start", "11:05am");
    await pickTime(page, "#entry-0-end", "8:07am");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Finish must be after start.")).toBeVisible();
    await expect(page.locator("#entry-0-end")).toHaveAttribute("aria-invalid", "true");

    // Typing 13:05 sets PM by itself; Now fills Finish with the clock.
    await page.locator("#entry-0-start").fill("13");
    await page.locator("#entry-0-start-minute").fill("05");
    await expect(page.locator("#entry-0-start-pm")).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Now" }).first().click();
    await expect(page.locator("#entry-0-end")).not.toHaveValue("");
    await expect(page.locator("#entry-0-end-minute")).not.toHaveValue("");
    await pickTime(page, "#entry-0-start", "8:07am");
    await pickTime(page, "#entry-0-end", "11:05am");
    await page.getByRole("button", { name: "+ Add a visit" }).click();
    await page.locator("#entry-1-date").fill("2026-10-09");
    await pickTime(page, "#entry-1-start", "9:00am");
    await pickTime(page, "#entry-1-end", "9:20am");
    await page.locator("#entry-1-note").fill("Back for the washer");
    await expect(page.getByText("Billed 3.5h")).toBeVisible();

    await page.locator("#completion-notes").fill("Replaced the cartridge.");

    // AC6: a part with no receipt photo is refused on its Receipt photo ...
    await page.getByRole("button", { name: "+ Add a part" }).click();
    await page.locator("#part-0-name").fill("Tap cartridge");
    await page.locator("#part-0-price").fill("45");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Required.", { exact: true })).toHaveCount(1);
    // ... and picks up its receipt through the mocked Cloudinary.
    await page.getByLabel("Receipt photo for part 1").setInputFiles(RECEIPT);
    await expect(page.getByText("bunnings-re...")).toBeVisible();

    await expect(page.getByText("Not saved yet").first()).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(`Saved ${job.reference}.`)).toBeVisible();

    // Reload: everything is back.
    await page.reload();
    await expectTime(page, "#entry-0-start", "8:07am");
    await expectTime(page, "#entry-0-end", "11:05am");
    await expect(page.locator("#entry-1-date")).toHaveValue("2026-10-09");
    await expect(page.locator("#entry-1-note")).toHaveValue("Back for the washer");
    await expect(page.locator("#completion-notes")).toHaveValue("Replaced the cartridge.");
    await expect(page.locator("#part-0-name")).toHaveValue("Tap cartridge");
    await expect(page.locator("#part-0-price")).toHaveValue("45.00");
    await expect(page.getByText("bunnings-re...")).toBeVisible();
    await expect(page.getByText("Billed 3.5h")).toBeVisible();
  });

  test("AC7: Complete with nothing entered is refused on those fields; then the dialog asks once and the screen locks", async ({
    page,
    browser,
    request,
  }) => {
    const job = await acceptedJobForBob(browser, request, "ac7");
    await openJobScreen(page, job);

    // Nothing entered: the refusal is on the fields, not a banner, and no dialog opens.
    await page.getByRole("button", { name: "Complete job" }).click();
    await expect(page.getByText("Add at least one visit.")).toBeVisible();
    await expect(page.getByText("Required.", { exact: true })).toHaveCount(1);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);

    await pickTime(page, "#entry-0-start", "8:07am");
    await pickTime(page, "#entry-0-end", "11:05am");
    await page.locator("#completion-notes").fill("Replaced the cartridge.");
    await page.getByRole("button", { name: "Complete job" }).click();

    // The dialog asks once; Cancel keeps everything open.
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByRole("heading", { name: `Complete ${job.reference}?` })).toBeVisible();
    await expect(dialog.getByText("Your times, notes and parts lock once you complete.")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Complete job" }).click();
    await dialog.getByRole("button", { name: "Complete", exact: true }).click();

    // Locked: ground-fill values with the reason, no inputs, no Add or Remove, no bottom bar.
    await expect(page.getByText(`Completed ${job.reference}.`)).toBeVisible();
    await expect(page.getByText("Locked when the job was completed").first()).toBeVisible();
    await expect(page.locator("#entry-0-start")).toHaveCount(0);
    await expect(page.locator("#completion-notes")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Complete job" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ Add a visit" })).toHaveCount(0);
    await expect(page.getByText("Replaced the cartridge.")).toBeVisible();
    await expect(page.getByText("8:07am")).toBeVisible();

    // Still locked after a reload, and the job has left his dashboard.
    await page.reload();
    await expect(page.getByText("Locked when the job was completed").first()).toBeVisible();
    await page.goto("/contractor");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText(job.reference)).toHaveCount(0);
  });

  /** Bob fills the one visit and completes it through the screen. */
  async function completeOnScreen(page: Page) {
    await pickTime(page, "#entry-0-start", "8:07am");
    await pickTime(page, "#entry-0-end", "11:05am");
    await page.locator("#completion-notes").fill("Replaced the cartridge.");
    await page.getByRole("button", { name: "Complete job" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Complete", exact: true }).click();
    await expect(page.getByText("Locked when the job was completed").first()).toBeVisible();
  }

  test("6001 AC12: after Complete the Payment card shows a QR code that opens the invoice's pay link, and no price", async ({
    page,
    browser,
    request,
  }) => {
    const job = await acceptedJobForBob(browser, request, "pay-qr");
    await openJobScreen(page, job);
    await completeOnScreen(page);

    // The invoice is waiting or already linked; a fake link is made if Stripe has not given one.
    await giveInvoiceItsPayLink(request, job);
    await page.reload();

    const payment = page.locator("section").filter({ has: page.getByRole("heading", { name: "Payment" }) });
    const qr = payment.getByTestId("qr-code");
    await expect(qr).toBeVisible();
    await expect(payment.getByText("Customer scans this with their phone camera to pay.")).toBeVisible();
    // The code says what the invoice's pay link says -- decoded from a photo of it.
    const read = await page.request.get(`${process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au"}/api/contractor/jobs/${job.reference}`);
    const { payment: paid } = (await read.json()) as { payment: { payLinkUrl: string } };
    expect(decodeQr(await qr.screenshot())).toBe(paid.payLinkUrl);
    // 200px square at every size, and Bob never sees a price.
    expect((await qr.boundingBox())?.width).toBe(200);
    await expect(payment.getByText(/\$\d/)).toHaveCount(0);
    // The Payment card is first in the column, above The job.
    const headings = await page.getByRole("heading", { level: 2 }).allTextContents();
    expect(headings.indexOf("Payment")).toBeGreaterThanOrEqual(0);
    expect(headings.indexOf("Payment")).toBeLessThan(headings.indexOf("The job"));
  });

  test("6001 AC12: while the invoice waits for its pay link the card says it is on its way", async ({ page, browser, request }) => {
    const job = await acceptedJobForBob(browser, request, "pay-wait");
    await openJobScreen(page, job);
    // Stripe may or may not have answered by the time Complete returns; this test is about
    // the waiting wording, so the screen is handed the waiting state.
    await page.route("**/api/contractor/jobs/*/complete", async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as object;
      await route.fulfill({ response, json: { ...body, payment: { waiting: true } } });
    });
    await completeOnScreen(page);

    const payment = page.locator("section").filter({ has: page.getByRole("heading", { name: "Payment" }) });
    await expect(payment.getByText("The pay link is on its way to the customer by email and text.")).toBeVisible();
    await expect(payment.getByTestId("qr-code")).toHaveCount(0);
    await expect(payment.getByText(/\$\d/)).toHaveCount(0);
  });

  test("AC4: I've arrived shows him in progress, and the job's receipt upload not being set up leaves the rest of the screen saving", async ({
    page,
    browser,
    request,
  }) => {
    await installMockCloudinary(page, { signatureStatus: 503 });
    const job = await acceptedJobForBob(browser, request, "onsite");
    await openJobScreen(page, job);

    await expect(page.getByText("Scheduled", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "I've arrived" }).click();
    await expect(page.getByText("In progress", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "I've arrived" })).toHaveCount(0);

    // Photo upload unavailable: the part cannot get its receipt, the rest still saves.
    await page.getByRole("button", { name: "+ Add a part" }).click();
    await page.getByLabel("Receipt photo for part 1").setInputFiles(RECEIPT);
    await expect(page.getByText("Photo upload isn't working right now - try again shortly")).toBeVisible();
    await page.getByRole("button", { name: "Remove part" }).click();
    await pickTime(page, "#entry-0-start", "8:07am");
    await pickTime(page, "#entry-0-end", "11:05am");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(`Saved ${job.reference}.`)).toBeVisible();
  });
});
