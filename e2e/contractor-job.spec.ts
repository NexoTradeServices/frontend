// Feature 5001 -- the contractor's job screen and Complete, frontend e2e (ADR 0001).
//
// AC4  Bob adds a visit with the date and time boxes, writes his notes, Saves, reloads --
//      everything is back; finish before start is refused on that row
// AC6  a receipt picked through the mocked Cloudinary lands on the part; a part with no
//      receipt is refused on its Receipt photo
// AC7  Complete with nothing entered is refused on those fields; otherwise the dialog asks
//      once, then the screen is locked and the job has left his dashboard
// AC1  (UI) the dashboard card opens the job screen -- every test here gets in that way
//
// AC1-AC3, AC5, AC8 and AC9 are proven in the backend (tests/contractor-job.test.ts,
// tests/billed-hours.test.ts, tests/ops-jobs.test.ts); the browser proves what needs one.
//
// Phone width: Bob's screen is designed Mobile first. Every test dispatches a throwaway job
// of its own (helpers/accepted-job.ts), labelled `e2e` and swept by the suite.
import { test, expect, type Page } from "@playwright/test";
import { acceptedJobForBob, openJobScreen } from "./helpers/accepted-job";
import { installMockCloudinary } from "./helpers/mock-cloudinary";
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
    await page.locator("#entry-0-start").fill("11:05");
    await page.locator("#entry-0-end").fill("08:07");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Finish must be after start.")).toBeVisible();
    await expect(page.locator("#entry-0-end")).toHaveAttribute("aria-invalid", "true");

    await page.locator("#entry-0-start").fill("08:07");
    await page.locator("#entry-0-end").fill("11:05");
    await page.getByRole("button", { name: "+ Add a visit" }).click();
    await page.locator("#entry-1-date").fill("2026-10-09");
    await page.locator("#entry-1-start").fill("09:00");
    await page.locator("#entry-1-end").fill("09:20");
    await page.locator("#entry-1-note").fill("Back for the washer");
    await expect(page.getByText("Billed 3.5h")).toBeVisible();

    await page.locator("#completion-notes").fill("Replaced the cartridge.");

    // AC6: a part with no receipt photo is refused on its Receipt photo ...
    await page.getByRole("button", { name: "+ Add a part" }).click();
    await page.locator("#part-0-name").fill("Tap cartridge");
    await page.locator("#part-0-price").fill("45");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Required.", { exact: true })).toHaveCount(1);
    await expect(page.getByText("No file chosen")).toBeVisible();
    // ... and picks up its receipt through the mocked Cloudinary.
    await page.getByLabel("Receipt photo for part 1").setInputFiles(RECEIPT);
    await expect(page.getByText(RECEIPT.name)).toBeVisible();

    await expect(page.getByText("Not saved yet").first()).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(`Saved ${job.reference}.`)).toBeVisible();

    // Reload: everything is back.
    await page.reload();
    await expect(page.locator("#entry-0-start")).toHaveValue("08:07");
    await expect(page.locator("#entry-0-end")).toHaveValue("11:05");
    await expect(page.locator("#entry-1-date")).toHaveValue("2026-10-09");
    await expect(page.locator("#entry-1-note")).toHaveValue("Back for the washer");
    await expect(page.locator("#completion-notes")).toHaveValue("Replaced the cartridge.");
    await expect(page.locator("#part-0-name")).toHaveValue("Tap cartridge");
    await expect(page.locator("#part-0-price")).toHaveValue("45.00");
    await expect(page.getByText(RECEIPT.name)).toBeVisible();
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

    await page.locator("#entry-0-start").fill("08:07");
    await page.locator("#entry-0-end").fill("11:05");
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

  test("AC4: On site shows him in progress, and the job's receipt upload not being set up leaves the rest of the screen saving", async ({
    page,
    browser,
    request,
  }) => {
    await installMockCloudinary(page, { signatureStatus: 503 });
    const job = await acceptedJobForBob(browser, request, "onsite");
    await openJobScreen(page, job);

    await expect(page.getByText("Scheduled", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "On site" }).click();
    await expect(page.getByText("In progress", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "On site" })).toHaveCount(0);

    // Photo upload unavailable: the part cannot get its receipt, the rest still saves.
    await page.getByRole("button", { name: "+ Add a part" }).click();
    await page.getByLabel("Receipt photo for part 1").setInputFiles(RECEIPT);
    await expect(page.getByText("Photo upload isn't working right now - try again shortly")).toBeVisible();
    await page.getByRole("button", { name: "Remove part" }).click();
    await page.locator("#entry-0-start").fill("08:07");
    await page.locator("#entry-0-end").fill("11:05");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(`Saved ${job.reference}.`)).toBeVisible();
  });
});
