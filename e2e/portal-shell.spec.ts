// The Portal shell -- Feature 4001 (BKLG-024, its breakpoint and its drawer), extended by
// Feature 1018 (the frontend frame), frontend e2e (frontend-conventions, Templates / Shells /
// Portal shell and Frame pieces).
//
// 4001 AC27 the sidebar shows at 1024px wide; at 1023px the top bar with its menu button
// 4001 AC28 below 1024px the menu opens as a left drawer about 288px wide over a scrim, carrying
//           the sidebar's exact entries in order; the x and a tap on the scrim both close it
// 1018 AC1  Mike at /ops/jobs at 1280px: the Sidebar (224px, ink), the Wordmark, then Jobs,
//           Contractors, Receivables, Refunds, Payouts, Jobs current, no OWNER group, his name and Log
//           out at the bottom; the owner sees the same plus Settings and Pricing
// 1018 AC2  at 1023px and below: the Top bar with the menu icon at the left, the Wordmark beside
//           it; the drawer (288px, never more than 85%) closes on its x, a tap outside, Escape,
//           or picking an entry
// 1018 AC3  Bob gets the same shell with Dashboard, Payouts, Rates, Service area; a customer
//           login gets it with no entries, its name and Log out, and the placeholder
//
// These tests' subject IS the width, so each one sets its own viewport.
import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/login";
import { makeCustomerLogin } from "./helpers/test-run";

const sidebar = (page: Page) => page.getByRole("navigation", { name: "Sidebar" });

async function expectSidebarAt1024(page: Page) {
  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(sidebar(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
}

async function expectAppBarAt1023(page: Page) {
  await page.setViewportSize({ width: 1023, height: 800 });
  await expect(sidebar(page)).toBeHidden();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
}

async function expectDrawer(page: Page, width: number) {
  await page.setViewportSize({ width, height: 800 });
  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.locator("[data-menu-drawer]");
  await expect(drawer).toBeVisible();
  await expect(page.locator("[data-menu-scrim]")).toBeVisible();

  // It slides in over 150ms: read it once it has arrived.
  await expect.poll(async () => (await drawer.boundingBox())?.x).toBe(0);
  const box = await drawer.boundingBox();
  expect(box?.width).toBeCloseTo(Math.min(288, width * 0.85), 0);

  // The sidebar's exact entries, in the same order (hidden at this width, still in the page).
  const sidebarLinks = await page
    .getByRole("navigation", { name: "Sidebar", includeHidden: true })
    .getByRole("link", { includeHidden: true })
    .allTextContents();
  const drawerLinks = await page.getByRole("navigation", { name: "Menu" }).getByRole("link").allTextContents();
  expect(drawerLinks.length).toBeGreaterThan(0);
  expect(drawerLinks).toEqual(sidebarLinks);

  // The x closes it.
  await page.getByRole("button", { name: "Close menu" }).click();
  await expect(drawer).toBeHidden();

  // A tap on the scrim, clear of the drawer, closes it too.
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(drawer).toBeVisible();
  await page.mouse.click(width - 10, 400);
  await expect(drawer).toBeHidden();
  await expect(page.locator("[data-menu-scrim]")).toBeHidden();

  // Escape closes it.
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
}

test("AC27 (BKLG-024): the ops portal shows the sidebar at 1024px and the top app bar with its menu button at 1023px", async ({
  page,
}) => {
  await page.goto("/ops/jobs");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();
  await expectSidebarAt1024(page);
  await expectAppBarAt1023(page);
});

test("AC27 (BKLG-024): the contractor portal switches at the same width", async ({ page }) => {
  await page.goto("/contractor");
  await login(page, "bob@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expectSidebarAt1024(page);
  await expectAppBarAt1023(page);
});

test("AC28 (BKLG-024) + 1018 AC2: below 1024px the ops menu is a left drawer about 288px wide over a scrim; the x, the scrim and Escape close it", async ({
  page,
}) => {
  await page.goto("/ops/jobs");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();
  await expectDrawer(page, 1023);
  await expectDrawer(page, 390);
});

test("AC28 (BKLG-024): the contractor menu is the same drawer", async ({ page }) => {
  await page.goto("/contractor");
  await login(page, "bob@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expectDrawer(page, 1023);
});

test("1018 AC1: Mike's Sidebar at 1280px - Wordmark, Jobs, Contractors, Receivables, Refunds, Payouts, Service status in order, Jobs current, no OWNER group, his name and Log out", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/ops/jobs");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();

  const bar = sidebar(page);
  await expect(bar).toBeVisible();
  const box = await bar.boundingBox();
  expect(box?.width).toBe(224);
  // Ink fill: the one dark bar down the left (on-ink text colour sits on it).
  const background = await bar.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(background).toBe("rgb(28, 43, 58)");

  await expect(bar.getByRole("link")).toHaveText(["Jobs", "Contractors", "Receivables", "Refunds", "Payouts", "Service status"]);
  await expect(bar.getByRole("link", { name: "Jobs", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(bar.getByText("Owner", { exact: true })).toHaveCount(0);

  // The Wordmark above the menu; his NAME (not his email) and Log out at the bottom.
  const wordmarkBox = await bar.locator("span.uppercase").first().boundingBox();
  const firstLinkBox = await bar.getByRole("link").first().boundingBox();
  expect(wordmarkBox!.y).toBeLessThan(firstLinkBox!.y);
  await expect(bar.getByTestId("menu-person")).toHaveText("Mike");
  await expect(bar.getByText("mike@idelta.com.au")).toHaveCount(0);
  await expect(bar.getByRole("button", { name: "Log out" })).toBeVisible();
  const personBox = await bar.getByTestId("menu-person").boundingBox();
  expect(personBox!.y).toBeGreaterThan(firstLinkBox!.y + 100);

  // Tablet and phone: not on the page's top bar yet (Desktop shows no Top bar).
  await expect(page.getByRole("banner")).toBeHidden();

  await bar.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});

test("1018 AC1: the owner sees the same entries plus the OWNER group - Settings and Pricing", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/ops/jobs");
  await login(page, "owner@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();

  const bar = sidebar(page);
  await expect(bar.getByRole("link")).toHaveText(["Jobs", "Contractors", "Receivables", "Refunds", "Payouts", "Service status", "Settings", "Pricing"]);
  await expect(bar.getByText("Owner", { exact: true })).toBeVisible();
  await expect(bar.getByTestId("menu-person")).toHaveText("The owner");

  await bar.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});

test("1018 AC1: the current entry follows the URL, not the page - a contractor's tab marks Contractors", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/ops/contractors/CON-014");
  await login(page, "mike@idelta.com.au");
  const bar = sidebar(page);
  await expect(bar.getByRole("link", { name: "Contractors" })).toHaveAttribute("aria-current", "page");
  await expect(bar.getByRole("link", { name: "Jobs", exact: true })).not.toHaveAttribute("aria-current", "page");
});

test("1018 AC2: at 1023px the Top bar carries the menu icon at the left with the Wordmark beside it; picking an entry closes the drawer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1023, height: 800 });
  await page.goto("/ops/jobs");
  await login(page, "mike@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();

  const topBar = page.getByRole("banner");
  await expect(topBar).toBeVisible();
  const icon = await topBar.getByRole("button", { name: "Open menu" }).boundingBox();
  const wordmark = await topBar.locator("span.uppercase").boundingBox();
  expect(icon!.width).toBeGreaterThanOrEqual(44);
  expect(icon!.height).toBeGreaterThanOrEqual(44);
  expect(icon!.x).toBeLessThan(wordmark!.x);

  // The drawer holds the name and Log out, at least 44px tall to tap.
  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.locator("[data-menu-drawer]");
  await expect(drawer.getByTestId("menu-person")).toHaveText("Mike");
  const logOut = await drawer.getByRole("button", { name: "Log out" }).boundingBox();
  expect(logOut!.height).toBeGreaterThanOrEqual(44);

  // Picking an entry closes it and lands on that page.
  await drawer.getByRole("link", { name: "Contractors" }).click();
  await expect(page).toHaveURL(/\/ops\/contractors$/);
  await expect(drawer).toBeHidden();
});

test("1018 AC3: Bob gets the same shell with Dashboard, Payouts, Rates and Service area", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/contractor");
  await login(page, "bob@idelta.com.au");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  const bar = sidebar(page);
  await expect(bar.getByRole("link")).toHaveText(["Dashboard", "Payouts", "Rates", "Service area"]);
  await expect(bar.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  await expect(bar.getByTestId("menu-person")).toContainText("Bob");
  await expect(bar.getByRole("button", { name: "Log out" })).toBeVisible();
});

test("1018 AC3 (6010): a customer login gets the same shell with its four menu entries, its name and Log out, and lands on Jobs", async ({
  page,
}) => {
  const customer = await makeCustomerLogin();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/account");
  await login(page, customer.email, customer.password);
  await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();

  const bar = sidebar(page);
  await expect(bar).toBeVisible();
  // 6010: Jobs, Invoices, Profile (refunds sit under Invoices), Jobs current.
  await expect(bar.getByRole("link")).toHaveText(["Jobs", "Invoices", "Profile"]);
  await expect(bar.getByRole("link", { name: "Jobs", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(bar.getByTestId("menu-person")).toHaveText(customer.name);
  await expect(bar.getByRole("button", { name: "Log out" })).toBeVisible();
  // A login with no jobs yet: the empty state.
  await expect(page.getByText("No jobs yet.")).toBeVisible();

  await bar.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});
