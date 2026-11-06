// Feature 1020 -- the Needs attention space above the job queue
//
// AC12 Mike sees the line ending "Contact platform administrator."; the owner sees it with an Add holidays
//      link that lands on the Public holidays card with the state and year chosen. It goes the moment the
//      seventh holiday is entered, and the space is gone with nothing in it. Phone and desktop.
//
// WA's holidays are loaded by the migration, so a gap is made on purpose: WA's current year loses rows down to
// six (the real rows, put back at the end), the one thing the plan allows "in dev only".
import { test, expect, request as playwrightRequest, type Page } from "@playwright/test";
import { login } from "./helpers/login";
import { MOBILE_VIEWPORT } from "../playwright.config";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.idelta.com.au";
const YEAR = new Date().getFullYear();

interface Holiday {
  id: string;
  date: string;
  name: string;
}

/** Opens the job queue as `email` and waits until the portal has really loaded, so the session cookie is in place. */
async function openQueueAs(page: Page, email: string): Promise<void> {
  await page.goto("/ops/jobs");
  await login(page, email);
  await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible({ timeout: 15_000 });
}

async function listWa(page: Page): Promise<Holiday[]> {
  const res = await page.request.get(`${apiUrl}/api/holidays?state=WA&year=${String(YEAR)}`);
  expect(res.status(), await res.text()).toBe(200);
  return ((await res.json()) as { holidays: Holiday[] }).holidays;
}

/** Leaves WA's current year with six rows; returns what was taken off so it can be put back. */
async function makeGap(page: Page): Promise<Holiday[]> {
  const rows = await listWa(page);
  const removed = rows.slice(6);
  for (const row of removed) expect((await page.request.delete(`${apiUrl}/api/holidays/${row.id}`)).status()).toBe(204);
  return removed;
}

/**
 * Puts the removed WA rows back as REAL rows. A request that carries the `ts-test-run` cookie labels what
 * it creates `e2e`, and the suite's teardown sweep would remove them again -- so the put-back is made on a
 * fresh request context holding the owner's session cookies and nothing else.
 */
async function putBack(page: Page, removed: Holiday[]): Promise<void> {
  const cookies = (await page.context().cookies()).filter((cookie) => cookie.name !== "ts-test-run");
  const context = await playwrightRequest.newContext({ storageState: { cookies, origins: [] } });
  try {
    for (const row of removed) {
      const res = await context.post(`${apiUrl}/api/holidays`, { data: { state: "WA", date: row.date, name: row.name } });
      expect(res.status(), `putting back ${row.date}`).toBe(201);
    }
  } finally {
    await context.dispose();
  }
}

/** The bar shows one item at a time ("1 of 3"): go through them with the arrow until the one asked for shows. */
async function showLine(page: Page, text: string): Promise<void> {
  const next = page.getByRole("button", { name: "Next item" });
  for (let tries = 0; tries < 10 && !(await page.getByText(text).isVisible()); tries += 1) {
    if ((await next.count()) === 0) break;
    await next.click();
  }
}

// One shared WA list, one test at a time: each test below takes rows off it and puts them back.
test.describe.configure({ mode: "serial" });

test.describe("1020 AC12 -- desktop", () => {
  test("the owner sees the Add holidays link that lands on the card; the line goes at the seventh holiday", async ({ page }) => {
    await openQueueAs(page, "owner@idelta.com.au");
    const rows = await listWa(page);
    test.skip(rows.length < 7, "WA's current year is already short in this database");
    const removed = await makeGap(page);
    try {
      await page.goto("/ops/jobs");
      await expect(page.getByText("Needs attention", { exact: true })).toBeVisible();
      await showLine(page, `WA ${String(YEAR)} has fewer than 7 holidays.`);
      await expect(page.getByText(`WA ${String(YEAR)} has fewer than 7 holidays.`)).toBeVisible();
      await page.getByRole("link", { name: "Add holidays" }).click();
      await expect(page).toHaveURL(/\/ops\/settings\/holidays\?holidayState=WA&holidayYear=\d{4}$/);
      await expect(page.getByLabel("State", { exact: true })).toHaveValue("WA");
      await expect(page.getByText(`WA ${String(YEAR)} has fewer than 7 holidays. Check the list is complete.`)).toBeVisible();

      // The seventh holiday: the space is gone, with nothing in it.
      const first = removed[0];
      if (first === undefined) throw new Error("no row to put back");
      await page.getByLabel("Date", { exact: true }).fill(first.date);
      await page.getByLabel("Holiday name").fill(first.name);
      await page.getByRole("button", { name: "Add holiday" }).click();
      await expect(page.getByText(`Added ${first.name}.`)).toBeVisible();
      await page.goto("/ops/jobs");
      await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();
      await expect(page.getByText("Needs attention", { exact: true })).toHaveCount(0);
    } finally {
      // The row typed on the card was made under the test-run label (the sweep would remove it): take it off
      // and put every removed row back as a real one.
      const typed = (await listWa(page)).find((row) => row.date === removed[0]?.date);
      if (typed !== undefined) await page.request.delete(`${apiUrl}/api/holidays/${typed.id}`);
      await putBack(page, removed);
    }
  });

  test("Mike sees the line ending 'Contact platform administrator.' and no link", async ({ page }) => {
    await openQueueAs(page, "owner@idelta.com.au");
    test.skip((await listWa(page)).length < 7, "WA's current year is already short in this database");
    const removed = await makeGap(page);
    try {
      await page.context().clearCookies();
      await openQueueAs(page, "mike@idelta.com.au");
      await showLine(page, `WA ${String(YEAR)} has fewer than 7 holidays. Contact platform administrator.`);
      await expect(page.getByText(`WA ${String(YEAR)} has fewer than 7 holidays. Contact platform administrator.`)).toBeVisible();
      await expect(page.getByRole("link", { name: "Add holidays" })).toHaveCount(0);
    } finally {
      await page.context().clearCookies();
      await openQueueAs(page, "owner@idelta.com.au");
      await putBack(page, removed);
    }
  });
});

test.describe("1020 AC12 -- phone", () => {
  test.use(MOBILE_VIEWPORT);
  test("the line stacks: the words, then the Add holidays button under them, no sideways scroll", async ({ page }) => {
    await openQueueAs(page, "owner@idelta.com.au");
    test.skip((await listWa(page)).length < 7, "WA's current year is already short in this database");
    const removed = await makeGap(page);
    try {
      await page.goto("/ops/jobs");
      await showLine(page, `WA ${String(YEAR)} has fewer than 7 holidays.`);
      const words = page.getByText(`WA ${String(YEAR)} has fewer than 7 holidays.`);
      const link = page.getByRole("link", { name: "Add holidays" });
      await expect(words).toBeVisible();
      const wordsBox = await words.boundingBox();
      const linkBox = await link.boundingBox();
      expect(linkBox?.y ?? 0).toBeGreaterThan((wordsBox?.y ?? 0) + (wordsBox?.height ?? 0) - 1);
      expect(linkBox?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } finally {
      await putBack(page, removed);
    }
  });
});
