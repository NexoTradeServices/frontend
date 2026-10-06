// Feature 2006, contractor agreement acceptance -- frontend e2e (ADR 0001,
// Playwright), at the contractor portal's primary (phone) viewport.
//
// AC1  with no version published Bob's agreement page says there is nothing
//      to accept yet (the real backend: nothing is ever published in the
//      shared dev database)
// AC8  Bob's page: the warning, Accept Quiet until ticked, then the accepted
//      state with the record link (the backend's answers faked --
//      helpers/mock-agreement.ts -- so no version is ever really published)
//      The agreement is never a menu entry.
import { test, expect } from "@playwright/test";
import { login } from "./helpers/login";
import { MOBILE_VIEWPORT } from "../playwright.config";
import { installMockContractorAgreement, installMockFileHost } from "./helpers/mock-agreement";

test.describe(() => {
  test.use(MOBILE_VIEWPORT);

  test("AC1: nothing published -- 'No agreement to accept yet.' with a way back to the dashboard", async ({ page }) => {
    await page.goto("/contractor/agreement");
    await login(page, "bob@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Contractor agreement", level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("No agreement to accept yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Back to dashboard" }).last()).toHaveAttribute("href", "/contractor");
  });

  test("AC8: the warning, Accept Quiet until ticked, then Accepted with the record link; never a menu entry", async ({ page }) => {
    await installMockFileHost(page.context());
    const mock = await installMockContractorAgreement(page, "1");
    await page.goto("/contractor/agreement");
    await login(page, "bob@idelta.com.au");
    await expect(page.getByRole("heading", { name: "Contractor agreement", level: 1 })).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/contractor");
    await expect(
      page.getByText("Until you accept version 1, no new jobs can be sent to you. Jobs already booked go ahead."),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Version 1" })).toBeVisible();
    await expect(page.getByText("1 Sep 2026")).toBeVisible();

    // Quiet until ticked.
    const accept = page.getByRole("button", { name: "Accept", exact: true });
    await expect(accept).toBeDisabled();
    await page.getByLabel("I have read and accept version 1").check();
    await expect(accept).toBeEnabled();

    // Reading the agreement opens the (signed) file in a new tab.
    const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: "Read the agreement (PDF)" }).click()]);
    await popup.waitForURL(/files\.test\/api\/agreements\/mock-1\/file\.pdf/);
    await popup.close();

    // The phone floor: nothing scrolls sideways.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await accept.click();
    await expect(page.getByText("Accepted, version 1")).toBeVisible();
    await expect(page.getByText("on 9 Sep 2026")).toBeVisible();
    expect(mock.accepts).toEqual(["mock-1"]);
    await expect(page.getByRole("button", { name: "Accept", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Your acceptance record (PDF)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Read the agreement (PDF)" })).toBeVisible();

    // Never a menu entry.
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("navigation", { name: "Menu" });
    await expect(menu.getByRole("link", { name: /agreement/i })).toHaveCount(0);
  });
});
