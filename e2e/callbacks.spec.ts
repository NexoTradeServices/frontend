// Feature 6004 -- callbacks, frontend e2e (ADR 0001).
//
// AC1, AC2, AC5 Mike's Raise callback dialog, its required message, landing on the new job, and the
//               Callback on / Callbacks links between the two pages
// AC5a          Bob taps Callback on, reads the original (no prices, no time, no name) and goes back
// AC6           Bob's "This callback is" field: the hint, Complete refused without it, frozen after
//
// The rest is proven in the backend (tests/callbacks.test.ts, contractor-job.test.ts,
// invoice-completion.test.ts). Every test makes throwaway jobs of its own, labelled `e2e`.
import { test, expect } from "@playwright/test";
import { acceptedJobForBob, completeJobAsBob, openJobScreen } from "./helpers/accepted-job";
import { acceptedCallbackForBob } from "./helpers/callback-job";
import { login } from "./helpers/login";
import { pickTime } from "./helpers/time-box";
import { MOBILE_VIEWPORT } from "../playwright.config";

test("AC1, AC2, AC5: Mike raises a callback from a completed job and lands on it, linked both ways", async ({
  page,
  browser,
  request,
}) => {
  const original = await acceptedJobForBob(browser, request, "cbk1");
  await completeJobAsBob(browser, original);

  await page.goto(`/ops/jobs/${original.reference}`);
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: original.reference, exact: true })).toBeVisible();
  await expect(page.getByText(/Raise callback - coming in/)).toHaveCount(0);

  await page.getByRole("button", { name: "Raise callback" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("heading", { name: `Raise a callback on ${original.reference}?` })).toBeVisible();

  // Empty: refused on the field, no job made, the dialog stays.
  await dialog.getByRole("button", { name: "Raise callback" }).click();
  await expect(dialog.getByText("Required.")).toBeVisible();
  await expect(dialog.getByLabel("What needs looking at?")).toHaveAttribute("aria-invalid", "true");

  // Not now closes it with nothing done.
  await dialog.getByRole("button", { name: "Not now" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.getByText("Callbacks", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Raise callback" }).click();
  await page.getByLabel("What needs looking at?").fill("The tap is dripping again.");
  await page.getByRole("alertdialog").getByRole("button", { name: "Raise callback" }).click();

  // Mike lands on the new job with a Toast; it says what it is a callback on.
  await expect(page).toHaveURL(/\/ops\/jobs\/JOB-\d+/);
  await expect(page.getByText(/^Raised callback JOB-\d+\.$/)).toBeVisible();
  const callbackRef = new URL(page.url()).pathname.split("/").pop() ?? "";
  expect(callbackRef).not.toBe(original.reference);
  await expect(page.getByRole("heading", { name: callbackRef, exact: true })).toBeVisible();
  await expect(page.getByText("The tap is dripping again.")).toBeVisible();
  await expect(page.getByText("Callback on", { exact: true })).toBeVisible();

  // The link goes back to the original, which lists the callback.
  await page.getByRole("link", { name: original.reference, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/ops/jobs/${original.reference}$`));
  await expect(page.getByText("Callbacks", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: callbackRef, exact: true })).toBeVisible();
});

test.describe("Bob's callback, on a phone", () => {
  test.use(MOBILE_VIEWPORT);

  test("AC5a: Callback on opens the original read-only, and the breadcrumb goes back", async ({ page, browser, request }) => {
    const callback = await acceptedCallbackForBob(browser, request, "cbk2");
    await openJobScreen(page, callback);

    await expect(page.getByText("Callback on", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: callback.originalReference, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/contractor/jobs/${callback.reference}/original$`), { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: callback.originalReference, exact: true })).toBeVisible();

    const card = page.getByTestId("original-job");
    await expect(card.getByRole("heading", { name: "Last time" })).toBeVisible();
    await expect(card.getByText("Problem", { exact: true })).toBeVisible();
    await expect(card.getByText("Finished", { exact: true })).toBeVisible();
    await expect(card.getByText("Replaced the cartridge.")).toBeVisible();
    await expect(card.getByText("No parts.")).toBeVisible();
    await expect(card.getByText(/\$|Time on site|Mike|Bob/)).toHaveCount(0);

    await page.getByRole("link", { name: `< ${callback.reference}` }).click();
    await expect(page).toHaveURL(new RegExp(`/contractor/jobs/${callback.reference}$`));
  });

  test("AC6: This callback is -- the hint, Complete refused without a pick, frozen with the choice after", async ({
    page,
    browser,
    request,
  }) => {
    const callback = await acceptedCallbackForBob(browser, request, "cbk3");
    await openJobScreen(page, callback);

    const pick = page.getByLabel("This callback is");
    await expect(pick).toBeVisible();
    await expect(page.getByText("Charged if it's a new problem. No charge if the earlier work failed.")).toBeVisible();
    await expect(pick.locator("option")).toHaveText(["Pick one", "New fault - charged", "Fixing earlier work - no charge"]);

    await pickTime(page, "#entry-0-start", "8:07am");
    await pickTime(page, "#entry-0-end", "11:05am");
    await page.locator("#completion-notes").fill("Reseated the cartridge.");
    await page.getByRole("button", { name: "Complete job" }).click();
    await expect(page.getByText("Pick whether this callback is charged.")).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);

    await pick.selectOption({ label: "Fixing earlier work - no charge" });
    await expect(page.getByText("Pick whether this callback is charged.")).toHaveCount(0);
    await page.getByRole("button", { name: "Complete job" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Complete", exact: true }).click();

    await expect(page.getByText(`Completed ${callback.reference}.`)).toBeVisible();
    await expect(pick).toHaveCount(0);
    await expect(page.getByText("Fixing earlier work - no charge")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Fixing earlier work - no charge")).toBeVisible();
    // A goodwill callback has nothing to pay: no Payment card.
    await expect(page.getByRole("heading", { name: "Payment" })).toHaveCount(0);
  });
});
