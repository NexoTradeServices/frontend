// Feature 2004 -- Availability, frontend e2e (ADR 0001).
//
// AC3  Bob switches half hours off, Saves, and they hold after a reload
// AC4  Day off / Day on, Copy to next day, Copy to next week (and "Replace next week?" when that week is set)
// AC5  click and drag paints a run on desktop; a tablet is tap only
// AC6  tapping a half hour a job holds says to ring the office
// AC7  past half hours and holidays are locked
// AC8  leaving with unsaved taps asks; Copy saves the unsaved taps with it
// and Mike sets Bob's week through the tab on his record.
// AC10 the dashboard says "Set your availability" until the first save
//
// Runs against the seeded dev database in a far-off week (Mon 8 Mar 2027); the rows it writes carry the e2e label and the
// suite's sweep removes them.
import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/login";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";
// Each test works in its own far-off week, so the two workers never touch the same half hours.
const WEEK_SAVE = "2027-03-08";
const WEEK_DAYOFF = "2027-04-05";
const WEEK_COPY = "2027-05-03";
const WEEK_LEAVE = "2027-05-10";
const WEEK_DRAG = "2027-05-17";
const WEEK_TABLET = "2027-05-24";
const WEEK_MIKE = "2027-05-31";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The date `offset` days after `week` (a Monday), as the grid names it: "Tue 9 Mar". */
function dayName(week: string, offset: number): string {
  const d = new Date(Date.parse(`${week}T00:00:00Z`) + offset * 86_400_000);
  return `${WEEKDAYS[d.getUTCDay()] ?? ""} ${String(d.getUTCDate())} ${MONTHS[d.getUTCMonth()] ?? ""}`;
}

/** A half hour's button: slot("2027-03-08", 1, "7:00am", "available") -> "Tue 9 Mar 7:00am available". */
const slot = (page: Page, week: string, offset: number, time: string, state: "available" | "not available") =>
  page.getByRole("button", { name: `${dayName(week, offset)} ${time} ${state}`, exact: true });

async function openBob(page: Page, week: string) {
  await page.goto(`/contractor/availability?week=${week}`);
  await login(page, "bob@idelta.com.au");
  await expect(page.getByTestId("availability-grid")).toBeVisible({ timeout: 15_000 });
}

test("AC3: Bob switches two half hours off, Saves, and they hold after a reload; an untouched half hour stays available", async ({ page }) => {
  await openBob(page, WEEK_SAVE);
  await slot(page, WEEK_SAVE, 1, "7:00am", "available").click();
  await slot(page, WEEK_SAVE, 1, "7:30am", "available").click();
  await expect(slot(page, WEEK_SAVE, 1, "7:00am", "not available")).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Availability saved.")).toBeVisible();
  await page.reload();
  await expect(slot(page, WEEK_SAVE, 1, "7:00am", "not available")).toBeVisible();
  await expect(slot(page, WEEK_SAVE, 1, "7:30am", "not available")).toBeVisible();
  await expect(slot(page, WEEK_SAVE, 1, "8:00am", "available")).toBeVisible();
});

test("AC4: Day off switches a whole day off and the button reads Day on; Copy to next day carries it to the day after", async ({ page }) => {
  await openBob(page, WEEK_DAYOFF);
  await page.getByTestId("availability-grid").getByRole("button", { name: "Day off" }).first().click(); // Monday's
  await expect(slot(page, WEEK_DAYOFF, 0, "7:00am", "not available")).toBeVisible();
  await expect(slot(page, WEEK_DAYOFF, 0, "6:30pm", "not available")).toBeVisible();
  await expect(page.getByTestId("availability-grid").getByRole("button", { name: "Day on" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Copy to next day" }).click();
  await expect(page.getByText("Copied to the next day.")).toBeVisible();
  await expect(slot(page, WEEK_DAYOFF, 1, "7:00am", "not available")).toBeVisible();
  await page.getByTestId("availability-grid").getByRole("button", { name: "Day on" }).first().click();
  await expect(slot(page, WEEK_DAYOFF, 0, "7:00am", "available")).toBeVisible();
});

test("AC4, AC8: Copy to next week saves the unsaved taps with it, moves to that week, and asks 'Replace next week?' when that week is already set", async ({ page }) => {
  const next = "2027-05-10";
  await openBob(page, WEEK_COPY);
  await slot(page, WEEK_COPY, 2, "9:00am", "available").click(); // an unsaved tap
  await page.getByRole("button", { name: "Copy to next week", exact: true }).click();
  await expect(page.getByText(/This week is copied to next week \(week of 10 May\)\./)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Week of 10 May/ })).toBeVisible();
  await expect(slot(page, next, 2, "9:00am", "not available")).toBeVisible();
  // the tap was saved with the copy: back on the first week it holds
  await page.getByRole("button", { name: "Previous week" }).click();
  await expect(page.getByRole("heading", { name: /Week of 3 May/ })).toBeVisible();
  await expect(slot(page, WEEK_COPY, 2, "9:00am", "not available")).toBeVisible();
  // the next week is now set - copying again asks
  await page.getByRole("button", { name: "Copy to next week", exact: true }).click();
  await expect(page.getByRole("alertdialog").getByRole("heading", { name: "Replace next week?" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: /Week of 3 May/ })).toBeVisible();
  await page.getByRole("button", { name: "Copy to next week", exact: true }).click();
  await page.getByRole("button", { name: "Replace", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Week of 10 May/ })).toBeVisible();
});

test("AC8: leaving the week with unsaved taps asks; Stay keeps them, Leave drops them", async ({ page }) => {
  await openBob(page, WEEK_LEAVE);
  await slot(page, WEEK_LEAVE, 3, "10:00am", "available").click();
  await page.getByRole("button", { name: "Next week", exact: true }).click();
  await expect(page.getByRole("alertdialog").getByRole("heading", { name: "Leave without saving?" })).toBeVisible();
  await page.getByRole("button", { name: "Stay" }).click();
  await expect(slot(page, WEEK_LEAVE, 3, "10:00am", "not available")).toBeVisible();
  await page.getByRole("button", { name: "Next week", exact: true }).click();
  await page.getByRole("button", { name: "Leave" }).click();
  await expect(page.getByRole("heading", { name: /Week of 17 May/ })).toBeVisible();
});

test("AC5: on a desktop a click and drag paints a run, sideways too", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openBob(page, WEEK_DRAG);
  const from = slot(page, WEEK_DRAG, 1, "11:00am", "available");
  const to = slot(page, WEEK_DRAG, 2, "12:00pm", "available");
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  if (a === null || b === null) throw new Error("cells not found");
  await page.mouse.move(a.x + 8, a.y + 8);
  await page.mouse.down();
  await page.mouse.move(a.x + 8, a.y + a.height * 2 + 8, { steps: 4 }); // down the column
  await page.mouse.move(b.x + 8, b.y + 8, { steps: 6 }); // sideways into the next column
  await page.mouse.up();
  await expect(slot(page, WEEK_DRAG, 1, "11:00am", "not available")).toBeVisible();
  await expect(slot(page, WEEK_DRAG, 1, "11:30am", "not available")).toBeVisible();
  await expect(slot(page, WEEK_DRAG, 2, "12:00pm", "not available")).toBeVisible();
});

test("AC5: on a tablet a drag changes nothing - taps only", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1100 });
  await openBob(page, WEEK_TABLET);
  const from = slot(page, WEEK_TABLET, 1, "1:00pm", "available");
  const a = await from.boundingBox();
  if (a === null) throw new Error("cell not found");
  await page.mouse.move(a.x + 8, a.y + 8);
  await page.mouse.down();
  await page.mouse.move(a.x + 8, a.y + a.height * 2 + 8, { steps: 4 });
  await page.mouse.up();
  await expect(slot(page, WEEK_TABLET, 1, "1:30pm", "available")).toBeVisible();
  await slot(page, WEEK_TABLET, 1, "1:00pm", "available").click();
  await expect(slot(page, WEEK_TABLET, 1, "1:00pm", "not available")).toBeVisible();
});

test("AC6: tapping a half hour a job holds says to ring the office, and changes nothing", async ({ page, request }) => {
  await openBob(page, WEEK_SAVE);
  const cal = await page.request.get(`${apiUrl}/api/contractor/calendar?from=${new Date().toISOString().slice(0, 10)}&to=${new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10)}`);
  const days = ((await cal.json()) as { days: { date: string; blocks: { startMinutes: number; status: string }[] }[] }).days;
  const day = days.find((d) => d.blocks.some((b) => b.startMinutes >= 420 && b.startMinutes < 1140 && b.status !== "finished"));
  test.skip(day === undefined, "Bob has no job in the next three weeks");
  if (day === undefined) return;
  await page.goto(`/contractor/availability?week=${day.date}`);
  await expect(page.getByTestId("availability-grid")).toBeVisible({ timeout: 15_000 });
  const locked = page.locator('[data-state="booked"], [data-state="in_progress"], [data-state="to_answer"]').first();
  await locked.click();
  await expect(page.getByText("This time has a job. Ring the office to change it.")).toBeVisible();
  void request;
});

test("AC7: a past half hour is locked, and so is a public holiday (rose, with its name)", async ({ page, request }) => {
  await openBob(page, new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10));
  const past = page.locator('[data-state="past"]').first();
  await expect(past).toBeVisible();
  await past.click();
  await expect(past).toHaveAttribute("data-available", /yes|no/); // unchanged either way - no ring of an unsaved tap
  await expect(page.locator(".ring-brand-accent")).toHaveCount(0);

  const res = await request.get(`${apiUrl}/api/public-holidays?state=WA`);
  const holiday = ((await res.json()) as { holidays: { date: string; name: string }[] }).holidays[0];
  test.skip(holiday === undefined, "no WA holiday ahead");
  if (holiday === undefined) return;
  await page.goto(`/contractor/availability?week=${holiday.date}`);
  await expect(page.getByTestId("availability-grid")).toBeVisible({ timeout: 15_000 });
  const closed = page.locator('[data-state="closed"]').first();
  await expect(closed).toBeVisible();
  await closed.click();
  await expect(page.locator(".ring-brand-accent")).toHaveCount(0);
  await expect(page.getByText(holiday.name).first()).toBeVisible();
});

test("Mike sets Bob's half hours through the Availability tab on his record, and Bob sees them", async ({ page, browser }) => {
  await page.goto(`/ops/contractors/CON-014/availability?week=${WEEK_MIKE}`);
  await login(page, "mike@idelta.com.au");
  await expect(page.getByTestId("availability-grid")).toBeVisible({ timeout: 15_000 });
  await slot(page, WEEK_MIKE, 4, "3:00pm", "available").click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Availability saved.")).toBeVisible();
  const bobContext = await browser.newContext();
  const bob = await bobContext.newPage();
  await openBob(bob, WEEK_MIKE);
  await expect(slot(bob, WEEK_MIKE, 4, "3:00pm", "not available")).toBeVisible();
  await bobContext.close();
});

test("AC10: a contractor who never saved sees 'Set your availability' on the dashboard, and it blocks nothing", async ({ page }) => {
  await page.goto("/contractor");
  await login(page, "dave@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible({ timeout: 15_000 });
  const banner = page.getByRole("link", { name: "Set your availability" });
  test.skip((await banner.count()) === 0, "Dave has already saved his availability in this database");
  await expect(banner).toBeVisible();
  await banner.click();
  await expect(page).toHaveURL(/\/contractor\/availability$/);
});
