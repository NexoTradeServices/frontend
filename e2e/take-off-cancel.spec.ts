// Feature 4006 -- take off and cancel, frontend e2e (ADR 0001).
//
// AC4  Reassign (was "Take off"): the dialog, the Toast, the job back in New with Dispatch
// AC5  Cancel job: reason required, Other needs a note, the body line names who is told and changes
//      with the pick, the Cancelled facts on the page
// AC8  Bob's old link says "You're no longer booked" / "This job was cancelled"
// AC9  Earlier bookings lists Taken off and Cancelled
// (phone) at 390px the Cancel dialog fits the screen
//
// Runs against the seeded dev database. Each test makes a throwaway accepted job of its own
// (helpers/dispatched-job.ts) -- never JOB-1042 -- and leaves Bob's calendar free.
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { dispatchThrowawayJob } from "./helpers/dispatched-job";
import { MOBILE_VIEWPORT } from "../playwright.config";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

async function acceptedJob(page: Page, request: APIRequestContext, tag: string) {
  const job = await dispatchThrowawayJob(page, request, tag);
  const accepted = await request.post(`${apiUrl}/api/respond/${job.token}/accept`);
  expect(accepted.status()).toBe(200);
  return job;
}

async function wrapUp(page: Page, reference: string) {
  // Already cancelled -> refused (409), which is fine.
  await page.request.post(`${apiUrl}/api/jobs/${reference}/cancel`, { data: { reason: "duplicate" } });
}

test("AC4, AC8, AC9: Reassign asks first, then frees Bob, tells him and puts the job back in New with Dispatch", async ({
  page,
  request,
}) => {
  const job = await acceptedJob(page, request, "takeoff");
  try {
    await page.goto(`/ops/jobs/${job.reference}`);
    await page.getByRole("button", { name: "Reassign" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByRole("heading", { name: `Reassign ${job.reference}?` })).toBeVisible();
    await expect(dialog.getByText("Bob is told he is no longer booked. The job goes back to New for a new contractor.")).toBeVisible();

    // Keep Bob: nothing changes.
    await dialog.getByRole("button", { name: "Keep Bob" }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(page.getByText(/Booked - /)).toBeVisible();

    await page.getByRole("button", { name: "Reassign" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Reassign" }).click();

    await expect(page.getByText(`${job.reference} reassigned. It's back in New.`)).toBeVisible();
    await expect(page.getByRole("link", { name: "Dispatch" })).toBeVisible();
    await expect(page.getByTestId("earlier-bookings").getByText(/reassigned/)).toBeVisible();

    // AC8: the link he had answered says he is no longer booked.
    await page.goto(job.respondPath);
    await expect(page.getByRole("heading", { name: "You're no longer booked" })).toBeVisible();
    await expect(page.getByText(`You're no longer booked on ${job.reference}. Nothing to do.`)).toBeVisible();
  } finally {
    await wrapUp(page, job.reference);
  }
});

test("AC5, AC8, AC9: Cancel job needs a reason, Other needs a note, the body line follows the pick, then the page reads Cancelled", async ({
  page,
  request,
}) => {
  const job = await acceptedJob(page, request, "cancel");
  try {
    await page.goto(`/ops/jobs/${job.reference}`);
    await page.getByRole("button", { name: "Cancel job" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByRole("heading", { name: `Cancel ${job.reference}?` })).toBeVisible();
    // No site contact on this throwaway: the customer and Bob are told.
    await expect(dialog.getByText("E2E and Bob are told. Nothing is owed.")).toBeVisible();

    // A duplicate tells only the contractor.
    await dialog.getByLabel("Reason").selectOption("duplicate");
    await expect(dialog.getByText("Bob is told. E2E is not told - the other job stands.")).toBeVisible();

    // The reason is required.
    await dialog.getByLabel("Reason").selectOption("");
    await dialog.getByRole("button", { name: "Cancel job" }).click();
    await expect(dialog.getByText("Required.")).toBeVisible();

    // Other needs a note.
    await dialog.getByLabel("Reason").selectOption("other");
    await dialog.getByRole("button", { name: "Cancel job" }).click();
    await expect(dialog.getByText("Required.")).toBeVisible();
    await dialog.getByLabel("Note").fill("Moved house");
    await dialog.getByRole("button", { name: "Cancel job" }).click();

    await expect(page.getByText(`${job.reference} cancelled.`)).toBeVisible();
    await expect(page.locator('[data-status="cancelled"]').first()).toBeVisible();
    await expect(page.getByText(/ by Mike$/)).toBeVisible();
    await expect(page.getByText("Moved house")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel job" })).toHaveCount(0);
    await expect(page.getByTestId("earlier-bookings").getByText(/cancelled/)).toBeVisible();

    // AC8: the answered link says the job was cancelled.
    await page.goto(job.respondPath);
    await expect(page.getByRole("heading", { name: "This job was cancelled" })).toBeVisible();
    await expect(page.getByText(`${job.reference} was cancelled. Nothing to do.`)).toBeVisible();
  } finally {
    await wrapUp(page, job.reference);
  }
});

test.describe("phone", () => {
  test.use(MOBILE_VIEWPORT);

  test("at 390px the Cancel dialog fits: both Fields and both buttons are visible, no sideways scroll", async ({ page, request }) => {
    const job = await acceptedJob(page, request, "cancel-phone");
    try {
      await page.goto(`/ops/jobs/${job.reference}`);
      await page.getByRole("button", { name: "Cancel job" }).click();
      const dialog = page.getByRole("alertdialog");
      await expect(dialog.getByLabel("Reason")).toBeVisible();
      await expect(dialog.getByLabel("Note")).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Keep the job" })).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Cancel job" })).toBeVisible();
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    } finally {
      await wrapUp(page, job.reference);
    }
  });
});
