// Feature 4001, BKLG-024 -- the portal shell's breakpoint and its drawer
// (frontend-conventions.md, Patterns / Layout shells), frontend e2e.
//
// AC27 (BKLG-024) the sidebar shows at 1024px wide; at 1023px the top app
//      bar with its menu button
// AC28 (BKLG-024) below 1024px the menu opens as a left drawer about 288px
//      wide over a scrim, carrying the sidebar's exact entries in order;
//      the x and a tap on the scrim both close it
//
// Proven in the two portals that render the shared shell today -- ops
// (Mike) and contractor (Bob). The customer portal still renders 1003's
// logged-in placeholder, no shell at all: change.md V1 (parked).
//
// These tests' subject IS the width, so each one sets its own viewport.
import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/login";

async function expectSidebarAt1024(page: Page) {
  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(page.getByRole("navigation", { name: "Sidebar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
}

async function expectAppBarAt1023(page: Page) {
  await page.setViewportSize({ width: 1023, height: 800 });
  await expect(page.getByRole("navigation", { name: "Sidebar" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
}

async function expectDrawer(page: Page, width: number) {
  await page.setViewportSize({ width, height: 800 });
  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.locator("[data-menu-drawer]");
  await expect(drawer).toBeVisible();
  await expect(page.locator("[data-menu-scrim]")).toBeVisible();

  const box = await drawer.boundingBox();
  expect(box?.x).toBe(0);
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

test("AC28 (BKLG-024): below 1024px the ops menu is a left drawer about 288px wide over a scrim; the x and the scrim close it", async ({
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
