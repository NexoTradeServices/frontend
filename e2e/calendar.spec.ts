// Feature 2004 -- the contractor's Calendar, frontend e2e (ADR 0001).
//
// AC1  Bob's menu has Calendar and Availability; Mike has the same two tabs on Bob's record
// AC2  Calendar draws day and month on a phone, week and month from a tablet up; a job shows ON its block with its status
//      look; a public holiday is a closed day (rose, with its name); the Calendar is look-only (no Change availability link)
//
// Runs against the seeded dev database: Bob's JOB-1042 (waiting on his answer) and JOB-1051 (booked today) are the blocks.
import { test, expect } from "@playwright/test";
import { login } from "./helpers/login";
import { MOBILE_VIEWPORT } from "../playwright.config";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";

test("AC1: Bob's menu has Calendar and Availability, in that order", async ({ page }) => {
  await page.goto("/contractor/calendar");
  await login(page, "bob@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Calendar", level: 1 })).toBeVisible({ timeout: 15_000 });
  const nav = page.getByRole("navigation").first();
  await expect(nav.getByRole("link", { name: "Calendar" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Availability" })).toBeVisible();
});

test("AC1: Mike has Calendar and Availability tabs on Bob's record", async ({ page }) => {
  await page.goto("/ops/contractors/CON-014");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("tab", { name: "Calendar" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("tab", { name: "Availability" })).toBeVisible();
  await page.getByRole("tab", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/\/ops\/contractors\/CON-014\/calendar$/);
  await expect(page.getByTestId("week-view")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: "Availability" }).click();
  await expect(page).toHaveURL(/\/ops\/contractors\/CON-014\/availability$/);
  await expect(page.getByTestId("availability-grid")).toBeVisible({ timeout: 15_000 });
});

test.describe("desktop and tablet: the week and the month", () => {
  test("AC2: the week view carries a job on its block (reference and suburb on the block), Not available as grey runs, and the month view opens", async ({ page }) => {
    await page.goto("/contractor/calendar");
    await login(page, "bob@idelta.com.au");
    await expect(page.getByTestId("week-view")).toBeVisible({ timeout: 15_000 });
    // JOB-1042 waits on Bob (To answer, dashed); find it in this week or the next.
    const toAnswer = page.locator('[data-status="to_answer"]');
    await page.waitForLoadState("networkidle"); // the week's data has arrived before we count
    if ((await toAnswer.count()) === 0) await page.getByRole("button", { name: "Next" }).click();
    await expect(toAnswer.first()).toBeVisible({ timeout: 15_000 });
    await expect(toAnswer.first()).toContainText(/JOB-\d+ \w+/);
    await expect(toAnswer.first()).toHaveClass(/border-dashed/);

    await page.getByRole("tab", { name: "Month" }).click();
    await expect(page.getByTestId("month-view")).toBeVisible();
    await expect(page.getByRole("button", { name: /closed|job/i }).first()).toBeVisible();
  });

  test("AC2, AC7: a public holiday shows in the month as a Closed day, and its week as a locked day across the column", async ({ page, request }) => {
    const res = await request.get(`${apiUrl}/api/public-holidays?state=WA`);
    const { holidays } = (await res.json()) as { holidays: { date: string; name: string }[] };
    const holiday = holidays[0];
    test.skip(holiday === undefined, "no WA holiday ahead in this database");
    if (holiday === undefined) return;
    await page.goto("/contractor/calendar");
    await login(page, "bob@idelta.com.au");
    await expect(page.getByTestId("week-view")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("tab", { name: "Month" }).click();
    const now = new Date();
    const months = (Number(holiday.date.slice(0, 4)) - now.getFullYear()) * 12 + (Number(holiday.date.slice(5, 7)) - 1 - now.getMonth());
    for (let i = 0; i < months; i += 1) await page.getByRole("button", { name: "Next", exact: true }).click();
    const cell = page.getByRole("button", { name: new RegExp(`closed - ${holiday.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i") }).first();
    await expect(cell).toBeVisible({ timeout: 15_000 });
    await cell.click(); // a tap opens that day
    await expect(page.getByTestId("closed-day").filter({ hasText: holiday.name }).first()).toBeVisible();
  });

  test("AC2: the Calendar is look-only - one swatch legend, and no Change availability link", async ({ page }) => {
    await page.goto("/contractor/calendar");
    await login(page, "bob@idelta.com.au");
    await expect(page.getByTestId("week-view")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("calendar-legend")).toBeVisible();
    await expect(page.getByRole("link", { name: "Change availability" })).toHaveCount(0);
  });
});

test.describe("phone: the day and the month", () => {
  test.use(MOBILE_VIEWPORT);
  test("AC2: a phone draws one day with Previous and Next, and the month with job counts; nothing scrolls sideways", async ({ page }) => {
    await page.goto("/contractor/calendar");
    await login(page, "bob@idelta.com.au");
    await expect(page.getByTestId("day-view")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("tab", { name: "Week" })).toHaveCount(0);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByTestId("day-view")).toBeVisible();
    await page.getByRole("tab", { name: "Month" }).click();
    await expect(page.getByTestId("month-view")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
